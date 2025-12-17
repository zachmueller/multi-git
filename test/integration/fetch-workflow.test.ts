/**
 * Integration Test: Complete Fetch Workflow
 * 
 * Tests the end-to-end workflow from plugin load through fetch execution,
 * status updates, and notifications.
 * 
 * Related: INT-001
 */

import { jest } from '@jest/globals';
import { Notice } from 'obsidian';
import { FetchSchedulerService } from '../../src/services/FetchSchedulerService';
import { GitCommandService } from '../../src/services/GitCommandService';
import { NotificationService } from '../../src/services/NotificationService';
import { RepositoryConfigService } from '../../src/services/RepositoryConfigService';
import type { MultiGitSettings, RepositoryConfig } from '../../src/settings/data';
import type MultiGitPlugin from '../../src/main';

// Mock Obsidian Notice (without DOM dependency)
jest.mock('obsidian', () => ({
    Notice: jest.fn().mockImplementation(() => ({
        noticeEl: { style: {} },
        hide: jest.fn()
    }))
}));

describe('Integration: Complete Fetch Workflow', () => {
    let mockPlugin: MultiGitPlugin;
    let gitService: GitCommandService;
    let configService: RepositoryConfigService;
    let notificationService: NotificationService;
    let schedulerService: FetchSchedulerService;
    let mockSettings: MultiGitSettings;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockSettings = {
            repositories: [],
            version: '0.1.0',
            globalFetchInterval: 300000,
            fetchOnStartup: true,
            notifyOnRemoteChanges: true
        };

        mockPlugin = {
            settings: mockSettings,
            saveSettings: jest.fn().mockResolvedValue(undefined)
        } as any;

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
        schedulerService.stopAll();
        jest.useRealTimers();
    });

    describe('Plugin Load → Schedule → Fetch → Status Update → Notification', () => {
        test('complete workflow with remote changes', async () => {
            // Setup: Add repository configuration manually (bypassing validation for test)
            const repoConfig: RepositoryConfig = {
                id: 'repo1',
                name: 'Test Repo',
                path: '/test/repo1',
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Mock git operations
            jest.spyOn(gitService, 'fetchRepository')
                .mockResolvedValue(true);

            jest.spyOn(gitService, 'checkRemoteChanges')
                .mockResolvedValue({
                    currentBranch: 'main',
                    trackingBranch: 'origin/main',
                    commitsAhead: 0,
                    commitsBehind: 3,
                    hasChanges: true
                });

            // Step 1: Plugin Load - Start scheduler
            schedulerService.startAll();

            // Verify scheduling occurred
            expect((schedulerService as any).intervals.size).toBe(1);

            // Step 2: Trigger fetch (simulate interval firing)
            const fetchPromise = schedulerService.fetchRepositoryNow('repo1');

            // Step 3: Verify fetch execution
            await fetchPromise;

            expect(gitService.fetchRepository).toHaveBeenCalledWith('/test/repo1');
            expect(gitService.checkRemoteChanges).toHaveBeenCalledWith('/test/repo1');

            // Step 4: Verify status update
            const updatedRepo = configService.getRepository('repo1');
            expect(updatedRepo).toBeDefined();
            expect(updatedRepo!.lastFetchStatus).toBe('success');
            expect(updatedRepo!.remoteChanges).toBe(true);
            expect(updatedRepo!.remoteCommitCount).toBe(3);
            expect(updatedRepo!.lastFetchTime).toBeDefined();

            // Step 5: Verify notification
            expect(Notice).toHaveBeenCalledWith(
                expect.stringContaining('Test Repo'),
                expect.any(Number)
            );
            expect(Notice).toHaveBeenCalledWith(
                expect.stringContaining('3 new commit'),
                expect.any(Number)
            );
        });

        test('workflow without remote changes (no notification)', async () => {
            // Setup
            const repoConfig: RepositoryConfig = {
                id: 'repo1',
                name: 'Test Repo',
                path: '/test/repo1',
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Mock git operations - no remote changes
            jest.spyOn(gitService, 'fetchRepository')
                .mockResolvedValue(true);

            jest.spyOn(gitService, 'checkRemoteChanges')
                .mockResolvedValue({
                    currentBranch: 'main',
                    trackingBranch: 'origin/main',
                    commitsAhead: 0,
                    commitsBehind: 0,
                    hasChanges: false
                });

            // Execute fetch
            await schedulerService.fetchRepositoryNow('repo1');

            // Verify status update
            const updatedRepo = configService.getRepository('repo1');
            expect(updatedRepo!.lastFetchStatus).toBe('success');
            expect(updatedRepo!.remoteChanges).toBe(false);

            // Verify NO notification
            expect(Notice).not.toHaveBeenCalled();
        });

        test('workflow with fetch error (error notification)', async () => {
            // Setup
            const repoConfig: RepositoryConfig = {
                id: 'repo1',
                name: 'Test Repo',
                path: '/test/repo1',
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Mock git fetch failure
            jest.spyOn(gitService, 'fetchRepository')
                .mockResolvedValue(false);

            // Execute fetch
            await schedulerService.fetchRepositoryNow('repo1');

            // Verify error status
            const updatedRepo = configService.getRepository('repo1');
            expect(updatedRepo!.lastFetchStatus).toBe('error');
            expect(updatedRepo!.lastFetchError).toBeDefined();

            // Verify error notification
            expect(Notice).toHaveBeenCalledWith(
                expect.stringContaining('Failed to fetch'),
                expect.any(Number)
            );
            expect(Notice).toHaveBeenCalledWith(
                expect.stringContaining('Test Repo'),
                expect.any(Number)
            );
        });
    });

    describe('Multiple Repositories Simultaneously', () => {
        test('fetch all repositories with mixed results', async () => {
            // Setup multiple repositories
            const repos: RepositoryConfig[] = [
                {
                    id: 'repo1',
                    name: 'Repo One',
                    path: '/test/repo1',
                    enabled: true,
                    createdAt: Date.now(),
                    fetchInterval: 60000,
                    lastFetchStatus: 'idle',
                    remoteChanges: false
                },
                {
                    id: 'repo2',
                    name: 'Repo Two',
                    path: '/test/repo2',
                    enabled: true,
                    createdAt: Date.now(),
                    fetchInterval: 60000,
                    lastFetchStatus: 'idle',
                    remoteChanges: false
                },
                {
                    id: 'repo3',
                    name: 'Repo Three',
                    path: '/test/repo3',
                    enabled: true,
                    createdAt: Date.now(),
                    fetchInterval: 60000,
                    lastFetchStatus: 'idle',
                    remoteChanges: false
                }
            ];

            mockPlugin.settings.repositories.push(...repos);

            // Mock git operations with different outcomes
            jest.spyOn(gitService, 'fetchRepository')
                .mockImplementation(async (repoPath: string) => {
                    if (repoPath === '/test/repo1') return true;
                    if (repoPath === '/test/repo2') return true;
                    if (repoPath === '/test/repo3') return false; // Error
                    return true;
                });

            jest.spyOn(gitService, 'checkRemoteChanges')
                .mockImplementation(async (repoPath: string) => {
                    if (repoPath === '/test/repo1') {
                        return {
                            currentBranch: 'main',
                            trackingBranch: 'origin/main',
                            commitsAhead: 0,
                            commitsBehind: 2,
                            hasChanges: true
                        };
                    }
                    if (repoPath === '/test/repo2') {
                        return {
                            currentBranch: 'main',
                            trackingBranch: 'origin/main',
                            commitsAhead: 0,
                            commitsBehind: 0,
                            hasChanges: false
                        };
                    }
                    // repo3 won't reach here due to fetch failure
                    return {
                        currentBranch: null,
                        trackingBranch: null,
                        commitsAhead: 0,
                        commitsBehind: 0,
                        hasChanges: false
                    };
                });

            // Execute fetch all
            const results = await schedulerService.fetchAllNow();

            // Verify results
            expect(results).toHaveLength(3);

            // Verify repo1: success with changes
            const repo1 = configService.getRepository('repo1');
            expect(repo1!.lastFetchStatus).toBe('success');
            expect(repo1!.remoteChanges).toBe(true);
            expect(repo1!.remoteCommitCount).toBe(2);

            // Verify repo2: success without changes
            const repo2 = configService.getRepository('repo2');
            expect(repo2!.lastFetchStatus).toBe('success');
            expect(repo2!.remoteChanges).toBe(false);

            // Verify repo3: error
            const repo3 = configService.getRepository('repo3');
            expect(repo3!.lastFetchStatus).toBe('error');

            // Verify notifications: 1 for changes, 1 for error
            expect(Notice).toHaveBeenCalledTimes(2);
        });
    });

    describe('Interval Changes During Operation', () => {
        test('changing interval reschedules fetch', async () => {
            // Setup
            const repoConfig: RepositoryConfig = {
                id: 'repo1',
                name: 'Test Repo',
                path: '/test/repo1',
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Mock git operations
            jest.spyOn(gitService as any, 'executeGitCommand')
                .mockResolvedValue({ stdout: '', stderr: '', success: true });

            // Start scheduler
            schedulerService.startAll();
            const initialIntervalCount = (schedulerService as any).intervals.size;
            expect(initialIntervalCount).toBe(1);

            // Change interval
            await configService.updateFetchInterval('repo1', 120000);

            // Reschedule
            schedulerService.stopAll();
            schedulerService.startAll();

            // Verify rescheduling
            expect((schedulerService as any).intervals.size).toBe(1);
            expect((schedulerService as any).intervals.size).toBe(1);
        });

        test('disabling repository stops scheduling', async () => {
            // Setup
            const repoConfig: RepositoryConfig = {
                id: 'repo1',
                name: 'Test Repo',
                path: '/test/repo1',
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Start scheduler
            schedulerService.startAll();
            expect((schedulerService as any).intervals.size).toBe(1);

            // Disable repository
            await configService.toggleRepository('repo1');

            // Restart scheduler
            schedulerService.stopAll();
            schedulerService.startAll();

            // Verify no scheduling for disabled repo
            expect((schedulerService as any).intervals.size).toBe(0);
        });
    });

    describe('Plugin Reload Scenarios', () => {
        test('stopAll cleans up all intervals', () => {
            // Setup multiple repositories
            for (let i = 1; i <= 3; i++) {
                mockPlugin.settings.repositories.push({
                    id: `repo${i}`,
                    name: `Repo ${i}`,
                    path: `/test/repo${i}`,
                    enabled: true,
                    createdAt: Date.now(),
                    fetchInterval: 60000,
                    lastFetchStatus: 'idle',
                    remoteChanges: false
                });
            }

            // Start all
            schedulerService.startAll();
            expect((schedulerService as any).intervals.size).toBe(3);

            // Stop all (simulating plugin unload)
            schedulerService.stopAll();
            expect((schedulerService as any).intervals.size).toBe(0);
        });

        test('reload preserves repository status', async () => {
            // Setup with existing status
            const repoConfig: RepositoryConfig = {
                id: 'repo1',
                name: 'Test Repo',
                path: '/test/repo1',
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'success',
                lastFetchTime: Date.now() - 30000,
                remoteChanges: true,
                remoteCommitCount: 5
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Simulate reload
            schedulerService.stopAll();

            // Create new scheduler instance (simulating plugin reload)
            const newScheduler = new FetchSchedulerService(
                configService,
                gitService,
                notificationService
            );

            // Start new scheduler
            newScheduler.startAll();

            // Verify status preserved
            const repo = configService.getRepository('repo1');
            expect(repo!.lastFetchStatus).toBe('success');
            expect(repo!.remoteChanges).toBe(true);
            expect(repo!.remoteCommitCount).toBe(5);

            newScheduler.stopAll();
        });
    });

    describe('Settings Persistence Across Restarts', () => {
        test('fetch status persists after save', async () => {
            // Add repository
            const repoConfig: RepositoryConfig = {
                id: 'repo1',
                name: 'Test Repo',
                path: '/test/repo1',
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Mock successful fetch with changes
            jest.spyOn(gitService, 'fetchRepository')
                .mockResolvedValue(true);

            jest.spyOn(gitService, 'checkRemoteChanges')
                .mockResolvedValue({
                    currentBranch: 'main',
                    trackingBranch: 'origin/main',
                    commitsAhead: 0,
                    commitsBehind: 3,
                    hasChanges: true
                });

            // Execute fetch
            await schedulerService.fetchRepositoryNow('repo1');

            // Verify save was called
            expect(mockPlugin.saveSettings).toHaveBeenCalled();

            // Verify settings contain updated status
            const savedRepo = mockPlugin.settings.repositories.find(r => r.id === 'repo1');
            expect(savedRepo).toBeDefined();
            expect(savedRepo!.lastFetchStatus).toBe('success');
            expect(savedRepo!.remoteChanges).toBe(true);
            expect(savedRepo!.remoteCommitCount).toBe(3);
        });
    });
});
