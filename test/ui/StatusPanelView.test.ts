import { StatusPanelView, VIEW_TYPE_STATUS_PANEL } from '../../src/ui/StatusPanelView';
import type MultiGitPlugin from '../../src/main';

/**
 * Unit tests for StatusPanelView
 * 
 * Tests cover:
 * - View type, display text, and icon
 * - Lifecycle methods (onOpen, onClose)
 * - Basic rendering
 */
describe('StatusPanelView', () => {
    let mockPlugin: MultiGitPlugin;
    let mockLeaf: any;

    beforeEach(() => {
        // Mock plugin instance
        mockPlugin = {} as MultiGitPlugin;

        // Mock workspace leaf
        mockLeaf = {
            view: null
        };
    });

    describe('View metadata', () => {
        test('should return correct view type', () => {
            const view = new StatusPanelView(mockLeaf, mockPlugin);
            expect(view.getViewType()).toBe(VIEW_TYPE_STATUS_PANEL);
            expect(view.getViewType()).toBe('multi-git-status');
        });

        test('should return correct display text', () => {
            const view = new StatusPanelView(mockLeaf, mockPlugin);
            expect(view.getDisplayText()).toBe('Multi-Git Status');
        });

        test('should return correct icon', () => {
            const view = new StatusPanelView(mockLeaf, mockPlugin);
            expect(view.getIcon()).toBe('git-branch');
        });
    });

    describe('Lifecycle methods', () => {
        test('should have onOpen method', () => {
            const view = new StatusPanelView(mockLeaf, mockPlugin);
            expect(view.onOpen).toBeDefined();
            expect(typeof view.onOpen).toBe('function');
        });

        test('should have onClose method', () => {
            const view = new StatusPanelView(mockLeaf, mockPlugin);
            expect(view.onClose).toBeDefined();
            expect(typeof view.onClose).toBe('function');
        });
    });
});
