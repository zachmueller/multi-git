import { StatusPanelView, VIEW_TYPE_STATUS_PANEL } from '../../src/ui/StatusPanelView';
import type MultiGitPlugin from '../../src/main';
import { GitCommandService } from '../../src/services/GitCommandService';
import { RepositoryConfigService } from '../../src/services/RepositoryConfigService';
import { RepositoryStatus, RepositoryConfig } from '../../src/settings/data';

/**
 * Create a mock repository config with all required fields
 */
function createMockRepo(id: string, name: string, path: string): RepositoryConfig {
    return {
        id,
        name,
        path,
        enabled: true,
        createdAt: Date.now(),
        fetchInterval: 300000,
        lastFetchStatus: 'idle',
        remoteChanges: false
    };
}

/**
 * TEST-004: Integration tests for StatusPanelView
 * 
 * Tests full integration with real service instances to verify:
 * - Status panel with real GitCommandService
 * - Refresh operations end-to-end
 * - Event-driven updates
 * - Polling behavior
 * - Multiple repositories handling
 * - Error scenarios with real services
 */
describe('StatusPanelView Integration Tests', () => {
    let mockPlugin: MultiGitPlugin;
    let mockLeaf: any;
    let gitCommandService: GitCommandService;
    let repositoryConfigService: RepositoryConfigService;

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

        // Create complete mock settings
        const mockSettings: any = {
            repositories: [],
            version: '0.1.0',
            globalFetchInterval: 300000,
            fetchOnStartup: true,
            notifyOnRemoteChanges: true,
            debugLogging: false,
            customPathEntries: []
        };

        gitCommandService = new GitCommandService(mockSettings);

        const mockApp = {
            vault: {
                adapter: {
                    write: jest.fn()
                }
            }
        };

        repositoryConfigService = new RepositoryConfigService(mockApp as any, mockSettings);

        // Mock plugin instance with real services
        mockPlugin = {
            repositoryConfigService,
            gitCommandService,
            settings: mockSettings
        } as any;

        // Mock workspace leaf with containerEl
        mockLeaf = {
            view: null,
            containerEl: document.createElement('div')
        };

        // Setup timers
        jest.clearAllTimers();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('End-to-end status refresh', () => {
        test('should refresh all repositories end-to-end', async () => {
            // Mock repository config
            const mockRepos = [
                createMockRepo('repo1', 'Repo 1', '/path/1'),
                createMockRepo('repo2', 'Repo 2', '/path/2')
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            // Mock git operations
            const mockStatus: RepositoryStatus = {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                repositoryPath: '/path/1',
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: []
            };
            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus').mockResolvedValue(mockStatus);

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();

            // Trigger refresh
            await view.refreshAll();
            await jest.runAllTimersAsync();

            // Verify git service was called for each repository
            expect(gitCommandService.getExtendedRepositoryStatus).toHaveBeenCalledTimes(2);
        });

        test('should handle partial failures during refresh', async () => {
            const mockRepos = [
                { id: 'repo1', name: 'Repo 1', path: '/path/1', enabled: true } as any,
                { id: 'repo2', name: 'Repo 2', path: '/path/2', enabled: true } as any
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            // First repo succeeds, second fails
            const successStatus: RepositoryStatus = {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                repositoryPath: '/path/1',
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: []
            };

            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus')
                .mockResolvedValueOnce(successStatus)
                .mockRejectedValueOnce(new Error('Git command failed'));

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();

            // Should not throw despite one failure
            await expect(view.refreshAll()).resolves.not.toThrow();
            await jest.runAllTimersAsync();

            // Both repos should have been attempted
            expect(gitCommandService.getExtendedRepositoryStatus).toHaveBeenCalledTimes(2);
        });
    });

    describe('Single repository refresh', () => {
        test('should refresh only specified repository', async () => {
            const mockRepos = [
                { id: 'repo1', name: 'Repo 1', path: '/path/1', enabled: true } as any,
                { id: 'repo2', name: 'Repo 2', path: '/path/2', enabled: true } as any
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            const mockStatus: RepositoryStatus = {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                repositoryPath: '/path/1',
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: []
            };
            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus').mockResolvedValue(mockStatus);

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();

            // Refresh only repo1
            await view.refreshRepository('repo1');
            await jest.runAllTimersAsync();

            // Should only call git service once for repo1
            expect(gitCommandService.getExtendedRepositoryStatus).toHaveBeenCalledTimes(1);
            expect(gitCommandService.getExtendedRepositoryStatus).toHaveBeenCalledWith(
                '/path/1',
                'repo1',
                'Repo 1',
                expect.any(Object)
            );
        });

        test('should handle refresh of non-existent repository', async () => {
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue([]);

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();

            // Should not throw
            await expect(view.refreshRepository('non-existent')).resolves.not.toThrow();
        });
    });

    describe('Polling behavior with real services', () => {
        test('should poll and refresh with real services', async () => {
            const mockRepos = [
                { id: 'repo1', name: 'Repo 1', path: '/path/1', enabled: true } as any
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            const mockStatus: RepositoryStatus = {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                repositoryPath: '/path/1',
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: []
            };
            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus').mockResolvedValue(mockStatus);

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();

            // Clear initial call from onOpen
            jest.clearAllMocks();

            // Advance timer to trigger poll
            jest.advanceTimersByTime(30000);
            await jest.runAllTimersAsync();

            // Should have called git service during poll
            expect(gitCommandService.getExtendedRepositoryStatus).toHaveBeenCalled();
        });

        test('should stop polling after close', async () => {
            const mockRepos = [
                { id: 'repo1', name: 'Repo 1', path: '/path/1', enabled: true } as any
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            const mockStatus: RepositoryStatus = {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                repositoryPath: '/path/1',
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: []
            };
            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus').mockResolvedValue(mockStatus);

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();
            await view.onClose();

            // Clear mocks
            jest.clearAllMocks();

            // Advance timer - should NOT trigger poll after close
            jest.advanceTimersByTime(30000);

            // Should not have called git service
            expect(gitCommandService.getExtendedRepositoryStatus).not.toHaveBeenCalled();
        });
    });

    describe('Error scenarios', () => {
        test('should handle git service errors gracefully', async () => {
            const mockRepos = [
                { id: 'repo1', name: 'Repo 1', path: '/path/1', enabled: true } as any
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            // Make git service throw
            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus')
                .mockRejectedValue(new Error('Git not found'));

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();

            // Should not throw despite error
            await expect(view.refreshAll()).resolves.not.toThrow();
            await jest.runAllTimersAsync();

            // Should render error state
            const container = mockLeaf.containerEl.children[1];
            const errorIndicator = container.querySelector('.multi-git-error');
            expect(errorIndicator).not.toBeNull();
        });

        test('should continue polling after errors', async () => {
            const mockRepos = [
                { id: 'repo1', name: 'Repo 1', path: '/path/1', enabled: true } as any
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            // First call fails, second succeeds
            const mockStatus: RepositoryStatus = {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                repositoryPath: '/path/1',
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: []
            };

            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus')
                .mockRejectedValueOnce(new Error('Git error'))
                .mockResolvedValue(mockStatus);

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();
            await jest.runAllTimersAsync();

            // First refresh failed
            expect(gitCommandService.getExtendedRepositoryStatus).toHaveBeenCalledTimes(1);

            // Advance timer for next poll
            jest.advanceTimersByTime(30000);
            await jest.runAllTimersAsync();

            // Second refresh should have been attempted
            expect(gitCommandService.getExtendedRepositoryStatus).toHaveBeenCalledTimes(2);
        });
    });

    describe('Multiple repositories handling', () => {
        test('should handle many repositories efficiently', async () => {
            // Create 10 mock repositories
            const mockRepos = Array.from({ length: 10 }, (_, i) => ({
                id: `repo${i}`,
                name: `Repo ${i}`,
                path: `/path/${i}`,
                enabled: true
            } as any));
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            // Mock git service to return status for each
            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus').mockImplementation(
                async (path, id, name) => ({
                    repositoryId: id,
                    repositoryName: name,
                    repositoryPath: path,
                    currentBranch: 'main',
                    hasUncommittedChanges: false,
                    stagedFiles: [],
                    unstagedFiles: [],
                    untrackedFiles: []
                })
            );

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();
            await view.refreshAll();
            await jest.runAllTimersAsync();

            // Should have called git service for each repository
            expect(gitCommandService.getExtendedRepositoryStatus).toHaveBeenCalledTimes(10);

            // Should render all repositories
            const container = mockLeaf.containerEl.children[1];
            const repoItems = container.querySelectorAll('.multi-git-repository-item');
            expect(repoItems.length).toBe(10);
        });

        test('should refresh repositories in parallel', async () => {
            const mockRepos = [
                { id: 'repo1', name: 'Repo 1', path: '/path/1', enabled: true } as any,
                { id: 'repo2', name: 'Repo 2', path: '/path/2', enabled: true } as any,
                { id: 'repo3', name: 'Repo 3', path: '/path/3', enabled: true } as any
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            // Track concurrent calls
            let concurrentCalls = 0;
            let maxConcurrentCalls = 0;

            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus').mockImplementation(
                async (path, id, name) => {
                    concurrentCalls++;
                    maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);

                    // Simulate async operation
                    await new Promise(resolve => setTimeout(resolve, 10));

                    concurrentCalls--;

                    return {
                        repositoryId: id,
                        repositoryName: name,
                        repositoryPath: path,
                        currentBranch: 'main',
                        hasUncommittedChanges: false,
                        stagedFiles: [],
                        unstagedFiles: [],
                        untrackedFiles: []
                    };
                }
            );

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();
            await view.refreshAll();
            await jest.runAllTimersAsync();

            // Should have processed multiple repositories concurrently
            expect(maxConcurrentCalls).toBeGreaterThan(1);
        });
    });

    describe('Debouncing and queuing', () => {
        test('should debounce rapid refresh requests', async () => {
            const mockRepos = [
                { id: 'repo1', name: 'Repo 1', path: '/path/1', enabled: true } as any
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            let callCount = 0;
            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus').mockImplementation(
                async (path, id, name) => {
                    callCount++;
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return {
                        repositoryId: id,
                        repositoryName: name,
                        repositoryPath: path,
                        currentBranch: 'main',
                        hasUncommittedChanges: false,
                        stagedFiles: [],
                        unstagedFiles: [],
                        untrackedFiles: []
                    };
                }
            );

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();

            // Trigger multiple rapid refreshes
            const promise1 = view.refreshAll();
            const promise2 = view.refreshAll();
            const promise3 = view.refreshAll();

            await Promise.all([promise1, promise2, promise3]);
            await jest.runAllTimersAsync();

            // Should have queued one additional refresh, not all three
            // First refresh runs, subsequent ones are queued into one
            expect(callCount).toBeLessThanOrEqual(2);
        });
    });

    describe('State management', () => {
        test('should maintain status cache correctly', async () => {
            const mockRepos = [
                { id: 'repo1', name: 'Repo 1', path: '/path/1', enabled: true } as any
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            const mockStatus: RepositoryStatus = {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                repositoryPath: '/path/1',
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: []
            };
            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus').mockResolvedValue(mockStatus);

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();
            await view.refreshAll();
            await jest.runAllTimersAsync();

            // Check cache has status
            const state = (view as any).state;
            expect(state.statuses.size).toBe(1);
            expect(state.statuses.get('repo1')).toMatchObject({
                repositoryId: 'repo1',
                repositoryName: 'Repo 1'
            });
        });

        test('should update lastRefreshTime after refresh', async () => {
            const mockRepos = [
                { id: 'repo1', name: 'Repo 1', path: '/path/1', enabled: true } as any
            ];
            jest.spyOn(repositoryConfigService, 'getEnabledRepositories').mockReturnValue(mockRepos);

            const mockStatus: RepositoryStatus = {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                repositoryPath: '/path/1',
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: []
            };
            jest.spyOn(gitCommandService, 'getExtendedRepositoryStatus').mockResolvedValue(mockStatus);

            const view = new StatusPanelView(mockLeaf, mockPlugin);
            await view.onOpen();

            const stateBefore = (view as any).state.lastRefreshTime;
            expect(stateBefore).toBe(0);

            await view.refreshAll();
            await jest.runAllTimersAsync();

            const stateAfter = (view as any).state.lastRefreshTime;
            expect(stateAfter).toBeGreaterThan(0);
        });
    });
});
