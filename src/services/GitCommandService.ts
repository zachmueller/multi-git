/**
 * Git Command Service
 * Handles execution of git CLI commands with proper error handling and security
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { GitRepositoryError, FetchError, FetchErrorCode } from '../utils/errors';

const execPromise = promisify(exec);

/**
 * Options for git command execution
 */
interface GitCommandOptions {
    cwd?: string;
    timeout?: number;
}

/**
 * Result of git command execution
 */
interface GitCommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

/**
 * Remote change status for a repository
 */
export interface RemoteChangeStatus {
    hasChanges: boolean;
    commitsBehind: number;
    commitsAhead: number;
    trackingBranch: string | null;
    currentBranch: string | null;
}

/**
 * Service for executing git commands safely
 */
export class GitCommandService {
    private readonly defaultTimeout = 10000; // 10 seconds

    /**
     * Check if a directory is a valid git repository
     * @param path Absolute path to check
     * @returns True if path is a git repository, false otherwise
     * @throws GitRepositoryError if command execution fails
     */
    async isGitRepository(path: string): Promise<boolean> {
        try {
            // Use rev-parse --git-dir to check if directory is part of a git repo
            // This command succeeds (exit 0) if we're in a git repo
            await this.executeGitCommand('rev-parse --git-dir', { cwd: path });
            return true;
        } catch (error) {
            // If the command fails with exit code 128, it's not a git repository
            // Any other error should be propagated
            if (error instanceof GitRepositoryError && error.message.toLowerCase().includes('not a git repository')) {
                return false;
            }
            // For other errors (permissions, path doesn't exist, etc.), throw
            throw error;
        }
    }

    /**
     * Get the root directory of a git repository
     * @param path Path within a git repository
     * @returns Absolute path to the repository root
     * @throws GitRepositoryError if not a git repository or command fails
     */
    async getRepositoryRoot(path: string): Promise<string> {
        try {
            const result = await this.executeGitCommand('rev-parse --show-toplevel', { cwd: path });
            // Trim whitespace and normalize line endings
            return result.stdout.trim();
        } catch (error) {
            if (error instanceof GitRepositoryError) {
                throw error;
            }
            throw new GitRepositoryError(
                `Failed to get repository root for path: ${path}`,
                path
            );
        }
    }

    /**
     * Execute a git command safely
     * @param command Git command to execute (without 'git' prefix)
     * @param options Execution options
     * @returns Command result
     * @throws GitRepositoryError if command fails
     */
    private async executeGitCommand(
        command: string,
        options: GitCommandOptions = {}
    ): Promise<GitCommandResult> {
        // Security: Validate command doesn't contain shell injection attempts
        this.validateCommand(command);

        const { cwd, timeout = this.defaultTimeout } = options;

        // Build the full git command
        const fullCommand = `git ${command}`;

        try {
            const { stdout, stderr } = await execPromise(fullCommand, {
                cwd,
                timeout,
                // Set max buffer to prevent memory issues with large outputs
                maxBuffer: 10 * 1024 * 1024, // 10MB
            });

            return {
                stdout: stdout || '',
                stderr: stderr || '',
                exitCode: 0,
            };
        } catch (error: unknown) {
            // Type-safe error handling
            if (this.isExecError(error)) {
                const stderr = error.stderr?.toString() || '';

                // Check if error indicates not a git repository
                if (stderr.includes('not a git repository') || stderr.includes('not found')) {
                    throw new GitRepositoryError(
                        `Not a git repository: ${cwd || 'unknown path'}`,
                        cwd || 'unknown'
                    );
                }

                // Check for permission errors
                if (stderr.includes('Permission denied') || error.code === 'EACCES') {
                    throw new GitRepositoryError(
                        `Permission denied accessing git repository: ${cwd || 'unknown path'}`,
                        cwd || 'unknown'
                    );
                }

                // Check for timeout
                if (error.killed && error.signal === 'SIGTERM') {
                    throw new GitRepositoryError(
                        `Git command timed out after ${timeout}ms`,
                        cwd || 'unknown'
                    );
                }

                // Generic git command failure
                throw new GitRepositoryError(
                    `Git command failed: ${stderr || error.message}`,
                    cwd || 'unknown'
                );
            }

            // Unknown error type
            throw new GitRepositoryError(
                `Unexpected error executing git command: ${error instanceof Error ? error.message : String(error)}`,
                cwd || 'unknown'
            );
        }
    }

