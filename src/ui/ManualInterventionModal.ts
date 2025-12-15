import { App, Modal } from 'obsidian';
import type { PullOperationState, PullSkipReason, PullErrorCode } from '../services/AutoPullService';
import { openRepositoryInTerminal } from '../utils/terminal';
import { Logger } from '../utils/logger';

/** Component name for logging */
const COMPONENT = 'ManualInterventionModal';

/**
 * Modal for displaying manual intervention scenarios.
 * 
 * This modal provides clear, actionable guidance when automatic pull operations
 * cannot proceed. It explains the situation in user-friendly terms and provides
 * buttons to help resolve the issue:
 * 
 * - **Open Terminal:** Launches terminal at repository location for manual git operations
 * - **I'll Handle This:** Acknowledges the issue and closes the modal
 * 
 * **Design Principles:**
 * - Non-dismissible for critical scenarios (diverged branches, auth failures)
 * - Clear, non-technical language explaining what happened
 * - Actionable next steps specific to the scenario
 * - Visual indicators (icons, colors) matching severity
 * 
 * **Scenarios:**
 * - DIVERGED_BRANCHES: Local and remote have diverged, requires merge/rebase
 * - UNCOMMITTED_CHANGES: Working directory has uncommitted changes
 * - AUTH_ERROR: Authentication failed, credentials need setup
 * - CONCURRENT_OPERATION: Another git operation in progress
 * - LOCK_ERROR: Repository locked by another process
 * 
 * @example
 * ```typescript
 * const modal = new ManualInterventionModal(app, pullOperationState);
 * modal.open();
 * ```
 */
export class ManualInterventionModal extends Modal {
    private pullState: PullOperationState;
    private terminalButtonEl?: HTMLButtonElement;

    /**
     * Create a new manual intervention modal
     * 
     * @param app - The Obsidian app instance
     * @param pullState - Complete pull operation state including skip reason
     */
    constructor(app: App, pullState: PullOperationState) {
        super(app);
        this.pullState = pullState;
    }

    /**
     * Called when the modal is opened
     * Renders content based on skip reason
     */
    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('multi-git-intervention-modal');

        Logger.debug(COMPONENT, `Opening manual intervention modal for ${this.pullState.repositoryName}, reason: ${this.pullState.skipReason}`);

        // Modal header with icon and title
        this.renderHeader(contentEl);

        // Main content explaining the situation
        this.renderContent(contentEl);

