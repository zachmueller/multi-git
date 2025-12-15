/**
 * Unit tests for NotificationService
 */

import { Notice } from 'obsidian';
import { NotificationService } from '../../src/services/NotificationService';
import { MultiGitSettings, DEFAULT_SETTINGS } from '../../src/settings/data';
import { ManualInterventionModal } from '../../src/ui/ManualInterventionModal';
import type { PullOperationState } from '../../src/services/AutoPullService';

// Mock Obsidian Notice and Modal
jest.mock('obsidian', () => ({
    Notice: jest.fn(),
    Modal: class MockModal {
        constructor() { }
        open() { }
        close() { }
    },
}));

// Mock ManualInterventionModal
jest.mock('../../src/ui/ManualInterventionModal');

describe('NotificationService', () => {
    let notificationService: NotificationService;
    let mockSettings: MultiGitSettings;
    let mockNotice: jest.MockedClass<typeof Notice>;
    let mockApp: any;
    let mockModal: jest.Mocked<ManualInterventionModal>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        mockNotice = Notice as jest.MockedClass<typeof Notice>;

        // Mock Obsidian app
        mockApp = {
            workspace: {},
            vault: {},
        };

        // Mock ManualInterventionModal
        mockModal = {
            open: jest.fn(),
            close: jest.fn(),
        } as any;
        (ManualInterventionModal as jest.MockedClass<typeof ManualInterventionModal>).mockImplementation(() => mockModal);

        // Create test settings with notifications enabled
        mockSettings = {
            ...DEFAULT_SETTINGS,
            notifyOnRemoteChanges: true,
            autoPullNotificationVerbosity: 'all',
        };

        // Create service instance
        notificationService = new NotificationService(mockApp, mockSettings);
    });

    describe('constructor', () => {
        it('should initialize with settings', () => {
            expect(notificationService).toBeDefined();
            expect(notificationService.areNotificationsEnabled()).toBe(true);
        });
    });

    describe('updateSettings', () => {
        it('should update settings reference', () => {
            const newSettings = {
                ...mockSettings,
                notifyOnRemoteChanges: false,
            };

            notificationService.updateSettings(newSettings);
            expect(notificationService.areNotificationsEnabled()).toBe(false);
        });
    });

    describe('notifyRemoteChanges', () => {
        it('should show notification for remote changes', () => {
            notificationService.notifyRemoteChanges('test-repo', 5);

            expect(mockNotice).toHaveBeenCalledTimes(1);
            expect(mockNotice).toHaveBeenCalledWith(
                "📥 Repository 'test-repo' has 5 new commits available",
                8000
            );
        });

        it('should use singular "commit" for count of 1', () => {
            notificationService.notifyRemoteChanges('test-repo', 1);

            expect(mockNotice).toHaveBeenCalledTimes(1);
            expect(mockNotice).toHaveBeenCalledWith(
                "📥 Repository 'test-repo' has 1 new commit available",
                8000
            );
        });

        it('should use plural "commits" for count > 1', () => {
            notificationService.notifyRemoteChanges('test-repo', 3);

            expect(mockNotice).toHaveBeenCalledTimes(1);
            const call = mockNotice.mock.calls[0][0];
            expect(call).toContain('commits');
        });

        it('should not show notification when notifications disabled', () => {
            mockSettings.notifyOnRemoteChanges = false;
            notificationService = new NotificationService(mockApp, mockSettings);

            notificationService.notifyRemoteChanges('test-repo', 5);

            expect(mockNotice).not.toHaveBeenCalled();
        });

        it('should not show duplicate notification within cooldown period', () => {
            notificationService.notifyRemoteChanges('test-repo', 5);
            notificationService.notifyRemoteChanges('test-repo', 5);

            // Should only be called once due to cooldown
            expect(mockNotice).toHaveBeenCalledTimes(1);
        });

        it('should allow notification after cooldown period', () => {
            // Use fake timers
            jest.useFakeTimers();

            notificationService.notifyRemoteChanges('test-repo', 5);
            expect(mockNotice).toHaveBeenCalledTimes(1);

            // Advance time past cooldown (60 seconds)
            jest.advanceTimersByTime(61000);

            notificationService.notifyRemoteChanges('test-repo', 5);
            expect(mockNotice).toHaveBeenCalledTimes(2);

            jest.useRealTimers();
        });

        it('should track notifications separately per repository', () => {
            notificationService.notifyRemoteChanges('repo-1', 5);
            notificationService.notifyRemoteChanges('repo-2', 3);

            // Should show notification for each different repository
            expect(mockNotice).toHaveBeenCalledTimes(2);
        });
    });

    describe('notifyFetchError', () => {
        it('should show notification for fetch error', () => {
            notificationService.notifyFetchError('test-repo', 'Network error');

            expect(mockNotice).toHaveBeenCalledTimes(1);
            expect(mockNotice).toHaveBeenCalledWith(
                "⚠️ Failed to fetch repository 'test-repo': Network error",
                10000
            );
        });

        it('should not show notification when notifications disabled', () => {
            mockSettings.notifyOnRemoteChanges = false;
            notificationService = new NotificationService(mockApp, mockSettings);

            notificationService.notifyFetchError('test-repo', 'Network error');

            expect(mockNotice).not.toHaveBeenCalled();
        });

        it('should not show duplicate error notification within cooldown period', () => {
            notificationService.notifyFetchError('test-repo', 'Network error');
            notificationService.notifyFetchError('test-repo', 'Network error');

            // Should only be called once due to cooldown (prevent spam)
            expect(mockNotice).toHaveBeenCalledTimes(1);
        });

        it('should allow error notification after cooldown period', () => {
            jest.useFakeTimers();

            notificationService.notifyFetchError('test-repo', 'Network error');
            expect(mockNotice).toHaveBeenCalledTimes(1);

            // Advance time past cooldown (60 seconds)
            jest.advanceTimersByTime(61000);

            notificationService.notifyFetchError('test-repo', 'Network error');
            expect(mockNotice).toHaveBeenCalledTimes(2);

            jest.useRealTimers();
        });

        it('should track error notifications separately per repository', () => {
            notificationService.notifyFetchError('repo-1', 'Error 1');
            notificationService.notifyFetchError('repo-2', 'Error 2');

            // Should show notification for each different repository
            expect(mockNotice).toHaveBeenCalledTimes(2);
        });

        it('should track error and remote change notifications separately', () => {
            // Remote change notification
            notificationService.notifyRemoteChanges('test-repo', 5);

            // Error notification for same repo (different notification type)
            notificationService.notifyFetchError('test-repo', 'Network error');

            // Both should be shown as they are different notification types
            expect(mockNotice).toHaveBeenCalledTimes(2);
        });
    });

    describe('areNotificationsEnabled', () => {
        it('should return true when notifications enabled', () => {
            expect(notificationService.areNotificationsEnabled()).toBe(true);
        });

        it('should return false when notifications disabled', () => {
            mockSettings.notifyOnRemoteChanges = false;
            notificationService = new NotificationService(mockApp, mockSettings);

            expect(notificationService.areNotificationsEnabled()).toBe(false);
        });
    });

    describe('clearTracking', () => {
        it('should clear all tracked notifications', () => {
            // Show a notification
            notificationService.notifyRemoteChanges('test-repo', 5);
            expect(mockNotice).toHaveBeenCalledTimes(1);

            // Try to show again (should be blocked by cooldown)
            notificationService.notifyRemoteChanges('test-repo', 5);
            expect(mockNotice).toHaveBeenCalledTimes(1);

            // Clear tracking
            notificationService.clearTracking();

            // Now notification should show again
            notificationService.notifyRemoteChanges('test-repo', 5);
            expect(mockNotice).toHaveBeenCalledTimes(2);
        });
    });

    describe('memory leak prevention', () => {
        it('should clean up old notification tracking entries', () => {
            jest.useFakeTimers();

            // Show notifications for multiple repos
            notificationService.notifyRemoteChanges('repo-1', 5);
            notificationService.notifyRemoteChanges('repo-2', 3);
            notificationService.notifyRemoteChanges('repo-3', 7);

            expect(mockNotice).toHaveBeenCalledTimes(3);

            // Advance time past 2x cooldown period (120 seconds)
            jest.advanceTimersByTime(121000);

            // Show a new notification (triggers cleanup)
            notificationService.notifyRemoteChanges('repo-4', 2);

            // Old entries should be cleaned up, new notification should show
            expect(mockNotice).toHaveBeenCalledTimes(4);

            // Old notifications should now be allowed again
            notificationService.notifyRemoteChanges('repo-1', 5);
            notificationService.notifyRemoteChanges('repo-2', 3);
            notificationService.notifyRemoteChanges('repo-3', 7);

            expect(mockNotice).toHaveBeenCalledTimes(7);

            jest.useRealTimers();
        });
    });

    describe('integration scenarios', () => {
        it('should handle rapid successive notifications correctly', () => {
            // Simulate rapid updates from multiple repos
            notificationService.notifyRemoteChanges('repo-1', 1);
            notificationService.notifyRemoteChanges('repo-2', 2);
            notificationService.notifyRemoteChanges('repo-3', 3);
            notificationService.notifyRemoteChanges('repo-1', 1); // Duplicate, should be blocked
            notificationService.notifyRemoteChanges('repo-4', 4);

            // Should show 4 notifications (3 unique repos + 1 new repo)
            expect(mockNotice).toHaveBeenCalledTimes(4);
        });

        it('should handle settings changes during operation', () => {
            // Show notification with notifications enabled
            notificationService.notifyRemoteChanges('test-repo', 5);
            expect(mockNotice).toHaveBeenCalledTimes(1);

            // Disable notifications
            mockSettings.notifyOnRemoteChanges = false;
            notificationService.updateSettings(mockSettings);

            // Try to show notification (should be blocked)
            notificationService.notifyRemoteChanges('other-repo', 3);
            expect(mockNotice).toHaveBeenCalledTimes(1);

            // Re-enable notifications
            mockSettings.notifyOnRemoteChanges = true;
            notificationService.updateSettings(mockSettings);

            // Notification should work again
            notificationService.notifyRemoteChanges('other-repo', 3);
            expect(mockNotice).toHaveBeenCalledTimes(2);
        });
    });

    describe('showManualInterventionNotification', () => {
        const createPullState = (
            skipReason: string | null,
            errorCode: string | null = null
        ): PullOperationState => ({
            repositoryId: 'test-repo-id',
            repositoryName: 'test-repo',
            repositoryPath: '/path/to/test-repo',
            startTime: new Date(),
            endTime: new Date(),
            status: 'skipped',
            pullType: 'fast-forward-only',
            commitsBefore: 'abc123',
            commitsAfter: null,
            commitsPulled: 0,
            skipReason: skipReason as any,
            errorCode: errorCode as any,
            errorMessage: errorCode ? 'Test error message' : null,
            retryCount: 0,
            lastRetryTime: null,
            nextRetryTime: null,
        });

        describe('critical scenarios - modal shown', () => {
            it('should show modal for DIVERGED_BRANCHES', () => {
                const state = createPullState('DIVERGED_BRANCHES');

                notificationService.showManualInterventionNotification(state);

                expect(ManualInterventionModal).toHaveBeenCalledWith(mockApp, state);
                expect(mockModal.open).toHaveBeenCalled();
                expect(mockNotice).not.toHaveBeenCalled();
            });

            it('should show modal for CONCURRENT_OPERATION', () => {
                const state = createPullState('CONCURRENT_OPERATION');

                notificationService.showManualInterventionNotification(state);

                expect(ManualInterventionModal).toHaveBeenCalledWith(mockApp, state);
                expect(mockModal.open).toHaveBeenCalled();
                expect(mockNotice).not.toHaveBeenCalled();
            });

            it('should show modal for AUTH_ERROR', () => {
                const state = createPullState(null, 'AUTH_ERROR');

                notificationService.showManualInterventionNotification(state);

                expect(ManualInterventionModal).toHaveBeenCalledWith(mockApp, state);
                expect(mockModal.open).toHaveBeenCalled();
                expect(mockNotice).not.toHaveBeenCalled();
            });

            it('should show modal even in silent mode for critical scenarios', () => {
                mockSettings.autoPullNotificationVerbosity = 'silent';
                notificationService.updateSettings(mockSettings);

                const state = createPullState('DIVERGED_BRANCHES');
                notificationService.showManualInterventionNotification(state);

                expect(ManualInterventionModal).toHaveBeenCalled();
                expect(mockModal.open).toHaveBeenCalled();
            });
        });

        describe('less critical scenarios - notice shown', () => {
            it('should show notice for UNCOMMITTED_CHANGES', () => {
                const state = createPullState('UNCOMMITTED_CHANGES');

                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).toHaveBeenCalledTimes(1);
                expect(mockNotice.mock.calls[0][0]).toContain('uncommitted changes');
                expect(ManualInterventionModal).not.toHaveBeenCalled();
            });

            it('should show notice for DETACHED_HEAD', () => {
                const state = createPullState('DETACHED_HEAD');

                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).toHaveBeenCalledTimes(1);
                expect(mockNotice.mock.calls[0][0]).toContain('detached HEAD');
                expect(ManualInterventionModal).not.toHaveBeenCalled();
            });

            it('should show notice for NO_TRACKING_BRANCH', () => {
                const state = createPullState('NO_TRACKING_BRANCH');

                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).toHaveBeenCalledTimes(1);
                expect(mockNotice.mock.calls[0][0]).toContain('no tracking branch');
                expect(ManualInterventionModal).not.toHaveBeenCalled();
            });

            it('should show notice for NOT_FAST_FORWARD', () => {
                const state = createPullState('NOT_FAST_FORWARD');

                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).toHaveBeenCalledTimes(1);
                expect(mockNotice.mock.calls[0][0]).toContain('unpushed commits');
                expect(ManualInterventionModal).not.toHaveBeenCalled();
            });

            it('should show notice for LOCK_ERROR', () => {
                const state = createPullState(null, 'LOCK_ERROR');

                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).toHaveBeenCalledTimes(1);
                expect(mockNotice.mock.calls[0][0]).toContain('repository locked');
                expect(ManualInterventionModal).not.toHaveBeenCalled();
            });

            it('should show notice for NETWORK_ERROR', () => {
                const state = createPullState(null, 'NETWORK_ERROR');

                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).toHaveBeenCalledTimes(1);
                expect(mockNotice.mock.calls[0][0]).toContain('network error');
                expect(ManualInterventionModal).not.toHaveBeenCalled();
            });

            it('should show notice for TIMEOUT_ERROR', () => {
                const state = createPullState(null, 'TIMEOUT_ERROR');

                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).toHaveBeenCalledTimes(1);
                expect(mockNotice.mock.calls[0][0]).toContain('timed out');
                expect(ManualInterventionModal).not.toHaveBeenCalled();
            });

            it('should show notice for UNKNOWN_ERROR', () => {
                const state = createPullState(null, 'UNKNOWN_ERROR');

                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).toHaveBeenCalledTimes(1);
                expect(mockNotice.mock.calls[0][0]).toContain('Test error message');
                expect(ManualInterventionModal).not.toHaveBeenCalled();
            });

            it('should not show notice for DISABLED_GLOBAL', () => {
                const state = createPullState('DISABLED_GLOBAL');

                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).not.toHaveBeenCalled();
                expect(ManualInterventionModal).not.toHaveBeenCalled();
            });

            it('should not show notice for DISABLED_REPO', () => {
                const state = createPullState('DISABLED_REPO');

                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).not.toHaveBeenCalled();
                expect(ManualInterventionModal).not.toHaveBeenCalled();
            });

            it('should not show notice in silent mode', () => {
                mockSettings.autoPullNotificationVerbosity = 'silent';
                notificationService.updateSettings(mockSettings);

                const state = createPullState('UNCOMMITTED_CHANGES');
                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).not.toHaveBeenCalled();
            });

            it('should respect cooldown period for notices', () => {
                const state = createPullState('UNCOMMITTED_CHANGES');

                notificationService.showManualInterventionNotification(state);
                expect(mockNotice).toHaveBeenCalledTimes(1);

                // Try again immediately (should be blocked by cooldown)
                notificationService.showManualInterventionNotification(state);
                expect(mockNotice).toHaveBeenCalledTimes(1);
            });

            it('should allow notice after cooldown period', () => {
                jest.useFakeTimers();

                const state = createPullState('UNCOMMITTED_CHANGES');

                notificationService.showManualInterventionNotification(state);
                expect(mockNotice).toHaveBeenCalledTimes(1);

                // Advance time past cooldown (60 seconds)
                jest.advanceTimersByTime(61000);

                notificationService.showManualInterventionNotification(state);
                expect(mockNotice).toHaveBeenCalledTimes(2);

                jest.useRealTimers();
            });

            it('should include repository name in all messages', () => {
                const skipReasons = [
                    'UNCOMMITTED_CHANGES',
                    'DETACHED_HEAD',
                    'NO_TRACKING_BRANCH',
                    'NOT_FAST_FORWARD',
                ];

                skipReasons.forEach(reason => {
                    jest.clearAllMocks();
                    const state = createPullState(reason);

                    notificationService.showManualInterventionNotification(state);

                    expect(mockNotice).toHaveBeenCalledTimes(1);
                    expect(mockNotice.mock.calls[0][0]).toContain('test-repo');
                });
            });
        });

        describe('verbosity settings', () => {
            it('should respect all verbosity for non-critical scenarios', () => {
                mockSettings.autoPullNotificationVerbosity = 'all';
                notificationService.updateSettings(mockSettings);

                const state = createPullState('UNCOMMITTED_CHANGES');
                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).toHaveBeenCalled();
            });

            it('should suppress non-critical notices in silent mode', () => {
                mockSettings.autoPullNotificationVerbosity = 'silent';
                notificationService.updateSettings(mockSettings);

                const state = createPullState('UNCOMMITTED_CHANGES');
                notificationService.showManualInterventionNotification(state);

                expect(mockNotice).not.toHaveBeenCalled();
            });

            it('should always show critical modals regardless of verbosity', () => {
                const verbosityLevels = ['all', 'failures-only', 'silent'];

                verbosityLevels.forEach(level => {
                    jest.clearAllMocks();
                    mockSettings.autoPullNotificationVerbosity = level as any;
                    notificationService.updateSettings(mockSettings);

                    const state = createPullState('DIVERGED_BRANCHES');
                    notificationService.showManualInterventionNotification(state);

                    expect(ManualInterventionModal).toHaveBeenCalled();
                    expect(mockModal.open).toHaveBeenCalled();
                });
            });
        });

        describe('message content validation', () => {
            it('should include actionable guidance for UNCOMMITTED_CHANGES', () => {
                const state = createPullState('UNCOMMITTED_CHANGES');

                notificationService.showManualInterventionNotification(state);

                const message = mockNotice.mock.calls[0][0];
                expect(message).toContain('Commit or stash');
            });

            it('should indicate retry behavior for LOCK_ERROR', () => {
                const state = createPullState(null, 'LOCK_ERROR');

                notificationService.showManualInterventionNotification(state);

                const message = mockNotice.mock.calls[0][0];
                expect(message).toContain('retry automatically');
            });

            it('should use warning icon for non-critical scenarios', () => {
                const state = createPullState('UNCOMMITTED_CHANGES');

                notificationService.showManualInterventionNotification(state);

                const message = mockNotice.mock.calls[0][0];
                expect(message).toContain('⚠️');
            });
        });
    });
});
