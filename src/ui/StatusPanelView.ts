import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type MultiGitPlugin from '../main';
import { RepositoryStatus } from '../settings/data';
import { Logger } from '../utils/logger';

/**
 * View type identifier for the Multi-Git status panel
 */
export const VIEW_TYPE_STATUS_PANEL = 'multi-git-status';

/**
 * State management for status panel
 */
interface StatusPanelState {
    /** Cached status for each repository */
    statuses: Map<string, RepositoryStatus>;
    /** Whether a refresh operation is in progress */
    isRefreshing: boolean;
    /** Timestamp of last refresh */
    lastRefreshTime: number;
    /** Pending refresh request queued during active refresh */
    hasPendingRefresh: boolean;
}

/**
 * Status panel view for displaying repository status information
 * 
 * Displays a list of all configured repositories with their current status:
 * - Current branch
 * - Uncommitted changes
 * - Unpushed commits
 * - Remote changes available
 * - Last commit message
 * 
 * Updates automatically via:
 * - 30-second polling when panel is open
 * - Event-driven updates after git operations
 * - Manual refresh button
 */
export class StatusPanelView extends ItemView {
    private plugin: MultiGitPlugin;
    private state: StatusPanelState;
    private pollingInterval: NodeJS.Timeout | null = null;
    private headerEl: HTMLElement | null = null;
    private repositoryListEl: HTMLElement | null = null;

    /**
     * Create a new status panel view
     * @param leaf - The workspace leaf to attach to
     * @param plugin - The main plugin instance
     */
    constructor(leaf: WorkspaceLeaf, plugin: MultiGitPlugin) {
        super(leaf);
        this.plugin = plugin;

        // Initialize state
        this.state = {
            statuses: new Map(),
            isRefreshing: false,
            lastRefreshTime: 0,
            hasPendingRefresh: false
        };

        Logger.debug('StatusPanel', 'StatusPanelView instance created');
    }

    /**
     * Get the unique view type identifier
     * @returns The view type identifier
     */
    getViewType(): string {
        return VIEW_TYPE_STATUS_PANEL;
    }

    /**
     * Get the display text for the view
     * @returns The display text
     */
    getDisplayText(): string {
        return 'Multi-Git Status';
    }

    /**
     * Get the icon identifier for the view
     * @returns The icon identifier
     */
    getIcon(): string {
        return 'git-branch';
    }

    /**
     * Called when the view is opened
     * Initializes the panel UI and starts status polling
     */
    async onOpen(): Promise<void> {
        Logger.debug('StatusPanel', 'Opening status panel view');

        // Get the content container
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('multi-git-status-panel');

        // Create header with title and refresh button
        this.headerEl = container.createDiv({ cls: 'multi-git-status-header' });

        const titleContainer = this.headerEl.createDiv({ cls: 'multi-git-status-title-container' });
        titleContainer.createEl('h4', {
            text: 'Multi-Git Status',
            cls: 'multi-git-status-title'
        });

        // Add last refresh time display
        titleContainer.createEl('span', {
            cls: 'multi-git-status-last-refresh',
            text: 'Never refreshed'
        });

        // Add refresh button
        const refreshButton = this.headerEl.createEl('button', {
            cls: 'multi-git-status-refresh-button',
            attr: { 'aria-label': 'Refresh all repository statuses' }
        });
        setIcon(refreshButton, 'refresh-cw');
        refreshButton.addEventListener('click', () => {
            Logger.debug('StatusPanel', 'Manual refresh triggered');
            this.refreshAll();
        });

        // Create repository list container
        this.repositoryListEl = container.createDiv({ cls: 'multi-git-repository-list' });

        // Initial render
        await this.renderStatuses();

        // Start polling for status updates
        this.startPolling();

        Logger.debug('StatusPanel', 'Status panel view opened successfully');
    }

    /**
     * Called when the view is closed
     * Stops polling and cleans up resources
     */
    async onClose(): Promise<void> {
        Logger.debug('StatusPanel', 'Closing status panel view');

        // Stop polling
        this.stopPolling();

        // Clear cached status data
        this.state.statuses.clear();
        this.state.isRefreshing = false;
        this.state.lastRefreshTime = 0;
        this.state.hasPendingRefresh = false;

        // Clear DOM references
        this.headerEl = null;
        this.repositoryListEl = null;

        Logger.debug('StatusPanel', 'Status panel view closed and cleaned up');
    }

