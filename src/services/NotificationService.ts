/**
 * Notification Service
 * Manages user notifications for fetch operations and remote changes
 */

import { Notice } from 'obsidian';
import { MultiGitSettings } from '../settings/data';
import { Logger } from '../utils/logger';

/**
 * Service for managing Obsidian Notice-based notifications
 */
export class NotificationService {
    private settings: MultiGitSettings;
    private recentNotifications: Map<string, number>; // Track notifications to prevent duplicates
    private readonly NOTIFICATION_COOLDOWN = 60000; // 1 minute cooldown between duplicate notifications

    /**
     * Create a new NotificationService
     * @param settings Plugin settings for checking notification preferences
     */
    constructor(settings: MultiGitSettings) {
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
}
