import { Logger } from '../utils/logger';
import type { MultiGitSettings } from '../settings/data';
import type { FastForwardDetectionService } from './FastForwardDetectionService';
import type { GitCommandService } from './GitCommandService';
import type { NotificationService } from './NotificationService';
import type { RepositoryConfigService } from './RepositoryConfigService';

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
}
