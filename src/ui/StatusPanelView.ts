import { ItemView, WorkspaceLeaf, setIcon, Notice } from 'obsidian';
import type MultiGitPlugin from '../main';
import { RepositoryStatus } from '../settings/data';
import { Logger } from '../utils/logger';
import type { PullHistoryEntry } from '../services/AutoPullService';

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
    private dataRefreshInterval: NodeJS.Timeout | null = null;
    private timestampUpdateInterval: NodeJS.Timeout | null = null;
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
     * Start periodic status polling with dual timers
     * - Data refresh: Every 5 minutes
     * - Timestamp update: Every 5 seconds
     */
    private startPolling(): void {
        // Don't start if already polling
        if (this.dataRefreshInterval !== null || this.timestampUpdateInterval !== null) {
            Logger.debug('StatusPanel', 'Polling already active, skipping start');
            return;
        }

        Logger.debug('StatusPanel', 'Starting status polling (5 minute data refresh + 5 second timestamp update)');

        // Data refresh interval - every 5 minutes
        this.dataRefreshInterval = setInterval(() => {
            // Skip if refresh already in progress
            if (this.state.isRefreshing) {
                Logger.debug('StatusPanel', 'Skipping data refresh poll - refresh already in progress');
                return;
            }

            // Skip if no repositories configured
            const repositories = this.plugin.repositoryConfigService.getEnabledRepositories();
            if (repositories.length === 0) {
                Logger.debug('StatusPanel', 'Skipping data refresh poll - no repositories configured');
                return;
            }

            Logger.debug('StatusPanel', 'Executing scheduled data refresh');
            this.refreshAll();
        }, 300000); // 5 minutes (300,000 ms)

        // Timestamp update interval - every 5 seconds
        this.timestampUpdateInterval = setInterval(() => {
            Logger.debug('StatusPanel', 'Updating timestamp display');
            this.updateLastRefreshTime();
        }, 5000); // 5 seconds
    }

    /**
     * Stop periodic status polling
     * Cleans up both data refresh and timestamp update interval timers
     */
    private stopPolling(): void {
        if (this.dataRefreshInterval !== null) {
            Logger.debug('StatusPanel', 'Stopping data refresh polling');
            clearInterval(this.dataRefreshInterval);
            this.dataRefreshInterval = null;
        }

        if (this.timestampUpdateInterval !== null) {
            Logger.debug('StatusPanel', 'Stopping timestamp update polling');
            clearInterval(this.timestampUpdateInterval);
            this.timestampUpdateInterval = null;
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

        // Repository name header with action buttons
        const headerEl = itemEl.createDiv({ cls: 'multi-git-repo-header' });
        headerEl.createEl('h5', {
            text: status.repositoryName,
            cls: 'multi-git-repo-name'
        });

        // Get most recent pull history entry to determine if action buttons needed
        const history = this.plugin.autoPullService.getPullHistory(status.repositoryId);
        const lastPullEntry = history.length > 0 ? history[0] : null;

        // Check if we should show Pull button (updates available scenarios)
        const shouldShowPullButton = this.shouldShowPullButton(status, lastPullEntry);
        if (shouldShowPullButton) {
            const pullButton = headerEl.createEl('button', {
                cls: 'multi-git-pull-button',
                text: 'Pull',
                attr: {
                    'aria-label': `Pull updates for ${status.repositoryName}`,
                    'type': 'button'
                }
            });

            pullButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleManualPull(status.repositoryId, status.repositoryName, pullButton);
            });
        }

        // Check if we should show "Open Terminal" button for critical scenarios
        const shouldShowTerminalButton = this.shouldShowTerminalButton(lastPullEntry);
        if (shouldShowTerminalButton) {
            const terminalButton = headerEl.createEl('button', {
                cls: 'multi-git-terminal-button',
                text: 'Open Terminal',
                attr: {
                    'aria-label': `Open terminal for ${status.repositoryName}`,
                    'type': 'button'
                }
            });

            terminalButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleOpenTerminal(status.repositoryPath, status.repositoryName, terminalButton);
            });
        }

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

        // Check for manual intervention scenarios (highest priority after errors)
        const interventionIndicator = this.getManualInterventionIndicator(lastPullEntry, status);
        if (interventionIndicator) {
            const interventionEl = statusEl.createDiv({
                cls: `multi-git-status-indicator ${interventionIndicator.className}`,
                attr: { 'role': 'listitem' }
            });
            const icon = interventionEl.createSpan({
                cls: 'multi-git-status-icon',
                attr: { 'aria-hidden': 'true' }
            });
            setIcon(icon, interventionIndicator.icon);
            interventionEl.createSpan({
                text: interventionIndicator.text,
                cls: 'multi-git-status-text',
                attr: {
                    'aria-label': interventionIndicator.ariaLabel,
                    'title': interventionIndicator.tooltip
                }
            });
        }

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

            // Add help link for common error types
            const helpLink = this.getHelpLinkForError(status.lastFetchError);
            if (helpLink) {
                errorTextEl.createEl('a', {
                    text: 'Get help',
                    href: helpLink,
                    cls: 'multi-git-help-link',
                    attr: {
                        'target': '_blank',
                        'rel': 'noopener noreferrer',
                        'aria-label': 'Get help with this error'
                    }
                });
            }

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
        if (!interventionIndicator &&
            !status.hasUncommittedChanges &&
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

        // Pull History Section
        this.renderPullHistory(itemEl, status.repositoryId, status.repositoryName);
    }

    /**
     * Handle manual pull trigger from UI button
     * @param repositoryId Repository ID
     * @param repositoryName Repository name for logging
     * @param buttonEl Button element to show loading state
     */
    private async handleManualPull(
        repositoryId: string,
        repositoryName: string,
        buttonEl: HTMLButtonElement
    ): Promise<void> {
        Logger.debug('StatusPanel', `Manual pull triggered for repository: ${repositoryName}`);

        // Update button to loading state
        const originalText = buttonEl.textContent;
        buttonEl.textContent = 'Pulling...';
        buttonEl.disabled = true;

        try {
            // Trigger manual pull via AutoPullService
            const result = await this.plugin.autoPullService.manualPull(repositoryId);

            Logger.debug('StatusPanel', `Manual pull completed for ${repositoryName}: ${result.status}`);

            // Refresh repository status to reflect changes
            await this.refreshRepository(repositoryId);

            // Show result notification based on outcome
            if (result.status === 'success') {
                // Success notification already shown by AutoPullService
            } else if (result.status === 'failed') {
                // Failure notification already shown by AutoPullService
            } else if (result.status === 'skipped') {
                // Show skip reason to user
                const skipReasonText = this.formatSkipReason(result.skipReason);
                Logger.debug('StatusPanel', `Manual pull skipped for ${repositoryName}: ${skipReasonText}`);
            }
        } catch (error) {
            Logger.error('StatusPanel', `Manual pull error for ${repositoryName}`, error);
        } finally {
            // Restore button state
            buttonEl.textContent = originalText;
            buttonEl.disabled = false;
        }
    }

    /**
     * Format skip reason for user-friendly display
     * @param skipReason Skip reason enum value
     * @returns User-friendly description
     */
    private formatSkipReason(skipReason: string | null): string {
        if (!skipReason) return 'Unknown reason';

        const reasons: Record<string, string> = {
            'DISABLED_GLOBAL': 'Auto-pull disabled globally',
            'DISABLED_REPO': 'Auto-pull disabled for this repository',
            'UNCOMMITTED_CHANGES': 'Uncommitted changes present',
            'NOT_FAST_FORWARD': 'Cannot fast-forward',
            'DIVERGED_BRANCHES': 'Branches have diverged',
            'NO_TRACKING_BRANCH': 'No tracking branch configured',
            'DETACHED_HEAD': 'Detached HEAD state',
            'CONCURRENT_OPERATION': 'Another git operation in progress'
        };

        return reasons[skipReason] || skipReason;
    }

    /**
     * Render pull history section for a repository
     * @param container Parent element
     * @param repositoryId Repository ID
     * @param repositoryName Repository name for display
     */
    private renderPullHistory(
        container: HTMLElement,
        repositoryId: string,
        repositoryName: string
    ): void {
        // Get pull history from AutoPullService
        const history = this.plugin.autoPullService.getPullHistory(repositoryId);

        // Create collapsible pull history section
        const historySection = container.createDiv({ cls: 'multi-git-pull-history-section' });

        // History header (clickable to expand/collapse)
        const historyHeader = historySection.createDiv({
            cls: 'multi-git-pull-history-header',
            attr: {
                'role': 'button',
                'aria-expanded': 'false',
                'aria-label': 'Toggle pull history'
            }
        });

        const headerIcon = historyHeader.createSpan({
            cls: 'multi-git-pull-history-icon',
            attr: { 'aria-hidden': 'true' }
        });
        setIcon(headerIcon, 'chevron-right');

        historyHeader.createSpan({
            text: `Pull History (${history.length})`,
            cls: 'multi-git-pull-history-title'
        });

        // History content (collapsed by default)
        const historyContent = historySection.createDiv({
            cls: 'multi-git-pull-history-content',
            attr: { 'aria-hidden': 'true' }
        });
        historyContent.style.display = 'none';

        // Toggle expand/collapse
        historyHeader.addEventListener('click', () => {
            const isExpanded = historyContent.style.display !== 'none';

            if (isExpanded) {
                historyContent.style.display = 'none';
                historyHeader.setAttribute('aria-expanded', 'false');
                historyContent.setAttribute('aria-hidden', 'true');
                setIcon(headerIcon, 'chevron-right');
            } else {
                historyContent.style.display = 'block';
                historyHeader.setAttribute('aria-expanded', 'true');
                historyContent.setAttribute('aria-hidden', 'false');
                setIcon(headerIcon, 'chevron-down');
            }
        });

        // Render history entries
        if (history.length === 0) {
            historyContent.createDiv({
                cls: 'multi-git-pull-history-empty',
                text: 'No pull operations yet'
            });
        } else {
            // Render each history entry
            for (const entry of history) {
                this.renderPullHistoryEntry(historyContent, entry);
            }
        }
    }

    /**
     * Render a single pull history entry
     * @param container Parent element
     * @param entry Pull history entry data
     */
    private renderPullHistoryEntry(
        container: HTMLElement,
        entry: PullHistoryEntry
    ): void {
        const entryEl = container.createDiv({
            cls: `multi-git-pull-history-entry multi-git-pull-${entry.result}`,
            attr: { 'role': 'listitem' }
        });

        // Result icon
        const iconEl = entryEl.createSpan({
            cls: 'multi-git-pull-history-entry-icon',
            attr: { 'aria-hidden': 'true' }
        });

        let iconName: string;
        if (entry.result === 'success') {
            iconName = 'check-circle';
        } else if (entry.result === 'failed') {
            iconName = 'x-circle';
        } else {
            iconName = 'circle-slash';
        }
        setIcon(iconEl, iconName);

        // Entry details
        const detailsEl = entryEl.createDiv({ cls: 'multi-git-pull-history-entry-details' });

        // Timestamp (relative)
        const timestampEl = detailsEl.createDiv({
            cls: 'multi-git-pull-history-entry-timestamp',
            text: this.formatRelativeTime(entry.timestamp)
        });

        // Result-specific information
        if (entry.result === 'success' && entry.commitsPulled !== undefined) {
            detailsEl.createDiv({
                cls: 'multi-git-pull-history-entry-info',
                text: entry.commitsPulled === 1
                    ? '1 commit pulled'
                    : `${entry.commitsPulled} commits pulled`
            });
        } else if (entry.result === 'failed' && entry.errorMessage) {
            detailsEl.createDiv({
                cls: 'multi-git-pull-history-entry-error',
                text: entry.errorMessage,
                attr: { 'title': entry.errorMessage }
            });
        } else if (entry.result === 'skipped' && entry.skipReason) {
            detailsEl.createDiv({
                cls: 'multi-git-pull-history-entry-skip',
                text: this.formatSkipReason(entry.skipReason)
            });
        }
    }

    /**
     * Format timestamp as relative time
     * @param timestamp Date to format
     * @returns Human-readable relative time string
     */
    private formatRelativeTime(timestamp: Date): string {
        const now = Date.now();
        const then = timestamp.getTime();
        const elapsed = now - then;
        const seconds = Math.floor(elapsed / 1000);

        if (seconds < 60) {
            return 'Just now';
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(seconds / 86400);
            return `${days} day${days !== 1 ? 's' : ''} ago`;
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
     * Get help documentation link for common error types
     * Returns relevant documentation URLs based on error message patterns
     * @param error - The error message to analyze
     * @returns Help documentation URL or undefined
     */
    private getHelpLinkForError(error: string): string | undefined {
        const errorLower = error.toLowerCase();

        // Authentication errors
        if (errorLower.includes('authentication') ||
            errorLower.includes('auth') ||
            errorLower.includes('publickey') ||
            errorLower.includes('permission denied (publickey)')) {
            return 'https://docs.github.com/en/authentication/connecting-to-github-with-ssh';
        }

        // Network errors
        if (errorLower.includes('could not resolve host') ||
            errorLower.includes('network') ||
            errorLower.includes('connection refused') ||
            errorLower.includes('timeout') ||
            errorLower.includes('failed to connect')) {
            return 'https://git-scm.com/docs/git#_git_urls';
        }

        // Permission errors
        if (errorLower.includes('permission denied') &&
            !errorLower.includes('publickey')) {
            return 'https://git-scm.com/book/en/v2/Git-Internals-Environment-Variables#_permissions_and_ownership';
        }

        // Repository errors
        if (errorLower.includes('not a git repository') ||
            errorLower.includes('does not appear to be a git repository') ||
            errorLower.includes('repository not found')) {
            return 'https://git-scm.com/book/en/v2/Getting-Started-Getting-Help';
        }

        // Merge conflicts
        if (errorLower.includes('conflict') ||
            errorLower.includes('merge')) {
            return 'https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging#_basic_merge_conflicts';
        }

        return undefined;
    }

    /**
     * Update the last refresh time display in header
     * Uses human-readable format:
     * - "Just now" for 0-10 seconds
     * - "<1m" for 10-60 seconds
     * - "{n}m" for 60+ seconds
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

            if (seconds <= 10) {
                lastRefreshEl.textContent = 'Just now';
            } else if (seconds < 60) {
                lastRefreshEl.textContent = '<1m';
            } else {
                const minutes = Math.floor(seconds / 60);
                lastRefreshEl.textContent = `${minutes}m`;
            }
        }
    }

    /**
     * Determine if we should show the Pull button
     * @param status Repository status
     * @param lastPullEntry Most recent pull history entry
     * @returns true if Pull button should be displayed
     */
    private shouldShowPullButton(status: RepositoryStatus, lastPullEntry: PullHistoryEntry | null): boolean {
        // Show Pull button if remote changes available
        if (status.remoteChanges && status.remoteChanges > 0) {
            return true;
        }
        return false;
    }

    /**
     * Determine if we should show the "Open Terminal" button
     * @param lastPullEntry Most recent pull history entry
     * @returns true if terminal button should be displayed
     */
    private shouldShowTerminalButton(lastPullEntry: PullHistoryEntry | null): boolean {
        if (!lastPullEntry || lastPullEntry.result !== 'skipped') {
            return false;
        }

        // Show terminal button for critical scenarios that require manual intervention
        const criticalReasons = [
            'DIVERGED_BRANCHES',
            'AUTH_ERROR',
            'CONCURRENT_OPERATION',
            'LOCK_ERROR'
        ];

        return criticalReasons.includes(lastPullEntry.skipReason || '');
    }

    /**
     * Get manual intervention indicator based on pull history
     * @param lastPullEntry Most recent pull history entry
     * @param status Repository status for context
     * @returns Indicator configuration or null if no indicator needed
     */
    private getManualInterventionIndicator(
        lastPullEntry: PullHistoryEntry | null,
        status: RepositoryStatus
    ): { icon: string; text: string; className: string; ariaLabel: string; tooltip: string } | null {
        // No indicator if no history or last operation succeeded
        if (!lastPullEntry) {
            return null;
        }

        // Handle skipped operations with specific reasons
        if (lastPullEntry.result === 'skipped' && lastPullEntry.skipReason) {
            const skipReason = lastPullEntry.skipReason;

            // DIVERGED_BRANCHES - most critical, requires manual merge
            if (skipReason === 'DIVERGED_BRANCHES') {
                return {
                    icon: 'alert-triangle',
                    text: 'Manual merge required',
                    className: 'multi-git-manual-merge-required',
                    ariaLabel: 'Manual merge required - branches have diverged',
                    tooltip: 'Branches have diverged. Manual merge or rebase needed.'
                };
            }

            // AUTH_ERROR - needs credential setup
            if (skipReason === 'AUTH_ERROR') {
                return {
                    icon: 'key',
                    text: 'Authentication needed',
                    className: 'multi-git-auth-needed',
                    ariaLabel: 'Authentication needed',
                    tooltip: 'Git credentials need to be configured.'
                };
            }

            // CONCURRENT_OPERATION or LOCK_ERROR - repository busy
            if (skipReason === 'CONCURRENT_OPERATION' || skipReason === 'LOCK_ERROR') {
                return {
                    icon: 'lock',
                    text: 'Repository busy',
                    className: 'multi-git-repo-busy',
                    ariaLabel: 'Repository busy',
                    tooltip: 'Another git operation is in progress.'
                };
            }

            // DISABLED states with remote changes - show Updates Available
            if ((skipReason === 'DISABLED_GLOBAL' || skipReason === 'DISABLED_REPO') &&
                status.remoteChanges && status.remoteChanges > 0) {
                return {
                    icon: 'info',
                    text: 'Updates Available',
                    className: 'multi-git-updates-available',
                    ariaLabel: 'Updates available - auto-pull disabled',
                    tooltip: 'Remote changes available. Auto-pull is disabled.'
                };
            }

            // UNCOMMITTED_CHANGES with remote changes
            if (skipReason === 'UNCOMMITTED_CHANGES' &&
                status.remoteChanges && status.remoteChanges > 0) {
                return {
                    icon: 'info',
                    text: 'Updates Available',
                    className: 'multi-git-updates-available',
                    ariaLabel: 'Updates available - uncommitted changes present',
                    tooltip: 'Remote changes available. Commit or stash local changes first.'
                };
            }
        }

        // Handle failed operations
        if (lastPullEntry.result === 'failed' && lastPullEntry.errorMessage) {
            const errorLower = lastPullEntry.errorMessage.toLowerCase();

            // Auth failures
            if (errorLower.includes('auth')) {
                return {
                    icon: 'key',
                    text: 'Authentication needed',
                    className: 'multi-git-auth-needed',
                    ariaLabel: 'Authentication needed',
                    tooltip: lastPullEntry.errorMessage
                };
            }

            // Show generic failure indicator for other errors
            return {
                icon: 'alert-circle',
                text: 'Pull failed',
                className: 'multi-git-pull-failed',
                ariaLabel: 'Pull operation failed',
                tooltip: lastPullEntry.errorMessage
            };
        }

        return null;
    }

    /**
     * Handle opening terminal at repository location
     * @param repositoryPath Repository filesystem path
     * @param repositoryName Repository name for logging
     * @param buttonEl Button element to show loading state
     */
    private async handleOpenTerminal(
        repositoryPath: string,
        repositoryName: string,
        buttonEl: HTMLButtonElement
    ): Promise<void> {
        Logger.debug('StatusPanel', `Opening terminal for repository: ${repositoryName}`);

        // Update button to loading state
        const originalText = buttonEl.textContent;
        buttonEl.textContent = 'Opening...';
        buttonEl.disabled = true;

        try {
            // Use Node.js child_process to open terminal
            const { exec } = require('child_process');
            const platform = process.platform;

            let command: string;
            if (platform === 'darwin') {
                // macOS - open Terminal.app
                command = `open -a Terminal "${repositoryPath}"`;
            } else if (platform === 'win32') {
                // Windows - open Command Prompt
                command = `start cmd /K "cd /d ${repositoryPath}"`;
            } else {
                // Linux - try common terminal emulators
                command = `gnome-terminal --working-directory="${repositoryPath}" || xterm -e "cd ${repositoryPath} && bash"`;
            }

            await new Promise<void>((resolve, reject) => {
                exec(command, (error: Error | null) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            Logger.debug('StatusPanel', `Terminal opened successfully for ${repositoryName}`);
            new Notice(`Terminal opened for ${repositoryName}`, 3000);
        } catch (error) {
            Logger.error('StatusPanel', `Failed to open terminal for ${repositoryName}`, error);
            new Notice(`Failed to open terminal: ${error instanceof Error ? error.message : String(error)}`, 5000);
        } finally {
            // Restore button state
            buttonEl.textContent = originalText;
            buttonEl.disabled = false;
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
