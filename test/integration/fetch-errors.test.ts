/**
 * Integration Tests: Fetch Error Scenarios
 * 
 * Tests error handling across all failure modes in the fetch workflow.
 * Validates graceful degradation and error recovery.
 */

import { GitCommandService } from '../../src/services/GitCommandService';
import { FetchSchedulerService } from '../../src/services/FetchSchedulerService';
import { RepositoryConfigService } from '../../src/services/RepositoryConfigService';
import { NotificationService } from '../../src/services/NotificationService';
import { FetchError, FetchErrorCode } from '../../src/utils/errors';
import type { MultiGitSettings, RepositoryConfig } from '../../src/settings/data';
import MultiGitPlugin from '../../src/main';

// Mock Obsidian
jest.mock('obsidian');

// Create mock plugin
function createMockPlugin(settings: MultiGitSettings): MultiGitPlugin {
    return {
        settings,
        saveSettings: jest.fn().mockResolvedValue(undefined),
    } as any;
}

// Helper to create valid repository config
function createRepoConfig(overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
    return {
        id: 'repo-1',
        name: 'Test Repository',
        path: '/path/to/repo1',
        enabled: true,
        createdAt: Date.now(),
        fetchInterval: 60000,
        lastFetchTime: undefined,
        lastFetchStatus: 'idle',
        lastFetchError: undefined,
        remoteChanges: false,
        remoteCommitCount: undefined,
        ...overrides,
    };
}

