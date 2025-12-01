/**
 * Tests for FetchSchedulerService
 */

import { FetchSchedulerService, FetchResult, BranchStatus } from '../../src/services/FetchSchedulerService';
import { GitCommandService, RemoteChangeStatus } from '../../src/services/GitCommandService';
import { RepositoryConfigService } from '../../src/services/RepositoryConfigService';
import { RepositoryConfig } from '../../src/settings/data';
import { FetchError, FetchErrorCode } from '../../src/utils/errors';

// Mock the services
jest.mock('../../src/services/GitCommandService');
jest.mock('../../src/services/RepositoryConfigService');

describe('FetchSchedulerService', () => {
    let scheduler: FetchSchedulerService;
    let mockGitService: jest.Mocked<GitCommandService>;
    let mockConfigService: jest.Mocked<RepositoryConfigService>;

    // Sample repository configs
    const repo1: RepositoryConfig = {
        id: 'repo-1',
        path: '/test/repo1',
        name: 'Test Repo 1',
        enabled: true,
        createdAt: Date.now(),
    };

    const repo2: RepositoryConfig = {
        id: 'repo-2',
        path: '/test/repo2',
        name: 'Test Repo 2',
        enabled: true,
        createdAt: Date.now(),
    };

    const repo3: RepositoryConfig = {
        id: 'repo-3',
        path: '/test/repo3',
        name: 'Test Repo 3',
        enabled: false,
        createdAt: Date.now(),
    };

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Create mock services
        mockGitService = new GitCommandService() as jest.Mocked<GitCommandService>;
        mockConfigService = new RepositoryConfigService(null as any) as jest.Mocked<RepositoryConfigService>;

        // Setup default mock implementations
        mockConfigService.getRepository.mockImplementation((id: string) => {
            if (id === 'repo-1') return repo1;
            if (id === 'repo-2') return repo2;
            if (id === 'repo-3') return repo3;
            return null;
        });

        mockConfigService.getEnabledRepositories.mockReturnValue([repo1, repo2]);

        mockGitService.fetchRepository.mockResolvedValue(true);
        mockGitService.checkRemoteChanges.mockResolvedValue({
            hasChanges: false,
            commitsBehind: 0,
            commitsAhead: 0,
            trackingBranch: 'origin/main',
            currentBranch: 'main',
        });

        // Create scheduler instance
        scheduler = new FetchSchedulerService(mockConfigService, mockGitService);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('constructor', () => {
        it('should initialize with empty maps', () => {
            expect(scheduler.isFetching('any-repo')).toBe(false);
        });
    });

    describe('scheduleRepository', () => {
        it('should schedule a repository with given interval', () => {
            scheduler.scheduleRepository('repo-1', 60000);

            // Fast-forward time
            jest.advanceTimersByTime(60000);

            // Should have called fetch
            expect(mockGitService.fetchRepository).toHaveBeenCalledWith('/test/repo1');
        });

        it('should replace existing interval when rescheduling', () => {
            // Schedule with 60 second interval
            scheduler.scheduleRepository('repo-1', 60000);

            // Reschedule with 30 second interval (should clear old interval)
            scheduler.scheduleRepository('repo-1', 30000);

            // Verify the interval was replaced by checking execution after 30s
            jest.advanceTimersByTime(30000);

            // Should have been called once after the new 30s interval
            expect(mockGitService.fetchRepository).toHaveBeenCalled();
        });

        it('should execute fetch on interval timer', () => {
            scheduler.scheduleRepository('repo-1', 60000);

            // Should not have been called yet
            expect(mockGitService.fetchRepository).not.toHaveBeenCalled();

            // Advance by interval time
            jest.advanceTimersByTime(60000);

            // Should have been called once
            expect(mockGitService.fetchRepository).toHaveBeenCalledTimes(1);
        });
    });

    describe('unscheduleRepository', () => {
        it('should stop scheduled fetches', () => {
            scheduler.scheduleRepository('repo-1', 60000);
            scheduler.unscheduleRepository('repo-1');

            // Advance time - should not trigger fetch
            jest.advanceTimersByTime(120000);
            expect(mockGitService.fetchRepository).not.toHaveBeenCalled();
        });

        it('should handle unscheduling non-existent repository', () => {
            expect(() => {
                scheduler.unscheduleRepository('non-existent');
            }).not.toThrow();
        });
    });

    describe('startAll', () => {
        it('should schedule all enabled repositories', () => {
            scheduler.startAll();

            // Should have scheduled repo1 and repo2 (both enabled)
            jest.advanceTimersByTime(300000); // Default interval

            expect(mockGitService.fetchRepository).toHaveBeenCalledWith('/test/repo1');
            expect(mockGitService.fetchRepository).toHaveBeenCalledWith('/test/repo2');
        });

        it('should not schedule disabled repositories', () => {
            scheduler.startAll();

            jest.advanceTimersByTime(300000);

            // Should not have fetched repo3 (disabled)
            expect(mockGitService.fetchRepository).not.toHaveBeenCalledWith('/test/repo3');
        });
    });

    describe('stopAll', () => {
        it('should clear all intervals', () => {
            scheduler.scheduleRepository('repo-1', 60000);
            scheduler.scheduleRepository('repo-2', 60000);

            scheduler.stopAll();

            // Advance time - no fetches should occur
            jest.advanceTimersByTime(120000);
            expect(mockGitService.fetchRepository).not.toHaveBeenCalled();
        });

        it('should handle stopping when no intervals exist', () => {
            expect(() => {
                scheduler.stopAll();
            }).not.toThrow();
        });
    });

    describe('fetchRepositoryNow', () => {
        it('should execute immediate fetch', async () => {
            const result = await scheduler.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(true);
            expect(result.repositoryId).toBe('repo-1');
            expect(mockGitService.fetchRepository).toHaveBeenCalledWith('/test/repo1');
        });

        it('should return existing promise if fetch in progress', async () => {
            // Track if fetch is called multiple times
            let callCount = 0;
            mockGitService.fetchRepository.mockImplementation(async () => {
                callCount++;
                return true;
            });

            // Start two fetches - second should reuse first's promise
            const promise1 = scheduler.fetchRepositoryNow('repo-1');

            // Check that fetch is in progress
            expect(scheduler.isFetching('repo-1')).toBe(true);

            const promise2 = scheduler.fetchRepositoryNow('repo-1');

            // Wait for both to complete
            await Promise.all([promise1, promise2]);

            // Only one call to git service should have been made
            expect(callCount).toBe(1);
        });

        it('should throw error for non-existent repository', async () => {
            await expect(scheduler.fetchRepositoryNow('non-existent'))
                .rejects.toThrow('Repository not found: non-existent');
        });

        it('should handle fetch with remote changes', async () => {
            mockGitService.checkRemoteChanges.mockResolvedValue({
                hasChanges: true,
                commitsBehind: 5,
                commitsAhead: 2,
                trackingBranch: 'origin/main',
                currentBranch: 'main',
            });

            const result = await scheduler.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(true);
            expect(result.remoteChanges).toBe(true);
            expect(result.commitsBehind).toBe(5);
            expect(result.branchInfo).toHaveLength(1);
            expect(result.branchInfo![0]).toEqual({
                name: 'main',
                remoteBranch: 'origin/main',
                behind: 5,
                ahead: 2,
            });
        });

        it('should handle fetch errors', async () => {
            mockGitService.fetchRepository.mockRejectedValue(
                new FetchError('Network error', '/test/repo1', FetchErrorCode.NETWORK_ERROR)
            );

            const result = await scheduler.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });

    describe('fetchAllNow', () => {
        it('should fetch all enabled repositories', async () => {
            const results = await scheduler.fetchAllNow();

            expect(results).toHaveLength(2);
            expect(results[0].repositoryId).toBe('repo-1');
            expect(results[1].repositoryId).toBe('repo-2');
            expect(mockGitService.fetchRepository).toHaveBeenCalledTimes(2);
        });

        it('should continue on individual fetch failures', async () => {
            // Make repo1 fail, repo2 succeed
            mockGitService.fetchRepository.mockImplementation((path: string) => {
                if (path === '/test/repo1') {
                    return Promise.reject(new Error('Fetch failed'));
                }
                return Promise.resolve(true);
            });

            const results = await scheduler.fetchAllNow();

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(false);
            expect(results[1].success).toBe(true);
        });

        it('should execute fetches sequentially', async () => {
            const executionOrder: string[] = [];

            mockGitService.fetchRepository.mockImplementation(async (path: string) => {
                executionOrder.push(path);
                return true;
            });

            await scheduler.fetchAllNow();

            // Should execute in order (sequential)
            expect(executionOrder).toEqual(['/test/repo1', '/test/repo2']);
        });
    });

    describe('isFetching', () => {
        it('should return false when no fetch in progress', () => {
            expect(scheduler.isFetching('repo-1')).toBe(false);
        });

        it('should return true during fetch', async () => {
            // Create a fetch that we can control
            let resolveFunc: (value: boolean) => void;
            mockGitService.fetchRepository.mockImplementation(() => {
                return new Promise(resolve => {
                    resolveFunc = resolve;
                });
            });

            const fetchPromise = scheduler.fetchRepositoryNow('repo-1');

            // During fetch
            expect(scheduler.isFetching('repo-1')).toBe(true);

            // Complete the fetch
            resolveFunc!(true);
            await fetchPromise;

            // After fetch
            expect(scheduler.isFetching('repo-1')).toBe(false);
        });
    });

    describe('concurrent fetch prevention', () => {
        it('should prevent concurrent fetches for same repository', async () => {
            // Track call count
            let callCount = 0;
            mockGitService.fetchRepository.mockImplementation(async () => {
                callCount++;
                return true;
            });

            // Start two fetches simultaneously
            const promise1 = scheduler.fetchRepositoryNow('repo-1');
            const promise2 = scheduler.fetchRepositoryNow('repo-1');

            // Wait for both to complete
            await Promise.all([promise1, promise2]);

            // Git service should only be called once (concurrent prevention)
            expect(callCount).toBe(1);
        });

        it('should allow concurrent fetches for different repositories', async () => {
            // Use simple async mock
            mockGitService.fetchRepository.mockImplementation(async () => {
                return true;
            });

            // Start fetches for different repos
            const promise1 = scheduler.fetchRepositoryNow('repo-1');
            const promise2 = scheduler.fetchRepositoryNow('repo-2');

            await Promise.all([promise1, promise2]);

            // Both should have been called
            expect(mockGitService.fetchRepository).toHaveBeenCalledTimes(2);
        });
    });

    describe('error handling', () => {
        it('should handle FetchError correctly', async () => {
            mockGitService.fetchRepository.mockRejectedValue(
                new FetchError('Auth failed', '/test/repo1', FetchErrorCode.AUTH_ERROR)
            );

            const result = await scheduler.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Auth failed');
        });

        it('should handle generic Error', async () => {
            mockGitService.fetchRepository.mockRejectedValue(new Error('Generic error'));

            const result = await scheduler.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Generic error');
        });

        it('should handle non-Error objects', async () => {
            mockGitService.fetchRepository.mockRejectedValue('String error');

            const result = await scheduler.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('String error');
        });

        it('should not crash interval on fetch error', () => {
            // Mock to always fail
            mockGitService.fetchRepository.mockRejectedValue(new Error('Fetch failed'));

            // Schedule repository - this should not throw even when fetch fails
            expect(() => {
                scheduler.scheduleRepository('repo-1', 60000);
                jest.advanceTimersByTime(60000);
            }).not.toThrow();

            // Verify fetch was attempted despite error
            expect(mockGitService.fetchRepository).toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle no tracking branch', async () => {
            mockGitService.checkRemoteChanges.mockResolvedValue({
                hasChanges: false,
                commitsBehind: 0,
                commitsAhead: 0,
                trackingBranch: null,
                currentBranch: 'main',
            });

            const result = await scheduler.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(true);
            expect(result.branchInfo).toBeUndefined();
        });

        it('should handle detached HEAD', async () => {
            mockGitService.checkRemoteChanges.mockResolvedValue({
                hasChanges: false,
                commitsBehind: 0,
                commitsAhead: 0,
                trackingBranch: null,
                currentBranch: null,
            });

            const result = await scheduler.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(true);
            expect(result.branchInfo).toBeUndefined();
        });

        it('should handle fetch returning false', async () => {
            mockGitService.fetchRepository.mockResolvedValue(false);

            const result = await scheduler.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Fetch operation failed');
        });
    });
});
