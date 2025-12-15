import { App } from 'obsidian';
import { ManualInterventionModal } from '../../src/ui/ManualInterventionModal';
import type { PullOperationState } from '../../src/services/AutoPullService';
import { PullSkipReason, PullErrorCode } from '../../src/services/AutoPullService';
import * as terminalUtils from '../../src/utils/terminal';

// Mock the terminal utility
jest.mock('../../src/utils/terminal');

describe('ManualInterventionModal', () => {
    let app: App;
    let mockPullState: PullOperationState;

    beforeEach(() => {
        // Create mock app
        app = {} as App;

        // Mock Obsidian's HTMLElement extensions
        (HTMLElement.prototype as any).empty = function () {
            this.innerHTML = '';
        };
        (HTMLElement.prototype as any).createEl = function (tag: string, o?: any) {
            const el = document.createElement(tag);
            if (o?.text) el.textContent = o.text;
            if (o?.cls) el.className = o.cls;
            this.appendChild(el);
            return el;
        };
        (HTMLElement.prototype as any).addClass = function (cls: string) {
            this.classList.add(cls);
        };

        // Create base pull state
        mockPullState = {
            repositoryId: 'test-repo-id',
            repositoryName: 'Test Repository',
            repositoryPath: '/path/to/repo',
            startTime: new Date(),
            endTime: new Date(),
            status: 'skipped',
            pullType: 'fast-forward-only',
            commitsBefore: 'abc123',
            commitsAfter: null,
            commitsPulled: 0,
            errorMessage: null,
            errorCode: null,
            skipReason: null,
            retryCount: 0,
            lastRetryTime: null,
            nextRetryTime: null,
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Modal Rendering', () => {
        test('renders modal for DIVERGED_BRANCHES', () => {
            mockPullState.skipReason = PullSkipReason.DIVERGED_BRANCHES;
            const modal = new ManualInterventionModal(app, mockPullState);

            // Create a container for the modal
            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            // Check header
            expect(container.querySelector('.multi-git-intervention-header')).toBeTruthy();
            expect(container.querySelector('.multi-git-intervention-icon')?.innerHTML).toBe('⚠️');
            expect(container.querySelector('.multi-git-intervention-title')?.textContent).toBe('Manual Merge Required');
            expect(container.querySelector('.multi-git-intervention-subtitle')?.textContent).toBe('Test Repository');

            // Check content
            expect(container.querySelector('.multi-git-intervention-explanation')?.textContent).toContain('different changes');
            expect(container.querySelector('.multi-git-intervention-actions-list')).toBeTruthy();

            // Check buttons
            const buttons = container.querySelectorAll('button');
            expect(buttons.length).toBe(2);
            expect(buttons[0].textContent).toContain('Open Terminal');
            expect(buttons[1].textContent).toBe("I'll Handle This");
        });

        test('renders modal for UNCOMMITTED_CHANGES', () => {
            mockPullState.skipReason = PullSkipReason.UNCOMMITTED_CHANGES;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            // Check header
            expect(container.querySelector('.multi-git-intervention-icon')?.innerHTML).toBe('ℹ️');
            expect(container.querySelector('.multi-git-intervention-title')?.textContent).toBe('Uncommitted Changes');

            // Check content explains uncommitted changes
            expect(container.querySelector('.multi-git-intervention-explanation')?.textContent).toContain('uncommitted changes');
        });

        test('renders modal for AUTH_ERROR', () => {
            mockPullState.status = 'failed';
            mockPullState.errorCode = PullErrorCode.AUTH_ERROR;
            mockPullState.errorMessage = 'Authentication failed';
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            // Check header
            expect(container.querySelector('.multi-git-intervention-icon')?.innerHTML).toBe('🔑');
            expect(container.querySelector('.multi-git-intervention-title')?.textContent).toBe('Authentication Required');

            // Check content explains authentication
            expect(container.querySelector('.multi-git-intervention-explanation')?.textContent).toContain('authentication');
        });

        test('renders modal for CONCURRENT_OPERATION', () => {
            mockPullState.skipReason = PullSkipReason.CONCURRENT_OPERATION;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            // Check header
            expect(container.querySelector('.multi-git-intervention-icon')?.innerHTML).toBe('🔒');
            expect(container.querySelector('.multi-git-intervention-title')?.textContent).toBe('Repository Busy');

            // Check content explains concurrent operation
            expect(container.querySelector('.multi-git-intervention-explanation')?.textContent).toContain('git operation');
        });

        test('renders modal for LOCK_ERROR', () => {
            mockPullState.status = 'failed';
            mockPullState.errorCode = PullErrorCode.LOCK_ERROR;
            mockPullState.errorMessage = 'Repository locked';
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            // Check header
            expect(container.querySelector('.multi-git-intervention-icon')?.innerHTML).toBe('🔒');
            expect(container.querySelector('.multi-git-intervention-title')?.textContent).toBe('Repository Busy');

            // Check content explains lock
            expect(container.querySelector('.multi-git-intervention-explanation')?.textContent).toContain('locked');
        });

        test('renders default modal for unknown scenario', () => {
            mockPullState.skipReason = PullSkipReason.NOT_FAST_FORWARD;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            // Check header shows default
            expect(container.querySelector('.multi-git-intervention-icon')?.innerHTML).toBe('⚠️');
            expect(container.querySelector('.multi-git-intervention-title')?.textContent).toBe('Manual Intervention Needed');
        });

        test('includes repository information', () => {
            mockPullState.skipReason = PullSkipReason.DIVERGED_BRANCHES;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            const branchInfo = container.querySelector('.multi-git-intervention-branch-info');
            expect(branchInfo).toBeTruthy();
            expect(branchInfo?.textContent).toContain('Test Repository');
            expect(branchInfo?.textContent).toContain('/path/to/repo');
        });
    });

    describe('Terminal Launch Button', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
        });

        test('calls openRepositoryInTerminal when clicked', async () => {
            const mockOpenTerminal = jest.spyOn(terminalUtils, 'openRepositoryInTerminal').mockResolvedValue(true);

            mockPullState.skipReason = PullSkipReason.DIVERGED_BRANCHES;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            const terminalButton = container.querySelector('button') as HTMLButtonElement;
            expect(terminalButton).toBeTruthy();

            // Click the button
            terminalButton.click();

            // Wait for async operation
            await Promise.resolve();

            expect(mockOpenTerminal).toHaveBeenCalledWith('/path/to/repo');
        });

        test('shows success feedback when terminal opens successfully', async () => {
            jest.spyOn(terminalUtils, 'openRepositoryInTerminal').mockResolvedValue(true);

            mockPullState.skipReason = PullSkipReason.DIVERGED_BRANCHES;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            const terminalButton = container.querySelector('button') as HTMLButtonElement;
            const originalText = terminalButton.textContent;

            // Click the button
            terminalButton.click();

            // Button should be disabled and show "Opening..."
            expect(terminalButton.disabled).toBe(true);
            expect(terminalButton.textContent).toBe('Opening...');

            // Wait for async operation
            await Promise.resolve();

            // Button should show success
            expect(terminalButton.textContent).toBe('✓ Terminal Opened');

            // Fast-forward timers to restore button
            jest.advanceTimersByTime(2000);

            expect(terminalButton.textContent).toBe(originalText);
            expect(terminalButton.disabled).toBe(false);
        });

        test('shows error feedback when terminal fails to open', async () => {
            jest.spyOn(terminalUtils, 'openRepositoryInTerminal').mockResolvedValue(false);

            mockPullState.skipReason = PullSkipReason.DIVERGED_BRANCHES;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            const terminalButton = container.querySelector('button') as HTMLButtonElement;

            // Click the button
            terminalButton.click();

            // Wait for async operation
            await Promise.resolve();

            // Button should show error
            expect(terminalButton.textContent).toBe('✗ Failed to Open');

            // Fast-forward timers to restore button
            jest.advanceTimersByTime(2000);

            expect(terminalButton.disabled).toBe(false);
        });

        test('shows error feedback when terminal throws exception', async () => {
            jest.spyOn(terminalUtils, 'openRepositoryInTerminal').mockRejectedValue(new Error('Terminal error'));

            mockPullState.skipReason = PullSkipReason.DIVERGED_BRANCHES;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            const terminalButton = container.querySelector('button') as HTMLButtonElement;

            // Click the button
            terminalButton.click();

            // Wait for async operation
            await Promise.resolve();

            // Button should show error
            expect(terminalButton.textContent).toBe('✗ Error');

            // Fast-forward timers to restore button
            jest.advanceTimersByTime(2000);

            expect(terminalButton.disabled).toBe(false);
        });
    });

    describe('Acknowledgment Button', () => {
        test('closes modal when clicked', () => {
            mockPullState.skipReason = PullSkipReason.DIVERGED_BRANCHES;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            // Mock the close method
            const closeSpy = jest.spyOn(modal, 'close').mockImplementation(() => { });

            modal.onOpen();

            const buttons = container.querySelectorAll('button');
            const handleButton = buttons[1] as HTMLButtonElement;
            expect(handleButton.textContent).toBe("I'll Handle This");

            // Click the button
            handleButton.click();

            expect(closeSpy).toHaveBeenCalled();
        });
    });

    describe('Modal Lifecycle', () => {
        test('onClose clears content', () => {
            mockPullState.skipReason = PullSkipReason.DIVERGED_BRANCHES;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            // Container should have content
            expect(container.children.length).toBeGreaterThan(0);

            modal.onClose();

            // Container should be empty
            expect(container.children.length).toBe(0);
        });
    });

    describe('CSS Classes', () => {
        test('applies correct CSS classes to elements', () => {
            mockPullState.skipReason = PullSkipReason.DIVERGED_BRANCHES;
            const modal = new ManualInterventionModal(app, mockPullState);

            const container = document.createElement('div');
            modal.contentEl = container;

            modal.onOpen();

            // Check main container class
            expect(container.classList.contains('multi-git-intervention-modal')).toBe(true);

            // Check header classes
            expect(container.querySelector('.multi-git-intervention-header')).toBeTruthy();
            expect(container.querySelector('.multi-git-intervention-icon')).toBeTruthy();
            expect(container.querySelector('.multi-git-intervention-icon-warning')).toBeTruthy();
            expect(container.querySelector('.multi-git-intervention-title-container')).toBeTruthy();
            expect(container.querySelector('.multi-git-intervention-title')).toBeTruthy();
            expect(container.querySelector('.multi-git-intervention-subtitle')).toBeTruthy();

            // Check content classes
            expect(container.querySelector('.multi-git-intervention-content')).toBeTruthy();
            expect(container.querySelector('.multi-git-intervention-explanation')).toBeTruthy();
            expect(container.querySelector('.multi-git-intervention-actions-title')).toBeTruthy();
            expect(container.querySelector('.multi-git-intervention-actions-list')).toBeTruthy();
            expect(container.querySelector('.multi-git-intervention-branch-info')).toBeTruthy();

            // Check button classes
            expect(container.querySelector('.multi-git-intervention-buttons')).toBeTruthy();
            const terminalButton = container.querySelector('.multi-git-intervention-buttons button') as HTMLButtonElement;
            expect(terminalButton.classList.contains('mod-cta')).toBe(true);
        });
    });
});
