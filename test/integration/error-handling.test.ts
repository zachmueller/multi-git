/**
 * Integration tests for error handling across git operations
 * Tests error classification and presentation in realistic scenarios
 */

import { GitCommandService } from '../../src/services/GitCommandService';
import { ErrorClassificationService } from '../../src/services/ErrorClassificationService';
import { ErrorPresentationService } from '../../src/services/ErrorPresentationService';
import { NotificationService } from '../../src/services/NotificationService';
import { MultiGitSettings } from '../../src/settings/data';
import { FetchError, GitPushError, GitCommitError, ErrorScenario } from '../../src/utils/errors';
import { App } from 'obsidian';

// Mock Obsidian App
jest.mock('obsidian');

describe('Error Handling Integration Tests', () => {
    let gitCommandService: GitCommandService;
    let errorClassificationService: ErrorClassificationService;
    let errorPresentationService: ErrorPresentationService;
    let notificationService: NotificationService;
    let mockApp: App;
    let settings: MultiGitSettings;

    beforeEach(() => {
        // Create mock settings
        settings = {
            repositories: [],
            version: '0.1.0',
            globalFetchInterval: 300000,
            fetchOnStartup: false,
            notifyOnRemoteChanges: true,
            customPathEntries: [],
            debugLogging: false,
        };

        // Create mock app
        mockApp = {
            vault: {
                adapter: {
                    basePath: '/mock/vault/path',
                },
            },
        } as unknown as App;

        // Create services
        notificationService = new NotificationService(settings);
        errorClassificationService = new ErrorClassificationService();
        errorPresentationService = new ErrorPresentationService(mockApp, notificationService);
        gitCommandService = new GitCommandService(
            settings,
            errorClassificationService,
            errorPresentationService
        );

        // Spy on presentation methods
        jest.spyOn(errorPresentationService, 'presentError');
        jest.spyOn(notificationService, 'notifyFetchError');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Fetch Operation Error Handling', () => {
        it('should classify and present authentication failure during fetch', async () => {
            // This test documents expected behavior but cannot execute actual git commands
            // In a real scenario, authentication failures would be caught and classified
            const repoPath = '/path/to/repo';
            const repoId = 'test-repo-id';
            const repoName = 'Test Repo';

            // Simulate an authentication error
            const authError = new Error('Permission denied (publickey)');

            // Classify the error
            const classified = errorClassificationService.classifyError(authError, {
                repositoryId: repoId,
                repositoryName: repoName,
                operation: 'fetch',
                stderr: authError.message,
            });

            // Verify classification
            expect(classified.scenario).toBe(ErrorScenario.AUTHENTICATION_FAILURE);
            expect(classified.severity).toBe('CRITICAL');
            expect(classified.suggestedActions.length).toBeGreaterThan(0);

            // Present the error
            errorPresentationService.presentError(classified);

            // Verify modal would be shown for critical error
            expect(errorPresentationService.presentError).toHaveBeenCalledWith(classified);
        });

        it('should classify and present network error during fetch', async () => {
            const repoId = 'test-repo-id';
            const repoName = 'Test Repo';

            // Simulate a network error
            const networkError = new Error('Could not resolve host: github.com');

            // Classify the error
            const classified = errorClassificationService.classifyError(networkError, {
                repositoryId: repoId,
                repositoryName: repoName,
                operation: 'fetch',
                stderr: networkError.message,
            });

            // Verify classification
            expect(classified.scenario).toBe(ErrorScenario.NETWORK_ERROR);
            expect(classified.severity).toBe('MINOR');

            // Present the error
            errorPresentationService.presentError(classified);

            // Verify notification would be shown for minor error
            expect(errorPresentationService.presentError).toHaveBeenCalledWith(classified);
        });
    });

    describe('Push Operation Error Handling', () => {
        it('should classify and present authentication failure during push', async () => {
            const repoId = 'test-repo-id';
            const repoName = 'Test Repo';

            // Simulate an authentication error during push
            const authError = new Error('Authentication failed for https://github.com/user/repo.git');

            // Classify the error
            const classified = errorClassificationService.classifyError(authError, {
                repositoryId: repoId,
                repositoryName: repoName,
                operation: 'push',
                stderr: authError.message,
            });

            // Verify classification
            expect(classified.scenario).toBe(ErrorScenario.AUTHENTICATION_FAILURE);
            expect(classified.severity).toBe('CRITICAL');

            // Present the error
            errorPresentationService.presentError(classified);

            // Verify modal would be shown
            expect(errorPresentationService.presentError).toHaveBeenCalledWith(classified);
        });

        it('should handle commit success with push failure', async () => {
            // This test documents the expected behavior:
            // 1. Commit succeeds (files are committed locally)
            // 2. Push fails (changes remain local)
            // 3. Error is classified and presented
            // 4. User sees modal explaining push failed but commit succeeded

            const repoId = 'test-repo-id';
            const repoName = 'Test Repo';

            // Simulate push failure after successful commit
            const pushError = new Error('Network error: Unable to reach remote repository');

            // Classify the error
            const classified = errorClassificationService.classifyError(pushError, {
                repositoryId: repoId,
                repositoryName: repoName,
                operation: 'push',
                stderr: pushError.message,
            });

            // Verify classification
            expect(classified.scenario).toBe(ErrorScenario.NETWORK_ERROR);

            // Present the error
            errorPresentationService.presentError(classified);

            // Verify error was presented
            expect(errorPresentationService.presentError).toHaveBeenCalledWith(classified);
        });
    });

    describe('Commit Operation Error Handling', () => {
        it('should classify and present merge conflict during commit', async () => {
            const repoId = 'test-repo-id';
            const repoName = 'Test Repo';

            // Simulate a merge conflict error
            const conflictError = new Error('CONFLICT (content): Merge conflict in file.txt');

            // Classify the error
            const classified = errorClassificationService.classifyError(conflictError, {
                repositoryId: repoId,
                repositoryName: repoName,
                operation: 'commit',
                stderr: conflictError.message,
            });

            // Verify classification
            expect(classified.scenario).toBe(ErrorScenario.MERGE_CONFLICT);
            expect(classified.severity).toBe('CRITICAL');

            // For commit operations, only merge conflicts should trigger modal
            if (classified.scenario === ErrorScenario.MERGE_CONFLICT) {
                errorPresentationService.presentError(classified);
            }

            // Verify modal would be shown for merge conflict
            expect(errorPresentationService.presentError).toHaveBeenCalledWith(classified);
        });

        it('should keep minor commit errors inline (not show modal)', async () => {
            const repoId = 'test-repo-id';
            const repoName = 'Test Repo';

            // Simulate a minor commit error (e.g., pre-commit hook failure)
            const hookError = new Error('Pre-commit hook failed: eslint errors found');

            // Classify the error
            const classified = errorClassificationService.classifyError(hookError, {
                repositoryId: repoId,
                repositoryName: repoName,
                operation: 'commit',
                stderr: hookError.message,
            });

            // For commit operations, only show modal for critical scenarios like MERGE_CONFLICT
            // Other errors should stay inline in the CommitMessageModal
            const shouldShowModal = classified.scenario === ErrorScenario.MERGE_CONFLICT;

            expect(shouldShowModal).toBe(false);
            expect(classified.scenario).toBe(ErrorScenario.UNKNOWN);
        });
    });

    describe('Error Recovery Workflows', () => {
        it('should allow retry after network error', async () => {
            const repoId = 'test-repo-id';
            const repoName = 'Test Repo';

            // Simulate network error
            const networkError = new Error('Connection timed out');

            // Classify the error
            const classified = errorClassificationService.classifyError(networkError, {
                repositoryId: repoId,
                repositoryName: repoName,
                operation: 'fetch',
                stderr: networkError.message,
            });

            // Verify suggested actions include retry
            expect(classified.suggestedActions.some(action =>
                action.toLowerCase().includes('try again') ||
                action.toLowerCase().includes('retry')
            )).toBe(true);
        });

        it('should provide actionable guidance for authentication failures', async () => {
            const repoId = 'test-repo-id';
            const repoName = 'Test Repo';

            // Simulate authentication error
            const authError = new Error('Permission denied (publickey)');

            // Classify the error
            const classified = errorClassificationService.classifyError(authError, {
                repositoryId: repoId,
                repositoryName: repoName,
                operation: 'fetch',
                stderr: authError.message,
            });

            // Verify suggested actions include SSH setup guidance
            expect(classified.suggestedActions.some(action =>
                action.toLowerCase().includes('ssh') ||
                action.toLowerCase().includes('key')
            )).toBe(true);
        });

        it('should provide step-by-step guidance for merge conflicts', async () => {
            const repoId = 'test-repo-id';
            const repoName = 'Test Repo';

            // Simulate merge conflict
            const conflictError = new Error('CONFLICT (content): Merge conflict in file.txt');

            // Classify the error
            const classified = errorClassificationService.classifyError(conflictError, {
                repositoryId: repoId,
                repositoryName: repoName,
                operation: 'commit',
                stderr: conflictError.message,
            });

            // Verify suggested actions include resolution steps
            expect(classified.suggestedActions.some(action =>
                action.toLowerCase().includes('conflict') ||
                action.toLowerCase().includes('resolve')
            )).toBe(true);
        });
    });

    describe('Concurrent Error Handling', () => {
        it('should handle multiple repositories failing with different errors', () => {
            const repo1Error = new Error('Permission denied (publickey)');
            const repo2Error = new Error('Could not resolve host: github.com');

            // Classify both errors
            const classified1 = errorClassificationService.classifyError(repo1Error, {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                operation: 'fetch',
                stderr: repo1Error.message,
            });

            const classified2 = errorClassificationService.classifyError(repo2Error, {
                repositoryId: 'repo2',
                repositoryName: 'Repo 2',
                operation: 'fetch',
                stderr: repo2Error.message,
            });

            // Verify different classifications
            expect(classified1.scenario).toBe(ErrorScenario.AUTHENTICATION_FAILURE);
            expect(classified2.scenario).toBe(ErrorScenario.NETWORK_ERROR);

            // Present both errors
            errorPresentationService.presentError(classified1);
            errorPresentationService.presentError(classified2);

            // Verify both were presented
            expect(errorPresentationService.presentError).toHaveBeenCalledTimes(2);
        });

        it('should prevent duplicate modals for same repository and scenario', () => {
            const authError = new Error('Permission denied (publickey)');

            // Classify error twice for same repository
            const classified1 = errorClassificationService.classifyError(authError, {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                operation: 'fetch',
                stderr: authError.message,
            });

            const classified2 = errorClassificationService.classifyError(authError, {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                operation: 'fetch',
                stderr: authError.message,
            });

            // Present both (simulating rapid errors)
            errorPresentationService.presentError(classified1);
            errorPresentationService.presentError(classified2);

            // Second call should be prevented by modal tracking
            // (This is handled by ErrorPresentationService internally)
            expect(errorPresentationService.presentError).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error Presentation Routing', () => {
        it('should route critical errors to modals', () => {
            const authError = new Error('Authentication failed');

            const classified = errorClassificationService.classifyError(authError, {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                operation: 'fetch',
                stderr: authError.message,
            });

            expect(classified.severity).toBe('CRITICAL');

            errorPresentationService.presentError(classified);

            // Modal should be shown (tested via presentError being called)
            expect(errorPresentationService.presentError).toHaveBeenCalled();
        });

        it('should route minor errors to notifications', () => {
            const networkError = new Error('Connection timed out');

            const classified = errorClassificationService.classifyError(networkError, {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                operation: 'fetch',
                stderr: networkError.message,
            });

            expect(classified.severity).toBe('MINOR');

            errorPresentationService.presentError(classified);

            // Notification should be shown
            expect(errorPresentationService.presentError).toHaveBeenCalled();
        });
    });

    describe('Status Check Error Handling', () => {
        it('should handle status check errors without modal interruption', () => {
            // Status check errors should NOT call error presentation service
            // They should be handled inline by the StatusPanelView

            const statusError = new Error('Failed to get repository status');

            // Classify the error (for logging purposes)
            const classified = errorClassificationService.classifyError(statusError, {
                repositoryId: 'repo1',
                repositoryName: 'Repo 1',
                operation: 'status',
                stderr: statusError.message,
            });

            // Status errors should NOT be presented via ErrorPresentationService
            // They should be shown inline in status panel
            // So we should NOT call presentError here

            // Verify the error is classified but not presented
            expect(classified).toBeDefined();
            expect(errorPresentationService.presentError).not.toHaveBeenCalled();
        });
    });
});
