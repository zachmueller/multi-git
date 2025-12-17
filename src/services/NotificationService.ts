/**
 * Notification Service
 * Manages user notifications for fetch operations and remote changes
 */

import { App, Notice } from 'obsidian';
import { MultiGitSettings } from '../settings/data';
import { Logger } from '../utils/logger';
import { ManualInterventionModal } from '../ui/ManualInterventionModal';
import type { PullOperationState, PullSkipReason, PullErrorCode } from './AutoPullService';

/**
 * Service for managing Obsidian Notice-based notifications
 */
export class NotificationService {
    private app: App;
    private settings: MultiGitSettings;
    private recentNotifications: Map<string, number>; // Track notifications to prevent duplicates
    private readonly NOTIFICATION_COOLDOWN = 60000; // 1 minute cooldown between duplicate notifications

    /**
     * Create a new NotificationService
     * @param app Obsidian app instance for creating modals
     * @param settings Plugin settings for checking notification preferences
     */
    constructor(app: App, settings: MultiGitSettings) {
        this.app = app;
        this.settings = settings;
        this.recentNotifications = new Map();
    }

    /**
     * Update settings reference (called when settings change)
     * @param settings Updated plugin settings
     */
    updateSettings(settings: MultiGitSettings): void {
        this.settings = settings;
    }

    /**
     * Notify user about remote changes in repository
     * Only called when remote has actionable changes
     * @param repoName Display name of repository
     * @param commitCount Number of commits behind
     */
    notifyRemoteChanges(repoName: string, commitCount: number): void {
        // Check if notifications are globally enabled
        if (!this.areNotificationsEnabled()) {
            Logger.debug('Notification', `Notification suppressed (disabled in settings): remote changes for ${repoName}`);
            return;
        }

        // Create notification key to track duplicates
        const notificationKey = `remote-changes:${repoName}`;

        // Check if we recently showed this notification
        if (this.isRecentNotification(notificationKey)) {
            Logger.debug('Notification', `Notification suppressed (cooldown): remote changes for ${repoName}`);
            return;
        }

        // Build clear, concise message
        const commitText = commitCount === 1 ? 'commit' : 'commits';
        const message = `📥 Repository '${repoName}' has ${commitCount} new ${commitText} available`;

        Logger.debug('Notification', `Showing remote changes notification for ${repoName}: ${commitCount} ${commitText}`);

        // Show Obsidian Notice (dismissible by user)
        new Notice(message, 8000); // 8 second duration

        // Track this notification
        this.trackNotification(notificationKey);
    }

    /**
     * Notify about fetch error (non-critical)
     * Shows dismissible notice with clear error information
     * @param repoName Display name of repository
     * @param error Error message or description
     */
    notifyFetchError(repoName: string, error: string): void {
        // Check if notifications are globally enabled
        if (!this.areNotificationsEnabled()) {
            Logger.debug('Notification', `Error notification suppressed (disabled in settings): ${repoName}`);
            return;
        }

        // Create notification key to track duplicates
        const notificationKey = `fetch-error:${repoName}`;

        // Check if we recently showed this notification (prevent error spam)
        if (this.isRecentNotification(notificationKey)) {
            Logger.debug('Notification', `Error notification suppressed (cooldown): ${repoName}`);
            return;
        }

        // Build clear error message
        const message = `⚠️ Failed to fetch repository '${repoName}': ${error}`;

        Logger.debug('Notification', `Showing fetch error notification for ${repoName}: ${error}`);

        // Show Obsidian Notice with longer duration for errors
        new Notice(message, 10000); // 10 second duration for errors

        // Track this notification
        this.trackNotification(notificationKey);
    }

    /**
     * Check if notifications are globally enabled
     * @returns true if user has enabled notifications in settings
     */
    areNotificationsEnabled(): boolean {
        return this.settings.notifyOnRemoteChanges;
    }

    /**
     * Check if a notification was recently shown (within cooldown period)
     * @param notificationKey Unique key identifying the notification
     * @returns true if notification was shown recently
     */
    private isRecentNotification(notificationKey: string): boolean {
        const lastShown = this.recentNotifications.get(notificationKey);
        if (!lastShown) {
            return false;
        }

        const now = Date.now();
        const timeSinceShown = now - lastShown;

        return timeSinceShown < this.NOTIFICATION_COOLDOWN;
    }

    /**
     * Track that a notification was shown
     * @param notificationKey Unique key identifying the notification
     */
    private trackNotification(notificationKey: string): void {
        this.recentNotifications.set(notificationKey, Date.now());

        // Clean up old entries to prevent memory leak
        // Remove entries older than 2x cooldown period
        const cutoff = Date.now() - (this.NOTIFICATION_COOLDOWN * 2);
        for (const [key, timestamp] of this.recentNotifications.entries()) {
            if (timestamp < cutoff) {
                this.recentNotifications.delete(key);
            }
        }
    }

    /**
     * Clear all tracked notifications
     * Useful for testing or when plugin reloads
     */
    clearTracking(): void {
        const count = this.recentNotifications.size;
        this.recentNotifications.clear();
        Logger.debug('Notification', `Cleared ${count} tracked notifications`);
    }