describe('Fetch Error Scenarios Integration', () => {
    let gitService: GitCommandService;
    let configService: RepositoryConfigService;
    let schedulerService: FetchSchedulerService;
    let notificationService: NotificationService;
    let mockPlugin: MultiGitPlugin;
    let mockSettings: MultiGitSettings;

    beforeEach(() => {
        // Initialize settings with proper repository config
        mockSettings = {
            repositories: [createRepoConfig()],
            version: '0.1.0',
            globalFetchInterval: 300000,
            fetchOnStartup: true,
            notifyOnRemoteChanges: true,
            lastGlobalFetch: undefined,
        };

        mockPlugin = createMockPlugin(mockSettings);
        gitService = new GitCommandService();
        configService = new RepositoryConfigService(mockPlugin);
        notificationService = new NotificationService(mockSettings);
        schedulerService = new FetchSchedulerService(
            configService,
            gitService,
            notificationService
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        schedulerService.stopAll();
    });

    describe('Network Disconnection', () => {
        it('should handle network disconnection during fetch', async () => {
            // Mock network error
            const networkError = new FetchError(
                'Could not resolve host',
                '/path/to/repo1',
                FetchErrorCode.NETWORK_ERROR,
                new Error('Could not resolve host')
            );

            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(networkError);

            // Execute fetch
            const result = await schedulerService.fetchRepositoryNow('repo-1');

            // Verify error handling
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Could not resolve host');

            // Verify status updated to error
            const config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('error');
            expect(config?.lastFetchError).toContain('Could not resolve host');
            expect(config?.remoteChanges).toBe(false);
        });

        it('should show error notification on network failure', async () => {
            const networkError = new FetchError(
                'Network unreachable',
                '/path/to/repo1',
                FetchErrorCode.NETWORK_ERROR,
                new Error('Network unreachable')
            );

            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(networkError);
            const notifySpy = jest.spyOn(notificationService, 'notifyFetchError');

            await schedulerService.fetchRepositoryNow('repo-1');

            expect(notifySpy).toHaveBeenCalledWith(
                'Test Repository',
                expect.stringContaining('Network unreachable')
            );
        });

        it('should allow retry after network error', async () => {
            // First attempt fails
            const networkError = new FetchError(
                'Network unreachable',
                '/path/to/repo1',
                FetchErrorCode.NETWORK_ERROR,
                new Error('Network unreachable')
            );
            jest.spyOn(gitService, 'fetchRepository').mockRejectedValueOnce(networkError);

            const firstResult = await schedulerService.fetchRepositoryNow('repo-1');
            expect(firstResult.success).toBe(false);

            // Second attempt succeeds
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValueOnce(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValueOnce({
                hasChanges: false,
                commitsAhead: 0,
                commitsBehind: 0,
                currentBranch: 'main',
                trackingBranch: 'origin/main',
            });

            const secondResult = await schedulerService.fetchRepositoryNow('repo-1');
            expect(secondResult.success).toBe(true);

            // Verify status recovered
            const config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('success');
            expect(config?.lastFetchError).toBeUndefined();
        });
    });

    describe('Authentication Failures', () => {
        it('should handle authentication failure during fetch', async () => {
            const authError = new FetchError(
                'Permission denied (publickey)',
                '/path/to/repo1',
                FetchErrorCode.AUTH_ERROR,
                new Error('Permission denied (publickey)')
            );

            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(authError);

            const result = await schedulerService.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Permission denied');

            const config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('error');
            expect(config?.lastFetchError).toContain('Permission denied');
        });

        it('should show actionable error notification for auth failures', async () => {
            const authError = new FetchError(
                'Permission denied (publickey)',
                '/path/to/repo1',
                FetchErrorCode.AUTH_ERROR,
                new Error('Permission denied (publickey)')
            );

            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(authError);
            const notifySpy = jest.spyOn(notificationService, 'notifyFetchError');

            await schedulerService.fetchRepositoryNow('repo-1');

            expect(notifySpy).toHaveBeenCalledWith(
                'Test Repository',
                expect.stringContaining('Permission denied')
            );
        });
    });

    describe('Repository in Invalid State', () => {
        it('should handle repository error during fetch', async () => {
            const repoError = new FetchError(
                'fatal: not a git repository',
                '/path/to/repo1',
                FetchErrorCode.REPO_ERROR,
                new Error('fatal: not a git repository')
            );

            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(repoError);

            const result = await schedulerService.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('not a git repository');

            const config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('error');
        });

        it('should handle corrupted repository', async () => {
            const repoError = new FetchError(
                'fatal: bad object',
                '/path/to/repo1',
                FetchErrorCode.REPO_ERROR,
                new Error('fatal: bad object')
            );

            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(repoError);

            const result = await schedulerService.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            const config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('error');
            expect(config?.lastFetchError).toContain('bad object');
        });
    });

    describe('Timeout Scenarios', () => {
        it('should handle timeout during fetch', async () => {
            const timeoutError = new FetchError(
                'Operation timed out after 30000ms',
                '/path/to/repo1',
                FetchErrorCode.TIMEOUT,
                new Error('Operation timed out after 30000ms')
            );

            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(timeoutError);

            const result = await schedulerService.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('timed out');

            const config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('error');
            expect(config?.lastFetchError).toContain('timed out');
        });

        it('should show user-friendly timeout message', async () => {
            const timeoutError = new FetchError(
                'Operation timed out after 30000ms',
                '/path/to/repo1',
                FetchErrorCode.TIMEOUT,
                new Error('Operation timed out after 30000ms')
            );

            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(timeoutError);
            const notifySpy = jest.spyOn(notificationService, 'notifyFetchError');

            await schedulerService.fetchRepositoryNow('repo-1');

            expect(notifySpy).toHaveBeenCalledWith(
                'Test Repository',
                expect.stringContaining('timed out')
            );
        });
    });

    describe('Graceful Degradation', () => {
        it('should continue scheduling other repos when one fails', async () => {
            // Add multiple repositories
            mockSettings.repositories.push(createRepoConfig({
                id: 'repo-2',
                name: 'Second Repository',
                path: '/path/to/repo2',
            }));

            // First repo fails, second succeeds
            jest.spyOn(gitService, 'fetchRepository')
                .mockRejectedValueOnce(new FetchError('Network error', '/path/to/repo1', FetchErrorCode.NETWORK_ERROR, new Error('Network error')))
                .mockResolvedValueOnce(true);

            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                hasChanges: false,
                commitsAhead: 0,
                commitsBehind: 0,
                currentBranch: 'main',
                trackingBranch: 'origin/main',
            });

            const results = await schedulerService.fetchAllNow();

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(false);
            expect(results[1].success).toBe(true);

            // Verify both statuses updated
            const config1 = configService.getRepository('repo-1');
            const config2 = configService.getRepository('repo-2');
            expect(config1?.lastFetchStatus).toBe('error');
            expect(config2?.lastFetchStatus).toBe('success');
        });

        it('should not block UI during error handling', async () => {
            const slowError = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new FetchError('Timeout', '/path/to/repo1', FetchErrorCode.TIMEOUT, new Error('Timeout')));
                }, 100);
            });

            jest.spyOn(gitService, 'fetchRepository').mockReturnValue(slowError as any);

            const startTime = Date.now();
            const resultPromise = schedulerService.fetchRepositoryNow('repo-1');

            // Operation should be async and not block
            const immediateTime = Date.now();
            expect(immediateTime - startTime).toBeLessThan(50);

            await resultPromise;
            const endTime = Date.now();
            expect(endTime - startTime).toBeGreaterThanOrEqual(100);
        });

        it('should maintain plugin stability after multiple errors', async () => {
            const networkError = new FetchError(
                'Network error',
                '/path/to/repo1',
                FetchErrorCode.NETWORK_ERROR,
                new Error('Network error')
            );

            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(networkError);

            // Simulate multiple failed fetch attempts
            const results = await Promise.all([
                schedulerService.fetchRepositoryNow('repo-1'),
                schedulerService.fetchRepositoryNow('repo-1'),
                schedulerService.fetchRepositoryNow('repo-1'),
            ]);

            // All should fail but not crash
            results.forEach(result => {
                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
            });

            // Service should still be functional
            const config = configService.getRepository('repo-1');
            expect(config).toBeDefined();
            expect(config?.lastFetchStatus).toBe('error');
        });
    });

    describe('Error Recovery', () => {
        it('should clear error state on successful fetch after failure', async () => {
            // First fetch fails
            const networkError = new FetchError(
                'Network error',
                '/path/to/repo1',
                FetchErrorCode.NETWORK_ERROR,
                new Error('Network error')
            );
            jest.spyOn(gitService, 'fetchRepository').mockRejectedValueOnce(networkError);

            await schedulerService.fetchRepositoryNow('repo-1');

            let config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('error');
            expect(config?.lastFetchError).toBeDefined();

            // Second fetch succeeds
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValueOnce(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValueOnce({
                hasChanges: false,
                commitsAhead: 0,
                commitsBehind: 0,
                currentBranch: 'main',
                trackingBranch: 'origin/main',
            });

            await schedulerService.fetchRepositoryNow('repo-1');

            config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('success');
            expect(config?.lastFetchError).toBeUndefined();
        });

        it('should recover from transient errors automatically', async () => {
            jest.useFakeTimers();

            // Mock intermittent failures
            let attemptCount = 0;
            jest.spyOn(gitService, 'fetchRepository').mockImplementation(async () => {
                attemptCount++;
                if (attemptCount <= 2) {
                    throw new FetchError('Transient error', '/path/to/repo1', FetchErrorCode.NETWORK_ERROR, new Error('Transient error'));
                }
                return true;
            });

            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                hasChanges: false,
                commitsAhead: 0,
                commitsBehind: 0,
                currentBranch: 'main',
                trackingBranch: 'origin/main',
            });

            // Start scheduler
            schedulerService.scheduleRepository('repo-1', 60000);

            // First interval fails
            await jest.advanceTimersByTimeAsync(60000);
            expect(attemptCount).toBe(1);

            // Second interval fails
            await jest.advanceTimersByTimeAsync(60000);
            expect(attemptCount).toBe(2);

            // Third interval succeeds
            await jest.advanceTimersByTimeAsync(60000);
            expect(attemptCount).toBe(3);

            const config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('success');

            jest.useRealTimers();
        });
    });

    describe('Unknown Errors', () => {
        it('should handle unknown error types gracefully', async () => {
            const unknownError = new FetchError(
                'Unexpected error',
                '/path/to/repo1',
                FetchErrorCode.UNKNOWN,
                new Error('Unexpected error')
            );

            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(unknownError);

            const result = await schedulerService.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            const config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('error');
        });

        it('should handle non-FetchError exceptions', async () => {
            const genericError = new Error('Generic error');
            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(genericError);

            const result = await schedulerService.fetchRepositoryNow('repo-1');

            expect(result.success).toBe(false);
            // Should still handle gracefully
            expect(result.error).toBeDefined();

            const config = configService.getRepository('repo-1');
            expect(config?.lastFetchStatus).toBe('error');
        });
    });

    describe('Concurrent Error Scenarios', () => {
        it('should handle errors in concurrent fetches independently', async () => {
            // Add multiple repositories
            for (let i = 2; i <= 5; i++) {
                mockSettings.repositories.push(createRepoConfig({
                    id: `repo-${i}`,
                    name: `Repository ${i}`,
                    path: `/path/to/repo${i}`,
                }));
            }

            // Mock different errors for different repos
            jest.spyOn(gitService, 'fetchRepository')
                .mockRejectedValueOnce(new FetchError('Network', '/path/to/repo1', FetchErrorCode.NETWORK_ERROR, new Error('Network')))
                .mockRejectedValueOnce(new FetchError('Auth', '/path/to/repo2', FetchErrorCode.AUTH_ERROR, new Error('Auth')))
                .mockResolvedValueOnce(true)
                .mockRejectedValueOnce(new FetchError('Timeout', '/path/to/repo4', FetchErrorCode.TIMEOUT, new Error('Timeout')))
                .mockResolvedValueOnce(true);

            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                hasChanges: false,
                commitsAhead: 0,
                commitsBehind: 0,
                currentBranch: 'main',
                trackingBranch: 'origin/main',
            });

            const results = await schedulerService.fetchAllNow();

            expect(results).toHaveLength(5);
            expect(results[0].success).toBe(false);
            expect(results[1].success).toBe(false);
            expect(results[2].success).toBe(true);
            expect(results[3].success).toBe(false);
            expect(results[4].success).toBe(true);

            // Verify all configs updated correctly
            expect(configService.getRepository('repo-1')?.lastFetchStatus).toBe('error');
            expect(configService.getRepository('repo-2')?.lastFetchStatus).toBe('error');
            expect(configService.getRepository('repo-3')?.lastFetchStatus).toBe('success');
            expect(configService.getRepository('repo-4')?.lastFetchStatus).toBe('error');
            expect(configService.getRepository('repo-5')?.lastFetchStatus).toBe('success');
        });
    });
});