    /**
     * Start periodic status polling
     * Polls every 30 seconds when panel is open
     */
    private startPolling(): void {
        // Don't start if already polling
        if (this.pollingInterval !== null) {
            Logger.debug('StatusPanel', 'Polling already active, skipping start');
            return;
        }

        Logger.debug('StatusPanel', 'Starting status polling (30 second interval)');

        // Poll every 30 seconds
        this.pollingInterval = setInterval(() => {
            // Skip if refresh already in progress
            if (this.state.isRefreshing) {
                Logger.debug('StatusPanel', 'Skipping poll - refresh already in progress');
                return;
            }

            // Skip if no repositories configured
            const repositories = this.plugin.repositoryConfigService.getEnabledRepositories();
            if (repositories.length === 0) {
                Logger.debug('StatusPanel', 'Skipping poll - no repositories configured');
                return;
            }

            Logger.debug('StatusPanel', 'Executing scheduled status poll');
            this.refreshAll();
        }, 30000); // 30 seconds
    }

    /**
     * Stop periodic status polling
     * Cleans up interval timer
     */
    private stopPolling(): void {
        if (this.pollingInterval !== null) {
            Logger.debug('StatusPanel', 'Stopping status polling');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Refresh all repository statuses
     * Updates cache and triggers UI re-render
     * Implements debouncing to prevent overlapping refreshes
     */
    async refreshAll(): Promise<void> {
        // Prevent overlapping refreshes - queue at most one pending refresh
        if (this.state.isRefreshing) {
            if (!this.state.hasPendingRefresh) {
                Logger.debug('StatusPanel', 'Refresh in progress, queuing pending refresh');
                this.state.hasPendingRefresh = true;
            } else {
                Logger.debug('StatusPanel', 'Refresh in progress and one already queued, ignoring request');
            }
            return;
        }

        Logger.debug('StatusPanel', 'Starting refresh of all repository statuses');
        this.state.isRefreshing = true;
        this.state.hasPendingRefresh = false;

        // Update UI to show loading state
        this.renderStatuses();

        try {
            // Get all enabled repositories
            const repositories = this.plugin.repositoryConfigService.getEnabledRepositories();

            if (repositories.length === 0) {
                Logger.debug('StatusPanel', 'No repositories configured');
                return;
            }

            Logger.debug('StatusPanel', `Refreshing status for ${repositories.length} repositories`);

            // Refresh each repository with extended status
            const refreshPromises = repositories.map(async (repo: { id: string; name: string; path: string; lastFetchTime?: number; lastFetchStatus?: string; lastFetchError?: string }) => {
                try {
                    // Get extended status including remote tracking info
                    const status = await this.plugin.gitCommandService.getExtendedRepositoryStatus(
                        repo.path,
                        repo.id,
                        repo.name,
                        {
                            lastFetchTime: repo.lastFetchTime,
                            lastFetchStatus: repo.lastFetchStatus,
                            lastFetchError: repo.lastFetchError
                        }
                    );

                    this.state.statuses.set(repo.id, status);
                    Logger.debug('StatusPanel', `Updated status for repository: ${repo.name}`);
                } catch (error) {
                    Logger.error('StatusPanel', `Failed to get status for repository: ${repo.name}`, error);
                    // Store error state in cache for display
                    const errorStatus: RepositoryStatus = {
                        repositoryId: repo.id,
                        repositoryName: repo.name,
                        repositoryPath: repo.path,
                        currentBranch: null,
                        hasUncommittedChanges: false,
                        stagedFiles: [],
                        unstagedFiles: [],
                        untrackedFiles: [],
                        fetchStatus: 'error',
                        lastFetchError: error instanceof Error ? error.message : 'Unknown error'
                    };
                    this.state.statuses.set(repo.id, errorStatus);
                }
            });

            // Wait for all refreshes to complete
            await Promise.all(refreshPromises);

            // Update last refresh time
            this.state.lastRefreshTime = Date.now();

            Logger.debug('StatusPanel', 'All repository statuses refreshed successfully');
        } catch (error) {
            Logger.error('StatusPanel', 'Error during status refresh', error);
        } finally {
            this.state.isRefreshing = false;

            // Update UI with new data
            this.renderStatuses();

            // Execute queued refresh if one was requested
            if (this.state.hasPendingRefresh) {
                Logger.debug('StatusPanel', 'Executing queued refresh');
                this.state.hasPendingRefresh = false;
                // Use setTimeout to avoid blocking the current execution
                setTimeout(() => this.refreshAll(), 0);
            }
        }
    }

    /**
     * Refresh single repository status
     * Updates only the specified repository in cache and UI
     * @param repoId - Repository identifier to refresh
     */
    async refreshRepository(repoId: string): Promise<void> {
        Logger.debug('StatusPanel', `Refreshing status for repository: ${repoId}`);

        try {
            // Find repository config
            const repo = this.plugin.repositoryConfigService.getEnabledRepositories()
                .find(r => r.id === repoId);

            if (!repo) {
                Logger.debug('StatusPanel', `Repository not found: ${repoId}`);
                return;
            }

            // Get extended status including remote tracking info
            const status = await this.plugin.gitCommandService.getExtendedRepositoryStatus(
                repo.path,
                repo.id,
                repo.name,
                {
                    lastFetchTime: repo.lastFetchTime,
                    lastFetchStatus: repo.lastFetchStatus,
                    lastFetchError: repo.lastFetchError
                }
            );

            // Update cache
            this.state.statuses.set(repo.id, status);

            // Update UI
            this.renderStatuses();

            Logger.debug('StatusPanel', `Successfully refreshed repository: ${repo.name}`);
        } catch (error) {
            Logger.error('StatusPanel', `Failed to refresh repository: ${repoId}`, error);
        }
    }

    /**
     * Update UI with current status data
     * Renders loading state, empty state, or repository list
     */
    private renderStatuses(): void {
        if (!this.repositoryListEl) {
            Logger.debug('StatusPanel', 'Repository list element not available, skipping render');
            return;
        }

        // Clear existing content
        this.repositoryListEl.empty();

        // Update last refresh time in header
        this.updateLastRefreshTime();

        // Show loading state if refreshing
        if (this.state.isRefreshing) {
            const loadingEl = this.repositoryListEl.createDiv({ cls: 'multi-git-loading' });
            loadingEl.createEl('p', { text: 'Refreshing repository statuses...' });
            return;
        }

        // Show empty state if no repositories configured
        const repositories = this.plugin.repositoryConfigService.getEnabledRepositories();
        if (repositories.length === 0) {
            const emptyEl = this.repositoryListEl.createDiv({ cls: 'multi-git-empty-state' });
            emptyEl.createEl('p', { text: 'No repositories configured.' });
            emptyEl.createEl('p', {
                text: 'Add repositories in plugin settings to get started.',
                cls: 'multi-git-empty-state-hint'
            });
            return;
        }

        // Render repository statuses
        Logger.debug('StatusPanel', `Rendering ${this.state.statuses.size} repository statuses`);

        for (const repo of repositories) {
            const status = this.state.statuses.get(repo.id);
            if (status) {
                this.renderRepositoryStatus(status, this.repositoryListEl);
            }
        }
    }

    /**
     * Render a single repository status item
     * @param status - Repository status data
     * @param container - Parent element to render into
     */
    private renderRepositoryStatus(status: RepositoryStatus, container: HTMLElement): void {
        const itemEl = container.createDiv({
            cls: 'multi-git-repository-item',
            attr: {
                'role': 'article',
                'aria-label': `Repository: ${status.repositoryName}`
            }
        });

        // Repository name header
        const headerEl = itemEl.createDiv({ cls: 'multi-git-repo-header' });
        headerEl.createEl('h5', {
            text: status.repositoryName,
            cls: 'multi-git-repo-name'
        });

        // Branch information
        const branchEl = itemEl.createDiv({ cls: 'multi-git-repo-branch' });
        const branchIcon = branchEl.createSpan({
            cls: 'multi-git-branch-icon',
            attr: { 'aria-hidden': 'true' }
        });
        setIcon(branchIcon, 'git-branch');
        branchEl.createSpan({
            text: status.currentBranch || 'detached HEAD',
            cls: status.currentBranch ? 'multi-git-branch-name' : 'multi-git-branch-name multi-git-detached',
            attr: {
                'aria-label': `Branch: ${status.currentBranch || 'detached HEAD'}`
            }
        });

        // Status indicators container
        const statusEl = itemEl.createDiv({
            cls: 'multi-git-repo-status',
            attr: { 'role': 'list', 'aria-label': 'Repository status indicators' }
        });

        // Error state (highest priority)
        if (status.fetchStatus === 'error' && status.lastFetchError) {
            const errorEl = statusEl.createDiv({
                cls: 'multi-git-status-indicator multi-git-error',
                attr: { 'role': 'listitem' }
            });
            const icon = errorEl.createSpan({
                cls: 'multi-git-status-icon',
                attr: { 'aria-hidden': 'true' }
            });
            setIcon(icon, 'alert-circle');

            const errorTextEl = errorEl.createDiv({ cls: 'multi-git-error-content' });
            errorTextEl.createSpan({
                text: this.formatErrorMessage(status.lastFetchError),
                cls: 'multi-git-status-text',
                attr: {
                    'aria-label': `Error: ${status.lastFetchError}`,
                    'title': status.lastFetchError
                }
            });

            // Add retry button for errors
            const retryButton = errorTextEl.createEl('button', {
                cls: 'multi-git-retry-button',
                text: 'Retry',
                attr: {
                    'aria-label': `Retry fetching status for ${status.repositoryName}`,
                    'type': 'button'
                }
            });
            retryButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                Logger.debug('StatusPanel', `Retrying status fetch for repository: ${status.repositoryName}`);
                await this.refreshRepository(status.repositoryId);
            });
        }

        // Uncommitted changes
        if (status.hasUncommittedChanges) {
            const changesEl = statusEl.createDiv({
                cls: 'multi-git-status-indicator multi-git-uncommitted',
                attr: { 'role': 'listitem' }
            });
            const icon = changesEl.createSpan({
                cls: 'multi-git-status-icon',
                attr: { 'aria-hidden': 'true' }
            });
            setIcon(icon, 'circle-dot');
            const totalChanges = status.stagedFiles.length + status.unstagedFiles.length + status.untrackedFiles.length;
            changesEl.createSpan({
                text: `${totalChanges} uncommitted`,
                cls: 'multi-git-status-text',
                attr: { 'aria-label': `${totalChanges} uncommitted change${totalChanges !== 1 ? 's' : ''}` }
            });
        }

        // Unpushed commits
        if (status.unpushedCommits && status.unpushedCommits > 0) {
            const unpushedEl = statusEl.createDiv({
                cls: 'multi-git-status-indicator multi-git-unpushed',
                attr: { 'role': 'listitem' }
            });
            const icon = unpushedEl.createSpan({
                cls: 'multi-git-status-icon',
                attr: { 'aria-hidden': 'true' }
            });
            setIcon(icon, 'arrow-up');
            unpushedEl.createSpan({
                text: `${status.unpushedCommits} to push`,
                cls: 'multi-git-status-text',
                attr: { 'aria-label': `${status.unpushedCommits} commit${status.unpushedCommits !== 1 ? 's' : ''} to push` }
            });
        }

        // Remote changes
        if (status.remoteChanges && status.remoteChanges > 0) {
            const remoteEl = statusEl.createDiv({
                cls: 'multi-git-status-indicator multi-git-remote-changes',
                attr: { 'role': 'listitem' }
            });
            const icon = remoteEl.createSpan({
                cls: 'multi-git-status-icon',
                attr: { 'aria-hidden': 'true' }
            });
            setIcon(icon, 'arrow-down');
            remoteEl.createSpan({
                text: `${status.remoteChanges} to pull`,
                cls: 'multi-git-status-text',
                attr: { 'aria-label': `${status.remoteChanges} commit${status.remoteChanges !== 1 ? 's' : ''} available from remote` }
            });
        }

        // If everything is clean and up to date, show a status message
        if (!status.hasUncommittedChanges &&
            (!status.unpushedCommits || status.unpushedCommits === 0) &&
            (!status.remoteChanges || status.remoteChanges === 0) &&
            status.fetchStatus !== 'error') {
            const cleanEl = statusEl.createDiv({
                cls: 'multi-git-status-indicator multi-git-clean',
                attr: { 'role': 'listitem' }
            });
            const icon = cleanEl.createSpan({
                cls: 'multi-git-status-icon',
                attr: { 'aria-hidden': 'true' }
            });
            setIcon(icon, 'check-circle');
            cleanEl.createSpan({
                text: 'Up to date',
                cls: 'multi-git-status-text',
                attr: { 'aria-label': 'Repository is clean and up to date' }
            });
        }
    }

