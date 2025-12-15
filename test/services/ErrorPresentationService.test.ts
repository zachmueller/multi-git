import { App } from 'obsidian';
import { ErrorPresentationService } from '../../src/services/ErrorPresentationService';
import { NotificationService } from '../../src/services/NotificationService';
import {
    ClassifiedError,
    ErrorSeverity,
    ErrorScenario
} from '../../src/utils/errors';
import { CriticalErrorModal } from '../../src/ui/CriticalErrorModal';
import { AuthFailureModal } from '../../src/ui/AuthFailureModal';
import { MergeConflictModal } from '../../src/ui/MergeConflictModal';

// Mock the modal classes
jest.mock('../../src/ui/CriticalErrorModal');
jest.mock('../../src/ui/AuthFailureModal');
jest.mock('../../src/ui/MergeConflictModal');

describe('ErrorPresentationService', () => {
    let service: ErrorPresentationService;
    let mockApp: App;
    let mockNotificationService: jest.Mocked<NotificationService>;
    let mockModalOpen: jest.Mock;
    let mockModalClose: jest.Mock;

    beforeEach(() => {
        // Create mock app
        mockApp = {} as App;

        // Create mock notification service
        mockNotificationService = {
            notifyFetchError: jest.fn(),
            notifyRemoteChanges: jest.fn(),
            areNotificationsEnabled: jest.fn().mockReturnValue(true),
            updateSettings: jest.fn(),
            clearTracking: jest.fn(),
        } as any;

        // Create service instance
        service = new ErrorPresentationService(mockApp, mockNotificationService);

        // Setup modal mocks
        mockModalOpen = jest.fn();
        mockModalClose = jest.fn();

        const MockModalInstance = {
            open: mockModalOpen,
            onClose: mockModalClose,
        };

        (CriticalErrorModal as jest.Mock).mockReturnValue(MockModalInstance);
        (AuthFailureModal as jest.Mock).mockReturnValue(MockModalInstance);
        (MergeConflictModal as jest.Mock).mockReturnValue(MockModalInstance);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('presentError', () => {
        it('should route critical errors to modal', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Test error'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Authentication failed',
                suggestedActions: ['Fix auth'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            expect(AuthFailureModal).toHaveBeenCalledWith(mockApp, classifiedError);
            expect(mockModalOpen).toHaveBeenCalled();
            expect(mockNotificationService.notifyFetchError).not.toHaveBeenCalled();
        });

        it('should route minor errors to notification', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Test error'),
                severity: ErrorSeverity.MINOR,
                scenario: ErrorScenario.NETWORK_ERROR,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: '[test-repo] Network error during fetch',
                suggestedActions: ['Check connection'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            expect(mockNotificationService.notifyFetchError).toHaveBeenCalledWith(
                'test-repo',
                expect.stringContaining('Network error')
            );
            expect(mockModalOpen).not.toHaveBeenCalled();
        });

        it('should route warning errors to notification', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Test error'),
                severity: ErrorSeverity.WARNING,
                scenario: ErrorScenario.UNKNOWN,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: '[test-repo] Warning message',
                suggestedActions: [],
                operation: 'status',
            };

            service.presentError(classifiedError);

            expect(mockNotificationService.notifyFetchError).toHaveBeenCalled();
            expect(mockModalOpen).not.toHaveBeenCalled();
        });
    });

    describe('showCriticalErrorModal', () => {
        it('should show AuthFailureModal for authentication failures', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Auth failed'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Authentication failed',
                suggestedActions: ['Fix auth'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            expect(AuthFailureModal).toHaveBeenCalledWith(mockApp, classifiedError);
            expect(mockModalOpen).toHaveBeenCalled();
        });

        it('should show MergeConflictModal for merge conflicts', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Conflict detected'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.MERGE_CONFLICT,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Merge conflict detected',
                suggestedActions: ['Resolve conflicts'],
                operation: 'pull',
            };

            service.presentError(classifiedError);

            expect(MergeConflictModal).toHaveBeenCalledWith(mockApp, classifiedError);
            expect(mockModalOpen).toHaveBeenCalled();
        });

        it('should show CriticalErrorModal for permission denied', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Permission denied'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.PERMISSION_DENIED,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Permission denied',
                suggestedActions: ['Fix permissions'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            expect(CriticalErrorModal).toHaveBeenCalledWith(mockApp, classifiedError);
            expect(mockModalOpen).toHaveBeenCalled();
        });

        it('should show CriticalErrorModal for repository errors', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Repo not found'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.REPOSITORY_ERROR,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Repository not found',
                suggestedActions: ['Check path'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            expect(CriticalErrorModal).toHaveBeenCalledWith(mockApp, classifiedError);
            expect(mockModalOpen).toHaveBeenCalled();
        });

        it('should show CriticalErrorModal for unknown errors', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Unknown error'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.UNKNOWN,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Unknown error',
                suggestedActions: ['Try again'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            expect(CriticalErrorModal).toHaveBeenCalledWith(mockApp, classifiedError);
            expect(mockModalOpen).toHaveBeenCalled();
        });

        it('should prevent duplicate modals for same repository and scenario', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Auth failed'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Authentication failed',
                suggestedActions: ['Fix auth'],
                operation: 'fetch',
            };

            // Present error twice
            service.presentError(classifiedError);
            service.presentError(classifiedError);

            // Should only open modal once
            expect(AuthFailureModal).toHaveBeenCalledTimes(1);
            expect(mockModalOpen).toHaveBeenCalledTimes(1);
        });

        it('should allow different scenarios for same repository', () => {
            const authError: ClassifiedError = {
                error: new Error('Auth failed'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Authentication failed',
                suggestedActions: ['Fix auth'],
                operation: 'fetch',
            };

            const conflictError: ClassifiedError = {
                error: new Error('Conflict'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.MERGE_CONFLICT,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Merge conflict',
                suggestedActions: ['Resolve'],
                operation: 'pull',
            };

            // Present different scenarios
            service.presentError(authError);
            service.presentError(conflictError);

            // Should open both modals
            expect(AuthFailureModal).toHaveBeenCalledTimes(1);
            expect(MergeConflictModal).toHaveBeenCalledTimes(1);
            expect(mockModalOpen).toHaveBeenCalledTimes(2);
        });

        it('should clean up tracking when modal closes', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Auth failed'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Authentication failed',
                suggestedActions: ['Fix auth'],
                operation: 'fetch',
            };

            // Present error
            service.presentError(classifiedError);

            // Get the mock modal instance
            const mockModal = (AuthFailureModal as jest.Mock).mock.results[0].value;

            // Simulate closing modal by calling the wrapped onClose
            mockModal.onClose();

            // Should allow presenting same error again
            service.presentError(classifiedError);
            expect(AuthFailureModal).toHaveBeenCalledTimes(2);
        });
    });

    describe('showMinorErrorNotification', () => {
        it('should remove repository name prefix from message', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Test error'),
                severity: ErrorSeverity.MINOR,
                scenario: ErrorScenario.NETWORK_ERROR,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: '[test-repo] Network error during fetch',
                suggestedActions: ['Check connection'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            expect(mockNotificationService.notifyFetchError).toHaveBeenCalledWith(
                'test-repo',
                expect.not.stringContaining('[test-repo]')
            );
        });

        it('should add scenario context for network errors', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Test error'),
                severity: ErrorSeverity.MINOR,
                scenario: ErrorScenario.NETWORK_ERROR,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Connection failed',
                suggestedActions: ['Check connection'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            expect(mockNotificationService.notifyFetchError).toHaveBeenCalledWith(
                'test-repo',
                expect.stringContaining('Network error')
            );
        });

        it('should not duplicate scenario context if already present', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Test error'),
                severity: ErrorSeverity.MINOR,
                scenario: ErrorScenario.NETWORK_ERROR,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Network error: Connection failed',
                suggestedActions: ['Check connection'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            const call = mockNotificationService.notifyFetchError.mock.calls[0][1];
            // Should not have "Network error" twice
            expect((call.match(/network error/gi) || []).length).toBe(1);
        });

        it('should handle unknown scenario without context prefix', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Test error'),
                severity: ErrorSeverity.MINOR,
                scenario: ErrorScenario.UNKNOWN,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Unknown error occurred',
                suggestedActions: ['Try again'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            expect(mockNotificationService.notifyFetchError).toHaveBeenCalledWith(
                'test-repo',
                'Unknown error occurred'
            );
        });
    });

    describe('isModalOpen', () => {
        it('should return false when no modal is open', () => {
            const isOpen = service.isModalOpen('repo-1', ErrorScenario.AUTHENTICATION_FAILURE);
            expect(isOpen).toBe(false);
        });

        it('should return true when modal is open', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Auth failed'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Authentication failed',
                suggestedActions: ['Fix auth'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            const isOpen = service.isModalOpen('repo-1', ErrorScenario.AUTHENTICATION_FAILURE);
            expect(isOpen).toBe(true);
        });

        it('should return false for different scenario', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Auth failed'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Authentication failed',
                suggestedActions: ['Fix auth'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            const isOpen = service.isModalOpen('repo-1', ErrorScenario.MERGE_CONFLICT);
            expect(isOpen).toBe(false);
        });

        it('should return false for different repository', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Auth failed'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Authentication failed',
                suggestedActions: ['Fix auth'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);

            const isOpen = service.isModalOpen('repo-2', ErrorScenario.AUTHENTICATION_FAILURE);
            expect(isOpen).toBe(false);
        });
    });

    describe('clearModalTracking', () => {
        it('should clear all tracked modals', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Auth failed'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Authentication failed',
                suggestedActions: ['Fix auth'],
                operation: 'fetch',
            };

            service.presentError(classifiedError);
            expect(service.isModalOpen('repo-1', ErrorScenario.AUTHENTICATION_FAILURE)).toBe(true);

            service.clearModalTracking();
            expect(service.isModalOpen('repo-1', ErrorScenario.AUTHENTICATION_FAILURE)).toBe(false);
        });

        it('should allow presenting errors after clearing', () => {
            const classifiedError: ClassifiedError = {
                error: new Error('Auth failed'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'test-repo',
                userMessage: 'Authentication failed',
                suggestedActions: ['Fix auth'],
                operation: 'fetch',
            };

            // Present error
            service.presentError(classifiedError);

            // Clear tracking
            service.clearModalTracking();

            // Should allow presenting same error again
            service.presentError(classifiedError);
            expect(AuthFailureModal).toHaveBeenCalledTimes(2);
        });
    });

    describe('concurrent error handling', () => {
        it('should handle multiple repositories with different errors', () => {
            const error1: ClassifiedError = {
                error: new Error('Error 1'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'repo-1',
                userMessage: 'Auth failed',
                suggestedActions: [],
                operation: 'fetch',
            };

            const error2: ClassifiedError = {
                error: new Error('Error 2'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.MERGE_CONFLICT,
                repositoryId: 'repo-2',
                repositoryName: 'repo-2',
                userMessage: 'Conflict',
                suggestedActions: [],
                operation: 'pull',
            };

            service.presentError(error1);
            service.presentError(error2);

            expect(AuthFailureModal).toHaveBeenCalledTimes(1);
            expect(MergeConflictModal).toHaveBeenCalledTimes(1);
        });

        it('should handle mix of critical and minor errors', () => {
            const criticalError: ClassifiedError = {
                error: new Error('Critical'),
                severity: ErrorSeverity.CRITICAL,
                scenario: ErrorScenario.AUTHENTICATION_FAILURE,
                repositoryId: 'repo-1',
                repositoryName: 'repo-1',
                userMessage: 'Auth failed',
                suggestedActions: [],
                operation: 'fetch',
            };

            const minorError: ClassifiedError = {
                error: new Error('Minor'),
                severity: ErrorSeverity.MINOR,
                scenario: ErrorScenario.NETWORK_ERROR,
                repositoryId: 'repo-2',
                repositoryName: 'repo-2',
                userMessage: 'Network issue',
                suggestedActions: [],
                operation: 'fetch',
            };

            service.presentError(criticalError);
            service.presentError(minorError);

            expect(mockModalOpen).toHaveBeenCalledTimes(1);
            expect(mockNotificationService.notifyFetchError).toHaveBeenCalledTimes(1);
        });
    });
});
