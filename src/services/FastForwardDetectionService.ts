/**
 * Fast-Forward Detection Service
 * Determines if a repository can be safely fast-forwarded to remote state
 */

import { GitCommandService } from './GitCommandService';
import { Logger } from '../utils/logger';

/**
 * Result of fast-forward detection operation
 */
export interface FastForwardDetectionResult {
    /**
     * Status of the detection operation
     * - 'can-fast-forward': Local can be safely fast-forwarded (ahead=0, behind>0)
     * - 'up-to-date': Local and remote are synchronized (ahead=0, behind=0)
     * - 'local-ahead': Local has commits not on remote (ahead>0, behind=0)
     * - 'diverged': Branches have diverged, manual merge required (ahead>0, behind>0)
     * - 'error': Detection failed, cannot determine status safely
     */
    status: 'can-fast-forward' | 'up-to-date' | 'local-ahead' | 'diverged' | 'error';

    /**
     * Number of commits local is ahead of remote
     */
    commitsAhead: number;

    /**
     * Number of commits local is behind remote
     */
    commitsBehind: number;

    /**
     * Current local branch name
     */
    localBranch: string;

    /**
     * Upstream tracking branch name (e.g., "origin/main")
     */
    remoteBranch: string;

    /**
     * Time taken for detection in milliseconds
     */
    detectionTime: number;

    /**
     * Timestamp when detection was performed
     */
    timestamp: Date;

    /**
     * Error message if status is 'error'
     */
    errorMessage?: string;

    /**
     * Error code for categorizing errors
     * - 'no-upstream': No upstream tracking branch configured
     * - 'detached-head': Repository in detached HEAD state
     * - 'invalid-repo': Not a valid git repository
     * - 'git-command-failed': Git command execution failed
     */
    errorCode?: 'no-upstream' | 'detached-head' | 'invalid-repo' | 'git-command-failed';
}

/**
 * Service for detecting if repository can be safely fast-forwarded
 * 
 * Uses conservative failure mode: when uncertain, returns 'error' status
 * to prevent any risk of data loss from incorrect fast-forward attempts.
 * 
 * @example
 * ```typescript
 * const service = new FastForwardDetectionService(gitCommandService, logger);
 * const result = await service.detectFastForward('/path/to/repo');
 * 
 * if (service.canSafelyFastForward(result)) {
 *   // Safe to execute git pull --ff-only
 *   console.log(`Can fast-forward: ${result.commitsBehind} commits to pull`);
 * } else {
 *   // Manual intervention required
 *   console.log(`Status: ${result.status}`);
 * }
 * ```
 */
export class FastForwardDetectionService {
    /**
     * Create a new FastForwardDetectionService
     * @param gitCommandService Service for executing git commands
     */
    constructor(
        private readonly gitCommandService: GitCommandService
    ) { }

    /**
     * Determines if repository can be fast-forwarded to remote state
     * 
     * This method performs a comprehensive analysis of the repository state:
     * 1. Gets current branch name
     * 2. Gets upstream tracking branch
     * 3. Counts commits local is ahead of remote
     * 4. Counts commits local is behind remote
     * 5. Determines status based on ahead/behind counts
     * 
     * Detection uses conservative failure mode: any uncertainty results in 'error' status
     * to prevent incorrect fast-forward attempts that could cause data loss.
     * 
     * @param repoPath Absolute path to git repository
     * @returns Detection result with status and commit counts
     * 
     * @example
     * ```typescript
     * const result = await detectFastForward('/path/to/repo');
     * 
     * switch (result.status) {
     *   case 'can-fast-forward':
     *     console.log(`Safe to pull ${result.commitsBehind} commits`);
     *     break;
     *   case 'up-to-date':
     *     console.log('Already synchronized');
     *     break;
     *   case 'local-ahead':
     *     console.log(`Local has ${result.commitsAhead} unpushed commits`);
     *     break;
     *   case 'diverged':
     *     console.log('Manual merge required');
     *     break;
     *   case 'error':
     *     console.log(`Detection failed: ${result.errorMessage}`);
     *     break;
     * }
     * ```
     */
    async detectFastForward(repoPath: string): Promise<FastForwardDetectionResult> {
        const startTime = Date.now();
        const timestamp = new Date();

        try {
            // Step 1: Get current branch
            const localBranch = await this.getCurrentBranch(repoPath);

            // Step 2: Get upstream tracking branch
            const remoteBranch = await this.getUpstreamBranch(repoPath);

            // Step 3: Count commits ahead
            const commitsAhead = await this.countCommitsAhead(repoPath, localBranch, remoteBranch);

            // Step 4: Count commits behind
            const commitsBehind = await this.countCommitsBehind(repoPath, localBranch, remoteBranch);

            // Step 5: Determine status
            const status = this.determineStatus(commitsAhead, commitsBehind);

            const detectionTime = Date.now() - startTime;

            Logger.debug(
                'FastForwardDetection',
                `Detection complete for ${repoPath}`,
                { status, commitsAhead, commitsBehind, detectionTime }
            );

            return {
                status,
                commitsAhead,
                commitsBehind,
                localBranch,
                remoteBranch,
                detectionTime,
                timestamp,
            };
        } catch (error) {
            const detectionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            Logger.error(
                'FastForwardDetection',
                `Detection failed for ${repoPath}: ${errorMessage}`,
                error
            );

            // Conservative failure mode: return error status
            return {
                status: 'error',
                commitsAhead: 0,
                commitsBehind: 0,
                localBranch: '',
                remoteBranch: '',
                detectionTime,
                timestamp,
                errorMessage,
                errorCode: this.categorizeError(error),
            };
        }
    }

