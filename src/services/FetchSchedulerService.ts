/**
 * Fetch Scheduler Service
 * Manages automated periodic fetch operations for repositories
 */

import { GitCommandService } from './GitCommandService';
import { RepositoryConfigService } from './RepositoryConfigService';
import { FetchError } from '../utils/errors';
import { NotificationService } from './NotificationService';
import { Logger } from '../utils/logger';

/**
 * Detailed information about a specific branch's status
 */
export interface BranchStatus {
    name: string;           // Local branch name
    remoteBranch: string;   // Tracking remote branch
    behind: number;         // Commits behind remote
    ahead: number;          // Commits ahead of remote
}

/**
 * Result of a fetch operation
 */
export interface FetchResult {
    repositoryId: string;
    timestamp: number;
    success: boolean;
    error?: string;
    remoteChanges: boolean;      // True if remote has new commits
    commitsBehind?: number;      // Number of commits behind remote
    branchInfo?: BranchStatus[]; // Detailed branch information
}

/**
 * Service for scheduling and managing automated fetch operations
 */
export class FetchSchedulerService {
    private intervals: Map<string, NodeJS.Timeout>;
    private activeOperations: Map<string, Promise<FetchResult>>;
    private configService: RepositoryConfigService;
    private gitService: GitCommandService;
    private notificationService?: NotificationService;

    // Default fetch interval: 5 minutes (300000ms) per spec requirement
    // This will be replaced with per-repository intervals in Phase 3
    private readonly DEFAULT_FETCH_INTERVAL = 300000;

    /**
     * Create a new FetchSchedulerService
     * @param configService Repository configuration service
     * @param gitService Git command service
     * @param notificationService Optional notification service for user alerts
     */
    constructor(
        configService: RepositoryConfigService,
        gitService: GitCommandService,
        notificationService?: NotificationService
    ) {
        this.intervals = new Map();
        this.activeOperations = new Map();
        this.configService = configService;
        this.gitService = gitService;
        this.notificationService = notificationService;
    }

    /**
     * Start automated fetching for all enabled repositories
     * Called on plugin load
     */
    startAll(): void {
        // Get all enabled repositories
        const enabledRepos = this.configService.getEnabledRepositories();

        Logger.debug('FetchScheduler', `Starting automated fetch for ${enabledRepos.length} enabled repositories`);

        // Schedule each enabled repository
        // TODO: In Phase 3, use per-repository fetchInterval instead of default
        for (const repo of enabledRepos) {
            this.scheduleRepository(repo.id, this.DEFAULT_FETCH_INTERVAL);
        }

        Logger.debug('FetchScheduler', 'All repositories scheduled successfully');
    }

    /**
     * Stop all automated fetching
     * Called on plugin unload for cleanup
     */
    stopAll(): void {
        const intervalCount = this.intervals.size;
        const activeCount = this.activeOperations.size;

        Logger.debug('FetchScheduler', `Stopping all automated fetch operations (${intervalCount} intervals, ${activeCount} active operations)`);

        // Clear all intervals to prevent memory leaks
        for (const intervalHandle of this.intervals.values()) {
            clearInterval(intervalHandle);
        }

        // Clear the map
        this.intervals.clear();

        Logger.debug('FetchScheduler', 'All intervals cleared successfully');

        // Note: We don't cancel active operations as they should complete naturally
        // The activeOperations map will clean itself up as operations finish
    }

    /**
     * Schedule fetch for specific repository
     * @param repoId Repository identifier
     * @param interval Fetch interval in milliseconds
     */
    scheduleRepository(repoId: string, interval: number): void {
        // If already scheduled, unschedule first to replace the interval
        if (this.intervals.has(repoId)) {
            Logger.debug('FetchScheduler', `Re-scheduling repository ${repoId} (replacing existing interval)`);
            this.unscheduleRepository(repoId);
        }

        Logger.debug('FetchScheduler', `Scheduling repository ${repoId} with interval ${interval}ms`);

        // Create interval for periodic fetch
        const intervalHandle = setInterval(() => {
            // Execute fetch operation (will be implemented in SCHED-003)
            this.executeFetch(repoId).catch(error => {
                // Log error but don't crash - fetch will retry on next interval
                console.error(`Fetch failed for repository ${repoId}:`, error);
                Logger.error('FetchScheduler', `Interval-triggered fetch failed for ${repoId}`, error);
            });
        }, interval);

        // Store interval handle for cleanup
        this.intervals.set(repoId, intervalHandle);
    }

    /**
     * Unschedule fetch for specific repository
     * Called when repository is disabled or removed
     * @param repoId Repository identifier
     */
    unscheduleRepository(repoId: string): void {
        const intervalHandle = this.intervals.get(repoId);
        if (intervalHandle) {
            Logger.debug('FetchScheduler', `Unscheduling repository ${repoId}`);
            clearInterval(intervalHandle);
            this.intervals.delete(repoId);
        }
    }

