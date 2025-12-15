import { Notice } from 'obsidian';
import { Logger } from '../utils/logger';
import type { MultiGitSettings } from '../settings/data';
import type { FastForwardDetectionService } from './FastForwardDetectionService';
import type { GitCommandService } from './GitCommandService';
import type { NotificationService } from './NotificationService';
import type { RepositoryConfigService } from './RepositoryConfigService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/** Component name for logging */
const COMPONENT = 'AutoPullService';

/**
 * Pull operation error codes for categorizing failure types
 */
export enum PullErrorCode {
    NETWORK_ERROR = 'NETWORK_ERROR',
    AUTH_ERROR = 'AUTH_ERROR',
    LOCK_ERROR = 'LOCK_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Reasons for skipping an automatic pull operation
 */
export enum PullSkipReason {
    DISABLED_GLOBAL = 'DISABLED_GLOBAL',
    DISABLED_REPO = 'DISABLED_REPO',
    UNCOMMITTED_CHANGES = 'UNCOMMITTED_CHANGES',
    NOT_FAST_FORWARD = 'NOT_FAST_FORWARD',
    DIVERGED_BRANCHES = 'DIVERGED_BRANCHES',
    NO_TRACKING_BRANCH = 'NO_TRACKING_BRANCH',
    DETACHED_HEAD = 'DETACHED_HEAD',
    CONCURRENT_OPERATION = 'CONCURRENT_OPERATION'
}

/**
 * Complete state of a pull operation including retry information
 */
export interface PullOperationState {
    /** Repository identifier from configuration */
    repositoryId: string;
    /** Human-readable repository name */
    repositoryName: string;
    /** Filesystem path to repository */
    repositoryPath: string;
    /** When the pull operation started */
    startTime: Date;
    /** When the pull operation completed (null if still in progress) */
    endTime: Date | null;
    /** Current status of the pull operation */
    status: 'pending' | 'success' | 'failed' | 'skipped';
    /** Type of pull operation (always fast-forward-only for safety) */
    pullType: 'fast-forward-only';
    /** Git commit hash before pull */
    commitsBefore: string;
    /** Git commit hash after pull (null if not completed) */
    commitsAfter: string | null;
    /** Number of commits pulled (0 if skipped or failed) */
    commitsPulled: number;
    /** Error message if operation failed */
    errorMessage: string | null;
    /** Categorized error code if operation failed */
    errorCode: PullErrorCode | null;
    /** Reason if operation was skipped */
    skipReason: PullSkipReason | null;
    /** Number of retry attempts (0-3) */
    retryCount: number;
    /** When the last retry was attempted */
    lastRetryTime: Date | null;
    /** When the next retry is scheduled */
    nextRetryTime: Date | null;
}

/**
 * Simplified history entry for display in status panel
 */
export interface PullHistoryEntry {
    /** When the pull operation occurred */
    timestamp: Date;
    /** Repository name for display */
    repositoryName: string;
    /** Operation result */
    result: 'success' | 'failed' | 'skipped';
    /** Number of commits pulled (only for success) */
    commitsPulled?: number;
    /** Error message (only for failed) */
    errorMessage?: string;
    /** Skip reason (only for skipped) */
    skipReason?: string;
}

/**
 * Service for automatic git pull operations with comprehensive safety checks.
 * 
 * This service orchestrates automatic fast-forward-only pulls after fetch operations
 * detect remote changes. It implements multiple safety layers to ensure data integrity:
 * 
 * 1. Configuration checks (global and per-repository enable/disable)
 * 2. Working directory safety (no uncommitted changes)
 * 3. Fast-forward detection (using FR-1 service)
 * 4. Retry logic with exponential backoff for transient failures
 * 
 * All pull operations use `git pull --ff-only` to guarantee safety.
 */
export class AutoPullService {
    private pullHistory = new Map<string, PullHistoryEntry[]>();