    /**
     * Show manual intervention notification based on pull operation state
     * 
     * Determines whether to show a modal (for critical scenarios) or a notice
     * (for less critical scenarios) based on the skip reason or error code.
     * 
     * **Critical Scenarios (Modal):**
     * - DIVERGED_BRANCHES: Requires manual merge/rebase decision
     * - AUTH_ERROR: Requires credential setup
     * - CONCURRENT_OPERATION: May indicate stuck operation
     * 
     * **Less Critical Scenarios (Notice):**
     * - UNCOMMITTED_CHANGES: User needs to commit or stash
     * - LOCK_ERROR: Usually auto-resolves, retry will occur
     * - DISABLED states: No notification needed (expected)
     * 
     * Critical scenarios always show modal regardless of verbosity settings.
     * Less critical scenarios respect the notification verbosity preference.
     * 
     * @param state Complete pull operation state including skip reason and error
     */
    showManualInterventionNotification(state: PullOperationState): void {
        const skipReason = state.skipReason;
        const errorCode = state.errorCode;

        Logger.debug('Notification', `Determining notification type for ${state.repositoryName}, skipReason: ${skipReason}, errorCode: ${errorCode}`);

        // Determine if this is a critical scenario requiring modal
        const isCritical = this.shouldShowModal(skipReason, errorCode);

        if (isCritical) {
            // Critical scenarios: Always show modal regardless of verbosity
            Logger.debug('Notification', `Showing critical modal for ${state.repositoryName}`);
            this.showManualInterventionModal(state);
        } else {
            // Less critical: Show notice if verbosity allows
            Logger.debug('Notification', `Showing non-critical notice for ${state.repositoryName}`);
            this.showManualInterventionNotice(state);
        }
    }

    /**
     * Determine if a scenario requires a modal (critical) or just a notice
     * 
     * @param skipReason Reason pull was skipped
     * @param errorCode Error code if pull failed
     * @returns true if modal should be shown (critical scenario)
     */
    private shouldShowModal(
        skipReason: PullSkipReason | null,
        errorCode: PullErrorCode | null
    ): boolean {
        // Critical skip reasons
        if (skipReason === 'DIVERGED_BRANCHES') {
            return true;
        }

        if (skipReason === 'CONCURRENT_OPERATION') {
            return true;
        }

        // Critical error codes
        if (errorCode === 'AUTH_ERROR') {
            return true;
        }

        // All other scenarios are less critical
        return false;
    }

    /**
     * Show modal for critical manual intervention scenarios
     * 
     * Modal is non-dismissible and provides clear guidance on resolution.
     * Always shown regardless of notification verbosity settings.
     * 
     * @param state Pull operation state
     */
    private showManualInterventionModal(state: PullOperationState): void {
        Logger.debug('Notification', `Opening ManualInterventionModal for ${state.repositoryName}`);

        const modal = new ManualInterventionModal(this.app, state);
        modal.open();
    }

    /**
     * Show notice for less critical manual intervention scenarios
     * 
     * Notice is dismissible and respects notification verbosity settings.
     * 
     * @param state Pull operation state
     */
    private showManualInterventionNotice(state: PullOperationState): void {
        const verbosity = this.settings.autoPullNotificationVerbosity;

        // Silent mode: no notices
        if (verbosity === 'silent') {
            Logger.debug('Notification', `Notice suppressed (silent mode): ${state.repositoryName}`);
            return;
        }

        // Check for disabled states - these don't need notifications (expected behavior)
        if (state.skipReason === 'DISABLED_GLOBAL' || state.skipReason === 'DISABLED_REPO') {
            Logger.debug('Notification', `No notice for disabled state: ${state.repositoryName}`);
            return;
        }

        // Build appropriate message based on skip reason
        const message = this.getNotificationMessage(state);

        // Check cooldown to prevent duplicate notices
        const notificationKey = `manual-intervention:${state.repositoryId}:${state.skipReason || state.errorCode}`;
        if (this.isRecentNotification(notificationKey)) {
            Logger.debug('Notification', `Notice suppressed (cooldown): ${state.repositoryName}`);
            return;
        }

        Logger.debug('Notification', `Showing manual intervention notice for ${state.repositoryName}: ${message}`);

        // Show notice with appropriate duration
        new Notice(message, 8000); // 8 second duration

        // Track this notification
        this.trackNotification(notificationKey);
    }

    /**
     * Get user-friendly notification message based on pull operation state
     * 
     * @param state Pull operation state
     * @returns Human-readable message explaining the situation
     */
    private getNotificationMessage(state: PullOperationState): string {
        const repoName = state.repositoryName;
        const skipReason = state.skipReason;
        const errorCode = state.errorCode;

        // Handle skip reasons
        if (skipReason === 'UNCOMMITTED_CHANGES') {
            return `⚠️ ${repoName}: Cannot auto-pull - you have uncommitted changes. Commit or stash them first.`;
        }

        if (skipReason === 'DETACHED_HEAD') {
            return `⚠️ ${repoName}: Cannot auto-pull - repository is in detached HEAD state.`;
        }

        if (skipReason === 'NO_TRACKING_BRANCH') {
            return `⚠️ ${repoName}: Cannot auto-pull - no tracking branch configured.`;
        }

        if (skipReason === 'NOT_FAST_FORWARD') {
            return `⚠️ ${repoName}: Cannot auto-pull - local branch has unpushed commits.`;
        }

        // Handle error codes
        if (errorCode === 'LOCK_ERROR') {
            return `⚠️ ${repoName}: Pull temporarily blocked - repository locked. Will retry automatically.`;
        }

        if (errorCode === 'NETWORK_ERROR') {
            return `⚠️ ${repoName}: Pull failed - network error. Will retry automatically.`;
        }

        if (errorCode === 'TIMEOUT_ERROR') {
            return `⚠️ ${repoName}: Pull timed out. Will retry automatically.`;
        }

        if (errorCode === 'UNKNOWN_ERROR') {
            return `⚠️ ${repoName}: Pull failed - ${state.errorMessage || 'unknown error'}`;
        }

        // Fallback message
        return `⚠️ ${repoName}: Manual intervention may be required.`;
    }
}
