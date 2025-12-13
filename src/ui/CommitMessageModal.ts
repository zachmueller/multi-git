import { App, Modal, Notice } from 'obsidian';
import { RepositoryStatus } from '../settings/data';

/**
 * Modal for entering commit message and executing commit+push operation
 * 
 * Displays repository information, changed files, and a text area for the commit message.
 * Pre-fills the message with a smart suggestion and allows the user to edit before committing.
 */
export class CommitMessageModal extends Modal {
    private repository: RepositoryStatus;
    private suggestedMessage: string;
    private onConfirm: (message: string) => Promise<void>;
    private isProcessing: boolean = false;
    private messageTextarea: HTMLTextAreaElement | null = null;
    private submitButton: HTMLButtonElement | null = null;
    private errorContainer: HTMLElement | null = null;

    /**
     * Create a new commit message modal
     * 
     * @param app - The Obsidian app instance
     * @param repository - Repository to commit and push
     * @param suggestedMessage - Pre-filled commit message suggestion
     * @param onConfirm - Callback invoked when user confirms the commit
     */
    constructor(
        app: App,
        repository: RepositoryStatus,
        suggestedMessage: string,
        onConfirm: (message: string) => Promise<void>
    ) {
        super(app);
        this.repository = repository;
        this.suggestedMessage = suggestedMessage;
        this.onConfirm = onConfirm;
    }

    /**
     * Called when the modal is opened
     * Renders the commit form and sets up event handlers
     */
    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('multi-git-commit-modal');

        // Modal header with repository info
        this.renderHeader(contentEl);

        // Changed files list
        this.renderFileList(contentEl);

        // Commit message textarea
        this.renderMessageInput(contentEl);

        // Error message container (hidden by default)
        this.errorContainer = contentEl.createEl('div');
        this.errorContainer.addClass('multi-git-commit-error');
        this.errorContainer.style.display = 'none';

        // Action buttons
        this.renderButtons(contentEl);

        // Focus the textarea
        this.messageTextarea?.focus();