    constructor(
        private _fastForwardDetectionService: FastForwardDetectionService,
        private gitCommandService: GitCommandService,
        private _notificationService: NotificationService,
        private _repositoryConfigService: RepositoryConfigService,
        private settings: MultiGitSettings
    ) {
        Logger.debug(COMPONENT, 'AutoPullService initialized');
        // TODO: _fastForwardDetectionService will be used in CORE-001 (executePull)
        // TODO: _notificationService will be used in CORE-005 (notification methods)
        // TODO: _repositoryConfigService will be used for repository lookups
        // TODO: addToHistory will be used in CORE-004 (attemptAutoPull)
        // TODO: performSafetyChecks will be used in CORE-004 (attemptAutoPull)
    }

    /**
     * Check if automatic pull is enabled for a repository.
     * 
     * Checks both global setting and per-repository override.
     * Per-repository setting takes precedence over global setting.
     * 
     * @param repositoryId Repository ID from configuration
     * @returns true if auto-pull is enabled for this repository
     */
    isAutoPullEnabled(repositoryId: string): boolean {
        // Check global setting first
        if (!this.settings.autoPullEnabled) {
            Logger.debug(COMPONENT, `Auto-pull disabled globally for repository ${repositoryId}`);
            return false;
        }

        // Check per-repository override
        const perRepoSetting = this.settings.autoPullPerRepository?.[repositoryId];
        if (perRepoSetting !== undefined) {
            Logger.debug(COMPONENT, `Auto-pull ${perRepoSetting ? 'enabled' : 'disabled'} for repository ${repositoryId} (per-repository override)`);
            return perRepoSetting;
        }

        // Default to global setting
        Logger.debug(COMPONENT, `Auto-pull enabled for repository ${repositoryId} (global setting)`);
        return true;
    }

    /**
     * Get pull history for a repository.
     * 
     * Returns up to the last 10 pull operations, most recent first.
     * Returns empty array if no history exists for the repository.
     * 
     * @param repositoryId Repository ID from configuration
     * @returns Array of pull history entries, most recent first
     */
    getPullHistory(repositoryId: string): PullHistoryEntry[] {
        const history = this.pullHistory.get(repositoryId);
        if (!history) {
            return [];
        }
        // Return copy to prevent external modification
        return [...history];
    }

    /**
     * Add an entry to the pull history.
     * 
     * Maintains a FIFO queue of up to 10 entries per repository.
     * Oldest entries are removed when the limit is exceeded.
     * 
     * @param repositoryId Repository ID from configuration
     * @param entry History entry to add
     */
    private addToHistory(repositoryId: string, entry: PullHistoryEntry): void {
        let history = this.pullHistory.get(repositoryId);
        if (!history) {
            history = [];
            this.pullHistory.set(repositoryId, history);
        }

        // Add new entry at the beginning (most recent first)
        history.unshift(entry);

        // Keep only last 10 entries
        if (history.length > 10) {
            history.splice(10);
        }

        Logger.debug(COMPONENT, `Added pull history entry for repository ${repositoryId}: ${entry.result}`);
    }

    /**
     * Check if the working directory is clean (no uncommitted changes).
     * 
     * Uses GitCommandService to check repository status.
     * A clean working directory is required before pull operations.
     * 
     * @param repoPath Filesystem path to repository
     * @param repositoryId Repository ID for status check
     * @param repositoryName Repository name for status check
     * @returns true if working directory has no uncommitted changes
     */
    private async isWorkingDirectoryClean(
        repoPath: string,
        repositoryId: string,
        repositoryName: string
    ): Promise<boolean> {
        try {
            const startTime = Date.now();

            // Use GitCommandService.getRepositoryStatus to check for uncommitted changes
            const status = await this.gitCommandService.getRepositoryStatus(
                repoPath,
                repositoryId,
                repositoryName
            );

            const duration = Date.now() - startTime;
            Logger.timing(COMPONENT, 'Working directory check', duration, repoPath);

            const isClean = !status.hasUncommittedChanges;
            Logger.debug(COMPONENT, `Working directory ${isClean ? 'clean' : 'dirty'}: ${repoPath}`);

            return isClean;
        } catch (error) {
            Logger.error(COMPONENT, `Failed to check working directory status: ${repoPath}`, error);
            // Conservative: if we can't check status, assume not clean
            return false;
        }
    }

