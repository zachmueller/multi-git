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

        // Add repository list section
        this.displayRepositoryList(containerEl);
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

        // Repository path
        infoDiv.createDiv({
            text: repo.path,
            cls: 'multi-git-repo-path setting-item-description'
        });

        // Repository metadata
        const metaDiv = infoDiv.createDiv({ cls: 'multi-git-repo-meta setting-item-description' });
        const createdDate = new Date(repo.createdAt).toLocaleDateString();
        metaDiv.createSpan({ text: `Added: ${createdDate}` });

        if (repo.lastValidated) {
            const validatedDate = new Date(repo.lastValidated).toLocaleDateString();
            metaDiv.createSpan({ text: ` • Last validated: ${validatedDate}` });
        }

        // Toggle button
        setting.addButton(button => button
            .setButtonText(repo.enabled ? 'Disable' : 'Enable')
            .setClass(repo.enabled ? 'mod-warning' : '')
            .onClick(async () => {
                await this.handleToggleRepository(repo.id);
            })
            .setTooltip(repo.enabled ? 'Disable this repository' : 'Enable this repository')
        );

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
     * Handle toggling repository enabled state
     */
    private async handleToggleRepository(repoId: string): Promise<void> {
        try {
            const newState = await this.plugin.repositoryConfigService.toggleRepository(repoId);

            if (newState !== null) {
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
