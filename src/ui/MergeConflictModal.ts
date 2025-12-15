import { App } from 'obsidian';
import { CriticalErrorModal } from './CriticalErrorModal';
import { ClassifiedError } from '../utils/errors';

/**
 * Modal for displaying merge conflict errors with resolution guidance.
 * 
 * This modal provides:
 * - List of conflicted files
 * - Explanation of conflict markers
 * - Step-by-step resolution instructions
 * - Quick actions to open repository or mark as resolved
 */
export class MergeConflictModal extends CriticalErrorModal {
    private conflictedFiles: string[] = [];

    /**
     * Create a new merge conflict modal
     * 
     * @param app - The Obsidian app instance
     * @param classifiedError - The classified merge conflict error
     */
    constructor(app: App, classifiedError: ClassifiedError) {
        super(app, classifiedError);
        this.extractConflictedFiles();
    }

    /**
     * Extract conflicted files from technical details
     */
    private extractConflictedFiles(): void {
        if (!this.classifiedError.technicalDetails) {
            return;
        }

        // Look for CONFLICT markers in git output
        const conflictPattern = /CONFLICT.*?:\s*(.+)$/gm;
        let match;
        while ((match = conflictPattern.exec(this.classifiedError.technicalDetails)) !== null) {
            if (match[1]) {
                this.conflictedFiles.push(match[1].trim());
            }
        }

        // If no files found via pattern, add a generic entry
        if (this.conflictedFiles.length === 0) {
            this.conflictedFiles.push('(See technical details for file list)');
        }
    }

    /**
     * Override header to show merge conflict-specific icon and title
     */
    protected renderHeader(container: HTMLElement): void {
        const header = container.createEl('div');
        header.addClass('multi-git-error-header');

        const iconContainer = header.createEl('div');
        iconContainer.addClass('multi-git-error-icon');
        iconContainer.innerHTML = '⚔️';

        const titleContainer = header.createEl('div');
        titleContainer.addClass('multi-git-error-title-container');

        const title = titleContainer.createEl('h2', {
            text: 'Merge Conflict Detected',
        });
        title.addClass('multi-git-error-title');

        const subtitle = titleContainer.createEl('div', {
            text: this.classifiedError.repositoryName,
        });
        subtitle.addClass('multi-git-error-subtitle');
    }

    /**
     * Override to render merge conflict-specific content
     */
    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('multi-git-error-modal');
        contentEl.addClass('multi-git-conflict-modal');

        // Modal header
        this.renderHeader(contentEl);

        // Error message
        this.renderMessage(contentEl);

        // Conflicted files list
        this.renderConflictedFiles(contentEl);

        // Conflict markers explanation
        this.renderConflictMarkerExplanation(contentEl);

        // Resolution steps
        this.renderResolutionSteps(contentEl);

        // Technical details (collapsible)
        if (this.classifiedError.technicalDetails) {
            this.renderTechnicalDetails(contentEl);
        }

        // Help link
        if (this.classifiedError.helpLink) {
            this.renderHelpLink(contentEl);
        }