    /**
     * Execute fetch operation for a repository with status tracking
     * @param repoId Repository identifier
     * @returns Fetch result with status information
     */
    private async executeFetch(repoId: string): Promise<FetchResult> {
        // Prevent concurrent fetches for same repository
        if (this.activeOperations.has(repoId)) {
            Logger.debug('FetchScheduler', `Fetch already in progress for ${repoId}, returning existing promise`);
            // Return the existing promise instead of starting a new fetch
            return this.activeOperations.get(repoId)!;
        }

        // Get repository configuration
        const repo = this.configService.getRepository(repoId);
        if (!repo) {
            throw new Error(`Repository not found: ${repoId}`);
        }

        Logger.debug('FetchScheduler', `Starting fetch execution for repository: ${repo.name} (${repoId})`);

        // Create fetch operation promise
        const fetchOperation = (async (): Promise<FetchResult> => {
            const startTime = Date.now();
            const timestamp = startTime;
            const result: FetchResult = {
                repositoryId: repoId,
                timestamp,
                success: false,
                remoteChanges: false,
            };

            try {
                // Execute git fetch
                const fetchSuccess = await this.gitService.fetchRepository(repo.path);

                if (!fetchSuccess) {
                    result.error = 'Fetch operation failed';

                    // Trigger error notification
                    if (this.notificationService) {
                        this.notificationService.notifyFetchError(repo.name, result.error);
                    }

                    return result;
                }

                // Check for remote changes after successful fetch
                const changeStatus = await this.gitService.checkRemoteChanges(repo.path);

                // Build branch info if we have tracking branch
                const branchInfo: BranchStatus[] = [];
                if (changeStatus.currentBranch && changeStatus.trackingBranch) {
                    branchInfo.push({
                        name: changeStatus.currentBranch,
                        remoteBranch: changeStatus.trackingBranch,
                        behind: changeStatus.commitsBehind,
                        ahead: changeStatus.commitsAhead,
                    });
                }

                // Populate result with success data
                result.success = true;
                result.remoteChanges = changeStatus.hasChanges;
                result.commitsBehind = changeStatus.commitsBehind;
                result.branchInfo = branchInfo.length > 0 ? branchInfo : undefined;

                const duration = Date.now() - startTime;
                Logger.timing('FetchScheduler', 'Complete fetch operation', duration, `${repo.name} (${changeStatus.hasChanges ? `${changeStatus.commitsBehind} commits behind` : 'up to date'})`);

                // Trigger notification if remote has changes
                if (changeStatus.hasChanges && this.notificationService) {
                    Logger.debug('FetchScheduler', `Remote changes detected for ${repo.name}: ${changeStatus.commitsBehind} commits behind`);
                    this.notificationService.notifyRemoteChanges(
                        repo.name,
                        changeStatus.commitsBehind
                    );
                }

                return result;

            } catch (error) {
                // Handle fetch errors
                result.success = false;

                const duration = Date.now() - startTime;
                Logger.error('FetchScheduler', `Fetch operation failed after ${duration}ms for ${repo.name}`, error);

                if (error instanceof FetchError) {
                    result.error = error.message;
                } else if (error instanceof Error) {
                    result.error = error.message;
                } else {
                    result.error = String(error);
                }

                // Trigger error notification
                if (this.notificationService && result.error) {
                    this.notificationService.notifyFetchError(repo.name, result.error);
                }

                return result;
            }
        })();

        // Track active operation
        this.activeOperations.set(repoId, fetchOperation);
        Logger.debug('FetchScheduler', `Added ${repoId} to active operations (${this.activeOperations.size} total active)`);

        try {
            // Wait for completion
            const result = await fetchOperation;

            // Record result in repository configuration
            Logger.debug('FetchScheduler', `Recording fetch result for ${repo.name}: ${result.success ? 'success' : 'failed'}`);
            await this.configService.recordFetchResult(result);

            return result;
        } finally {
            // Always remove from active operations when done
            this.activeOperations.delete(repoId);
            Logger.debug('FetchScheduler', `Removed ${repoId} from active operations (${this.activeOperations.size} remaining)`);
        }
    }

    /**
     * Manually trigger immediate fetch for specific repository
     * Used for manual refresh button
     * @param repoId Repository identifier
     * @returns Fetch result with status and remote changes
     */
    async fetchRepositoryNow(repoId: string): Promise<FetchResult> {
        // Check if repository exists
        const repo = this.configService.getRepository(repoId);
        if (!repo) {
            throw new Error(`Repository not found: ${repoId}`);
        }

        // If fetch already in progress, return existing promise
        if (this.isFetching(repoId)) {
            return this.activeOperations.get(repoId)!;
        }

        // Execute fetch immediately
        return this.executeFetch(repoId);
    }

    /**
     * Manually trigger immediate fetch for all enabled repositories
     * @returns Array of fetch results
     */
    async fetchAllNow(): Promise<FetchResult[]> {
        // Get all enabled repositories
        const enabledRepos = this.configService.getEnabledRepositories();

        Logger.debug('FetchScheduler', `Starting batch fetch for ${enabledRepos.length} enabled repositories`);
        const batchStartTime = Date.now();

        // Execute fetches sequentially to avoid system overload
        const results: FetchResult[] = [];

        for (const repo of enabledRepos) {
            try {
                const result = await this.executeFetch(repo.id);
                results.push(result);
            } catch (error) {
                Logger.error('FetchScheduler', `Batch fetch failed for ${repo.name}`, error);
                // If fetch fails, create error result and continue with other repos
                results.push({
                    repositoryId: repo.id,
                    timestamp: Date.now(),
                    success: false,
                    remoteChanges: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        const batchDuration = Date.now() - batchStartTime;
        const successCount = results.filter(r => r.success).length;
        Logger.timing('FetchScheduler', 'Batch fetch operation', batchDuration, `${successCount}/${enabledRepos.length} successful`);

        return results;
    }

    /**
     * Check if fetch operation is currently in progress for repository
     * @param repoId Repository identifier
     * @returns true if fetch is running
     */
    isFetching(repoId: string): boolean {
        return this.activeOperations.has(repoId);
    }
}