        // Action buttons
        this.renderActionButtons(contentEl);
    }

    /**
     * Render the modal header with appropriate icon and title
     */
    private renderHeader(container: HTMLElement): void {
        const header = container.createEl('div');
        header.addClass('multi-git-intervention-header');

        const iconContainer = header.createEl('div');
        iconContainer.addClass('multi-git-intervention-icon');

        const titleContainer = header.createEl('div');
        titleContainer.addClass('multi-git-intervention-title-container');

        const title = titleContainer.createEl('h2');
        title.addClass('multi-git-intervention-title');

        const subtitle = titleContainer.createEl('div', {
            text: this.pullState.repositoryName,
        });
        subtitle.addClass('multi-git-intervention-subtitle');

        // Set icon and title based on skip reason or error code
        const skipReason = this.pullState.skipReason;
        const errorCode = this.pullState.errorCode;

        if (skipReason === 'DIVERGED_BRANCHES') {
            iconContainer.innerHTML = '⚠️';
            iconContainer.addClass('multi-git-intervention-icon-warning');
            title.textContent = 'Manual Merge Required';
        } else if (errorCode === 'AUTH_ERROR') {
            iconContainer.innerHTML = '🔑';
            iconContainer.addClass('multi-git-intervention-icon-error');
            title.textContent = 'Authentication Required';
        } else if (skipReason === 'CONCURRENT_OPERATION' || errorCode === 'LOCK_ERROR') {
            iconContainer.innerHTML = '🔒';
            iconContainer.addClass('multi-git-intervention-icon-info');
            title.textContent = 'Repository Busy';
        } else if (skipReason === 'UNCOMMITTED_CHANGES') {
            iconContainer.innerHTML = 'ℹ️';
            iconContainer.addClass('multi-git-intervention-icon-info');
            title.textContent = 'Uncommitted Changes';
        } else {
            iconContainer.innerHTML = '⚠️';
            iconContainer.addClass('multi-git-intervention-icon-warning');
            title.textContent = 'Manual Intervention Needed';
        }
    }

    /**
     * Render the main content explaining the situation
     */
    private renderContent(container: HTMLElement): void {
        const contentContainer = container.createEl('div');
        contentContainer.addClass('multi-git-intervention-content');

        const skipReason = this.pullState.skipReason;
        const errorCode = this.pullState.errorCode;

        // Create explanation paragraph
        const explanation = contentContainer.createEl('p');
        explanation.addClass('multi-git-intervention-explanation');

        // Create action list
        const actionsTitle = contentContainer.createEl('h3', {
            text: 'What to do:',
        });
        actionsTitle.addClass('multi-git-intervention-actions-title');

        const actionsList = contentContainer.createEl('ol');
        actionsList.addClass('multi-git-intervention-actions-list');

        // Content varies by skip reason
        if (skipReason === 'DIVERGED_BRANCHES') {
            explanation.textContent = 'Your local branch and the remote branch have both been updated with different changes. Automatic pull cannot proceed safely.';

            actionsList.createEl('li', {
                text: 'Open the terminal using the button below',
            });
            actionsList.createEl('li', {
                text: 'Review the changes with: git log --oneline --graph --all',
            });
            actionsList.createEl('li', {
                text: 'Choose to merge (git pull) or rebase (git pull --rebase)',
            });
            actionsList.createEl('li', {
                text: 'Resolve any conflicts if they occur',
            });
            actionsList.createEl('li', {
                text: 'Push your changes: git push',
            });
        } else if (skipReason === 'UNCOMMITTED_CHANGES') {
            explanation.textContent = 'You have uncommitted changes in your working directory. Automatic pull cannot proceed to avoid losing your work.';

            actionsList.createEl('li', {
                text: 'Open the terminal using the button below',
            });
            actionsList.createEl('li', {
                text: 'Review your changes with: git status',
            });
            actionsList.createEl('li', {
                text: 'Commit your changes: git add . && git commit -m "your message"',
            });
            actionsList.createEl('li', {
                text: 'Or stash them temporarily: git stash',
            });
            actionsList.createEl('li', {
                text: 'Then the automatic pull will work on the next fetch',
            });
        } else if (errorCode === 'AUTH_ERROR') {
            explanation.textContent = 'Git authentication failed. You need to set up your credentials to access the remote repository.';

            actionsList.createEl('li', {
                text: 'Open the terminal using the button below',
            });
            actionsList.createEl('li', {
                text: 'For HTTPS: Update your credentials or use a personal access token',
            });
            actionsList.createEl('li', {
                text: 'For SSH: Ensure your SSH key is added to your git provider',
            });
            actionsList.createEl('li', {
                text: 'Test with: git fetch',
            });
            actionsList.createEl('li', {
                text: 'Once authenticated, automatic pull will work',
            });
        } else if (skipReason === 'CONCURRENT_OPERATION') {
            explanation.textContent = 'Another git operation is currently in progress in this repository. Automatic pull is waiting to avoid conflicts.';

            actionsList.createEl('li', {
                text: 'Wait for the current operation to complete',
            });
            actionsList.createEl('li', {
                text: 'If the operation seems stuck, check for any open git processes',
            });
            actionsList.createEl('li', {
                text: 'The automatic pull will retry automatically',
            });
        } else if (errorCode === 'LOCK_ERROR') {
            explanation.textContent = 'The repository is locked by another git process. This usually resolves itself automatically.';

            actionsList.createEl('li', {
                text: 'Wait a moment for the lock to release',
            });
            actionsList.createEl('li', {
                text: 'If the issue persists, you may need to manually remove .git/index.lock',
            });
            actionsList.createEl('li', {
                text: 'Open the terminal using the button below if needed',
            });
            actionsList.createEl('li', {
                text: 'The automatic pull will retry automatically',
            });
        } else {
            explanation.textContent = 'Automatic pull could not proceed for this repository. Manual intervention may be required.';

            actionsList.createEl('li', {
                text: 'Open the terminal using the button below',
            });
            actionsList.createEl('li', {
                text: 'Check repository status: git status',
            });
            actionsList.createEl('li', {
                text: 'Review any error messages',
            });
            actionsList.createEl('li', {
                text: 'Resolve the issue manually',
            });
        }

        // Add branch information if available
        const branchInfo = contentContainer.createEl('div');
        branchInfo.addClass('multi-git-intervention-branch-info');

        const branchText = branchInfo.createEl('p');
        branchText.innerHTML = `<strong>Repository:</strong> ${this.pullState.repositoryName}<br>`;
        branchText.innerHTML += `<strong>Location:</strong> <code>${this.pullState.repositoryPath}</code>`;
    }

    /**
     * Render action buttons
     */
    private renderActionButtons(container: HTMLElement): void {
        const buttonContainer = container.createEl('div');
        buttonContainer.addClass('multi-git-intervention-buttons');

        // Open Terminal button
        this.terminalButtonEl = buttonContainer.createEl('button', {
            text: '🖥️ Open Terminal',
        });
        this.terminalButtonEl.addClass('mod-cta');
        this.terminalButtonEl.addEventListener('click', () => this.handleOpenTerminal());

        // I'll Handle This button
        const handleButton = buttonContainer.createEl('button', {
            text: "I'll Handle This",
        });
        handleButton.addEventListener('click', () => {
            Logger.debug(COMPONENT, `User acknowledged manual intervention for ${this.pullState.repositoryName}`);
            this.close();
        });
    }

    /**
     * Handle Open Terminal button click
     */
    private async handleOpenTerminal(): Promise<void> {
        if (!this.terminalButtonEl) return;

        // Disable button during operation
        this.terminalButtonEl.disabled = true;
        const originalText = this.terminalButtonEl.textContent;
        this.terminalButtonEl.textContent = 'Opening...';

        try {
            Logger.debug(COMPONENT, `Opening terminal for ${this.pullState.repositoryPath}`);

            const success = await openRepositoryInTerminal(this.pullState.repositoryPath);

            if (success) {
                Logger.debug(COMPONENT, `Terminal opened successfully for ${this.pullState.repositoryPath}`);
                // Show brief success message
                this.terminalButtonEl.textContent = '✓ Terminal Opened';
                setTimeout(() => {
                    if (this.terminalButtonEl) {
                        this.terminalButtonEl.textContent = originalText;
                        this.terminalButtonEl.disabled = false;
                    }
                }, 2000);
            } else {
                Logger.debug(COMPONENT, `Failed to open terminal for ${this.pullState.repositoryPath}`);
                // Show error message
                this.terminalButtonEl.textContent = '✗ Failed to Open';
                setTimeout(() => {
                    if (this.terminalButtonEl) {
                        this.terminalButtonEl.textContent = originalText;
                        this.terminalButtonEl.disabled = false;
                    }
                }, 2000);
            }
        } catch (error) {
            Logger.error(COMPONENT, `Error opening terminal for ${this.pullState.repositoryPath}`, error);
            this.terminalButtonEl.textContent = '✗ Error';
            setTimeout(() => {
                if (this.terminalButtonEl) {
                    this.terminalButtonEl.textContent = originalText;
                    this.terminalButtonEl.disabled = false;
                }
            }, 2000);
        }
    }

    /**
     * Called when the modal is closed
     */
    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
        Logger.debug(COMPONENT, `Manual intervention modal closed for ${this.pullState.repositoryName}`);
    }
}
