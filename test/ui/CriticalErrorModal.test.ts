/**
 * Tests for CriticalErrorModal
 */

import { App } from 'obsidian';
import { CriticalErrorModal } from '../../src/ui/CriticalErrorModal';
import { ClassifiedError, ErrorSeverity, ErrorScenario } from '../../src/utils/errors';

// Mock Obsidian App
const mockApp = {
    vault: {},
    workspace: {},
} as App;

describe('CriticalErrorModal', () => {
    let containerEl: HTMLElement;

    beforeEach(() => {
        // Create a container element for testing
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
        };

        mockElement(containerEl);

        document.body.appendChild(containerEl);
    });

    afterEach(() => {
        document.body.removeChild(containerEl);
    });

    const createMockError = (overrides?: Partial<ClassifiedError>): ClassifiedError => ({
        error: new Error('Test error'),
        severity: ErrorSeverity.CRITICAL,
        scenario: ErrorScenario.UNKNOWN,
        repositoryId: 'test-repo-id',
        repositoryName: 'test-repo',
        userMessage: 'Test error message',
        suggestedActions: ['Action 1', 'Action 2'],
        technicalDetails: 'Error details',
        helpLink: 'https://example.com/help',
        operation: 'test-operation',
        ...overrides,
    });

    describe('constructor', () => {
        it('should create modal with classified error', () => {
            const error = createMockError();
            const modal = new CriticalErrorModal(mockApp, error);

            expect(modal).toBeInstanceOf(CriticalErrorModal);
        });
    });

    describe('onOpen', () => {
        it('should render header with repository name', () => {
            const error = createMockError({
                repositoryName: 'my-awesome-repo',
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const subtitle = containerEl.querySelector('.multi-git-error-subtitle');
            expect(subtitle?.textContent).toBe('my-awesome-repo');
        });

        it('should render user message', () => {
            const error = createMockError({
                userMessage: 'Operation failed due to authentication error',
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const message = containerEl.querySelector('.multi-git-error-message-text');
            expect(message?.textContent).toBe('Operation failed due to authentication error');
        });

        it('should render suggested actions list', () => {
            const error = createMockError({
                suggestedActions: [
                    'Check your network connection',
                    'Verify repository access',
                    'Try again later',
                ],
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const actionsList = containerEl.querySelectorAll('.multi-git-error-action-item');
            expect(actionsList.length).toBe(3);
            expect(actionsList[0].textContent).toBe('Check your network connection');
            expect(actionsList[1].textContent).toBe('Verify repository access');
            expect(actionsList[2].textContent).toBe('Try again later');
        });

        it('should not render actions section if no actions provided', () => {
            const error = createMockError({
                suggestedActions: [],
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const actionsContainer = containerEl.querySelector('.multi-git-error-actions');
            expect(actionsContainer).toBeFalsy();
        });

        it('should render technical details in collapsible section', () => {
            const error = createMockError({
                technicalDetails: 'fatal: Authentication failed for \'https://github.com/user/repo.git\'',
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const detailsText = containerEl.querySelector('.multi-git-error-details-text');
            expect(detailsText).toBeTruthy();
            expect(detailsText?.textContent).toContain('Authentication failed');
        });

        it('should not render technical details if not provided', () => {
            const error = createMockError({
                technicalDetails: undefined,
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const detailsContainer = containerEl.querySelector('.multi-git-error-details-container');
            expect(detailsContainer).toBeFalsy();
        });

        it('should render help link if provided', () => {
            const error = createMockError({
                helpLink: 'https://docs.example.com/troubleshooting',
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const helpLink = containerEl.querySelector('.multi-git-error-help-link') as HTMLAnchorElement;
            expect(helpLink).toBeTruthy();
            expect(helpLink?.href).toBe('https://docs.example.com/troubleshooting');
            expect(helpLink?.target).toBe('_blank');
        });

        it('should not render help link if not provided', () => {
            const error = createMockError({
                helpLink: undefined,
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const helpContainer = containerEl.querySelector('.multi-git-error-help');
            expect(helpContainer).toBeFalsy();
        });

        it('should create acknowledge button', () => {
            const error = createMockError();
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const buttons = containerEl.querySelectorAll('.multi-git-error-buttons button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('button interactions', () => {
        it('should close modal when acknowledge button clicked', () => {
            const error = createMockError();
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            const closeSpy = jest.spyOn(modal, 'close');

            modal.onOpen();

            const button = containerEl.querySelector('.multi-git-error-buttons button') as HTMLButtonElement;
            button?.click();

            expect(closeSpy).toHaveBeenCalled();
        });

        it('should toggle technical details visibility', () => {
            const error = createMockError({
                technicalDetails: 'Technical error details here',
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const toggle = containerEl.querySelector('.multi-git-error-details-toggle') as HTMLElement;
            const detailsContent = containerEl.querySelector('.multi-git-error-details-content') as HTMLElement;

            // Initially hidden
            expect(detailsContent.style.display).toBe('none');
            expect(toggle.textContent).toContain('Show Technical Details');

            // Click to expand
            toggle?.click();
            expect(detailsContent.style.display).toBe('block');
            expect(toggle.textContent).toContain('Hide Technical Details');

            // Click to collapse
            toggle?.click();
            expect(detailsContent.style.display).toBe('none');
            expect(toggle.textContent).toContain('Show Technical Details');
        });
    });

    describe('formatTechnicalDetails', () => {
        it('should format error lines with separators', () => {
            const error = createMockError({
                technicalDetails: 'fatal: Authentication failed\nsome context\n',
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const detailsText = containerEl.querySelector('.multi-git-error-details-text');
            expect(detailsText?.textContent).toContain('━');
            expect(detailsText?.textContent).toContain('fatal: Authentication failed');
        });

        it('should handle empty technical details', () => {
            const error = createMockError({
                technicalDetails: '',
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const detailsContainer = containerEl.querySelector('.multi-git-error-details-container');
            expect(detailsContainer).toBeFalsy();
        });
    });

    describe('edge cases', () => {
        it('should handle minimal error object', () => {
            const error: ClassifiedError = {
                error: new Error('Minimal error'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.UNKNOWN,
                repositoryId: 'repo',
                repositoryName: 'Repo',
                userMessage: 'Error occurred',
                suggestedActions: [],
                operation: 'status',
            };
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');

            expect(() => modal.onOpen()).not.toThrow();
        });

        it('should handle very long error messages', () => {
            const longMessage = 'a'.repeat(1000);
            const error = createMockError({
                userMessage: longMessage,
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');

            expect(() => modal.onOpen()).not.toThrow();
            const message = containerEl.querySelector('.multi-git-error-message-text');
            expect(message?.textContent).toHaveLength(1000);
        });

        it('should handle many suggested actions', () => {
            const manyActions = Array.from({ length: 20 }, (_, i) => `Action ${i + 1}`);
            const error = createMockError({
                suggestedActions: manyActions,
            });
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const actionsList = containerEl.querySelectorAll('.multi-git-error-action-item');
            expect(actionsList.length).toBe(20);
        });
    });

    describe('onClose', () => {
        it('should empty content element', () => {
            const error = createMockError();
            const modal = new CriticalErrorModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            expect(containerEl.children.length).toBeGreaterThan(0);

            modal.onClose();

            expect(containerEl.children.length).toBe(0);
        });
    });
});