        // Action buttons
        this.renderConflictButtons(contentEl);
    }

    /**
     * Render the list of conflicted files
     */
    private renderConflictedFiles(container: HTMLElement): void {
        const filesContainer = container.createEl('div');
        filesContainer.addClass('multi-git-conflict-files');

        const filesTitle = filesContainer.createEl('h3', {
            text: 'Conflicted Files:',
        });
        filesTitle.addClass('multi-git-conflict-files-title');

        const filesList = filesContainer.createEl('ul');
        filesList.addClass('multi-git-conflict-files-list');

        this.conflictedFiles.forEach((file) => {
            const fileItem = filesList.createEl('li', {
                text: file,
            });
            fileItem.addClass('multi-git-conflict-file-item');
        });
    }

    /**
     * Render explanation of conflict markers
     */
    private renderConflictMarkerExplanation(container: HTMLElement): void {
        const explanationContainer = container.createEl('div');
        explanationContainer.addClass('multi-git-conflict-explanation');

        const explanationTitle = explanationContainer.createEl('h3', {
            text: 'Understanding Conflict Markers:',
        });
        explanationTitle.addClass('multi-git-conflict-explanation-title');

        explanationContainer.createEl('p', {
            text: 'Conflicted files contain special markers showing where changes conflict:',
        });

        const markersContainer = explanationContainer.createEl('div');
        markersContainer.addClass('multi-git-conflict-markers');

        // HEAD marker
        const headMarker = markersContainer.createEl('div');
        headMarker.addClass('multi-git-conflict-marker');

        const headCode = headMarker.createEl('code');
        headCode.textContent = '<<<<<<< HEAD';
        headCode.addClass('multi-git-conflict-marker-code');

        const headText = headMarker.createEl('span', {
            text: ' — Your current changes',
        });
        headText.addClass('multi-git-conflict-marker-text');

        // Separator
        const separatorMarker = markersContainer.createEl('div');
        separatorMarker.addClass('multi-git-conflict-marker');

        const separatorCode = separatorMarker.createEl('code');
        separatorCode.textContent = '=======';
        separatorCode.addClass('multi-git-conflict-marker-code');

        const separatorText = separatorMarker.createEl('span', {
            text: ' — Divider between versions',
        });
        separatorText.addClass('multi-git-conflict-marker-text');

        // Remote marker
        const remoteMarker = markersContainer.createEl('div');
        remoteMarker.addClass('multi-git-conflict-marker');

        const remoteCode = remoteMarker.createEl('code');
        remoteCode.textContent = '>>>>>>> branch-name';
        remoteCode.addClass('multi-git-conflict-marker-code');

        const remoteText = remoteMarker.createEl('span', {
            text: ' — Incoming changes from remote',
        });
        remoteText.addClass('multi-git-conflict-marker-text');
    }

    /**
     * Render step-by-step resolution instructions
     */
    private renderResolutionSteps(container: HTMLElement): void {
        const stepsContainer = container.createEl('div');
        stepsContainer.addClass('multi-git-conflict-steps');

        const stepsTitle = stepsContainer.createEl('h3', {
            text: 'How to Resolve:',
        });
        stepsTitle.addClass('multi-git-conflict-steps-title');

        const stepsList = stepsContainer.createEl('ol');
        stepsList.addClass('multi-git-conflict-steps-list');

        // Step 1: Open files
        const step1 = stepsList.createEl('li');
        step1.addClass('multi-git-conflict-step');
        step1.textContent = 'Open each conflicted file in your text editor';

        // Step 2: Choose version
        const step2 = stepsList.createEl('li');
        step2.addClass('multi-git-conflict-step');
        step2.innerHTML = 'For each conflict, decide which changes to keep:<ul><li>Keep your changes (HEAD section)</li><li>Keep incoming changes (remote section)</li><li>Keep both changes (combine manually)</li><li>Write entirely new content</li></ul>';

        // Step 3: Remove markers
        const step3 = stepsList.createEl('li');
        step3.addClass('multi-git-conflict-step');
        step3.innerHTML = 'Remove all conflict markers (<code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code>, <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>)';

        // Step 4: Save files
        const step4 = stepsList.createEl('li');
        step4.addClass('multi-git-conflict-step');
        step4.textContent = 'Save all files after resolving conflicts';

        // Step 5: Stage and commit
        const step5 = stepsList.createEl('li');
        step5.addClass('multi-git-conflict-step');
        step5.textContent = 'Stage the resolved files and commit the merge';
    }

    /**
     * Render action buttons with conflict-specific actions
     */
    private renderConflictButtons(container: HTMLElement): void {
        const buttonContainer = container.createEl('div');
        buttonContainer.addClass('multi-git-error-buttons');

        // Open in file explorer button
        const openButton = buttonContainer.createEl('button', {
            text: 'Open in File Explorer',
        });
        openButton.addClass('mod-cta');
        openButton.addEventListener('click', async () => {
            await this.openRepositoryInExplorer();
        });

        // Acknowledgment button
        const acknowledgeButton = buttonContainer.createEl('button', {
            text: 'I\'ll Resolve This',
        });
        acknowledgeButton.addEventListener('click', () => {
            this.close();
        });
    }

    /**
     * Open repository directory in file explorer
     */
    private async openRepositoryInExplorer(): Promise<void> {
        try {
            // Get repository path from error context
            const repoPath = this.classifiedError.repositoryId;

            if (!repoPath) {
                return;
            }

            // Use Electron's shell to open the directory
            const { shell } = require('electron');
            await shell.openPath(repoPath);
        } catch (error) {
            console.error('Failed to open repository in explorer:', error);
        }
    }
}
