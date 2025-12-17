/**
 * Tests for MergeConflictModal
 */

import { App } from 'obsidian';
import { MergeConflictModal } from '../../src/ui/MergeConflictModal';
import { ClassifiedError, ErrorSeverity, ErrorScenario } from '../../src/utils/errors';

// Mock Obsidian App
const mockApp = {
    vault: {},
    workspace: {},
} as App;

// Mock electron shell
jest.mock('electron', () => ({
    shell: {
        openPath: jest.fn().mockResolvedValue(''),
    },
}), { virtual: true });

describe('MergeConflictModal', () => {
    let containerEl: HTMLElement;

    beforeEach(() => {
        containerEl = document.createElement('div');

        // Mock Obsidian-specific methods recursively
        const mockElement = (el: HTMLElement) => {
            (el as any).empty = jest.fn(function (this: HTMLElement) {
                this.innerHTML = '';
            });
            (el as any).createEl = jest.fn((tag: string, attrs?: any) => {
                const child = document.createElement(tag);
                if (attrs?.text) child.textContent = attrs.text;
                if (attrs?.cls) child.className = attrs.cls;
                if (attrs?.href) (child as any).href = attrs.href;
                el.appendChild(child);
                mockElement(child); // Recursively mock child elements
                return child;
            });
            (el as any).addClass = jest.fn(function (this: HTMLElement, className: string) {
                this.classList.add(className);
            });
            (el as any).setAttribute = jest.fn(function (this: HTMLElement, name: string, value: string) {
                (this as any)[name] = value;
            });
        };

        mockElement(containerEl);

        document.body.appendChild(containerEl);
    });

    afterEach(() => {
        document.body.removeChild(containerEl);
        jest.clearAllMocks();
    });

    const createConflictError = (overrides?: Partial<ClassifiedError>): ClassifiedError => ({
        error: new Error('Merge conflict'),
        severity: ErrorSeverity.CRITICAL,
        scenario: ErrorScenario.MERGE_CONFLICT,
        repositoryId: '/path/to/repo',
        repositoryName: 'test-repo',
        userMessage: 'Merge conflict detected in your repository',
        suggestedActions: [
            'Open conflicted files in your editor',
            'Resolve conflicts manually',
            'Stage and commit resolved files',
        ],
        technicalDetails: 'CONFLICT (content): Merge conflict in file1.ts\nCONFLICT (content): Merge conflict in file2.ts',
        helpLink: 'https://docs.example.com/merge-conflicts',
        operation: 'pull',
        ...overrides,
    });

    describe('constructor', () => {
        it('should create modal with merge conflict error', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            expect(modal).toBeInstanceOf(MergeConflictModal);
        });

        it('should extract conflicted files from technical details', () => {
            const error = createConflictError({
                technicalDetails: 'CONFLICT (content): Merge conflict in src/index.ts\nCONFLICT (modify/delete): Merge conflict in README.md',
            });
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const fileItems = containerEl.querySelectorAll('.multi-git-conflict-file-item');
            expect(fileItems.length).toBeGreaterThan(0);
        });
    });

    describe('onOpen', () => {
        it('should render merge conflict-specific header', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const title = containerEl.querySelector('.multi-git-error-title');
            expect(title?.textContent).toBe('Merge Conflict Detected');

            const icon = containerEl.querySelector('.multi-git-error-icon');
            expect(icon?.innerHTML).toBe('⚔️');
        });

        it('should apply conflict modal specific class', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            expect(containerEl.classList.contains('multi-git-conflict-modal')).toBe(true);
        });

        it('should render list of conflicted files', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const filesTitle = containerEl.querySelector('.multi-git-conflict-files-title');
            expect(filesTitle?.textContent).toContain('Conflicted Files');

            const filesList = containerEl.querySelectorAll('.multi-git-conflict-file-item');
            expect(filesList.length).toBeGreaterThan(0);
        });

        it('should render conflict marker explanation', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const explanationTitle = containerEl.querySelector('.multi-git-conflict-explanation-title');
            expect(explanationTitle?.textContent).toContain('Understanding Conflict Markers');

            const markers = containerEl.querySelectorAll('.multi-git-conflict-marker-code');
            expect(markers.length).toBe(3); // HEAD, separator, remote
        });

        it('should render resolution steps', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const stepsTitle = containerEl.querySelector('.multi-git-conflict-steps-title');
            expect(stepsTitle?.textContent).toContain('How to Resolve');

            const steps = containerEl.querySelectorAll('.multi-git-conflict-step');
            expect(steps.length).toBeGreaterThan(0);
        });

        it('should render conflict-specific action buttons', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const buttons = containerEl.querySelectorAll('.multi-git-error-buttons button');
            expect(buttons.length).toBe(2); // Open in Explorer + Acknowledge
        });
    });

    describe('conflicted files extraction', () => {
        it('should extract files from CONFLICT markers', () => {
            const error = createConflictError({
                technicalDetails: 'CONFLICT (content): Merge conflict in src/main.ts\nCONFLICT (content): Merge conflict in test/test.ts',
            });
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const fileItems = containerEl.querySelectorAll('.multi-git-conflict-file-item');
            const fileTexts = Array.from(fileItems).map(item => item.textContent);

            expect(fileTexts.some(text => text?.includes('src/main.ts'))).toBe(true);
            expect(fileTexts.some(text => text?.includes('test/test.ts'))).toBe(true);
        });

        it('should handle single conflicted file', () => {
            const error = createConflictError({
                technicalDetails: 'CONFLICT (content): Merge conflict in README.md',
            });
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const fileItems = containerEl.querySelectorAll('.multi-git-conflict-file-item');
            expect(fileItems.length).toBe(1);
        });

        it('should handle technical details without explicit file list', () => {
            const error = createConflictError({
                technicalDetails: 'Automatic merge failed; fix conflicts and then commit the result.',
            });
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const fileItems = containerEl.querySelectorAll('.multi-git-conflict-file-item');
            expect(fileItems.length).toBeGreaterThan(0);
            expect(fileItems[0].textContent).toContain('See technical details');
        });

        it('should handle missing technical details', () => {
            const error = createConflictError({
                technicalDetails: undefined,
            });
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');

            expect(() => modal.onOpen()).not.toThrow();
        });
    });

    describe('conflict marker explanation', () => {
        it('should explain HEAD marker', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const markers = containerEl.querySelectorAll('.multi-git-conflict-marker');
            const headMarker = Array.from(markers).find(m =>
                m.textContent?.includes('<<<<<<< HEAD')
            );

            expect(headMarker).toBeTruthy();
            expect(headMarker?.textContent).toContain('Your current changes');
        });

        it('should explain separator marker', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const markers = containerEl.querySelectorAll('.multi-git-conflict-marker');
            const separator = Array.from(markers).find(m =>
                m.textContent?.includes('=======')
            );

            expect(separator).toBeTruthy();
            expect(separator?.textContent).toContain('Divider');
        });

        it('should explain remote marker', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const markers = containerEl.querySelectorAll('.multi-git-conflict-marker');
            const remoteMarker = Array.from(markers).find(m =>
                m.textContent?.includes('>>>>>>>')
            );

            expect(remoteMarker).toBeTruthy();
            expect(remoteMarker?.textContent).toContain('Incoming changes');
        });
    });

    describe('resolution steps', () => {
        it('should provide step-by-step instructions', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const steps = containerEl.querySelectorAll('.multi-git-conflict-step');
            expect(steps.length).toBe(5);

            expect(steps[0].textContent).toContain('Open each conflicted file');
            expect(steps[1].textContent).toContain('decide which changes to keep');
            expect(steps[2].textContent).toContain('Remove all conflict markers');
            expect(steps[3].textContent).toContain('Save all files');
            expect(steps[4].textContent).toContain('Stage the resolved files');
        });

        it('should explain resolution options', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const steps = containerEl.querySelectorAll('.multi-git-conflict-step');
            const choiceStep = steps[1];

            expect(choiceStep.textContent).toContain('Keep your changes');
            expect(choiceStep.textContent).toContain('Keep incoming changes');
            expect(choiceStep.textContent).toContain('Keep both changes');
        });
    });

    describe('button interactions', () => {
        it('should have "Open in File Explorer" button', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const buttons = containerEl.querySelectorAll('.multi-git-error-buttons button');
            const openButton = Array.from(buttons).find(btn =>
                btn.textContent?.includes('Open in File Explorer')
            );

            expect(openButton).toBeTruthy();
        });

        it('should have acknowledgment button', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const buttons = containerEl.querySelectorAll('.multi-git-error-buttons button');
            const acknowledgeButton = Array.from(buttons).find(btn =>
                btn.textContent?.includes("I'll Resolve This")
            );

            expect(acknowledgeButton).toBeTruthy();
        });

        it('should close modal when acknowledgment button clicked', () => {
            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            const closeSpy = jest.spyOn(modal, 'close');

            modal.onOpen();

            const buttons = containerEl.querySelectorAll('.multi-git-error-buttons button');
            const acknowledgeButton = Array.from(buttons).find(btn =>
                btn.textContent?.includes("I'll Resolve")
            ) as HTMLButtonElement;

            acknowledgeButton?.click();

            expect(closeSpy).toHaveBeenCalled();
        });

        it('should attempt to open repository when "Open in File Explorer" clicked', async () => {
            const { shell } = require('electron');
            const error = createConflictError({
                repositoryId: '/path/to/test/repo',
            });
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const buttons = containerEl.querySelectorAll('.multi-git-error-buttons button');
            const openButton = Array.from(buttons).find(btn =>
                btn.textContent?.includes('Open in File Explorer')
            ) as HTMLButtonElement;

            openButton?.click();

            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(shell.openPath).toHaveBeenCalledWith('/path/to/test/repo');
        });
    });

    describe('edge cases', () => {
        it('should handle error without technical details', () => {
            const error = createConflictError({
                technicalDetails: undefined,
            });
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');

            expect(() => modal.onOpen()).not.toThrow();
        });

        it('should handle error without help link', () => {
            const error = createConflictError({
                helpLink: undefined,
            });
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');

            expect(() => modal.onOpen()).not.toThrow();
        });

        it('should handle many conflicted files', () => {
            const manyConflicts = Array.from({ length: 20 }, (_, i) =>
                `CONFLICT (content): Merge conflict in file${i}.ts`
            ).join('\n');

            const error = createConflictError({
                technicalDetails: manyConflicts,
            });
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const fileItems = containerEl.querySelectorAll('.multi-git-conflict-file-item');
            expect(fileItems.length).toBe(20);
        });

        it('should handle file explorer open failure gracefully', async () => {
            const { shell } = require('electron');
            shell.openPath.mockRejectedValueOnce(new Error('Failed to open'));

            const error = createConflictError();
            const modal = new MergeConflictModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const buttons = containerEl.querySelectorAll('.multi-git-error-buttons button');
            const openButton = Array.from(buttons).find(btn =>
                btn.textContent?.includes('Open in File Explorer')
            ) as HTMLButtonElement;

            // Should not throw
            expect(() => openButton?.click()).not.toThrow();

            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 10));
        });
    });
});
