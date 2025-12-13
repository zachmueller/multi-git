import { ItemView, WorkspaceLeaf } from 'obsidian';
import type MultiGitPlugin from '../main';

/**
 * View type identifier for the Multi-Git status panel
 */
export const VIEW_TYPE_STATUS_PANEL = 'multi-git-status';

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
    private _plugin: MultiGitPlugin;

    /**
     * Create a new status panel view
     * @param leaf - The workspace leaf to attach to
     * @param plugin - The main plugin instance
     */
    constructor(leaf: WorkspaceLeaf, plugin: MultiGitPlugin) {
        super(leaf);
        this._plugin = plugin;
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
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('h4', { text: 'Multi-Git Status' });
        container.createEl('p', { text: 'Status panel initialization...' });
    }

    /**
     * Called when the view is closed
     * Stops polling and cleans up resources
     */
    async onClose(): Promise<void> {
        // Cleanup will be implemented in later phases
    }

    /**
     * Get the plugin instance
     * @returns The plugin instance
     */
    protected getPlugin(): MultiGitPlugin {
        return this._plugin;
    }
}