    /**
     * Validate command for security issues
     * @param command Command to validate
     * @throws Error if command contains suspicious patterns
     */
    private validateCommand(command: string): void {
        // Check for command chaining attempts
        const dangerousPatterns = [
            '&&', '||', ';', '|', '>', '<', '`', '$(',
            '\n', '\r'
        ];

        for (const pattern of dangerousPatterns) {
            if (command.includes(pattern)) {
                throw new Error(
                    `Invalid git command: contains potentially dangerous pattern '${pattern}'`
                );
            }
        }

        // Ensure command starts with a valid git subcommand
        const validSubcommands = [
            'rev-parse', 'status', 'log', 'diff', 'branch',
            'remote', 'fetch', 'pull', 'push', 'commit',
            'add', 'checkout', 'merge', 'rebase', 'tag',
            'show', 'config', 'ls-files', 'ls-tree'
        ];

        const firstWord = command.trim().split(/\s+/)[0];
        if (!validSubcommands.includes(firstWord)) {
            throw new Error(
                `Invalid git command: '${firstWord}' is not a recognized git subcommand`
            );
        }
    }

    /**
     * Type guard for exec error
     */
    private isExecError(error: unknown): error is {
        code?: string;
        killed?: boolean;
        signal?: string;
        stdout?: Buffer | string;
        stderr?: Buffer | string;
        message: string;
    } {
        return (
            typeof error === 'object' &&
            error !== null &&
            'message' in error
        );
    }

