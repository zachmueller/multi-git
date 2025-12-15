import { App, Modal } from 'obsidian';
import { ClassifiedError } from '../utils/errors';

/**
 * Base modal class for displaying critical errors that require user acknowledgment.
 * 
 * This modal provides a standard layout for critical errors including:
 * - Clear error message
 * - Collapsible technical details
 * - Suggested actions for resolution
 * - Acknowledgment button to close
 * 
 * Extend this class for specific error scenarios (auth failures, merge conflicts, etc.)
 */
export class CriticalErrorModal extends Modal {
    protected classifiedError: ClassifiedError;
    private detailsVisible: boolean = false;

    /**
     * Create a new critical error modal
     * 
     * @param app - The Obsidian app instance
     * @param classifiedError - The classified error with all presentation details
     */
    constructor(app: App, classifiedError: ClassifiedError) {
        super(app);
        this.classifiedError = classifiedError;
    }

    /**
     * Called when the modal is opened
     * Renders the error content and sets up event handlers
     */
    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('multi-git-error-modal');

        // Modal header
        this.renderHeader(contentEl);

        // Error message
        this.renderMessage(contentEl);

        // Suggested actions
        this.renderSuggestedActions(contentEl);

        // Technical details (collapsible)
        if (this.classifiedError.technicalDetails) {
            this.renderTechnicalDetails(contentEl);
        }

        // Help link
        if (this.classifiedError.helpLink) {
            this.renderHelpLink(contentEl);
        }

        // Acknowledgment button
        this.renderButtons(contentEl);
    }

    /**
     * Render the modal header with error icon and title
     */
    protected renderHeader(container: HTMLElement): void {
        const header = container.createEl('div');
        header.addClass('multi-git-error-header');

        const iconContainer = header.createEl('div');
        iconContainer.addClass('multi-git-error-icon');
        iconContainer.innerHTML = '⚠️';

        const titleContainer = header.createEl('div');
        titleContainer.addClass('multi-git-error-title-container');

        const title = titleContainer.createEl('h2', {
            text: 'Critical Error',
        });
        title.addClass('multi-git-error-title');

        const subtitle = titleContainer.createEl('div', {
            text: this.classifiedError.repositoryName,
        });
        subtitle.addClass('multi-git-error-subtitle');
    }

    /**
     * Render the user-friendly error message
     */
    protected renderMessage(container: HTMLElement): void {
        const messageContainer = container.createEl('div');
        messageContainer.addClass('multi-git-error-message');

        const message = messageContainer.createEl('p', {
            text: this.classifiedError.userMessage,
        });
        message.addClass('multi-git-error-message-text');
    }

    /**
     * Render the list of suggested actions
     */
    protected renderSuggestedActions(container: HTMLElement): void {
        if (this.classifiedError.suggestedActions.length === 0) {
            return;
        }

        const actionsContainer = container.createEl('div');
        actionsContainer.addClass('multi-git-error-actions');

        const actionsTitle = actionsContainer.createEl('h3', {
            text: 'How to Fix This:',
        });
        actionsTitle.addClass('multi-git-error-actions-title');

        const actionsList = actionsContainer.createEl('ol');
        actionsList.addClass('multi-git-error-actions-list');

        this.classifiedError.suggestedActions.forEach((action) => {
            const actionItem = actionsList.createEl('li', {
                text: action,
            });
            actionItem.addClass('multi-git-error-action-item');
        });
    }

    /**
     * Render collapsible technical details section
     */
    protected renderTechnicalDetails(container: HTMLElement): void {
        const detailsContainer = container.createEl('div');
        detailsContainer.addClass('multi-git-error-details-container');

        // Toggle button
        const toggleButton = detailsContainer.createEl('button');
        toggleButton.addClass('multi-git-error-details-toggle');
        toggleButton.textContent = '▸ Show Technical Details';

        // Details content (hidden by default)
        const detailsContent = detailsContainer.createEl('div');
        detailsContent.addClass('multi-git-error-details-content');
        detailsContent.style.display = 'none';

        const detailsText = detailsContent.createEl('pre');
        detailsText.addClass('multi-git-error-details-text');
        detailsText.textContent = this.classifiedError.technicalDetails || '';

        // Toggle functionality
        toggleButton.addEventListener('click', () => {
            this.detailsVisible = !this.detailsVisible;
            if (this.detailsVisible) {
                detailsContent.style.display = 'block';
                toggleButton.textContent = '▾ Hide Technical Details';
            } else {
                detailsContent.style.display = 'none';
                toggleButton.textContent = '▸ Show Technical Details';
            }
        });
    }

    /**
     * Render help documentation link
     */
    protected renderHelpLink(container: HTMLElement): void {
        const helpContainer = container.createEl('div');
        helpContainer.addClass('multi-git-error-help');

        const helpText = helpContainer.createEl('span', {
            text: 'Need more help? ',
        });

        const helpLink = helpContainer.createEl('a', {
            text: 'View documentation',
            href: this.classifiedError.helpLink,
        });
        helpLink.addClass('multi-git-error-help-link');
        helpLink.setAttribute('target', '_blank');
        helpLink.setAttribute('rel', 'noopener noreferrer');
    }

    /**
     * Render action buttons
     */
    protected renderButtons(container: HTMLElement): void {
        const buttonContainer = container.createEl('div');
        buttonContainer.addClass('multi-git-error-buttons');

        const acknowledgeButton = buttonContainer.createEl('button', {
            text: 'I Understand',
        });
        acknowledgeButton.addClass('mod-cta');
        acknowledgeButton.addEventListener('click', () => {
            this.close();
        });
    }

    /**
     * Called when the modal is closed
     * Cleanup is handled automatically by Obsidian
     */
    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
