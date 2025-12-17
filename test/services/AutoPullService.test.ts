import { AutoPullService } from '../../src/services/AutoPullService';
import { PullErrorCode, PullSkipReason } from '../../src/services/AutoPullService';

// Mock Obsidian
jest.mock('obsidian', () => ({
    Notice: jest.fn(),
}));

describe('AutoPullService', () => {
    let service: AutoPullService;
    let mockFastForwardDetection: any;
    let mockGitCommand: any;
    let mockNotification: any;
    let mockRepoConfig: any;
    let mockSettings: any;

    beforeEach(() => {
        // Create mock services
        mockFastForwardDetection = {
            detectFastForward: jest.fn(),
            canSafelyFastForward: jest.fn(),
        };

        mockGitCommand = {
            getRepositoryStatus: jest.fn(),
        };

        mockNotification = {
            show: jest.fn(),
            showManualInterventionNotification: jest.fn(),
        };

        mockRepoConfig = {
            getRepository: jest.fn(),
        };

        mockSettings = {
            autoPullEnabled: true,
            autoPullPerRepository: {},
            autoPullNotificationVerbosity: 'all',
            repositories: [],
            fetchInterval: 300000,
        };

        // Create service instance (5 parameters, no logger)
        service = new AutoPullService(
            mockFastForwardDetection,
            mockGitCommand,
            mockNotification,
            mockRepoConfig,
            mockSettings
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('TEST-001: Service Foundation', () => {
        describe('isAutoPullEnabled()', () => {
            it('should return true when global setting is enabled and no per-repo override', () => {
                mockSettings.autoPullEnabled = true;
                mockSettings.autoPullPerRepository = {};

                const result = service.isAutoPullEnabled('repo1');

                expect(result).toBe(true);
            });

            it('should return false when global setting is disabled and no per-repo override', () => {
                mockSettings.autoPullEnabled = false;
                mockSettings.autoPullPerRepository = {};

                const result = service.isAutoPullEnabled('repo1');

                expect(result).toBe(false);
            });

            it('should respect per-repository override when enabled', () => {
                mockSettings.autoPullEnabled = false;
                mockSettings.autoPullPerRepository = { repo1: true };

                const result = service.isAutoPullEnabled('repo1');

                expect(result).toBe(true);
            });

            it('should respect per-repository override when disabled', () => {
                mockSettings.autoPullEnabled = true;
                mockSettings.autoPullPerRepository = { repo1: false };

                const result = service.isAutoPullEnabled('repo1');

                expect(result).toBe(false);
            });

            it('should fall back to global setting when per-repo override not set', () => {
                mockSettings.autoPullEnabled = true;
                mockSettings.autoPullPerRepository = { repo2: false };

                const result = service.isAutoPullEnabled('repo1');

                expect(result).toBe(true);
            });
        });

        describe('getPullHistory()', () => {
            it('should return empty array when no history exists', () => {
                const result = service.getPullHistory('repo1');

                expect(result).toEqual([]);
            });

            it('should return history entries for a repository', async () => {
                // Setup mock repository
                mockRepoConfig.getRepository.mockReturnValue({
                    id: 'repo1',
                    name: 'Test Repo',
                    path: '/path/to/repo',
                });

                mockSettings.autoPullEnabled = false; // Will skip

                // Execute a pull operation to generate history
                await service.attemptAutoPull('repo1');

                const history = service.getPullHistory('repo1');

                expect(history.length).toBe(1);
                expect(history[0].result).toBe('skipped');
            });
        });
    });

    describe('TEST-004: Orchestration & History', () => {
        const repositoryId = 'repo1';
        const repositoryName = 'Test Repo';
        const repoPath = '/path/to/repo';

        beforeEach(() => {
            mockRepoConfig.getRepository.mockReturnValue({
                id: repositoryId,
                name: repositoryName,
                path: repoPath,
            });
        });

        describe('attemptAutoPull() - Configuration Checks', () => {
            it('should skip when auto-pull disabled globally', async () => {
                mockSettings.autoPullEnabled = false;
                mockSettings.autoPullPerRepository = {};

                const result = await service.attemptAutoPull(repositoryId);

                expect(result.status).toBe('skipped');
                expect(result.skipReason).toBe(PullSkipReason.DISABLED_GLOBAL);
            });

            it('should skip when auto-pull disabled per-repository', async () => {
                mockSettings.autoPullEnabled = true;
                mockSettings.autoPullPerRepository = { [repositoryId]: false };

                const result = await service.attemptAutoPull(repositoryId);

                expect(result.status).toBe('skipped');
                expect(result.skipReason).toBe(PullSkipReason.DISABLED_REPO);
            });

            it('should proceed when auto-pull enabled', async () => {
                mockSettings.autoPullEnabled = true;
                mockSettings.autoPullPerRepository = {};

                mockGitCommand.getRepositoryStatus.mockResolvedValue({
                    hasUncommittedChanges: false,
                });
                mockFastForwardDetection.detectFastForward.mockResolvedValue({
                    status: 'can-fast-forward',
                });
                mockFastForwardDetection.canSafelyFastForward.mockReturnValue(true);

                // Mock executePull success (private method will use child_process)
                // We'll test that the service attempts to proceed past configuration checks

                const result = await service.attemptAutoPull(repositoryId);

                // Should at least get past configuration checks
                expect(result.status).not.toBe('skipped');
                expect(result.skipReason).not.toBe(PullSkipReason.DISABLED_GLOBAL);
                expect(result.skipReason).not.toBe(PullSkipReason.DISABLED_REPO);
            });
        });

        describe('attemptAutoPull() - Safety Checks', () => {
            beforeEach(() => {
                mockSettings.autoPullEnabled = true;
                mockSettings.autoPullPerRepository = {};
            });

            it('should skip when uncommitted changes exist', async () => {
                mockGitCommand.getRepositoryStatus.mockResolvedValue({
                    hasUncommittedChanges: true,
                });

                const result = await service.attemptAutoPull(repositoryId);

                expect(result.status).toBe('skipped');
                expect(result.skipReason).toBe(PullSkipReason.UNCOMMITTED_CHANGES);

                // Should notify manual intervention required
                expect(mockNotification.showManualInterventionNotification).toHaveBeenCalledWith(
                    expect.objectContaining({
                        repositoryId,
                        repositoryName,
                        skipReason: PullSkipReason.UNCOMMITTED_CHANGES,
                        status: 'skipped',
                    })
                );
            });

            it('should proceed when working directory clean', async () => {
                mockGitCommand.getRepositoryStatus.mockResolvedValue({
                    hasUncommittedChanges: false,
                });
                mockFastForwardDetection.detectFastForward.mockResolvedValue({
                    status: 'can-fast-forward',
                });
                mockFastForwardDetection.canSafelyFastForward.mockReturnValue(true);

                const result = await service.attemptAutoPull(repositoryId);

                // Should get past safety checks
                expect(result.skipReason).not.toBe(PullSkipReason.UNCOMMITTED_CHANGES);
            });
        });

        describe('attemptAutoPull() - Fast-Forward Detection', () => {
            beforeEach(() => {
                mockSettings.autoPullEnabled = true;
                mockSettings.autoPullPerRepository = {};
                mockGitCommand.getRepositoryStatus.mockResolvedValue({
                    hasUncommittedChanges: false,
                });
            });

            it('should skip when branches diverged', async () => {
                mockFastForwardDetection.detectFastForward.mockResolvedValue({
                    status: 'diverged',
                });
                mockFastForwardDetection.canSafelyFastForward.mockReturnValue(false);

                const result = await service.attemptAutoPull(repositoryId);

                expect(result.status).toBe('skipped');
                expect(result.skipReason).toBe(PullSkipReason.DIVERGED_BRANCHES);

                // Should notify manual intervention required (critical scenario)
                expect(mockNotification.showManualInterventionNotification).toHaveBeenCalledWith(
                    expect.objectContaining({
                        repositoryId,
                        repositoryName,
                        skipReason: PullSkipReason.DIVERGED_BRANCHES,
                        status: 'skipped',
                    })
                );
            });

            it('should skip when detached HEAD', async () => {
                mockFastForwardDetection.detectFastForward.mockResolvedValue({
                    status: 'error',
                    errorCode: 'detached-head',
                });
                mockFastForwardDetection.canSafelyFastForward.mockReturnValue(false);

                const result = await service.attemptAutoPull(repositoryId);

                expect(result.status).toBe('skipped');
                expect(result.skipReason).toBe(PullSkipReason.DETACHED_HEAD);

                // Should notify manual intervention required
                expect(mockNotification.showManualInterventionNotification).toHaveBeenCalledWith(
                    expect.objectContaining({
                        repositoryId,
                        repositoryName,
                        skipReason: PullSkipReason.DETACHED_HEAD,
                        status: 'skipped',
                    })
                );
            });

            it('should skip when no tracking branch', async () => {
                mockFastForwardDetection.detectFastForward.mockResolvedValue({
                    status: 'error',
                    errorCode: 'no-upstream',
                });
                mockFastForwardDetection.canSafelyFastForward.mockReturnValue(false);

                const result = await service.attemptAutoPull(repositoryId);

                expect(result.status).toBe('skipped');
                expect(result.skipReason).toBe(PullSkipReason.NO_TRACKING_BRANCH);

                // Should notify manual intervention required
                expect(mockNotification.showManualInterventionNotification).toHaveBeenCalledWith(
                    expect.objectContaining({
                        repositoryId,
                        repositoryName,
                        skipReason: PullSkipReason.NO_TRACKING_BRANCH,
                        status: 'skipped',
                    })
                );
            });

            it('should proceed when fast-forward possible', async () => {
                mockFastForwardDetection.detectFastForward.mockResolvedValue({
                    status: 'can-fast-forward',
                });
                mockFastForwardDetection.canSafelyFastForward.mockReturnValue(true);

                const result = await service.attemptAutoPull(repositoryId);

                // Should get past fast-forward check
                expect(result.skipReason).not.toBe(PullSkipReason.NOT_FAST_FORWARD);
                expect(result.skipReason).not.toBe(PullSkipReason.DIVERGED_BRANCHES);
            });
        });

        describe('attemptAutoPull() - History Management', () => {
            beforeEach(() => {
                mockSettings.autoPullEnabled = true;
                mockSettings.autoPullPerRepository = {};
            });

            it('should add entry to history after operation', async () => {
                // Setup for skip scenario
                mockSettings.autoPullEnabled = false;

                await service.attemptAutoPull(repositoryId);

                const history = service.getPullHistory(repositoryId);
                expect(history.length).toBe(1);
                expect(history[0].repositoryName).toBe(repositoryName);
            });

            it('should maintain history limited to 10 entries', async () => {
                // Execute 15 operations
                for (let i = 0; i < 15; i++) {
                    mockSettings.autoPullEnabled = false;
                    await service.attemptAutoPull(repositoryId);
                    mockSettings.autoPullEnabled = true; // Toggle to generate new entries
                }

                const history = service.getPullHistory(repositoryId);
                expect(history.length).toBeLessThanOrEqual(10);
            });

            it('should order history most recent first', async () => {
                // Execute multiple operations
                mockSettings.autoPullEnabled = false;
                await service.attemptAutoPull(repositoryId);

                await new Promise(resolve => setTimeout(resolve, 10));

                mockSettings.autoPullEnabled = true;
                mockSettings.autoPullPerRepository = { [repositoryId]: false };
                await service.attemptAutoPull(repositoryId);

                const history = service.getPullHistory(repositoryId);
                expect(history.length).toBe(2);
                // Most recent should be first
                expect(history[0].timestamp.getTime()).toBeGreaterThan(history[1].timestamp.getTime());
            });
        });
    });

    describe('TEST-002: Logging Behavior', () => {
        let consoleDebugSpy: jest.SpyInstance;
        const repositoryId = 'repo1';
        const repositoryName = 'Test Repo';
        const repoPath = '/path/to/repo';

        beforeEach(() => {
            consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

            mockRepoConfig.getRepository.mockReturnValue({
                id: repositoryId,
                name: repositoryName,
                path: repoPath,
            });

            mockSettings.autoPullEnabled = true;
            mockGitCommand.getRepositoryStatus.mockResolvedValue({
                hasUncommittedChanges: false,
            });
        });

        afterEach(() => {
            consoleDebugSpy.mockRestore();
        });

        it('should generate pull start logs when debug mode enabled', async () => {
            // Arrange
            const Logger = require('../../src/utils/logger').Logger;
            Logger.initialize({
                repositories: [],
                version: '0.1.0',
                globalFetchInterval: 300000,
                fetchOnStartup: false,
                notifyOnRemoteChanges: true,
                debugLogging: true,
                customPathEntries: [],
                autoPullEnabled: true,
                autoPullPerRepository: {},
                autoPullNotificationVerbosity: 'all',
            });

            mockFastForwardDetection.detectFastForward.mockResolvedValue({
                status: 'can-fast-forward',
            });
            mockFastForwardDetection.canSafelyFastForward.mockReturnValue(true);

            // Act
            await service.attemptAutoPull(repositoryId);

            // Assert - Should have pull start logs
            expect(consoleDebugSpy).toHaveBeenCalled();
            const logs = consoleDebugSpy.mock.calls.map(call => call[0]);
            expect(logs.some((log: string) =>
                log.includes('[AutoPull]') && log.includes('Starting')
            )).toBe(true);
        });

        it('should NOT generate logs when debug mode disabled', async () => {
            // Arrange
            const Logger = require('../../src/utils/logger').Logger;
            Logger.initialize({
                repositories: [],
                version: '0.1.0',
                globalFetchInterval: 300000,
                fetchOnStartup: false,
                notifyOnRemoteChanges: true,
                debugLogging: false,
                customPathEntries: [],
                autoPullEnabled: true,
                autoPullPerRepository: {},
                autoPullNotificationVerbosity: 'all',
            });

            mockFastForwardDetection.detectFastForward.mockResolvedValue({
                status: 'can-fast-forward',
            });
            mockFastForwardDetection.canSafelyFastForward.mockReturnValue(true);

            // Act
            await service.attemptAutoPull(repositoryId);

            // Assert
            expect(consoleDebugSpy).not.toHaveBeenCalled();
        });

        it('should include repository identifier in logs', async () => {
            // Arrange
            const Logger = require('../../src/utils/logger').Logger;
            Logger.initialize({
                repositories: [],
                version: '0.1.0',
                globalFetchInterval: 300000,
                fetchOnStartup: false,
                notifyOnRemoteChanges: true,
                debugLogging: true,
                customPathEntries: [],
                autoPullEnabled: true,
                autoPullPerRepository: {},
                autoPullNotificationVerbosity: 'all',
            });

            mockFastForwardDetection.detectFastForward.mockResolvedValue({
                status: 'can-fast-forward',
            });
            mockFastForwardDetection.canSafelyFastForward.mockReturnValue(true);

            // Act
            await service.attemptAutoPull(repositoryId);

            // Assert
            const logs = consoleDebugSpy.mock.calls.map(call => call[0]);
            expect(logs.some((log: string) => log.includes(repositoryName))).toBe(true);
        });

        it('should log skip reasons appropriately', async () => {
            // Arrange
            const Logger = require('../../src/utils/logger').Logger;
            Logger.initialize({
                repositories: [],
                version: '0.1.0',
                globalFetchInterval: 300000,
                fetchOnStartup: false,
                notifyOnRemoteChanges: true,
                debugLogging: true,
                customPathEntries: [],
                autoPullEnabled: true,
                autoPullPerRepository: {},
                autoPullNotificationVerbosity: 'all',
            });

            mockGitCommand.getRepositoryStatus.mockResolvedValue({
                hasUncommittedChanges: true,
            });

            // Act
            await service.attemptAutoPull(repositoryId);

            // Assert
            const logs = consoleDebugSpy.mock.calls.map(call => call[0]);
            expect(logs.some((log: string) =>
                log.includes('skipped') || log.includes('uncommitted')
            )).toBe(true);
        });

        it('should sanitize error messages in logs', async () => {
            // Arrange
            const Logger = require('../../src/utils/logger').Logger;
            Logger.initialize({
                repositories: [],
                version: '0.1.0',
                globalFetchInterval: 300000,
                fetchOnStartup: false,
                notifyOnRemoteChanges: true,
                debugLogging: true,
                customPathEntries: [],
                autoPullEnabled: true,
                autoPullPerRepository: {},
                autoPullNotificationVerbosity: 'all',
            });

            const errorWithCredentials = new Error('Failed: https://user:pass@github.com/repo.git');
            mockFastForwardDetection.detectFastForward.mockRejectedValue(errorWithCredentials);

            // Act
            await service.attemptAutoPull(repositoryId);

            // Assert - Error should be logged but credentials should be sanitized
            const logs = consoleDebugSpy.mock.calls.map(call => call[0]);
            const errorLogs = logs.filter((log: string) => log.includes('error') || log.includes('failed'));

            // Should not contain credentials
            errorLogs.forEach((log: string) => {
                expect(log).not.toContain('user:pass');
            });
        });

        it('should log retry attempts with retry count', async () => {
            // Arrange
            const Logger = require('../../src/utils/logger').Logger;
            Logger.initialize({
                repositories: [],
                version: '0.1.0',
                globalFetchInterval: 300000,
                fetchOnStartup: false,
                notifyOnRemoteChanges: true,
                debugLogging: true,
                customPathEntries: [],
                autoPullEnabled: true,
                autoPullPerRepository: {},
                autoPullNotificationVerbosity: 'all',
            });

            mockFastForwardDetection.detectFastForward.mockResolvedValue({
                status: 'can-fast-forward',
            });
            mockFastForwardDetection.canSafelyFastForward.mockReturnValue(true);

            // Act
            await service.attemptAutoPull(repositoryId);

            // Assert - Should include attempt information
            const logs = consoleDebugSpy.mock.calls.map(call => call[0]);
            expect(logs.some((log: string) =>
                log.includes('attempt') || log.includes('retry')
            )).toBe(true);
        });
    });

    describe('TEST-005: Manual Pull & Notifications', () => {
        const repositoryId = 'repo1';
        const repositoryName = 'Test Repo';
        const repoPath = '/path/to/repo';

        beforeEach(() => {
            mockRepoConfig.getRepository.mockReturnValue({
                id: repositoryId,
                name: repositoryName,
                path: repoPath,
            });
        });

        describe('manualPull()', () => {
            it('should work when auto-pull disabled globally', async () => {
                mockSettings.autoPullEnabled = false;
                mockGitCommand.getRepositoryStatus.mockResolvedValue({
                    hasUncommittedChanges: false,
                });
                mockFastForwardDetection.detectFastForward.mockResolvedValue({
                    status: 'can-fast-forward',
                });
                mockFastForwardDetection.canSafelyFastForward.mockReturnValue(true);

                const result = await service.manualPull(repositoryId);

                // Should not skip due to disabled auto-pull
                expect(result.skipReason).not.toBe(PullSkipReason.DISABLED_GLOBAL);
                expect(result.skipReason).not.toBe(PullSkipReason.DISABLED_REPO);
            });

            it('should still perform safety checks', async () => {
                mockGitCommand.getRepositoryStatus.mockResolvedValue({
                    hasUncommittedChanges: true,
                });

                const result = await service.manualPull(repositoryId);

                expect(result.status).toBe('skipped');
                expect(result.skipReason).toBe(PullSkipReason.UNCOMMITTED_CHANGES);
            });

            it('should add entry to history', async () => {
                mockGitCommand.getRepositoryStatus.mockResolvedValue({
                    hasUncommittedChanges: true,
                });

                await service.manualPull(repositoryId);

                const history = service.getPullHistory(repositoryId);
                expect(history.length).toBe(1);
            });
        });

        describe('Manual Intervention Notifications', () => {
            beforeEach(() => {
                mockSettings.autoPullEnabled = true;
                mockGitCommand.getRepositoryStatus.mockResolvedValue({
                    hasUncommittedChanges: false,
                });
            });

            it('should call NotificationService for DIVERGED_BRANCHES', async () => {
                mockFastForwardDetection.detectFastForward.mockResolvedValue({
                    status: 'diverged',
                });
                mockFastForwardDetection.canSafelyFastForward.mockReturnValue(false);

                await service.attemptAutoPull(repositoryId);

                expect(mockNotification.showManualInterventionNotification).toHaveBeenCalledWith(
                    expect.objectContaining({
                        repositoryId,
                        repositoryName,
                        skipReason: PullSkipReason.DIVERGED_BRANCHES,
                    })
                );
            });

            it('should call NotificationService for UNCOMMITTED_CHANGES', async () => {
                mockGitCommand.getRepositoryStatus.mockResolvedValue({
                    hasUncommittedChanges: true,
                });

                await service.attemptAutoPull(repositoryId);

                expect(mockNotification.showManualInterventionNotification).toHaveBeenCalledWith(
                    expect.objectContaining({
                        repositoryId,
                        repositoryName,
                        skipReason: PullSkipReason.UNCOMMITTED_CHANGES,
                    })
                );
            });

            it('should call NotificationService for DETACHED_HEAD', async () => {
                mockFastForwardDetection.detectFastForward.mockResolvedValue({
                    status: 'error',
                    errorCode: 'detached-head',
                });
                mockFastForwardDetection.canSafelyFastForward.mockReturnValue(false);

                await service.attemptAutoPull(repositoryId);

                expect(mockNotification.showManualInterventionNotification).toHaveBeenCalledWith(
                    expect.objectContaining({
                        repositoryId,
                        repositoryName,
                        skipReason: PullSkipReason.DETACHED_HEAD,
                    })
                );
            });

            it('should call NotificationService for NO_TRACKING_BRANCH', async () => {
                mockFastForwardDetection.detectFastForward.mockResolvedValue({
                    status: 'error',
                    errorCode: 'no-upstream',
                });
                mockFastForwardDetection.canSafelyFastForward.mockReturnValue(false);

                await service.attemptAutoPull(repositoryId);

                expect(mockNotification.showManualInterventionNotification).toHaveBeenCalledWith(
                    expect.objectContaining({
                        repositoryId,
                        repositoryName,
                        skipReason: PullSkipReason.NO_TRACKING_BRANCH,
                    })
                );
            });

            it('should not call NotificationService for DISABLED states', async () => {
                mockSettings.autoPullEnabled = false;

                await service.attemptAutoPull(repositoryId);

                // DISABLED_GLOBAL/DISABLED_REPO should not trigger manual intervention notification
                expect(mockNotification.showManualInterventionNotification).not.toHaveBeenCalled();
            });

            it('should pass complete PullOperationState to NotificationService', async () => {
                mockGitCommand.getRepositoryStatus.mockResolvedValue({
                    hasUncommittedChanges: true,
                });

                await service.attemptAutoPull(repositoryId);

                expect(mockNotification.showManualInterventionNotification).toHaveBeenCalledWith(
                    expect.objectContaining({
                        repositoryId,
                        repositoryName,
                        repositoryPath: repoPath,
                        status: 'skipped',
                        skipReason: PullSkipReason.UNCOMMITTED_CHANGES,
                        pullType: 'fast-forward-only',
                        commitsBefore: expect.any(String),
                        commitsAfter: null,
                        commitsPulled: 0,
                        errorMessage: null,
                        errorCode: null,
                        retryCount: 0,
                        startTime: expect.any(Date),
                        endTime: expect.any(Date),
                    })
                );
            });
        });
    });
});