        // Select all text for easy replacement
        this.messageTextarea?.select();
    }

    /**
     * Render the modal header with repository information
     */
    private renderHeader(container: HTMLElement): void {
        const header = container.createEl('div');
        header.addClass('multi-git-commit-header');

        const title = header.createEl('h2', {
            text: 'Commit and Push',
        });
        title.addClass('multi-git-commit-title');

        const repoInfo = header.createEl('div');
        repoInfo.addClass('multi-git-commit-repo-info');

        // Repository name
        const repoName = repoInfo.createEl('span', {
            text: this.repository.repositoryName,
        });
        repoName.addClass('multi-git-commit-repo-name');

        // Branch name
        const branchText = this.repository.currentBranch ?? 'detached HEAD';
        const branchName = repoInfo.createEl('span', {
            text: `on ${branchText}`,
        });
        branchName.addClass('multi-git-commit-branch');
    }

    /**
     * Render the list of changed files
     */
    private renderFileList(container: HTMLElement): void {
        const fileListContainer = container.createEl('div');
        fileListContainer.addClass('multi-git-commit-files');

        const fileListTitle = fileListContainer.createEl('div', {
            text: 'Changed files:',
        });
        fileListTitle.addClass('multi-git-commit-files-title');

        const fileList = fileListContainer.createEl('ul');
        fileList.addClass('multi-git-commit-files-list');

        // Combine all changed files
        const allFiles = [
            ...this.repository.stagedFiles,
            ...this.repository.unstagedFiles,
            ...this.repository.untrackedFiles,
        ];

        // Show first 10 files
        const displayFiles = allFiles.slice(0, 10);
        displayFiles.forEach((file) => {
            const fileItem = fileList.createEl('li', {
                text: file,
            });
            fileItem.addClass('multi-git-commit-file-item');
        });

        // Show "and N more" if there are more files
        if (allFiles.length > 10) {
            const remaining = allFiles.length - 10;
            const moreText = remaining === 1 ? 'and 1 more file...' : `and ${remaining} more files...`;
            const moreItem = fileList.createEl('li', {
                text: moreText,
            });
            moreItem.addClass('multi-git-commit-file-more');
        }
    }

    /**
     * Render the commit message textarea
     */
    private renderMessageInput(container: HTMLElement): void {
        const inputContainer = container.createEl('div');
        inputContainer.addClass('multi-git-commit-input-container');

        const label = inputContainer.createEl('label', {
            text: 'Commit message:',
        });
        label.addClass('multi-git-commit-label');

        this.messageTextarea = inputContainer.createEl('textarea');
        this.messageTextarea.addClass('multi-git-commit-textarea');
        this.messageTextarea.value = this.suggestedMessage;
        this.messageTextarea.placeholder = 'Enter commit message...';
        this.messageTextarea.rows = 4;

        // Handle Enter key (submit) and Shift+Enter (newline)
        this.messageTextarea.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter' && !evt.shiftKey) {
                evt.preventDefault();
                this.handleSubmit();
            }
        });
    }

    /**
     * Render the action buttons
     */
    private renderButtons(container: HTMLElement): void {
        const buttonContainer = container.createEl('div');
        buttonContainer.addClass('multi-git-commit-buttons');

        // Cancel button
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
        });
        cancelButton.addClass('multi-git-commit-button');
        cancelButton.addClass('multi-git-commit-button-cancel');
        cancelButton.addEventListener('click', () => {
            if (!this.isProcessing) {
                this.close();
            }
        });

        // Submit button
        this.submitButton = buttonContainer.createEl('button', {
            text: 'Commit & Push',
        });
        this.submitButton.addClass('multi-git-commit-button');
        this.submitButton.addClass('multi-git-commit-button-submit');
        this.submitButton.addEventListener('click', () => {
            this.handleSubmit();
        });
    }

    /**
     * Handle commit submission
     */
    private async handleSubmit(): Promise<void> {
        // Prevent double submission
        if (this.isProcessing) {
            return;
        }

        // Get and validate commit message
        const message = this.messageTextarea?.value.trim() ?? '';
        if (message.length === 0) {
            this.showError('Commit message cannot be empty');
            return;
        }

        // Clear any previous errors
        this.hideError();

        // Start processing
        this.setProcessingState(true);

        try {
            // Execute commit and push
            await this.onConfirm(message);

            // Success - show notification and close
            new Notice(`Successfully committed and pushed to ${this.repository.repositoryName}`);
            this.close();
        } catch (error) {
            // Error - display in modal and allow retry
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.showError(errorMessage);
            this.setProcessingState(false);

            // Keep focus on textarea for retry
            this.messageTextarea?.focus();
        }
    }

    /**
     * Set the processing state (loading indicator and disabled buttons)
     */
    private setProcessingState(processing: boolean): void {
        this.isProcessing = processing;

        if (this.submitButton) {
            this.submitButton.disabled = processing;

            if (processing) {
                this.submitButton.addClass('multi-git-commit-button-loading');
                this.submitButton.textContent = 'Committing...';
            } else {
                this.submitButton.removeClass('multi-git-commit-button-loading');
                this.submitButton.textContent = 'Commit & Push';
            }
        }

        // Disable textarea during processing
        if (this.messageTextarea) {
            this.messageTextarea.disabled = processing;
        }
    }

    /**
     * Show an error message in the modal
     */
    private showError(message: string): void {
        if (this.errorContainer) {
            this.errorContainer.textContent = message;
            this.errorContainer.style.display = 'block';
        }
    }

    /**
     * Hide the error message
     */
    private hideError(): void {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
            this.errorContainer.textContent = '';
        }
    }

    /**
     * Called when the modal is closed
     * Cleanup is handled automatically by Obsidian
     */
    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
        this.messageTextarea = null;
        this.submitButton = null;
        this.errorContainer = null;
    }
}
