import { App, PluginSettingTab, Setting, Modal, Notice, TextComponent } from 'obsidian';
import MultiGitPlugin from '../main';
import { RepositoryConfig } from './data';

/**
 * Settings tab for Multi-Git plugin
 * Provides UI for managing git repositories
 */
export class MultiGitSettingTab extends PluginSettingTab {
    plugin: MultiGitPlugin;

    constructor(app: App, plugin: MultiGitPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /**
     * Display the settings tab
     */
    display(): void {
        const { containerEl } = this;

        // Clear previous content
        containerEl.empty();

        // Add plugin description header
        containerEl.createEl('h2', { text: 'Multi-Git Repository Manager' });
        containerEl.createEl('p', {
            text: 'Manage multiple git repositories from within Obsidian. Add repositories by specifying their absolute paths, and enable/disable them as needed.',
            cls: 'setting-item-description'
        });

        // Add global fetch settings section
        this.displayGlobalFetchSettings(containerEl);

        // Add repository list section
        this.displayRepositoryList(containerEl);
    }

    /**
     * Display global fetch settings
     */
    private displayGlobalFetchSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Fetch Settings' });

        // Global fetch interval
        new Setting(containerEl)
            .setName('Default Fetch Interval')
            .setDesc('Default interval for automatic fetching (in minutes). Applied to new repositories.')
            .addText(text => {
                text
                    .setPlaceholder('5')
                    .setValue(String(this.plugin.settings.globalFetchInterval / 60000))
                    .onChange(async (value) => {
                        const minutes = parseInt(value);
                        if (!isNaN(minutes) && this.validateInterval(minutes)) {
                            this.plugin.settings.globalFetchInterval = minutes * 60000;
                            await this.plugin.saveSettings();
                        }
                    });
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.max = '60';
            });

        // Fetch on startup toggle
        new Setting(containerEl)
            .setName('Fetch on Startup')
            .setDesc('Automatically fetch all enabled repositories when Obsidian starts')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.fetchOnStartup)
                .onChange(async (value) => {
                    this.plugin.settings.fetchOnStartup = value;
                    await this.plugin.saveSettings();
                })
            );

        // Notification toggle
        new Setting(containerEl)
            .setName('Notify on Remote Changes')
            .setDesc('Show notifications when remote repositories have new commits available')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.notifyOnRemoteChanges)
                .onChange(async (value) => {
                    this.plugin.settings.notifyOnRemoteChanges = value;
                    await this.plugin.saveSettings();
                })
            );

        // Manual fetch all button with last fetch time
        const fetchAllSetting = new Setting(containerEl)
            .setName('Manual Fetch')
            .setDesc(this.getLastGlobalFetchDescription());

        fetchAllSetting.addButton(button => button
            .setButtonText('Fetch All Now')
            .setClass('mod-cta')
            .onClick(async () => {
                await this.handleFetchAllNow(button.buttonEl);
            })
            .setTooltip('Manually fetch all enabled repositories now')
        );
    }

    /**
     * Get description text for last global fetch time
     */
    private getLastGlobalFetchDescription(): string {
        if (!this.plugin.settings.lastGlobalFetch) {
            return 'Manually trigger fetch for all enabled repositories';
        }

        const lastFetchTime = this.formatRelativeTime(this.plugin.settings.lastGlobalFetch);
        return `Manually trigger fetch for all enabled repositories. Last fetch: ${lastFetchTime}`;
    }

    /**
     * Handle manual fetch all button click
     */
    private async handleFetchAllNow(buttonEl: HTMLElement): Promise<void> {
        const originalText = buttonEl.textContent || 'Fetch All Now';
        buttonEl.textContent = 'Fetching...';
        buttonEl.setAttribute('disabled', 'true');

        try {
            const results = await this.plugin.fetchSchedulerService.fetchAllNow();

            // Update last global fetch time
            this.plugin.settings.lastGlobalFetch = Date.now();
            await this.plugin.saveSettings();

            // Count successes and failures
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            const changesCount = results.filter(r => r.remoteChanges).length;

            // Show summary notification
            if (errorCount === 0) {
                if (changesCount > 0) {
                    new Notice(`✓ Fetched ${successCount} repositories. ${changesCount} have remote changes.`);
                } else {
                    new Notice(`✓ Fetched ${successCount} repositories. All up to date.`);
                }
            } else {
                new Notice(`Fetched ${successCount} repositories. ${errorCount} failed. Check status indicators.`, 5000);
            }

            // Refresh display to show updated status
            this.display();
        } catch (error) {
            console.error('Failed to fetch all repositories:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            new Notice(`Failed to fetch repositories: ${errorMessage}`, 5000);
        } finally {
            buttonEl.textContent = originalText;
            buttonEl.removeAttribute('disabled');
        }
    }

    /**
     * Display the list of configured repositories
     */
    private displayRepositoryList(containerEl: HTMLElement): void {
        const repositories = this.plugin.repositoryConfigService.getRepositories();

        // Create section header with count and add button
        const headerDiv = containerEl.createDiv({ cls: 'multi-git-header' });
        const headerTitleDiv = headerDiv.createDiv({ cls: 'multi-git-header-title' });
        headerTitleDiv.createEl('h3', {
            text: `Configured Repositories (${repositories.length})`
        });

        // Add repository button
        const addButton = headerDiv.createEl('button', {
            text: 'Add Repository',
            cls: 'mod-cta'
        });
        addButton.addEventListener('click', () => {
            new AddRepositoryModal(this.app, this.plugin, () => {
                this.display(); // Refresh display after adding
            }).open();
        });

        // Display empty state or repository list
        if (repositories.length === 0) {
            this.displayEmptyState(containerEl);
        } else {
            this.displayRepositories(containerEl, repositories);
        }
    }

    /**
     * Display empty state message when no repositories configured
     */
    private displayEmptyState(containerEl: HTMLElement): void {
        const emptyDiv = containerEl.createDiv({ cls: 'multi-git-empty-state' });
        emptyDiv.createEl('p', {
            text: 'No repositories configured yet. Click "Add Repository" to get started.',
            cls: 'setting-item-description'
        });
    }

    /**
     * Display list of repositories with controls
     */
    private displayRepositories(containerEl: HTMLElement, repositories: RepositoryConfig[]): void {
        const listContainer = containerEl.createDiv({ cls: 'multi-git-repository-list' });

        repositories.forEach(repo => {
            this.displayRepositoryItem(listContainer, repo);
        });
    }

    /**
     * Display a single repository item with controls
     */
    private displayRepositoryItem(container: HTMLElement, repo: RepositoryConfig): void {
        const setting = new Setting(container)
            .setClass('multi-git-repository-item');

        // Repository info section
        const infoDiv = setting.infoEl;
        infoDiv.empty();

        // Repository name with enabled/disabled indicator
        const nameDiv = infoDiv.createDiv({ cls: 'multi-git-repo-name' });
        const statusIcon = nameDiv.createSpan({
            cls: repo.enabled ? 'multi-git-status-enabled' : 'multi-git-status-disabled',
            text: repo.enabled ? '●' : '○'
        });
        statusIcon.setAttribute('aria-label', repo.enabled ? 'Enabled' : 'Disabled');
        nameDiv.createSpan({ text: ` ${repo.name}`, cls: 'multi-git-name-text' });

        // Fetch status indicator
        if (repo.enabled) {
            this.addFetchStatusIndicator(nameDiv, repo);
        }

        // Repository path
        infoDiv.createDiv({
            text: repo.path,
            cls: 'multi-git-repo-path setting-item-description'
        });

        // Repository metadata (including fetch status)
        const metaDiv = infoDiv.createDiv({ cls: 'multi-git-repo-meta setting-item-description' });
        const createdDate = new Date(repo.createdAt).toLocaleDateString();
        metaDiv.createSpan({ text: `Added: ${createdDate}` });

        if (repo.lastValidated) {
            const validatedDate = new Date(repo.lastValidated).toLocaleDateString();
            metaDiv.createSpan({ text: ` • Last validated: ${validatedDate}` });
        }

        // Add fetch status info
        if (repo.enabled && repo.lastFetchTime) {
            const lastFetchTime = this.formatRelativeTime(repo.lastFetchTime);
            metaDiv.createSpan({ text: ` • Last fetch: ${lastFetchTime}` });
        }

        // Fetch interval setting
        if (repo.enabled) {
            const intervalSetting = new Setting(infoDiv)
                .setName('Fetch Interval')
                .setDesc('Automatic fetch interval for this repository (in minutes)')
                .setClass('multi-git-nested-setting');

            intervalSetting.addText(text => {
                text
                    .setPlaceholder('5')
                    .setValue(String(repo.fetchInterval / 60000))
                    .onChange(async (value) => {
                        const minutes = parseInt(value);
                        if (!isNaN(minutes) && this.validateInterval(minutes)) {
                            await this.updateRepositoryInterval(repo.id, minutes);
                            // Clear any previous error
                            text.inputEl.style.borderColor = '';
                        } else {
                            // Show validation error
                            text.inputEl.style.borderColor = 'var(--text-error)';
                        }
                    });
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.max = '60';
                text.inputEl.style.width = '80px';
            });
        }

        // Fetch Now button (only for enabled repos)
        if (repo.enabled) {
            setting.addButton(button => button
                .setButtonText('Fetch Now')
                .onClick(async () => {
                    await this.handleFetchRepositoryNow(repo.id, button.buttonEl);
                })
                .setTooltip('Manually fetch this repository now')
            );
        }

        // Toggle button
        setting.addButton(button => {
            button
                .setButtonText(repo.enabled ? 'Disable' : 'Enable')
                .onClick(async () => {
                    await this.handleToggleRepository(repo.id);
                })
                .setTooltip(repo.enabled ? 'Disable this repository' : 'Enable this repository');

            // Only set class when there's a class to set (avoid empty string error)
            if (repo.enabled) {
                button.setClass('mod-warning');
            }

            return button;
        });

        // Remove button
        setting.addButton(button => button
            .setButtonText('Remove')
            .setClass('mod-warning')
            .onClick(async () => {
                await this.handleRemoveRepository(repo);
            })
            .setTooltip('Remove this repository from configuration')
        );
    }

    /**
     * Add fetch status indicator to repository name
     */
    private addFetchStatusIndicator(container: HTMLElement, repo: RepositoryConfig): void {
        let statusText = '';
        let statusClass = '';
        let tooltip = '';

        switch (repo.lastFetchStatus) {
            case 'fetching':
                statusText = ' ⟳';
                statusClass = 'multi-git-fetch-fetching';
                tooltip = 'Fetch in progress...';
                break;
            case 'success':
                if (repo.remoteChanges && repo.remoteCommitCount) {
                    statusText = ` ↓${repo.remoteCommitCount}`;
                    statusClass = 'multi-git-fetch-changes';
                    tooltip = `${repo.remoteCommitCount} commit(s) available from remote`;
                } else {
                    statusText = ' ✓';
                    statusClass = 'multi-git-fetch-success';
                    tooltip = 'Up to date with remote';
                }
                break;
            case 'error':
                statusText = ' ✗';
                statusClass = 'multi-git-fetch-error';
                tooltip = repo.lastFetchError || 'Last fetch failed';
                break;
            case 'idle':
                // No indicator for idle state
                break;
        }

        if (statusText) {
            const indicator = container.createSpan({
                text: statusText,
                cls: statusClass
            });
            indicator.setAttribute('aria-label', tooltip);
            indicator.setAttribute('title', tooltip);
        }
    }

    /**
     * Format timestamp as relative time
     */
    private formatRelativeTime(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) {
            return 'just now';
        } else if (minutes < 60) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (hours < 24) {
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (days < 7) {
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        } else {
            return new Date(timestamp).toLocaleDateString();
        }
    }

    /**
     * Validate fetch interval value
     */
    private validateInterval(minutes: number): boolean {
        return minutes >= 1 && minutes <= 60 && Number.isInteger(minutes);
    }

    /**
     * Update repository fetch interval
     */
    private async updateRepositoryInterval(repoId: string, minutes: number): Promise<void> {
        try {
            const intervalMs = minutes * 60000;
            await this.plugin.repositoryConfigService.updateFetchInterval(repoId, intervalMs);

            // Reschedule the repository with new interval
            this.plugin.fetchSchedulerService.unscheduleRepository(repoId);
            this.plugin.fetchSchedulerService.scheduleRepository(repoId, intervalMs);

            new Notice(`Fetch interval updated to ${minutes} minute${minutes !== 1 ? 's' : ''}`);
        } catch (error) {
            console.error('Failed to update fetch interval:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            new Notice(`Failed to update interval: ${errorMessage}`, 5000);
        }
    }

    /**
     * Handle manual fetch for specific repository
     */
    private async handleFetchRepositoryNow(repoId: string, buttonEl: HTMLElement): Promise<void> {
        const originalText = buttonEl.textContent || 'Fetch Now';
        buttonEl.textContent = 'Fetching...';
        buttonEl.setAttribute('disabled', 'true');

        try {
            const result = await this.plugin.fetchSchedulerService.fetchRepositoryNow(repoId);

            if (result.success) {
                if (result.remoteChanges) {
                    const count = result.commitsBehind || 0;
                    new Notice(`✓ Fetch complete. ${count} commit${count !== 1 ? 's' : ''} available from remote.`);
                } else {
                    new Notice('✓ Fetch complete. Repository is up to date.');
                }
            } else {
                const errorMsg = result.error || 'Unknown error';
                new Notice(`✗ Fetch failed: ${errorMsg}`, 5000);
            }

            // Refresh display to show updated status
            this.display();
        } catch (error) {
            console.error('Failed to fetch repository:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            new Notice(`Failed to fetch: ${errorMessage}`, 5000);
        } finally {
            buttonEl.textContent = originalText;
            buttonEl.removeAttribute('disabled');
        }
    }

    /**
     * Handle toggling repository enabled state
     */
    private async handleToggleRepository(repoId: string): Promise<void> {
        try {
            const newState = await this.plugin.repositoryConfigService.toggleRepository(repoId);

            if (newState !== null) {
                // Update scheduler based on new state
                if (newState) {
                    const repo = this.plugin.repositoryConfigService.getRepository(repoId);
                    if (repo) {
                        this.plugin.fetchSchedulerService.scheduleRepository(repoId, repo.fetchInterval);
                    }
                } else {
                    this.plugin.fetchSchedulerService.unscheduleRepository(repoId);
                }

                new Notice(`Repository ${newState ? 'enabled' : 'disabled'}`);
                this.display(); // Refresh display
            } else {
                new Notice('Repository not found', 3000);
            }
        } catch (error) {
            console.error('Failed to toggle repository:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            new Notice(`Failed to toggle repository: ${errorMessage}`, 5000);
        }
    }

    /**
     * Handle removing a repository
     */
    private async handleRemoveRepository(repo: RepositoryConfig): Promise<void> {
        // Show confirmation modal
        new ConfirmRemovalModal(
            this.app,
            repo.name,
            async () => {
                try {
                    // Unschedule before removing
                    this.plugin.fetchSchedulerService.unscheduleRepository(repo.id);

                    const removed = await this.plugin.repositoryConfigService.removeRepository(repo.id);

                    if (removed) {
                        new Notice(`Repository "${repo.name}" removed`);
                        this.display(); // Refresh display
                    } else {
                        new Notice('Repository not found', 3000);
                    }
                } catch (error) {
                    console.error('Failed to remove repository:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    new Notice(`Failed to remove repository: ${errorMessage}`, 5000);
                }
            }
        ).open();
    }
}

/**
 * Modal dialog for adding a new repository
 */
class AddRepositoryModal extends Modal {
    plugin: MultiGitPlugin;
    onSuccess: () => void;
    pathInput!: TextComponent;
    nameInput!: TextComponent;
    errorEl!: HTMLElement;
    addButton!: HTMLButtonElement;

    constructor(app: App, plugin: MultiGitPlugin, onSuccess: () => void) {
        super(app);
        this.plugin = plugin;
        this.onSuccess = onSuccess;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: 'Add Git Repository' });

        // Error message container (hidden by default)
        this.errorEl = contentEl.createDiv({ cls: 'multi-git-error-message' });
        this.errorEl.style.display = 'none';

        // Path input with file picker
        const pathSetting = new Setting(contentEl)
            .setName('Repository Path')
            .setDesc('Absolute path to the git repository directory')
            .addText(text => {
                this.pathInput = text;
                text
                    .setPlaceholder('/path/to/repository')
                    .onChange(async (value) => {
                        await this.validatePath(value);
                    });
                text.inputEl.style.width = '100%';
            });

        // Add browse button
        pathSetting.addButton(button => button
            .setButtonText('Browse...')
            .onClick(async () => {
                // Note: File picker requires platform-specific implementation
                // For now, user must type path manually
                new Notice('Please enter the path manually. File picker support coming soon.', 4000);
            })
        );

        // Optional name input
        new Setting(contentEl)
            .setName('Repository Name')
            .setDesc('Optional display name (defaults to directory name)')
            .addText(text => {
                this.nameInput = text;
                text.setPlaceholder('My Repository');
                text.inputEl.style.width = '100%';
            });

        // Buttons container
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        // Cancel button
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => {
            this.close();
        });

        // Add button (initially disabled)
        this.addButton = buttonContainer.createEl('button', {
            text: 'Add Repository',
            cls: 'mod-cta'
        });
        this.addButton.disabled = true;
        this.addButton.addEventListener('click', async () => {
            await this.handleAddRepository();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Validate the entered path
     */
    private async validatePath(path: string): Promise<void> {
        // Hide error message
        this.errorEl.style.display = 'none';
        this.errorEl.textContent = '';

        // Disable add button if path is empty
        if (!path.trim()) {
            this.addButton.disabled = true;
            return;
        }

        try {
            // Basic path validation - check if it's absolute
            if (!path.startsWith('/') && !path.match(/^[A-Za-z]:\\/)) {
                throw new Error('Path must be absolute');
            }

            // Enable add button if validation passed
            this.addButton.disabled = false;
        } catch (error) {
            // Show error message
            const errorMessage = error instanceof Error ? error.message : 'Invalid path';
            this.showError(errorMessage);
            this.addButton.disabled = true;
        }
    }

    /**
     * Show error message in the modal
     */
    private showError(message: string): void {
        this.errorEl.textContent = message;
        this.errorEl.style.display = 'block';
        this.errorEl.style.color = 'var(--text-error)';
        this.errorEl.style.marginBottom = '1em';
    }

    /**
     * Handle adding the repository
     */
    private async handleAddRepository(): Promise<void> {
        const path = this.pathInput.getValue().trim();
        const name = this.nameInput.getValue().trim() || undefined;

        // Disable button during operation
        this.addButton.disabled = true;
        this.addButton.textContent = 'Adding...';

        try {
            await this.plugin.repositoryConfigService.addRepository(path, name);
            new Notice('Repository added successfully');
            this.close();
            this.onSuccess();
        } catch (error) {
            console.error('Failed to add repository:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.showError(errorMessage);
            this.addButton.disabled = false;
            this.addButton.textContent = 'Add Repository';
        }
    }
}

/**
 * Modal dialog for confirming repository removal
 */
class ConfirmRemovalModal extends Modal {
    repositoryName: string;
    onConfirm: () => void;

    constructor(app: App, repositoryName: string, onConfirm: () => void) {
        super(app);
        this.repositoryName = repositoryName;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: 'Remove Repository?' });

        contentEl.createEl('p', {
            text: `Are you sure you want to remove "${this.repositoryName}" from the configuration?`,
        });

        contentEl.createEl('p', {
            text: 'This will only remove it from Multi-Git. The repository files on disk will not be affected.',
            cls: 'setting-item-description'
        });

        // Buttons container
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        // Cancel button
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => {
            this.close();
        });

        // Confirm button
        const confirmButton = buttonContainer.createEl('button', {
            text: 'Remove',
            cls: 'mod-warning'
        });
        confirmButton.addEventListener('click', () => {
            this.onConfirm();
            this.close();
        });

        // Focus cancel button by default (safer)
        cancelButton.focus();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
