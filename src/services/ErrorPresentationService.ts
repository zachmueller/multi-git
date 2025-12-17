import { App } from 'obsidian';
import { Logger } from '../utils/logger';
import { NotificationService } from './NotificationService';
import { ClassifiedError, ErrorSeverity, ErrorScenario } from '../utils/errors';
import { CriticalErrorModal } from '../ui/CriticalErrorModal';
import { AuthFailureModal } from '../ui/AuthFailureModal';
import { MergeConflictModal } from '../ui/MergeConflictModal';

/**
 * Service for presenting errors to users based on severity and scenario.
 * Routes errors to appropriate presentation method:
 * - Critical errors: Modal dialogs
 * - Minor errors: Notifications
 * - Status updates: Status panel (handled by caller)
 */
export class ErrorPresentationService {
    private readonly component = 'ErrorPresentationService';
    private app: App;
    private notificationService: NotificationService;
    private openModals: Map<string, boolean>; // Track open modals to prevent duplicates

    /**
     * Create a new ErrorPresentationService
     * 
     * @param app - The Obsidian app instance
     * @param notificationService - Service for showing notifications
     */
    constructor(app: App, notificationService: NotificationService) {
        this.app = app;
        this.notificationService = notificationService;
        this.openModals = new Map();
    }

    /**
     * Present an error to the user using the appropriate method.
     * Routes based on error severity:
     * - CRITICAL: Shows modal dialog
     * - MINOR: Shows notification
     * - WARNING: Shows notification
     * 
     * @param classifiedError - The classified error with presentation details
     */
    presentError(classifiedError: ClassifiedError): void {
        Logger.debug(this.component, `Presenting error for ${classifiedError.repositoryName}`, {
            severity: classifiedError.severity,
            scenario: classifiedError.scenario,
            operation: classifiedError.operation
        });

        if (classifiedError.severity === ErrorSeverity.CRITICAL) {
            this.showCriticalErrorModal(classifiedError);
        } else {
            this.showMinorErrorNotification(classifiedError);
        }
    }

    /**
     * Show a critical error as a modal dialog.
     * Prevents duplicate modals for the same repository and scenario.
     * 
     * @param classifiedError - The critical error to display
     */
    private showCriticalErrorModal(classifiedError: ClassifiedError): void {
        // Create unique key for this modal to prevent duplicates
        const modalKey = `${classifiedError.repositoryId}:${classifiedError.scenario}`;

        // Check if modal is already open for this repository and scenario
        if (this.openModals.get(modalKey)) {
            Logger.debug(this.component, `Modal already open for ${classifiedError.repositoryName}, skipping duplicate`, {
                scenario: classifiedError.scenario
            });
            return;
        }

        Logger.debug(this.component, `Showing critical error modal for ${classifiedError.repositoryName}`, {
            scenario: classifiedError.scenario
        });

        // Mark modal as open
        this.openModals.set(modalKey, true);

        // Create appropriate modal based on scenario
        let modal;
        switch (classifiedError.scenario) {
            case ErrorScenario.AUTHENTICATION_FAILURE:
                modal = new AuthFailureModal(this.app, classifiedError);
                break;

            case ErrorScenario.MERGE_CONFLICT:
                modal = new MergeConflictModal(this.app, classifiedError);
                break;

            case ErrorScenario.PERMISSION_DENIED:
            case ErrorScenario.REPOSITORY_ERROR:
            case ErrorScenario.UNKNOWN:
            default:
                modal = new CriticalErrorModal(this.app, classifiedError);
                break;
        }

        // Open modal
        modal.open();

        // Clean up tracking when modal closes
        const originalOnClose = modal.onClose.bind(modal);
        modal.onClose = () => {
            this.openModals.delete(modalKey);
            Logger.debug(this.component, `Modal closed for ${classifiedError.repositoryName}`, {
                scenario: classifiedError.scenario
            });
            originalOnClose();
        };
    }

    /**
     * Show a minor error as a notification.
     * Uses NotificationService for consistent notification handling.
     * 
     * @param classifiedError - The minor error to display
     */
    private showMinorErrorNotification(classifiedError: ClassifiedError): void {
        Logger.debug(this.component, `Showing notification for ${classifiedError.repositoryName}`, {
            scenario: classifiedError.scenario
        });

        // Extract concise error message for notification
        // Remove repository name prefix if present (NotificationService adds it)
        let errorMessage = classifiedError.userMessage;
        const repoPrefix = `[${classifiedError.repositoryName}]`;
        if (errorMessage.startsWith(repoPrefix)) {
            errorMessage = errorMessage.substring(repoPrefix.length).trim();
        }

        // Add scenario context if not already in message
        const scenarioContext = this.getScenarioContext(classifiedError.scenario);
        if (scenarioContext && !errorMessage.toLowerCase().includes(scenarioContext.toLowerCase())) {
            errorMessage = `${scenarioContext}: ${errorMessage}`;
        }

        // Use NotificationService for consistent handling (cooldown, settings check)
        this.notificationService.notifyFetchError(
            classifiedError.repositoryName,
            errorMessage
        );
    }

    /**
     * Get brief scenario context for notification.
     * Returns a short prefix that explains the error type.
     * 
     * @param scenario - The error scenario
     * @returns Brief context string or empty string
     */
    private getScenarioContext(scenario: ErrorScenario): string {
        switch (scenario) {
            case ErrorScenario.NETWORK_ERROR:
                return 'Network error';
            case ErrorScenario.AUTHENTICATION_FAILURE:
                return 'Authentication failed';
            case ErrorScenario.MERGE_CONFLICT:
                return 'Merge conflict';
            case ErrorScenario.PERMISSION_DENIED:
                return 'Permission denied';
            case ErrorScenario.REPOSITORY_ERROR:
                return 'Repository error';
            case ErrorScenario.UNKNOWN:
            default:
                return '';
        }
    }

    /**
     * Check if a modal is currently open for a specific repository and scenario.
     * Useful for preventing duplicate modal presentations.
     * 
     * @param repositoryId - The repository identifier
     * @param scenario - The error scenario
     * @returns true if modal is open
     */
    isModalOpen(repositoryId: string, scenario: ErrorScenario): boolean {
        const modalKey = `${repositoryId}:${scenario}`;
        return this.openModals.get(modalKey) || false;
    }

    /**
     * Clear all modal tracking.
     * Useful for testing or when plugin reloads.
     */
    clearModalTracking(): void {
        const count = this.openModals.size;
        this.openModals.clear();
        Logger.debug(this.component, `Cleared ${count} tracked modals`);
    }
}