    /**
     * Format error message for display
     * Provides user-friendly error messages instead of raw git output
     * @param error - The error message to format
     * @returns Formatted user-friendly error message
     */
    private formatErrorMessage(error: string): string {
        // Check for common error patterns and provide clearer messages
        if (error.includes('Authentication failed') || error.includes('auth')) {
            return 'Authentication error';
        }
        if (error.includes('Could not resolve host') || error.includes('network')) {
            return 'Network error';
        }
        if (error.includes('Permission denied')) {
            return 'Permission denied';
        }
        if (error.includes('not a git repository')) {
            return 'Not a git repository';
        }
        if (error.includes('timeout')) {
            return 'Connection timeout';
        }

        // If message is short enough, show it directly
        if (error.length <= 50) {
            return error;
        }

        // Otherwise, show truncated version
        return error.substring(0, 47) + '...';
    }

    /**
     * Update the last refresh time display in header
     */
    private updateLastRefreshTime(): void {
        if (!this.headerEl) return;

        const lastRefreshEl = this.headerEl.querySelector('.multi-git-status-last-refresh') as HTMLElement;
        if (!lastRefreshEl) return;

        if (this.state.lastRefreshTime === 0) {
            lastRefreshEl.textContent = 'Never refreshed';
        } else {
            const elapsed = Date.now() - this.state.lastRefreshTime;
            const seconds = Math.floor(elapsed / 1000);

            if (seconds < 60) {
                lastRefreshEl.textContent = `Updated ${seconds}s ago`;
            } else {
                const minutes = Math.floor(seconds / 60);
                lastRefreshEl.textContent = `Updated ${minutes}m ago`;
            }
        }
    }

    /**
     * Get the plugin instance
     * @returns The plugin instance
     */
    protected getPlugin(): MultiGitPlugin {
        return this.plugin;
    }
}
