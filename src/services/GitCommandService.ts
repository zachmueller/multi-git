/**
 * Git Command Service
 * Handles execution of git CLI commands with proper error handling and security
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import {
    GitRepositoryError,
    FetchError,
    FetchErrorCode,
    GitStatusError,
    GitCommitError,
    GitPushError
} from '../utils/errors';
import { Logger } from '../utils/logger';
import { MultiGitSettings, RepositoryStatus } from '../settings/data';

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
    private readonly settings: MultiGitSettings;

    /**
     * Create a new GitCommandService
     * @param settings Plugin settings containing PATH configuration
     */
    constructor(settings: MultiGitSettings) {
        this.settings = settings;
    }

    /**
     * Build enhanced PATH with custom entries prepended to system PATH
     * @param systemPath Current system PATH (from process.env.PATH)
     * @param customEntries Custom PATH entries from settings
     * @returns Enhanced PATH string with proper separator for platform
     */
    private buildEnhancedPath(systemPath: string | undefined, customEntries: string[]): string {
        // Determine platform-specific path separator
        const pathSeparator = process.platform === 'win32' ? ';' : ':';

        // Expand tildes and validate custom entries
        const expandedEntries = customEntries
            .map(entry => {
                // Expand tilde to home directory
                if (entry.startsWith('~')) {
                    return entry.replace(/^~/, os.homedir());
                }
                return entry;
            })
            .filter(path => {
                // Validate path is absolute
                if (!path.startsWith('/') && !(process.platform === 'win32' && /^[A-Za-z]:/.test(path))) {
                    Logger.debug('GitCommand', `Skipping relative path in customPathEntries: ${path}`);
                    return false;
                }

                // Validate no shell metacharacters for security
                if (/[;&|`$()]/.test(path)) {
                    Logger.debug('GitCommand', `Skipping path with shell metacharacters: ${path}`);
                    return false;
                }

                return true;
            });

        // Split system PATH into array, handling undefined
        const systemPaths = systemPath ? systemPath.split(pathSeparator) : [];

        // Prepend custom paths to system paths
        const allPaths = [...expandedEntries, ...systemPaths];

        // Remove duplicates while preserving order (keep first occurrence)
        const uniquePaths = Array.from(new Set(allPaths));

        // Join with appropriate separator
        const enhancedPath = uniquePaths.join(pathSeparator);

        // Log enhanced PATH in debug mode
        Logger.debug('GitCommand', `Enhanced PATH: ${enhancedPath}`);

        return enhancedPath;
    }

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

        // Log command execution
        Logger.gitCommand('GitCommand', fullCommand, cwd || 'unknown');

        const startTime = Date.now();

        // Build enhanced PATH with custom entries
        const enhancedPath = this.buildEnhancedPath(process.env.PATH, this.settings.customPathEntries);

        try {
            const { stdout, stderr } = await execPromise(fullCommand, {
                cwd,
                timeout,
                // Set max buffer to prevent memory issues with large outputs
                maxBuffer: 10 * 1024 * 1024, // 10MB
                // Pass enhanced PATH while preserving other environment variables
                env: {
                    ...process.env,
                    PATH: enhancedPath,
                },
            });

            const duration = Date.now() - startTime;
            Logger.gitResult('GitCommand', fullCommand, true, duration);

            return {
                stdout: stdout || '',
                stderr: stderr || '',
                exitCode: 0,
            };
        } catch (error: unknown) {
            const duration = Date.now() - startTime;
            Logger.gitResult('GitCommand', fullCommand, false, duration);
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
            'rev-parse', 'rev-list', 'status', 'log', 'diff', 'branch',
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
        Logger.debug('GitCommand', `Starting fetch for repository: ${repoPath}`);
        const startTime = Date.now();

        try {
            // Use --all to fetch all remotes, --tags to include tags, --prune to remove stale refs
            await this.executeGitCommand('fetch --all --tags --prune', {
                cwd: repoPath,
                timeout,
            });

            const duration = Date.now() - startTime;
            Logger.timing('GitCommand', 'Fetch operation', duration, repoPath);

            return true;
        } catch (error) {
            const duration = Date.now() - startTime;
            Logger.error('GitCommand', `Fetch failed after ${duration}ms for ${repoPath}`, error);
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
        Logger.debug('GitCommand', `Checking remote changes for repository: ${repoPath}`);

        try {
            // Get current branch if not specified
            const currentBranch = branch || await this.getCurrentBranch(repoPath);

            // If in detached HEAD state, no tracking possible
            if (!currentBranch) {
                Logger.debug('GitCommand', `Repository in detached HEAD state: ${repoPath}`);
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
                Logger.debug('GitCommand', `No tracking branch configured for ${currentBranch} in ${repoPath}`);
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

            const status = {
                hasChanges,
                commitsBehind: behind,
                commitsAhead: ahead,
                trackingBranch,
                currentBranch,
            };

            Logger.debug('GitCommand', `Remote change detection complete for ${repoPath}`, status);

            return status;
        } catch (error) {
            Logger.error('GitCommand', `Failed to check remote changes for ${repoPath}`, error);
            if (error instanceof GitRepositoryError) {
                throw error;
            }
            throw new GitRepositoryError(
                `Failed to check remote changes: ${error instanceof Error ? error.message : String(error)}`,
                repoPath
            );
        }
    }

    /**
     * Get detailed repository status including staged, unstaged, and untracked files
     * @param repoPath Absolute path to repository
     * @param repositoryId Repository ID from configuration
     * @param repositoryName Repository name from configuration
     * @returns Repository status with detailed file information
     * @throws GitStatusError if status check fails
     */
    async getRepositoryStatus(
        repoPath: string,
        repositoryId: string,
        repositoryName: string
    ): Promise<RepositoryStatus> {
        Logger.debug('GitCommand', `Getting repository status for: ${repoPath}`);

        try {
            // Get current branch
            const currentBranch = await this.getCurrentBranch(repoPath);

            // Get git status in porcelain format for easy parsing
            const result = await this.executeGitCommand('status --porcelain', {
                cwd: repoPath,
            });

            // Parse status output
            const stagedFiles: string[] = [];
            const unstagedFiles: string[] = [];
            const untrackedFiles: string[] = [];

            const lines = result.stdout.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                // Git status --porcelain format:
                // XY filename
                // X = index status, Y = working tree status
                // M = modified, A = added, D = deleted, R = renamed, C = copied
                // ?? = untracked
                const statusCode = line.substring(0, 2);
                const filename = line.substring(3);

                const indexStatus = statusCode[0];
                const workingTreeStatus = statusCode[1];

                // Check index (staged) status
                if (indexStatus !== ' ' && indexStatus !== '?') {
                    stagedFiles.push(filename);
                }

                // Check working tree (unstaged) status
                if (workingTreeStatus !== ' ' && workingTreeStatus !== '?') {
                    unstagedFiles.push(filename);
                }

                // Check for untracked files
                if (statusCode === '??') {
                    untrackedFiles.push(filename);
                }
            }

            const hasUncommittedChanges =
                stagedFiles.length > 0 ||
                unstagedFiles.length > 0 ||
                untrackedFiles.length > 0;

            const status: RepositoryStatus = {
                repositoryId,
                repositoryName,
                repositoryPath: repoPath,
                currentBranch,
                hasUncommittedChanges,
                stagedFiles,
                unstagedFiles,
                untrackedFiles,
            };

            Logger.debug('GitCommand', `Repository status complete for ${repoPath}`, {
                branch: currentBranch,
                hasChanges: hasUncommittedChanges,
                staged: stagedFiles.length,
                unstaged: unstagedFiles.length,
                untracked: untrackedFiles.length,
            });

            return status;
        } catch (error) {
            Logger.error('GitCommand', `Failed to get repository status for ${repoPath}`, error);
            if (error instanceof GitRepositoryError) {
                throw new GitStatusError(
                    `Failed to get repository status: ${error.message}`,
                    repoPath
                );
            }
            throw new GitStatusError(
                `Failed to get repository status: ${error instanceof Error ? error.message : String(error)}`,
                repoPath
            );
        }
    }

    /**
     * Stage all changes in the repository
     * @param repoPath Absolute path to repository
     * @throws GitRepositoryError if staging fails
     */
    async stageAllChanges(repoPath: string): Promise<void> {
        Logger.debug('GitCommand', `Staging all changes for: ${repoPath}`);

        try {
            await this.executeGitCommand('add -A', {
                cwd: repoPath,
            });

            Logger.debug('GitCommand', `Successfully staged all changes for ${repoPath}`);
        } catch (error) {
            Logger.error('GitCommand', `Failed to stage changes for ${repoPath}`, error);
            if (error instanceof GitRepositoryError) {
                throw error;
            }
            throw new GitRepositoryError(
                `Failed to stage changes: ${error instanceof Error ? error.message : String(error)}`,
                repoPath
            );
        }
    }

    /**
     * Create a commit with the given message
     * @param repoPath Absolute path to repository
     * @param message Commit message
     * @throws GitCommitError if commit fails
     */
    async createCommit(repoPath: string, message: string): Promise<void> {
        Logger.debug('GitCommand', `Creating commit for: ${repoPath}`);

        // Validate commit message is not empty
        if (!message || message.trim() === '') {
            throw new GitCommitError(
                'Commit message cannot be empty',
                repoPath
            );
        }

        try {
            // Use -m flag to provide commit message
            // Escape message properly for shell
            const escapedMessage = message.replace(/"/g, '\\"');
            await this.executeGitCommand(`commit -m "${escapedMessage}"`, {
                cwd: repoPath,
            });

            Logger.debug('GitCommand', `Successfully created commit for ${repoPath}`);
        } catch (error) {
            Logger.error('GitCommand', `Failed to create commit for ${repoPath}`, error);

            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStr = errorMessage.toLowerCase();

            // Check for "nothing to commit" scenario
            if (errorStr.includes('nothing to commit') || errorStr.includes('no changes added')) {
                throw new GitCommitError(
                    'No changes to commit',
                    repoPath,
                    error instanceof Error ? error : undefined
                );
            }

            // Check for pre-commit hook failure
            if (errorStr.includes('pre-commit hook') || errorStr.includes('hook failed')) {
                throw new GitCommitError(
                    `Pre-commit hook failed: ${errorMessage}`,
                    repoPath,
                    error instanceof Error ? error : undefined
                );
            }

            if (error instanceof GitRepositoryError) {
                throw new GitCommitError(
                    `Commit failed: ${error.message}`,
                    repoPath,
                    error
                );
            }
            throw new GitCommitError(
                `Commit failed: ${errorMessage}`,
                repoPath,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Push commits to remote repository
     * @param repoPath Absolute path to repository
     * @param timeout Timeout in milliseconds (default: 60000ms)
     * @throws GitPushError if push fails
     */
    async pushToRemote(repoPath: string, timeout: number = 60000): Promise<void> {
        Logger.debug('GitCommand', `Pushing to remote for: ${repoPath}`);

        try {
            await this.executeGitCommand('push', {
                cwd: repoPath,
                timeout,
            });

            Logger.debug('GitCommand', `Successfully pushed to remote for ${repoPath}`);
        } catch (error) {
            Logger.error('GitCommand', `Failed to push to remote for ${repoPath}`, error);

            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStr = errorMessage.toLowerCase();

            // Check for authentication errors
            if (errorStr.includes('authentication failed') ||
                errorStr.includes('could not read username') ||
                errorStr.includes('permission denied')) {
                throw new GitPushError(
                    'Authentication failed. Please configure git credentials.',
                    repoPath,
                    error instanceof Error ? error : undefined
                );
            }

            // Check for network errors
            if (errorStr.includes('could not resolve host') ||
                errorStr.includes('failed to connect') ||
                errorStr.includes('network is unreachable')) {
                throw new GitPushError(
                    'Network error: Unable to reach remote repository.',
                    repoPath,
                    error instanceof Error ? error : undefined
                );
            }

            // Check for no upstream branch
            if (errorStr.includes('no upstream branch') ||
                errorStr.includes('has no upstream')) {
                throw new GitPushError(
                    'No upstream branch configured. Please set up tracking branch.',
                    repoPath,
                    error instanceof Error ? error : undefined
                );
            }

            // Check for pre-push hook failure
            if (errorStr.includes('pre-push hook') || errorStr.includes('hook failed')) {
                throw new GitPushError(
                    `Pre-push hook failed: ${errorMessage}`,
                    repoPath,
                    error instanceof Error ? error : undefined
                );
            }

            // Check for timeout
            if (errorStr.includes('timed out')) {
                throw new GitPushError(
                    `Push operation timed out after ${timeout}ms. Changes are committed locally.`,
                    repoPath,
                    error instanceof Error ? error : undefined
                );
            }

            if (error instanceof GitRepositoryError) {
                throw new GitPushError(
                    `Push failed: ${error.message}`,
                    repoPath,
                    error
                );
            }
            throw new GitPushError(
                `Push failed: ${errorMessage}`,
                repoPath,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Combined operation: stage all changes, commit, and push to remote
     * @param repoPath Absolute path to repository
     * @param message Commit message
     * @param timeout Timeout for push operation in milliseconds (default: 60000ms)
     * @throws GitCommitError if staging or commit fails
     * @throws GitPushError if push fails
     */
    async commitAndPush(
        repoPath: string,
        message: string,
        timeout: number = 60000
    ): Promise<void> {
        Logger.debug('GitCommand', `Starting commit and push workflow for: ${repoPath}`);

        try {
            // Step 1: Stage all changes
            await this.stageAllChanges(repoPath);
            Logger.debug('GitCommand', 'Stage complete, proceeding to commit');

            // Step 2: Create commit
            await this.createCommit(repoPath, message);
            Logger.debug('GitCommand', 'Commit complete, proceeding to push');

            // Step 3: Push to remote
            await this.pushToRemote(repoPath, timeout);
            Logger.debug('GitCommand', `Commit and push workflow complete for ${repoPath}`);
        } catch (error) {
            // Errors are already categorized by the individual methods
            // Just re-throw them with appropriate context
            Logger.error('GitCommand', `Commit and push workflow failed for ${repoPath}`, error);
            throw error;
        }
    }
}