    /**
     * Perform comprehensive safety checks before pull operation.
     * 
     * Implements multiple validation layers:
     * 1. Working directory clean (no uncommitted changes)
     * 2. No concurrent git operations (future enhancement)
     * 3. Repository not locked (future enhancement)
     * 
     * @param repoPath Filesystem path to repository
     * @param repositoryId Repository ID for logging
     * @param repositoryName Repository name for logging
     * @returns Object with safe boolean and optional skipReason
     */
    private async performSafetyChecks(
        repoPath: string,
        repositoryId: string,
        repositoryName: string
    ): Promise<{ safe: boolean; skipReason?: PullSkipReason }> {
        const startTime = Date.now();
        Logger.debug(COMPONENT, `Performing safety checks for repository ${repositoryId}`);

        // Check 1: Working directory must be clean
        const isClean = await this.isWorkingDirectoryClean(repoPath, repositoryId, repositoryName);
        if (!isClean) {
            Logger.debug(COMPONENT, `Safety check failed: uncommitted changes in ${repositoryId}`);
            return { safe: false, skipReason: PullSkipReason.UNCOMMITTED_CHANGES };
        }

        // Check 2: No concurrent git operations
        // Note: Git's lock file mechanism (.git/index.lock) will naturally prevent
        // concurrent operations, so we rely on that for now. Future enhancement
        // could add explicit checking of lock files.

        // Check 3: Repository not locked
        // Similar to above, relying on git's internal locking mechanism

        const duration = Date.now() - startTime;
        Logger.timing(COMPONENT, 'Safety checks', duration, `repository ${repositoryId}`);
        Logger.debug(COMPONENT, `Safety checks passed for repository ${repositoryId}`);

        return { safe: true };
    }

