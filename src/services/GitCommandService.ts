/**
 * Git Command Service
 * Handles execution of git CLI commands with proper error handling and security
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { GitRepositoryError } from '../utils/errors';

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
}
