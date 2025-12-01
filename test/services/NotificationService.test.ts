/**
 * Unit tests for NotificationService
 */

import { Notice } from 'obsidian';
import { NotificationService } from '../../src/services/NotificationService';
import { MultiGitSettings, DEFAULT_SETTINGS } from '../../src/settings/data';

// Mock Obsidian Notice
jest.mock('obsidian', () => ({
    Notice: jest.fn(),
}));

describe('NotificationService', () => {
    let notificationService: NotificationService;
    let mockSettings: MultiGitSettings;
    let mockNotice: jest.MockedClass<typeof Notice>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        mockNotice = Notice as jest.MockedClass<typeof Notice>;

        // Create test settings with notifications enabled
        mockSettings = {
            ...DEFAULT_SETTINGS,
            notifyOnRemoteChanges: true,
        };

        // Create service instance
        notificationService = new NotificationService(mockSettings);
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
            notificationService = new NotificationService(mockSettings);

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
            notificationService = new NotificationService(mockSettings);

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
            notificationService = new NotificationService(mockSettings);

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
});