    /**
     * Execute git pull operation with fast-forward-only flag.
     * 
     * Captures commit hash before and after pull to verify operation success
     * and calculate number of commits pulled. Uses 5-second timeout per
     * specification requirements.
     * 
     * @param repoPath Filesystem path to repository
     * @param repositoryId Repository ID for logging
     * @returns Pull execution result with success status and details
     */
    private async executePull(
        repoPath: string,
        repositoryId: string
    ): Promise<{
        success: boolean;
        commitsBefore: string;
        commitsAfter: string | null;
        commitsPulled: number;
        errorCode?: PullErrorCode;
        errorMessage?: string;
    }> {
        const startTime = Date.now();
        Logger.debug(COMPONENT, `Executing pull for repository ${repositoryId}`);

        try {
            // Capture commit hash before pull
            const commitsBefore = await this.getCurrentCommitHash(repoPath);
            Logger.debug(COMPONENT, `Commit before pull: ${commitsBefore} for ${repositoryId}`);

            // Execute git pull --ff-only with 5-second timeout
            await execPromise('git pull --ff-only', {
                cwd: repoPath,
                timeout: 5000, // 5-second timeout per specification
            });

            // Capture commit hash after pull
            const commitsAfter = await this.getCurrentCommitHash(repoPath);
            Logger.debug(COMPONENT, `Commit after pull: ${commitsAfter} for ${repositoryId}`);

            // Calculate commits pulled
            const commitsPulled = await this.calculateCommitsPulled(
                repoPath,
                commitsBefore,
                commitsAfter
            );

            const duration = Date.now() - startTime;
            Logger.timing(COMPONENT, 'Pull execution', duration, `repository ${repositoryId}`);
            Logger.debug(COMPONENT, `Pull successful: ${commitsPulled} commits pulled for ${repositoryId}`);

            return {
                success: true,
                commitsBefore,
                commitsAfter,
                commitsPulled,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            Logger.error(COMPONENT, `Pull failed after ${duration}ms for ${repositoryId}`, error);

            // Capture current commit hash for error case
            const commitsBefore = await this.getCurrentCommitHashSafe(repoPath);

            // Categorize error
            const { errorCode, errorMessage } = this.categorizePullError(error);

            return {
                success: false,
                commitsBefore,
                commitsAfter: null,
                commitsPulled: 0,
                errorCode,
                errorMessage,
            };
        }
    }

    /**
     * Get current commit hash (HEAD)
     * @param repoPath Filesystem path to repository
     * @returns Commit hash
     */
    private async getCurrentCommitHash(repoPath: string): Promise<string> {
        try {
            const { stdout } = await execPromise('git rev-parse HEAD', {
                cwd: repoPath,
                timeout: 5000,
            });
            return stdout.trim();
        } catch (error) {
            throw new Error(`Failed to get commit hash: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get current commit hash safely (returns 'unknown' on error)
     * @param repoPath Filesystem path to repository
     * @returns Commit hash or 'unknown'
     */
    private async getCurrentCommitHashSafe(repoPath: string): Promise<string> {
        try {
            return await this.getCurrentCommitHash(repoPath);
        } catch (error) {
            Logger.debug(COMPONENT, `Could not get commit hash for ${repoPath}`, error);
            return 'unknown';
        }
    }

    /**
     * Calculate number of commits pulled by comparing hashes
     * @param repoPath Filesystem path to repository
     * @param beforeHash Hash before pull
     * @param afterHash Hash after pull
     * @returns Number of commits pulled
     */
    private async calculateCommitsPulled(
        repoPath: string,
        beforeHash: string,
        afterHash: string
    ): Promise<number> {
        // If hashes are the same, no commits were pulled
        if (beforeHash === afterHash) {
            return 0;
        }

        try {
            // Count commits between before and after
            const { stdout } = await execPromise(
                `git rev-list --count ${beforeHash}..${afterHash}`,
                { cwd: repoPath, timeout: 5000 }
            );
            const count = parseInt(stdout.trim(), 10);
            return isNaN(count) ? 0 : count;
        } catch (error) {
            Logger.debug(COMPONENT, `Could not calculate commits pulled for ${repoPath}`, error);
            return 0;
        }
    }

    /**
     * Categorize pull error into standard error codes
     * @param error Error from git pull operation
     * @returns Categorized error code and user-friendly message
     */
    private categorizePullError(error: unknown): {
        errorCode: PullErrorCode;
        errorMessage: string;
    } {
        const errorStr = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

        // Timeout errors
        if (errorStr.includes('timed out') || errorStr.includes('timeout')) {
            return {
                errorCode: PullErrorCode.TIMEOUT_ERROR,
                errorMessage: 'Pull operation timed out after 5 seconds',
            };
        }

        // Authentication errors
        if (
            errorStr.includes('authentication failed') ||
            errorStr.includes('could not read username') ||
            errorStr.includes('could not read password') ||
            errorStr.includes('permission denied (publickey)') ||
            errorStr.includes('fatal: authentication')
        ) {
            return {
                errorCode: PullErrorCode.AUTH_ERROR,
                errorMessage: 'Authentication failed. Please check your git credentials.',
            };
        }

        // Network errors
        if (
            errorStr.includes('could not resolve host') ||
            errorStr.includes('failed to connect') ||
            errorStr.includes('network is unreachable') ||
            errorStr.includes('connection timed out') ||
            errorStr.includes('temporary failure in name resolution')
        ) {
            return {
                errorCode: PullErrorCode.NETWORK_ERROR,
                errorMessage: 'Network error: Unable to reach remote repository.',
            };
        }

        // Lock errors
        if (
            errorStr.includes('index.lock') ||
            errorStr.includes('unable to create') ||
            errorStr.includes('another git process')
        ) {
            return {
                errorCode: PullErrorCode.LOCK_ERROR,
                errorMessage: 'Repository is locked by another git operation.',
            };
        }

        // Unknown errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            errorCode: PullErrorCode.UNKNOWN_ERROR,
            errorMessage: `Pull failed: ${errorMessage}`,
        };
    }

    /**
     * Calculate retry delay based on retry count (exponential backoff)
     * 
     * Retry schedule:
     * - Retry 0: 0ms (immediate)
     * - Retry 1: 10000ms (10 seconds)
     * - Retry 2: 30000ms (30 seconds)
     * - Retry 3+: Not called (max retries exhausted)
     * 
     * @param retryCount Current retry count (0-2)
     * @returns Delay in milliseconds
     */
    private calculateRetryDelay(retryCount: number): number {
        const delays = [0, 10000, 30000];
        return delays[retryCount] || 0;
    }

    /**
     * Check if an error is retryable
     * 
     * AUTH_ERROR is never retryable (fail fast).
     * NETWORK_ERROR and LOCK_ERROR are retryable.
     * 
     * @param errorCode Error code from pull operation
     * @returns true if error should trigger retry
     */
    private isRetryableError(errorCode: PullErrorCode): boolean {
        return errorCode === PullErrorCode.NETWORK_ERROR || errorCode === PullErrorCode.LOCK_ERROR;
    }

    /**
     * Send notification for successful pull operation
     * 
     * Respects notification verbosity setting.
     * Success notifications are subtle and transient.
     * 
     * @param repositoryName Repository name for display
     * @param commitsPulled Number of commits pulled
     */
    private notifyPullSuccess(repositoryName: string, commitsPulled: number): void {
        const verbosity = this.settings.autoPullNotificationVerbosity;

        // Silent mode: no notifications
        if (verbosity === 'silent') {
            return;
        }

        // All mode: show success notification
        if (verbosity === 'all') {
            const message = commitsPulled === 1
                ? `📥 Pulled 1 commit for ${repositoryName}`
                : `📥 Pulled ${commitsPulled} commits for ${repositoryName}`;

            new Notice(message, 5000); // 5 second duration for success
            Logger.debug(COMPONENT, `Success notification sent for ${repositoryName}`);
        }

        // failures-only mode: don't show success
    }

    /**
     * Send notification for failed pull operation
     * 
     * Respects notification verbosity setting (except silent).
     * Failure notifications are prominent and persistent.
     * 
     * @param repositoryName Repository name for display
     * @param errorMessage Error message to display
     */
    private notifyPullFailed(repositoryName: string, errorMessage: string): void {
        const verbosity = this.settings.autoPullNotificationVerbosity;

        // Silent mode: no notifications
        if (verbosity === 'silent') {
            return;
        }

        // Show failure notification for 'all' and 'failures-only' modes
        const message = `⚠️ Failed to pull ${repositoryName}: ${errorMessage}`;
        new Notice(message, 10000); // 10 second duration for errors
        Logger.debug(COMPONENT, `Failure notification sent for ${repositoryName}`);
    }

    /**
     * Send notification for manual intervention required
     * 
     * Always sent regardless of verbosity (manual intervention is critical).
     * Explains why auto-pull couldn't proceed and what user should do.
     * 
     * @param repositoryName Repository name for display
     * @param reason Reason manual intervention is needed
     */
    private notifyManualInterventionRequired(repositoryName: string, reason: string): void {
        const message = `⚠️ ${repositoryName}: ${reason}. Please resolve manually.`;
        new Notice(message, 8000); // 8 second duration for warnings
        Logger.debug(COMPONENT, `Manual intervention notification sent for ${repositoryName}`);
    }

    /**
     * Attempt automatic pull for a repository after fetch detects changes.
     * 
     * Implements four layers of safety checks:
     * 1. Configuration: Check auto-pull is enabled globally and for this repo
     * 2. Safety: Verify working directory is clean and no concurrent operations
     * 3. Fast-forward: Confirm pull will be a clean fast-forward (using FR-1)
     * 4. Execution: Perform git pull --ff-only with error handling and retry
     * 
     * @param repositoryId Repository ID from configuration
     * @returns Complete pull operation state including status and details
     */
    async attemptAutoPull(repositoryId: string): Promise<PullOperationState> {
        const startTime = new Date();
        Logger.debug(COMPONENT, `Attempting auto-pull for repository ${repositoryId}`);

        // Get repository configuration
        const repoConfig = this._repositoryConfigService.getRepository(repositoryId);
        if (!repoConfig) {
            throw new Error(`Repository not found: ${repositoryId}`);
        }

        const { name: repositoryName, path: repositoryPath } = repoConfig;

        // Get current commit hash for initial state
        const commitsBefore = await this.getCurrentCommitHashSafe(repositoryPath);

        // Create initial operation state
        const operation: PullOperationState = {
            repositoryId,
            repositoryName,
            repositoryPath,
            startTime,
            endTime: null,
            status: 'pending',
            pullType: 'fast-forward-only',
            commitsBefore,
            commitsAfter: null,
            commitsPulled: 0,
            errorMessage: null,
            errorCode: null,
            skipReason: null,
            retryCount: 0,
            lastRetryTime: null,
            nextRetryTime: null,
        };

        // Layer 1: Check auto-pull enabled
        if (!this.isAutoPullEnabled(repositoryId)) {
            const skipReason = this.settings.autoPullEnabled
                ? PullSkipReason.DISABLED_REPO
                : PullSkipReason.DISABLED_GLOBAL;

            Logger.debug(COMPONENT, `Auto-pull disabled for ${repositoryId}: ${skipReason}`);

            operation.status = 'skipped';
            operation.skipReason = skipReason;
            operation.endTime = new Date();

            // Add to history
            this.addToHistory(repositoryId, {
                timestamp: operation.endTime,
                repositoryName,
                result: 'skipped',
                skipReason: skipReason,
            });

            return operation;
        }

        // Layer 2: Perform safety checks
        const safetyCheck = await this.performSafetyChecks(
            repositoryPath,
            repositoryId,
            repositoryName
        );

        if (!safetyCheck.safe) {
            Logger.debug(COMPONENT, `Safety check failed for ${repositoryId}: ${safetyCheck.skipReason}`);

            operation.status = 'skipped';
            operation.skipReason = safetyCheck.skipReason || PullSkipReason.UNCOMMITTED_CHANGES;
            operation.endTime = new Date();

            // Add to history
            this.addToHistory(repositoryId, {
                timestamp: operation.endTime,
                repositoryName,
                result: 'skipped',
                skipReason: operation.skipReason,
            });

            // Notify user manual intervention needed
            this.notifyManualInterventionRequired(
                repositoryName,
                'Uncommitted changes detected'
            );

            return operation;
        }

        // Layer 3: Check fast-forward detection
        const ffResult = await this._fastForwardDetectionService.detectFastForward(repositoryPath);

        if (!this._fastForwardDetectionService.canSafelyFastForward(ffResult)) {
            let skipReason: PullSkipReason;
            let notificationReason: string;

            if (ffResult.status === 'diverged') {
                skipReason = PullSkipReason.DIVERGED_BRANCHES;
                notificationReason = 'Branches have diverged, manual merge required';
            } else if (ffResult.status === 'error' && ffResult.errorCode === 'detached-head') {
                skipReason = PullSkipReason.DETACHED_HEAD;
                notificationReason = 'Detached HEAD state';
            } else if (ffResult.status === 'error' && ffResult.errorCode === 'no-upstream') {
                skipReason = PullSkipReason.NO_TRACKING_BRANCH;
                notificationReason = 'No tracking branch configured';
            } else if (ffResult.status === 'up-to-date') {
                // Already up to date, no need to pull
                skipReason = PullSkipReason.NOT_FAST_FORWARD;
                notificationReason = 'Already up to date';
            } else if (ffResult.status === 'local-ahead') {
                skipReason = PullSkipReason.NOT_FAST_FORWARD;
                notificationReason = 'Local has unpushed commits';
            } else {
                skipReason = PullSkipReason.NOT_FAST_FORWARD;
                notificationReason = 'Cannot fast-forward';
            }

            Logger.debug(COMPONENT, `Fast-forward check failed for ${repositoryId}: ${skipReason}`);

            operation.status = 'skipped';
            operation.skipReason = skipReason;
            operation.endTime = new Date();

            // Add to history
            this.addToHistory(repositoryId, {
                timestamp: operation.endTime,
                repositoryName,
                result: 'skipped',
                skipReason: skipReason,
            });

            // Notify user manual intervention needed
            this.notifyManualInterventionRequired(repositoryName, notificationReason);

            return operation;
        }

        // Layer 4: Execute pull with retry logic
        let lastError: { errorCode: PullErrorCode; errorMessage: string } | null = null;

        for (let retry = 0; retry <= 3; retry++) {
            // Calculate and apply retry delay if not first attempt
            if (retry > 0) {
                const delay = this.calculateRetryDelay(retry - 1);
                if (delay > 0) {
                    Logger.debug(COMPONENT, `Waiting ${delay}ms before retry ${retry} for ${repositoryId}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                operation.retryCount = retry;
                operation.lastRetryTime = new Date();
            }

            // Execute pull
            const pullResult = await this.executePull(repositoryPath, repositoryId);

            if (pullResult.success) {
                // Success!
                operation.status = 'success';
                operation.commitsAfter = pullResult.commitsAfter;
                operation.commitsPulled = pullResult.commitsPulled;
                operation.endTime = new Date();

                Logger.debug(COMPONENT, `Pull successful for ${repositoryId} after ${retry} retries`);

                // Add to history
                this.addToHistory(repositoryId, {
                    timestamp: operation.endTime,
                    repositoryName,
                    result: 'success',
                    commitsPulled: operation.commitsPulled,
                });

                // Notify user of success
                this.notifyPullSuccess(repositoryName, operation.commitsPulled);

                return operation;
            }

            // Pull failed - check if retryable
            lastError = {
                errorCode: pullResult.errorCode!,
                errorMessage: pullResult.errorMessage!,
            };

            // If error is not retryable, fail immediately
            if (!this.isRetryableError(pullResult.errorCode!)) {
                Logger.debug(COMPONENT, `Non-retryable error for ${repositoryId}: ${pullResult.errorCode}`);
                break;
            }

            // If we've exhausted retries, fail
            if (retry >= 3) {
                Logger.debug(COMPONENT, `Max retries exhausted for ${repositoryId}`);
                break;
            }

            // Otherwise, continue to next retry
            Logger.debug(COMPONENT, `Retryable error for ${repositoryId}, will retry: ${pullResult.errorCode}`);
        }

        // All retries exhausted or non-retryable error
        operation.status = 'failed';
        operation.errorCode = lastError!.errorCode;
        operation.errorMessage = lastError!.errorMessage;
        operation.endTime = new Date();

        Logger.error(COMPONENT, `Pull failed for ${repositoryId} after all retries`, lastError);

        // Add to history
        this.addToHistory(repositoryId, {
            timestamp: operation.endTime,
            repositoryName,
            result: 'failed',
            errorMessage: operation.errorMessage,
        });

        // Notify user of failure
        this.notifyPullFailed(repositoryName, operation.errorMessage);

        return operation;
    }

    /**
     * Manually trigger pull for a repository (for status panel "Pull" button).
     * 
     * Bypasses auto-pull enabled check but still performs all safety checks.
     * Does NOT use retry logic - provides immediate feedback to user.
     * 
     * @param repositoryId Repository ID from configuration
     * @returns Complete pull operation state
     */
    async manualPull(repositoryId: string): Promise<PullOperationState> {
        const startTime = new Date();
        Logger.debug(COMPONENT, `Manual pull triggered for repository ${repositoryId}`);

        // Get repository configuration
        const repoConfig = this._repositoryConfigService.getRepository(repositoryId);
        if (!repoConfig) {
            throw new Error(`Repository not found: ${repositoryId}`);
        }

        const { name: repositoryName, path: repositoryPath } = repoConfig;

        // Get current commit hash for initial state
        const commitsBefore = await this.getCurrentCommitHashSafe(repositoryPath);

        // Create initial operation state
        const operation: PullOperationState = {
            repositoryId,
            repositoryName,
            repositoryPath,
            startTime,
            endTime: null,
            status: 'pending',
            pullType: 'fast-forward-only',
            commitsBefore,
            commitsAfter: null,
            commitsPulled: 0,
            errorMessage: null,
            errorCode: null,
            skipReason: null,
            retryCount: 0,
            lastRetryTime: null,
            nextRetryTime: null,
        };

        // Perform safety checks (skip auto-pull enabled check for manual)
        const safetyCheck = await this.performSafetyChecks(
            repositoryPath,
            repositoryId,
            repositoryName
        );

        if (!safetyCheck.safe) {
            Logger.debug(COMPONENT, `Manual pull safety check failed for ${repositoryId}: ${safetyCheck.skipReason}`);

            operation.status = 'skipped';
            operation.skipReason = safetyCheck.skipReason || PullSkipReason.UNCOMMITTED_CHANGES;
            operation.endTime = new Date();

            // Add to history
            this.addToHistory(repositoryId, {
                timestamp: operation.endTime,
                repositoryName,
                result: 'skipped',
                skipReason: operation.skipReason,
            });

            return operation;
        }

        // Check fast-forward detection
        const ffResult = await this._fastForwardDetectionService.detectFastForward(repositoryPath);

        if (!this._fastForwardDetectionService.canSafelyFastForward(ffResult)) {
            let skipReason: PullSkipReason;

            if (ffResult.status === 'diverged') {
                skipReason = PullSkipReason.DIVERGED_BRANCHES;
            } else if (ffResult.status === 'error' && ffResult.errorCode === 'detached-head') {
                skipReason = PullSkipReason.DETACHED_HEAD;
            } else if (ffResult.status === 'error' && ffResult.errorCode === 'no-upstream') {
                skipReason = PullSkipReason.NO_TRACKING_BRANCH;
            } else {
                skipReason = PullSkipReason.NOT_FAST_FORWARD;
            }

            Logger.debug(COMPONENT, `Manual pull fast-forward check failed for ${repositoryId}: ${skipReason}`);

            operation.status = 'skipped';
            operation.skipReason = skipReason;
            operation.endTime = new Date();

            // Add to history
            this.addToHistory(repositoryId, {
                timestamp: operation.endTime,
                repositoryName,
                result: 'skipped',
                skipReason: skipReason,
            });

            return operation;
        }

        // Execute pull (no retry for manual - immediate feedback)
        const pullResult = await this.executePull(repositoryPath, repositoryId);

        if (pullResult.success) {
            operation.status = 'success';
            operation.commitsAfter = pullResult.commitsAfter;
            operation.commitsPulled = pullResult.commitsPulled;
            operation.endTime = new Date();

            Logger.debug(COMPONENT, `Manual pull successful for ${repositoryId}`);

            // Add to history
            this.addToHistory(repositoryId, {
                timestamp: operation.endTime,
                repositoryName,
                result: 'success',
                commitsPulled: operation.commitsPulled,
            });

            // Notify user of success
            this.notifyPullSuccess(repositoryName, operation.commitsPulled);

            return operation;
        }

        // Pull failed
        operation.status = 'failed';
        operation.errorCode = pullResult.errorCode!;
        operation.errorMessage = pullResult.errorMessage!;
        operation.endTime = new Date();

        Logger.error(COMPONENT, `Manual pull failed for ${repositoryId}`, pullResult);

        // Add to history
        this.addToHistory(repositoryId, {
            timestamp: operation.endTime,
            repositoryName,
            result: 'failed',
            errorMessage: operation.errorMessage,
        });

        // Notify user of failure
        this.notifyPullFailed(repositoryName, operation.errorMessage);

        return operation;
    }
}
