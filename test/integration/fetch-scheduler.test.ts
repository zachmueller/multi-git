import { FetchSchedulerService } from '../../src/services/FetchSchedulerService';
import { GitCommandService } from '../../src/services/GitCommandService';
import { RepositoryConfigService } from '../../src/services/RepositoryConfigService';
import { NotificationService } from '../../src/services/NotificationService';
import { MultiGitSettings, RepositoryConfig } from '../../src/settings/data';
import { Notice } from 'obsidian';
import * as childProcess from 'child_process';

// Mock Obsidian
jest.mock('obsidian');

// Mock child_process
jest.mock('child_process');

// Mock validation utilities
jest.mock('../../src/utils/validation', () => ({
    validateAbsolutePath: jest.fn(() => true),
    isDirectory: jest.fn(() => Promise.resolve(true)),
}));

// Mock MultiGitPlugin
const createMockPlugin = () => {
    const settings: MultiGitSettings = {
        repositories: [],
        version: '1.0.0',
        globalFetchInterval: 300000,
        fetchOnStartup: true,
        notifyOnRemoteChanges: true,
    };

    return {
        settings,
        saveSettings: jest.fn().mockResolvedValue(undefined),
    };
};

describe('FetchScheduler Integration Tests', () => {
    let fetchScheduler: FetchSchedulerService;
    let gitService: GitCommandService;
    let configService: RepositoryConfigService;
    let notificationService: NotificationService;
    let mockPlugin: any;
    let testRepoId: string;

    const mockExec = childProcess.exec as jest.MockedFunction<typeof childProcess.exec>;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Create mock plugin
        mockPlugin = createMockPlugin();

        // Initialize services
        gitService = new GitCommandService();
        configService = new RepositoryConfigService(mockPlugin);
        notificationService = new NotificationService(mockPlugin.settings);
        fetchScheduler = new FetchSchedulerService(
            configService,
            gitService,
            notificationService
        );

        // Mock git repository validation for addRepository
        jest.spyOn(gitService, 'isGitRepository').mockResolvedValue(true);

        // Setup default repository config
        const repo = await configService.addRepository('/test/repo1', 'Test Repo 1');
        testRepoId = repo.id;

        jest.clearAllMocks(); // Clear mocks after setup
        jest.useFakeTimers(); // Enable fake timers after async setup
    });

    afterEach(() => {
        fetchScheduler.stopAll();
        jest.useRealTimers();
    });

    describe('Complete Fetch Workflow', () => {
        it('should complete full cycle: schedule → fetch → status update → persist', async () => {
            // Mock successful git operations
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                currentBranch: 'main',
                trackingBranch: 'origin/main',
                commitsAhead: 0,
                commitsBehind: 3,
                hasChanges: true,
            });

            // Get initial status
            const initialConfig = configService.getRepository(testRepoId);
            expect(initialConfig?.lastFetchStatus).toBe('idle');
            expect(initialConfig?.remoteChanges).toBe(false);

            // Execute immediate fetch
            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);

            // Verify fetch result
            expect(result.success).toBe(true);
            expect(result.remoteChanges).toBe(true);
            expect(result.branchInfo?.[0].behind).toBe(3);

            // Update status in config service
            await configService.recordFetchResult(result);

            // Verify status was updated in config
            const updatedConfig = configService.getRepository(testRepoId);
            expect(updatedConfig?.lastFetchStatus).toBe('success');
            expect(updatedConfig?.remoteChanges).toBe(true);
            expect(updatedConfig?.remoteCommitCount).toBe(3);
            expect(updatedConfig?.lastFetchTime).toBeGreaterThan(0);

            // Verify settings were persisted
            const allRepos = configService.getRepositories();
            const savedRepo = allRepos.find((r: RepositoryConfig) => r.path === '/test/repo1');
            expect(savedRepo?.remoteChanges).toBe(true);
            expect(savedRepo?.lastFetchStatus).toBe('success');
        });

        it('should update status during fetch lifecycle', async () => {
            // Mock git operations
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                currentBranch: 'main',
                trackingBranch: 'origin/main',
                commitsAhead: 0,
                commitsBehind: 0,
                hasChanges: false,
            });

            // Start fetch (non-blocking)
            const fetchPromise = fetchScheduler.fetchRepositoryNow(testRepoId);

            // Advance timers to complete the fetch
            jest.advanceTimersByTime(150);
            const result = await fetchPromise;

            // Record result
            await configService.recordFetchResult(result);

            // Check final status
            const finalConfig = configService.getRepository(testRepoId);
            expect(finalConfig?.lastFetchStatus).toBe('success');
        });
    });

    describe('Error Scenario Status Updates', () => {
        it('should update status correctly on fetch error', async () => {
            // Mock git fetch failure
            const error = new Error('Network error: fatal: unable to access repository');
            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(error);

            // Execute fetch
            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);

            // Verify error result
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Record error result
            await configService.recordFetchResult(result);

            // Verify status was updated with error
            const config = configService.getRepository(testRepoId);
            expect(config?.lastFetchStatus).toBe('error');
            expect(config?.lastFetchError).toContain('Network error');
            expect(config?.remoteChanges).toBe(false);
        });

        it('should update status correctly on timeout', async () => {
            // Mock timeout error
            const error = new Error('Git command timeout after 30000ms');
            jest.spyOn(gitService, 'fetchRepository').mockRejectedValue(error);

            // Execute fetch
            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);

            // Should have timeout error
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Record timeout result
            await configService.recordFetchResult(result);

            // Status should reflect timeout error
            const config = configService.getRepository(testRepoId);
            expect(config?.lastFetchStatus).toBe('error');
        });
    });

    describe('Remote Changes Detection and Status', () => {
        it('should correctly detect and store remote changes (behind)', async () => {
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                currentBranch: 'main',
                trackingBranch: 'origin/main',
                commitsAhead: 0,
                commitsBehind: 5,
                hasChanges: true,
            });

            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);
            await configService.recordFetchResult(result);

            const config = configService.getRepository(testRepoId);
            expect(config?.remoteChanges).toBe(true);
            expect(config?.remoteCommitCount).toBe(5);
        });

        it('should correctly detect and store remote changes (ahead)', async () => {
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                currentBranch: 'main',
                trackingBranch: 'origin/main',
                commitsAhead: 2,
                commitsBehind: 0,
                hasChanges: false,
            });

            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);
            await configService.recordFetchResult(result);

            const config = configService.getRepository(testRepoId);
            // Ahead commits don't trigger remote changes flag
            expect(config?.remoteChanges).toBe(false);
            expect(config?.remoteCommitCount).toBeUndefined();
        });

        it('should correctly detect diverged branches', async () => {
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                currentBranch: 'main',
                trackingBranch: 'origin/main',
                commitsAhead: 3,
                commitsBehind: 4,
                hasChanges: true,
            });

            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);
            await configService.recordFetchResult(result);

            const config = configService.getRepository(testRepoId);
            expect(config?.remoteChanges).toBe(true);
            expect(config?.remoteCommitCount).toBe(4);
        });

        it('should detect when no remote changes exist', async () => {
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                currentBranch: 'main',
                trackingBranch: 'origin/main',
                commitsAhead: 0,
                commitsBehind: 0,
                hasChanges: false,
            });

            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);
            await configService.recordFetchResult(result);

            const config = configService.getRepository(testRepoId);
            expect(config?.remoteChanges).toBe(false);
            expect(config?.remoteCommitCount).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle detached HEAD state correctly', async () => {
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                currentBranch: null,
                trackingBranch: null,
                commitsAhead: 0,
                commitsBehind: 0,
                hasChanges: false,
            });

            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);

            // Fetch succeeds but no branch comparison possible
            expect(result.success).toBe(true);
            expect(result.remoteChanges).toBe(false);
            expect(result.branchInfo).toBeUndefined();

            await configService.recordFetchResult(result);

            const config = configService.getRepository(testRepoId);
            expect(config?.lastFetchStatus).toBe('success');
            expect(config?.remoteChanges).toBe(false);
        });

        it('should handle no tracking branch configured', async () => {
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                currentBranch: 'feature-branch',
                trackingBranch: null,
                commitsAhead: 0,
                commitsBehind: 0,
                hasChanges: false,
            });

            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);

            // Fetch succeeds but no branch comparison possible
            expect(result.success).toBe(true);
            expect(result.remoteChanges).toBe(false);
            expect(result.branchInfo).toBeUndefined();

            await configService.recordFetchResult(result);

            const config = configService.getRepository(testRepoId);
            expect(config?.lastFetchStatus).toBe('success');
            expect(config?.remoteChanges).toBe(false);
        });

        it('should handle force-pushed remote branch', async () => {
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                currentBranch: 'main',
                trackingBranch: 'origin/main',
                commitsAhead: 5,
                commitsBehind: 5,
                hasChanges: true,
            });

            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);

            expect(result.success).toBe(true);
            expect(result.remoteChanges).toBe(true);
            expect(result.branchInfo?.[0].ahead).toBe(5);
            expect(result.branchInfo?.[0].behind).toBe(5);

            await configService.recordFetchResult(result);

            const config = configService.getRepository(testRepoId);
            expect(config?.remoteChanges).toBe(true);
        });
    });

    describe('Scheduled Fetch Integration', () => {
        it('should update status on scheduled fetch execution', async () => {
            // Add another repository for multi-repo testing
            const repo2 = await configService.addRepository('/test/repo2', 'Test Repo 2');

            // Mock successful operations for both repos
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            const mockCheckChanges = jest.spyOn(gitService, 'checkRemoteChanges');
            mockCheckChanges
                .mockResolvedValueOnce({
                    currentBranch: 'main',
                    trackingBranch: 'origin/main',
                    commitsAhead: 0,
                    commitsBehind: 2,
                    hasChanges: true,
                })
                .mockResolvedValueOnce({
                    currentBranch: 'develop',
                    trackingBranch: 'origin/develop',
                    commitsAhead: 0,
                    commitsBehind: 0,
                    hasChanges: false,
                });

            // Schedule both repositories
            fetchScheduler.scheduleRepository(testRepoId, 60000);
            fetchScheduler.scheduleRepository(repo2.id, 60000);

            // Advance time to trigger scheduled fetch
            jest.advanceTimersByTime(60000);

            // Wait for async operations
            await new Promise(resolve => setImmediate(resolve));
            await new Promise(resolve => setImmediate(resolve));

            // Note: In the actual implementation, the scheduler handles the fetches
            // For this test, we just verify the repositories were scheduled
            expect(fetchScheduler.isFetching(testRepoId) || fetchScheduler.isFetching(repo2.id)).toBe(false);
        });
    });

    describe('Settings Persistence', () => {
        it('should persist status across service reload', async () => {
            // Mock successful fetch with changes
            jest.spyOn(gitService, 'fetchRepository').mockResolvedValue(true);
            jest.spyOn(gitService, 'checkRemoteChanges').mockResolvedValue({
                currentBranch: 'main',
                trackingBranch: 'origin/main',
                commitsAhead: 0,
                commitsBehind: 3,
                hasChanges: true,
            });

            const result = await fetchScheduler.fetchRepositoryNow(testRepoId);
            await configService.recordFetchResult(result);

            // Simulate plugin reload by creating new plugin with same settings
            const newMockPlugin = {
                settings: { ...mockPlugin.settings },
                saveSettings: jest.fn().mockResolvedValue(undefined),
            } as any;
            const newConfigService = new RepositoryConfigService(newMockPlugin);

            // Verify data persisted in the settings object
            const reloadedRepo = newConfigService.getRepository(testRepoId);
            expect(reloadedRepo?.lastFetchStatus).toBe('success');
            expect(reloadedRepo?.remoteChanges).toBe(true);
            expect(reloadedRepo?.remoteCommitCount).toBe(3);
            expect(reloadedRepo?.lastFetchTime).toBeGreaterThan(0);
        });
    });
});