    /**
     * Check if git is installed and accessible
     * @returns True if git is available, false otherwise
     */
    async isGitInstalled(): Promise<boolean> {
        try {
            await execPromise('git --version', {
                timeout: 5000,
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get git version information
     * @returns Git version string or null if git not available
     */
    async getGitVersion(): Promise<string | null> {
        try {
            const { stdout } = await execPromise('git --version', {
                timeout: 5000,
            });
            return stdout.trim();
        } catch {
            return null;
        }
    }

    /**
     * Fetch remote changes for a repository
     * @param repoPath Absolute path to repository
     * @param timeout Timeout in milliseconds (default: 30000ms)
     * @returns True if fetch succeeded, false otherwise
     * @throws FetchError with categorized error code if fetch fails
     */
    async fetchRepository(repoPath: string, timeout: number = 30000): Promise<boolean> {
        try {
            // Use --all to fetch all remotes, --tags to include tags, --prune to remove stale refs
            await this.executeGitCommand('fetch --all --tags --prune', {
                cwd: repoPath,
                timeout,
            });
            return true;
        } catch (error) {
            // Categorize the error and throw FetchError with appropriate code
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStr = errorMessage.toLowerCase();

            // Check for timeout
            if (error instanceof GitRepositoryError && errorStr.includes('timed out')) {
                throw new FetchError(
                    `Fetch operation timed out after ${timeout}ms`,
                    repoPath,
                    FetchErrorCode.TIMEOUT,
                    error instanceof Error ? error : undefined
                );
            }

            // Check for authentication errors
            if (errorStr.includes('authentication failed') ||
                errorStr.includes('could not read username') ||
                errorStr.includes('could not read password') ||
                errorStr.includes('permission denied (publickey)') ||
                errorStr.includes('fatal: authentication')) {
                throw new FetchError(
                    'Authentication failed. Please check your git credentials.',
                    repoPath,
                    FetchErrorCode.AUTH_ERROR,
                    error instanceof Error ? error : undefined
                );
            }

            // Check for network errors
            if (errorStr.includes('could not resolve host') ||
                errorStr.includes('failed to connect') ||
                errorStr.includes('network is unreachable') ||
                errorStr.includes('connection timed out') ||
                errorStr.includes('temporary failure in name resolution')) {
                throw new FetchError(
                    'Network error: Unable to reach remote repository.',
                    repoPath,
                    FetchErrorCode.NETWORK_ERROR,
                    error instanceof Error ? error : undefined
                );
            }

            // Check for repository errors
            if (errorStr.includes('not a git repository') ||
                errorStr.includes('does not appear to be') ||
                errorStr.includes('repository not found') ||
                errorStr.includes('remote not found')) {
                throw new FetchError(
                    'Repository error: Invalid git repository or remote configuration.',
                    repoPath,
                    FetchErrorCode.REPO_ERROR,
                    error instanceof Error ? error : undefined
                );
            }

            // Unknown error
            throw new FetchError(
                `Fetch failed: ${errorMessage}`,
                repoPath,
                FetchErrorCode.UNKNOWN,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Get current branch name
     * @param repoPath Absolute path to repository
     * @returns Branch name or null if in detached HEAD state
     * @throws GitRepositoryError if command fails
     */
    async getCurrentBranch(repoPath: string): Promise<string | null> {
        try {
            const result = await this.executeGitCommand('rev-parse --abbrev-ref HEAD', {
                cwd: repoPath,
            });
            const branch = result.stdout.trim();

            // If we're in detached HEAD state, git returns 'HEAD'
            if (branch === 'HEAD') {
                return null;
            }

            return branch;
        } catch (error) {
            if (error instanceof GitRepositoryError) {
                throw error;
            }
            throw new GitRepositoryError(
                `Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`,
                repoPath
            );
        }
    }

    /**
     * Get remote tracking branch for a local branch
     * @param repoPath Absolute path to repository
     * @param branch Local branch name (defaults to current branch)
     * @returns Remote tracking branch (e.g., "origin/main") or null if no tracking branch
     * @throws GitRepositoryError if command fails
     */
    async getTrackingBranch(repoPath: string, branch?: string): Promise<string | null> {
        try {
            // If no branch specified, use current branch
            const targetBranch = branch || '@';

            // Use @{u} to get the upstream/tracking branch
            const result = await this.executeGitCommand(
                `rev-parse --abbrev-ref ${targetBranch}@{u}`,
                { cwd: repoPath }
            );

            return result.stdout.trim();
        } catch (error) {
            // If there's no tracking branch configured, git returns an error
            // This is a normal scenario, not an actual error
            if (error instanceof GitRepositoryError &&
                (error.message.includes('no upstream') ||
                    error.message.includes('does not point to a branch'))) {
                return null;
            }

            // For other errors, propagate them
            if (error instanceof GitRepositoryError) {
                throw error;
            }
            throw new GitRepositoryError(
                `Failed to get tracking branch: ${error instanceof Error ? error.message : String(error)}`,
                repoPath
            );
        }
    }

    /**
     * Count commits between local and remote branch
     * @param repoPath Absolute path to repository
     * @param localBranch Local branch name
     * @param remoteBranch Remote branch name
     * @returns Object with ahead and behind counts
     * @throws GitRepositoryError if command fails
     */
    async compareWithRemote(
        repoPath: string,
        localBranch: string,
        remoteBranch: string
    ): Promise<{ ahead: number; behind: number }> {
        try {
            // Count commits local is ahead of remote
            const aheadResult = await this.executeGitCommand(
                `rev-list --count ${remoteBranch}..${localBranch}`,
                { cwd: repoPath }
            );
            const ahead = parseInt(aheadResult.stdout.trim(), 10);

            // Count commits local is behind remote
            const behindResult = await this.executeGitCommand(
                `rev-list --count ${localBranch}..${remoteBranch}`,
                { cwd: repoPath }
            );
            const behind = parseInt(behindResult.stdout.trim(), 10);

            return { ahead, behind };
        } catch (error) {
            if (error instanceof GitRepositoryError) {
                throw error;
            }
            throw new GitRepositoryError(
                `Failed to compare branches: ${error instanceof Error ? error.message : String(error)}`,
                repoPath
            );
        }
    }

    /**
     * Check if remote has changes not in local branch
     * @param repoPath Absolute path to repository
     * @param branch Branch name (defaults to current branch)
     * @returns Remote change status with commit counts and branch information
     * @throws GitRepositoryError if command fails
     */
    async checkRemoteChanges(repoPath: string, branch?: string): Promise<RemoteChangeStatus> {
        try {
            // Get current branch if not specified
            const currentBranch = branch || await this.getCurrentBranch(repoPath);

            // If in detached HEAD state, no tracking possible
            if (!currentBranch) {
                return {
                    hasChanges: false,
                    commitsBehind: 0,
                    commitsAhead: 0,
                    trackingBranch: null,
                    currentBranch: null,
                };
            }

            // Get tracking branch
            const trackingBranch = await this.getTrackingBranch(repoPath, currentBranch);

            // If no tracking branch, can't check for changes
            if (!trackingBranch) {
                return {
                    hasChanges: false,
                    commitsBehind: 0,
                    commitsAhead: 0,
                    trackingBranch: null,
                    currentBranch,
                };
            }

            // Compare with remote
            const { ahead, behind } = await this.compareWithRemote(
                repoPath,
                currentBranch,
                trackingBranch
            );

            // Has changes if there are commits we're behind on
            const hasChanges = behind > 0;

            return {
                hasChanges,
                commitsBehind: behind,
                commitsAhead: ahead,
                trackingBranch,
                currentBranch,
            };
        } catch (error) {
            if (error instanceof GitRepositoryError) {
                throw error;
            }
            throw new GitRepositoryError(
                `Failed to check remote changes: ${error instanceof Error ? error.message : String(error)}`,
                repoPath
            );
        }
    }
}
