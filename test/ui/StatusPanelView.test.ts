import { StatusPanelView, VIEW_TYPE_STATUS_PANEL } from '../../src/ui/StatusPanelView';
import type MultiGitPlugin from '../../src/main';
import { RepositoryStatus } from '../../src/settings/data';

/**
 * Unit tests for StatusPanelView
 * 
 * Tests cover:
 * - View metadata (type, display text, icon)
 * - Lifecycle methods (onOpen, onClose)
 * - Polling behavior (start, stop, no memory leaks)
 * - Rendering (empty state, loading state, repository list)
 * - Error state rendering
 * - Refresh operations (all repos, single repo)
 * - Debouncing and queuing logic
 */
describe('StatusPanelView', () => {
    let mockPlugin: MultiGitPlugin;
    let mockLeaf: any;
    let mockRepositoryConfigService: any;
    let mockGitCommandService: any;

    beforeEach(() => {
        // Add Obsidian's DOM helper methods to HTMLElement
        if (!HTMLElement.prototype.createDiv) {
            (HTMLElement.prototype as any).createDiv = function (options?: any) {
                const div = document.createElement('div');
                if (options?.cls) div.className = options.cls;
                if (options?.text) div.textContent = options.text;
                this.appendChild(div);
                return div;
            };
        }
        if (!HTMLElement.prototype.createEl) {
            (HTMLElement.prototype as any).createEl = function (tag: string, options?: any) {
                const el = document.createElement(tag);
                if (options?.cls) el.className = options.cls;
                if (options?.text) el.textContent = options.text;
                if (options?.attr) {
                    Object.entries(options.attr).forEach(([key, value]) => {
                        el.setAttribute(key, value as string);
                    });
                }
                this.appendChild(el);
                return el;
            };
        }
        if (!HTMLElement.prototype.createSpan) {
            (HTMLElement.prototype as any).createSpan = function (options?: any) {
                const span = document.createElement('span');
                if (options?.cls) span.className = options.cls;
                if (options?.text) span.textContent = options.text;
                if (options?.attr) {
                    Object.entries(options.attr).forEach(([key, value]) => {
                        span.setAttribute(key, value as string);
                    });
                }
                this.appendChild(span);
                return span;
            };
        }
        if (!HTMLElement.prototype.empty) {
            (HTMLElement.prototype as any).empty = function () {
                this.innerHTML = '';
            };
        }
        if (!HTMLElement.prototype.addClass) {
            (HTMLElement.prototype as any).addClass = function (cls: string) {
                this.classList.add(cls);
            };
        }

        // Mock repository config service
        mockRepositoryConfigService = {
            getEnabledRepositories: jest.fn().mockReturnValue([])
        };

        // Mock git command service
        mockGitCommandService = {
            getExtendedRepositoryStatus: jest.fn()
        };

        // Mock plugin instance
        mockPlugin = {
            repositoryConfigService: mockRepositoryConfigService,
            gitCommandService: mockGitCommandService
        } as any;

        // Mock workspace leaf with containerEl
        mockLeaf = {
            view: null,
            containerEl: document.createElement('div')
        };

        // Clear timers
        jest.clearAllTimers();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
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

    describe('TEST-002: View Lifecycle', () => {
        describe('onOpen()', () => {
            test('should initialize panel UI structure', async () => {
                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                const container = mockLeaf.containerEl.children[1];
                expect(container.classList.contains('multi-git-status-panel')).toBe(true);

                // Check for header
                const header = container.querySelector('.multi-git-status-header');
                expect(header).not.toBeNull();

                // Check for title
                const title = container.querySelector('.multi-git-status-title');
                expect(title).not.toBeNull();
                expect(title?.textContent).toBe('Multi-Git Status');

                // Check for last refresh time display
                const lastRefresh = container.querySelector('.multi-git-status-last-refresh');
                expect(lastRefresh).not.toBeNull();
                expect(lastRefresh?.textContent).toBe('Never refreshed');

                // Check for refresh button
                const refreshButton = container.querySelector('.multi-git-status-refresh-button');
                expect(refreshButton).not.toBeNull();

                // Check for repository list container
                const repoList = container.querySelector('.multi-git-repository-list');
                expect(repoList).not.toBeNull();
            });

            test('should render empty state when no repositories configured', async () => {
                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([]);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                const container = mockLeaf.containerEl.children[1];
                const emptyState = container.querySelector('.multi-git-empty-state');
                expect(emptyState).not.toBeNull();
                expect(emptyState?.textContent).toContain('No repositories configured');
            });

            test('should start polling on open', async () => {
                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                // Verify setInterval was called
                expect(jest.getTimerCount()).toBeGreaterThan(0);
            });

            test('should call renderStatuses during initialization', async () => {
                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([]);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                const renderSpy = jest.spyOn(view as any, 'renderStatuses');

                await view.onOpen();

                expect(renderSpy).toHaveBeenCalled();
            });
        });

        describe('onClose()', () => {
            test('should stop polling on close', async () => {
                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                const initialTimerCount = jest.getTimerCount();
                expect(initialTimerCount).toBeGreaterThan(0);

                await view.onClose();

                // All timers should be cleared
                expect(jest.getTimerCount()).toBe(0);
            });

            test('should clear cached status data on close', async () => {
                const mockStatus: RepositoryStatus = {
                    repositoryId: 'test-repo',
                    repositoryName: 'Test Repo',
                    repositoryPath: '/path/to/repo',
                    currentBranch: 'main',
                    hasUncommittedChanges: false,
                    stagedFiles: [],
                    unstagedFiles: [],
                    untrackedFiles: []
                };

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'test-repo', name: 'Test Repo', path: '/path/to/repo' }
                ]);
                mockGitCommandService.getExtendedRepositoryStatus.mockResolvedValue(mockStatus);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                // Verify status is cached
                expect((view as any).state.statuses.size).toBeGreaterThan(0);

                await view.onClose();

                // Verify cache is cleared
                expect((view as any).state.statuses.size).toBe(0);
                expect((view as any).state.isRefreshing).toBe(false);
                expect((view as any).state.lastRefreshTime).toBe(0);
                expect((view as any).state.hasPendingRefresh).toBe(false);
            });

            test('should prevent memory leaks by clearing DOM references', async () => {
                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                expect((view as any).headerEl).not.toBeNull();
                expect((view as any).repositoryListEl).not.toBeNull();

                await view.onClose();

                expect((view as any).headerEl).toBeNull();
                expect((view as any).repositoryListEl).toBeNull();
            });

            test('should handle close when view was never opened', async () => {
                const view = new StatusPanelView(mockLeaf, mockPlugin);

                // Should not throw
                await expect(view.onClose()).resolves.not.toThrow();
            });
        });

        describe('Polling behavior', () => {
            test('should poll every 30 seconds', async () => {
                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Repo 1', path: '/path/1' }
                ]);

                const view = new StatusPanelView(mockLeaf, mockPlugin);

                // Set up spy before onOpen so it captures all calls
                const refreshSpy = jest.spyOn(view as any, 'refreshAll');

                await view.onOpen();

                // Advance by 29 seconds - should not trigger
                jest.advanceTimersByTime(29000);
                expect(refreshSpy).not.toHaveBeenCalled();

                // Advance by 1 more second (total 30s) - should trigger
                jest.advanceTimersByTime(1000);
                expect(refreshSpy).toHaveBeenCalled();
            });

            test('should not start multiple polling intervals', async () => {
                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                const initialTimerCount = jest.getTimerCount();

                // Call startPolling again (simulating edge case)
                (view as any).startPolling();

                // Should not create additional timer
                expect(jest.getTimerCount()).toBe(initialTimerCount);
            });

            test('should skip poll if refresh already in progress', async () => {
                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Repo 1', path: '/path/1' }
                ]);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                // Set refresh in progress
                (view as any).state.isRefreshing = true;

                const gitServiceSpy = jest.spyOn(mockGitCommandService, 'getExtendedRepositoryStatus');

                // Trigger poll
                jest.advanceTimersByTime(30000);

                // Should not call git service since refresh is in progress
                expect(gitServiceSpy).not.toHaveBeenCalled();
            });

            test('should skip poll if no repositories configured', async () => {
                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([]);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                const gitServiceSpy = jest.spyOn(mockGitCommandService, 'getExtendedRepositoryStatus');

                // Trigger poll
                jest.advanceTimersByTime(30000);

                // Should not call git service since no repos
                expect(gitServiceSpy).not.toHaveBeenCalled();
            });
        });
    });

    describe('TEST-003: Rendering Tests', () => {
        describe('renderStatuses() - Empty State', () => {
            test('should render empty state when no repositories configured', async () => {
                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([]);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                const container = mockLeaf.containerEl.children[1];
                const emptyState = container.querySelector('.multi-git-empty-state');

                expect(emptyState).not.toBeNull();
                expect(emptyState?.textContent).toContain('No repositories configured');
                expect(emptyState?.textContent).toContain('Add repositories in plugin settings');
            });

            test('should not show loading state when not refreshing', async () => {
                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([]);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                const container = mockLeaf.containerEl.children[1];
                const loadingState = container.querySelector('.multi-git-loading');

                expect(loadingState).toBeNull();
            });
        });

        describe('renderStatuses() - Loading State', () => {
            test('should render loading state during refresh', async () => {
                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Repo 1', path: '/path/1' }
                ]);

                // Make git service hang to keep refresh in progress
                let resolveStatus: any;
                mockGitCommandService.getExtendedRepositoryStatus.mockReturnValue(
                    new Promise(resolve => { resolveStatus = resolve; })
                );

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();

                // Trigger refresh
                const refreshPromise = view.refreshAll();

                // Should show loading state
                const container = mockLeaf.containerEl.children[1];
                const loadingState = container.querySelector('.multi-git-loading');

                expect(loadingState).not.toBeNull();
                expect(loadingState?.textContent).toContain('Refreshing repository statuses');

                // Resolve to cleanup
                resolveStatus({});
                await refreshPromise;
            });
        });

        describe('renderRepositoryStatus() - Various States', () => {
            test('should render clean repository status', async () => {
                const mockStatus: RepositoryStatus = {
                    repositoryId: 'repo1',
                    repositoryName: 'Clean Repo',
                    repositoryPath: '/path/to/clean',
                    currentBranch: 'main',
                    hasUncommittedChanges: false,
                    stagedFiles: [],
                    unstagedFiles: [],
                    untrackedFiles: [],
                    unpushedCommits: 0,
                    remoteChanges: 0,
                    fetchStatus: 'success'
                };

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Clean Repo', path: '/path/to/clean' }
                ]);
                mockGitCommandService.getExtendedRepositoryStatus.mockResolvedValue(mockStatus);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                const container = mockLeaf.containerEl.children[1];
                const repoItem = container.querySelector('.multi-git-repository-item');

                expect(repoItem).not.toBeNull();

                // Check repository name
                const repoName = repoItem?.querySelector('.multi-git-repo-name');
                expect(repoName?.textContent).toBe('Clean Repo');

                // Check branch
                const branchName = repoItem?.querySelector('.multi-git-branch-name');
                expect(branchName?.textContent).toBe('main');

                // Check for clean status indicator
                const cleanIndicator = repoItem?.querySelector('.multi-git-clean');
                expect(cleanIndicator).not.toBeNull();
                expect(cleanIndicator?.textContent).toContain('Up to date');
            });

            test('should render uncommitted changes indicator', async () => {
                const mockStatus: RepositoryStatus = {
                    repositoryId: 'repo1',
                    repositoryName: 'Dirty Repo',
                    repositoryPath: '/path/to/dirty',
                    currentBranch: 'feature',
                    hasUncommittedChanges: true,
                    stagedFiles: ['file1.ts'],
                    unstagedFiles: ['file2.ts', 'file3.ts'],
                    untrackedFiles: ['file4.ts']
                };

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Dirty Repo', path: '/path/to/dirty' }
                ]);
                mockGitCommandService.getExtendedRepositoryStatus.mockResolvedValue(mockStatus);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                const container = mockLeaf.containerEl.children[1];
                const uncommittedIndicator = container.querySelector('.multi-git-uncommitted');

                expect(uncommittedIndicator).not.toBeNull();
                expect(uncommittedIndicator?.textContent).toContain('4 uncommitted');
            });

            test('should render unpushed commits indicator', async () => {
                const mockStatus: RepositoryStatus = {
                    repositoryId: 'repo1',
                    repositoryName: 'Ahead Repo',
                    repositoryPath: '/path/to/ahead',
                    currentBranch: 'main',
                    hasUncommittedChanges: false,
                    stagedFiles: [],
                    unstagedFiles: [],
                    untrackedFiles: [],
                    unpushedCommits: 3
                };

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Ahead Repo', path: '/path/to/ahead' }
                ]);
                mockGitCommandService.getExtendedRepositoryStatus.mockResolvedValue(mockStatus);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                const container = mockLeaf.containerEl.children[1];
                const unpushedIndicator = container.querySelector('.multi-git-unpushed');

                expect(unpushedIndicator).not.toBeNull();
                expect(unpushedIndicator?.textContent).toContain('3 to push');
            });

            test('should render remote changes indicator', async () => {
                const mockStatus: RepositoryStatus = {
                    repositoryId: 'repo1',
                    repositoryName: 'Behind Repo',
                    repositoryPath: '/path/to/behind',
                    currentBranch: 'main',
                    hasUncommittedChanges: false,
                    stagedFiles: [],
                    unstagedFiles: [],
                    untrackedFiles: [],
                    remoteChanges: 5
                };

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Behind Repo', path: '/path/to/behind' }
                ]);
                mockGitCommandService.getExtendedRepositoryStatus.mockResolvedValue(mockStatus);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                const container = mockLeaf.containerEl.children[1];
                const remoteChangesIndicator = container.querySelector('.multi-git-remote-changes');

                expect(remoteChangesIndicator).not.toBeNull();
                expect(remoteChangesIndicator?.textContent).toContain('5 to pull');
            });

            test('should render error state with retry button', async () => {
                const mockStatus: RepositoryStatus = {
                    repositoryId: 'repo1',
                    repositoryName: 'Error Repo',
                    repositoryPath: '/path/to/error',
                    currentBranch: null,
                    hasUncommittedChanges: false,
                    stagedFiles: [],
                    unstagedFiles: [],
                    untrackedFiles: [],
                    fetchStatus: 'error',
                    lastFetchError: 'Authentication failed'
                };

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Error Repo', path: '/path/to/error' }
                ]);
                mockGitCommandService.getExtendedRepositoryStatus.mockResolvedValue(mockStatus);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                const container = mockLeaf.containerEl.children[1];
                const errorIndicator = container.querySelector('.multi-git-error');

                expect(errorIndicator).not.toBeNull();
                expect(errorIndicator?.textContent).toContain('Authentication error');

                // Check for retry button
                const retryButton = errorIndicator?.querySelector('.multi-git-retry-button');
                expect(retryButton).not.toBeNull();
            });

            test('should render detached HEAD state', async () => {
                const mockStatus: RepositoryStatus = {
                    repositoryId: 'repo1',
                    repositoryName: 'Detached Repo',
                    repositoryPath: '/path/to/detached',
                    currentBranch: null,
                    hasUncommittedChanges: false,
                    stagedFiles: [],
                    unstagedFiles: [],
                    untrackedFiles: []
                };

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Detached Repo', path: '/path/to/detached' }
                ]);
                mockGitCommandService.getExtendedRepositoryStatus.mockResolvedValue(mockStatus);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                const container = mockLeaf.containerEl.children[1];
                const branchName = container.querySelector('.multi-git-branch-name');

                expect(branchName?.textContent).toBe('detached HEAD');
                expect(branchName?.classList.contains('multi-git-detached')).toBe(true);
            });

            test('should render multiple status indicators together', async () => {
                const mockStatus: RepositoryStatus = {
                    repositoryId: 'repo1',
                    repositoryName: 'Complex Repo',
                    repositoryPath: '/path/to/complex',
                    currentBranch: 'develop',
                    hasUncommittedChanges: true,
                    stagedFiles: ['file1.ts'],
                    unstagedFiles: ['file2.ts'],
                    untrackedFiles: [],
                    unpushedCommits: 2,
                    remoteChanges: 1
                };

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Complex Repo', path: '/path/to/complex' }
                ]);
                mockGitCommandService.getExtendedRepositoryStatus.mockResolvedValue(mockStatus);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                const container = mockLeaf.containerEl.children[1];

                // Should have all three indicators
                expect(container.querySelector('.multi-git-uncommitted')).not.toBeNull();
                expect(container.querySelector('.multi-git-unpushed')).not.toBeNull();
                expect(container.querySelector('.multi-git-remote-changes')).not.toBeNull();

                // Should NOT have clean indicator
                expect(container.querySelector('.multi-git-clean')).toBeNull();
            });
        });

        describe('renderStatuses() - Multiple Repositories', () => {
            test('should render multiple repositories', async () => {
                const mockStatuses: RepositoryStatus[] = [
                    {
                        repositoryId: 'repo1',
                        repositoryName: 'Repo 1',
                        repositoryPath: '/path/1',
                        currentBranch: 'main',
                        hasUncommittedChanges: false,
                        stagedFiles: [],
                        unstagedFiles: [],
                        untrackedFiles: []
                    },
                    {
                        repositoryId: 'repo2',
                        repositoryName: 'Repo 2',
                        repositoryPath: '/path/2',
                        currentBranch: 'feature',
                        hasUncommittedChanges: true,
                        stagedFiles: ['file.ts'],
                        unstagedFiles: [],
                        untrackedFiles: []
                    }
                ];

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Repo 1', path: '/path/1' },
                    { id: 'repo2', name: 'Repo 2', path: '/path/2' }
                ]);

                mockGitCommandService.getExtendedRepositoryStatus
                    .mockResolvedValueOnce(mockStatuses[0])
                    .mockResolvedValueOnce(mockStatuses[1]);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                const container = mockLeaf.containerEl.children[1];
                const repoItems = container.querySelectorAll('.multi-git-repository-item');

                expect(repoItems.length).toBe(2);
            });
        });

        describe('Error message formatting', () => {
            test('should format authentication errors', async () => {
                const mockStatus: RepositoryStatus = {
                    repositoryId: 'repo1',
                    repositoryName: 'Auth Error Repo',
                    repositoryPath: '/path',
                    currentBranch: 'main',
                    hasUncommittedChanges: false,
                    stagedFiles: [],
                    unstagedFiles: [],
                    untrackedFiles: [],
                    fetchStatus: 'error',
                    lastFetchError: 'Authentication failed for remote'
                };

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Auth Error Repo', path: '/path' }
                ]);
                mockGitCommandService.getExtendedRepositoryStatus.mockResolvedValue(mockStatus);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                const container = mockLeaf.containerEl.children[1];
                const errorText = container.querySelector('.multi-git-status-text');

                expect(errorText?.textContent).toBe('Authentication error');
            });

            test('should truncate long error messages', async () => {
                const longError = 'This is a very long error message that should be truncated to avoid taking up too much space in the UI';

                const mockStatus: RepositoryStatus = {
                    repositoryId: 'repo1',
                    repositoryName: 'Long Error Repo',
                    repositoryPath: '/path',
                    currentBranch: 'main',
                    hasUncommittedChanges: false,
                    stagedFiles: [],
                    unstagedFiles: [],
                    untrackedFiles: [],
                    fetchStatus: 'error',
                    lastFetchError: longError
                };

                mockRepositoryConfigService.getEnabledRepositories.mockReturnValue([
                    { id: 'repo1', name: 'Long Error Repo', path: '/path' }
                ]);
                mockGitCommandService.getExtendedRepositoryStatus.mockResolvedValue(mockStatus);

                const view = new StatusPanelView(mockLeaf, mockPlugin);
                await view.onOpen();
                await view.refreshAll();

                const container = mockLeaf.containerEl.children[1];
                const errorText = container.querySelector('.multi-git-status-text');

                expect(errorText?.textContent).toContain('...');
                expect(errorText?.textContent?.length).toBeLessThanOrEqual(50);
            });
        });
    });
});