    /**
     * Checks if detection result indicates fast-forward is safe
     * 
     * Returns true ONLY when status is 'can-fast-forward', which guarantees:
     * - Local has no commits ahead of remote (ahead = 0)
     * - Remote has commits not on local (behind > 0)
     * - Fast-forward merge will succeed without conflicts
     * 
     * All other statuses return false for safety.
     * 
     * @param result Detection result from detectFastForward()
     * @returns true if can safely fast-forward, false otherwise
     * 
     * @example
     * ```typescript
     * const result = await detectFastForward(repoPath);
     * 
     * if (canSafelyFastForward(result)) {
     *   await gitCommandService.executeCommand('pull --ff-only', { cwd: repoPath });
     * }
     * ```
     */
    canSafelyFastForward(result: FastForwardDetectionResult): boolean {
        return result.status === 'can-fast-forward';
    }

    /**
     * Get current branch name
     * @param repoPath Absolute path to repository
     * @returns Branch name
     * @throws Error if in detached HEAD state or command fails
     */
    private async getCurrentBranch(repoPath: string): Promise<string> {
        try {
            const branch = await this.gitCommandService.getCurrentBranch(repoPath);

            // GitCommandService returns null for detached HEAD
            if (branch === null) {
                throw new Error('Repository is in detached HEAD state');
            }

            return branch;
        } catch (error) {
            Logger.error('FastForwardDetection', `Failed to get current branch for ${repoPath}`, error);
            throw error;
        }
    }

    /**
     * Get upstream tracking branch
     * @param repoPath Absolute path to repository
     * @returns Upstream branch name (e.g., "origin/main")
     * @throws Error if no upstream configured or command fails
     */
    private async getUpstreamBranch(repoPath: string): Promise<string> {
        try {
            const upstream = await this.gitCommandService.getTrackingBranch(repoPath);

            // GitCommandService returns null if no tracking branch
            if (upstream === null) {
                throw new Error('No upstream tracking branch configured');
            }

            return upstream;
        } catch (error) {
            Logger.error('FastForwardDetection', `Failed to get upstream branch for ${repoPath}`, error);
            throw error;
        }
    }

    /**
     * Count commits local is ahead of remote
     * @param repoPath Absolute path to repository
     * @param localBranch Local branch name
     * @param remoteBranch Remote branch name
     * @returns Number of commits ahead (0 or greater)
     */
    private async countCommitsAhead(
        repoPath: string,
        localBranch: string,
        remoteBranch: string
    ): Promise<number> {
        try {
            const { ahead } = await this.gitCommandService.compareWithRemote(
                repoPath,
                localBranch,
                remoteBranch
            );

            // Conservative: if count is invalid, return 0
            return ahead >= 0 ? ahead : 0;
        } catch (error) {
            Logger.error(
                'FastForwardDetection',
                `Failed to count commits ahead for ${repoPath}`,
                error
            );
            // Conservative failure: return 0 (safe assumption)
            return 0;
        }
    }

    /**
     * Count commits local is behind remote
     * @param repoPath Absolute path to repository
     * @param localBranch Local branch name
     * @param remoteBranch Remote branch name
     * @returns Number of commits behind (0 or greater)
     */
    private async countCommitsBehind(
        repoPath: string,
        localBranch: string,
        remoteBranch: string
    ): Promise<number> {
        try {
            const { behind } = await this.gitCommandService.compareWithRemote(
                repoPath,
                localBranch,
                remoteBranch
            );

            // Conservative: if count is invalid, return 0
            return behind >= 0 ? behind : 0;
        } catch (error) {
            Logger.error(
                'FastForwardDetection',
                `Failed to count commits behind for ${repoPath}`,
                error
            );
            // Conservative failure: return 0 (safe assumption)
            return 0;
        }
    }

    /**
     * Determine detection status from ahead/behind counts
     * 
     * Status determination logic:
     * - ahead=0, behind>0: can-fast-forward (safe to pull)
     * - ahead=0, behind=0: up-to-date (no action needed)
     * - ahead>0, behind=0: local-ahead (no pull needed)
     * - ahead>0, behind>0: diverged (manual merge required)
     * 
     * @param ahead Number of commits local is ahead
     * @param behind Number of commits local is behind
     * @returns Detection status
     * 
     * @example
     * ```typescript
     * determineStatus(0, 3)  // 'can-fast-forward'
     * determineStatus(0, 0)  // 'up-to-date'
     * determineStatus(2, 0)  // 'local-ahead'
     * determineStatus(2, 3)  // 'diverged'
     * ```
     */
    private determineStatus(
        ahead: number,
        behind: number
    ): FastForwardDetectionResult['status'] {
        // Local and remote are synchronized
        if (ahead === 0 && behind === 0) {
            return 'up-to-date';
        }

        // Local can be fast-forwarded (no local commits, remote has commits)
        if (ahead === 0 && behind > 0) {
            return 'can-fast-forward';
        }

        // Local has commits not on remote (no pull needed)
        if (ahead > 0 && behind === 0) {
            return 'local-ahead';
        }

        // Branches have diverged (both ahead and behind)
        if (ahead > 0 && behind > 0) {
            return 'diverged';
        }

        // Should never reach here, but return error for safety
        return 'error';
    }

    /**
     * Categorize error for error code assignment
     * @param error Error from detection operation
     * @returns Error code
     */
    private categorizeError(error: unknown): FastForwardDetectionResult['errorCode'] {
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

        if (errorMessage.includes('detached head')) {
            return 'detached-head';
        }

        if (errorMessage.includes('no upstream') || errorMessage.includes('no tracking')) {
            return 'no-upstream';
        }

        if (errorMessage.includes('not a git repository')) {
            return 'invalid-repo';
        }

        return 'git-command-failed';
    }
}
