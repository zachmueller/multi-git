import { Logger } from '../utils/logger';
import {
    ClassifiedError,
    ErrorSeverity,
    ErrorScenario
} from '../utils/errors';

/**
 * Regex patterns for detecting authentication failures in git output.
 * Matches common SSH and HTTPS authentication error messages.
 */
const AUTH_FAILURE_PATTERNS = [
    /Authentication failed/i,
    /Permission denied \(publickey\)/i,
    /Could not read from remote repository/i,
    /fatal: Authentication failed for/i,
    /Invalid username or password/i,
    /fatal: could not read Username/i,
    /fatal: could not read Password/i,
    /HTTP Basic: Access denied/i,
    /authentication required but no callback set/i,
    /fatal: No path specified/i
];

/**
 * Regex patterns for detecting merge conflicts in git output.
 * Matches conflict markers and merge failure messages.
 */
const MERGE_CONFLICT_PATTERNS = [
    /CONFLICT/i,
    /Automatic merge failed/i,
    /fix conflicts and then commit/i,
    /Merge conflict in/i,
    /after resolving the conflicts/i
];

/**
 * Regex patterns for detecting network errors in git output.
 * Matches connectivity issues and timeouts.
 */
const NETWORK_ERROR_PATTERNS = [
    /Could not resolve host/i,
    /Connection refused/i,
    /Connection timed out/i,
    /Failed to connect/i,
    /network.*unavailable/i,
    /Unable to access/i,
    /Could not resolve proxy/i,
    /Operation timed out/i,
    /Failed to connect to .* port/i,
    /Recv failure: Connection reset by peer/i
];

/**
 * Regex patterns for detecting permission errors in git output.
 * Matches file system and git permission issues.
 */
const PERMISSION_DENIED_PATTERNS = [
    /Permission denied/i,
    /access.*denied/i,
    /insufficient permission/i,
    /You don't have permission/i,
    /fatal: unable to access/i,
    /error: cannot (open|lock|write)/i,
    /fatal: Unable to create.*lock/i
];

/**
 * Regex patterns for detecting repository errors in git output.
 * Matches repository not found and invalid repository issues.
 */
const REPOSITORY_ERROR_PATTERNS = [
    /not a git repository/i,
    /No such file or directory/i,
    /does not appear to be a git repository/i,
    /repository.*not found/i,
    /fatal: '.*' does not exist/i,
    /Remote repository not found/i
];

/**
 * Service for classifying errors based on git command output.
 * Analyzes error messages to determine severity, scenario, and provide
 * actionable guidance for users.
 */
export class ErrorClassificationService {
    private readonly component = 'ErrorClassificationService';

    /**
     * Classify an error for appropriate presentation.
     * Analyzes the error message and context to determine severity,
     * scenario, and generate user-friendly messages with suggested actions.
     * 
     * @param error - The error to classify
     * @param context - Context about where the error occurred
     * @returns Classified error with presentation guidance
     */
    classifyError(
        error: Error,
        context: {
            repositoryId: string;
            repositoryName: string;
            operation: string;
            stderr?: string;
        }
    ): ClassifiedError {
        const errorMessage = error.message.toLowerCase();
        const stderr = (context.stderr || '').toLowerCase();
        const fullErrorText = `${errorMessage} ${stderr}`;

        Logger.debug(this.component, `Classifying error for ${context.repositoryName}`, {
            operation: context.operation,
            errorMessage: error.message,
            stderr: context.stderr
        });

        // Detect specific error scenarios
        let scenario: ErrorScenario;
        let severity: ErrorSeverity;

        if (this.isAuthenticationFailure(fullErrorText)) {
            scenario = ErrorScenario.AUTHENTICATION_FAILURE;
            severity = ErrorSeverity.CRITICAL;
            Logger.debug(this.component, 'Detected authentication failure');
        } else if (this.isMergeConflict(fullErrorText)) {
            scenario = ErrorScenario.MERGE_CONFLICT;
            severity = ErrorSeverity.CRITICAL;
            Logger.debug(this.component, 'Detected merge conflict');
        } else if (this.isNetworkError(fullErrorText)) {
            scenario = ErrorScenario.NETWORK_ERROR;
            severity = ErrorSeverity.MINOR;
            Logger.debug(this.component, 'Detected network error');
        } else if (this.isPermissionDenied(fullErrorText)) {
            scenario = ErrorScenario.PERMISSION_DENIED;
            severity = ErrorSeverity.CRITICAL;
            Logger.debug(this.component, 'Detected permission error');
        } else if (this.isRepositoryError(fullErrorText)) {
            scenario = ErrorScenario.REPOSITORY_ERROR;
            severity = ErrorSeverity.CRITICAL;
            Logger.debug(this.component, 'Detected repository error');
        } else {
            scenario = ErrorScenario.UNKNOWN;
            severity = ErrorSeverity.MINOR;
            Logger.debug(this.component, 'Error scenario unknown, defaulting to minor', {
                errorText: fullErrorText.substring(0, 200)
            });
        }

        // Generate user-friendly message and suggested actions
        const userMessage = this.generateUserMessage(
            scenario,
            context.operation,
            context.repositoryName
        );
        const suggestedActions = this.getSuggestedActions(
            scenario,
            context.operation
        );
        const helpLink = this.getHelpLink(scenario);

        const classifiedError: ClassifiedError = {
            error,
            severity,
            scenario,
            repositoryId: context.repositoryId,
            repositoryName: context.repositoryName,
            userMessage,
            technicalDetails: context.stderr || error.message,
            suggestedActions,
            helpLink,
            operation: context.operation
        };

        Logger.debug(this.component, 'Error classified', {
            scenario,
            severity,
            actionsCount: suggestedActions.length
        });

        return classifiedError;
    }

    /**
     * Detect if error is an authentication failure.
     * Checks for SSH key issues, HTTPS credential problems, and
     * general authentication errors.
     * 
     * @param errorText - Combined error message and stderr to analyze
     * @returns true if authentication failure detected
     */
    private isAuthenticationFailure(errorText: string): boolean {
        return AUTH_FAILURE_PATTERNS.some(pattern => pattern.test(errorText));
    }

    /**
     * Detect if error is a merge conflict.
     * Checks for conflict markers, merge failure messages, and
     * conflict resolution instructions.
     * 
     * @param errorText - Combined error message and stderr to analyze
     * @returns true if merge conflict detected
     */
    private isMergeConflict(errorText: string): boolean {
        return MERGE_CONFLICT_PATTERNS.some(pattern => pattern.test(errorText));
    }

    /**
     * Detect if error is a network connectivity issue.
     * Checks for DNS resolution failures, connection timeouts,
     * and network unavailability.
     * 
     * @param errorText - Combined error message and stderr to analyze
     * @returns true if network error detected
     */
    private isNetworkError(errorText: string): boolean {
        return NETWORK_ERROR_PATTERNS.some(pattern => pattern.test(errorText));
    }

    /**
     * Detect if error is a permission issue.
     * Checks for file system permissions, git access permissions,
     * and lock file issues.
     * 
     * @param errorText - Combined error message and stderr to analyze
     * @returns true if permission error detected
     */
    private isPermissionDenied(errorText: string): boolean {
        return PERMISSION_DENIED_PATTERNS.some(pattern => pattern.test(errorText));
    }

    /**
     * Detect if error is a repository issue.
     * Checks for missing repositories, invalid git directories,
     * and repository not found errors.
     * 
     * @param errorText - Combined error message and stderr to analyze
     * @returns true if repository error detected
     */
    private isRepositoryError(errorText: string): boolean {
        return REPOSITORY_ERROR_PATTERNS.some(pattern => pattern.test(errorText));
    }

    /**
     * Generate user-friendly error message based on scenario.
     * Creates clear, non-technical messages that explain what went wrong.
     * 
     * @param scenario - Detected error scenario
     * @param operation - Git operation that failed
     * @param repositoryName - Name of repository for context
     * @returns User-friendly error message
     */
    private generateUserMessage(
        scenario: ErrorScenario,
        operation: string,
        repositoryName: string
    ): string {
        const repoPrefix = `[${repositoryName}]`;

        switch (scenario) {
            case ErrorScenario.AUTHENTICATION_FAILURE:
                return `${repoPrefix} Authentication failed during ${operation}. Git couldn't verify your credentials to access the remote repository.`;

            case ErrorScenario.MERGE_CONFLICT:
                return `${repoPrefix} Merge conflict detected during ${operation}. Some changes conflict with the remote repository and need manual resolution.`;

            case ErrorScenario.NETWORK_ERROR:
                return `${repoPrefix} Network error during ${operation}. Could not connect to the remote repository.`;

            case ErrorScenario.PERMISSION_DENIED:
                return `${repoPrefix} Permission denied during ${operation}. You don't have the required permissions to access this repository or its files.`;

            case ErrorScenario.REPOSITORY_ERROR:
                return `${repoPrefix} Repository error during ${operation}. The repository path may be invalid or the repository may not exist.`;

            case ErrorScenario.UNKNOWN:
            default:
                return `${repoPrefix} Error during ${operation}. The operation could not be completed.`;
        }
    }

    /**
     * Get suggested actions for resolving the error.
     * Provides specific, actionable steps tailored to the error scenario.
     * 
     * @param scenario - Detected error scenario
     * @param operation - Git operation that failed
     * @returns Array of suggested actions
     */
    private getSuggestedActions(
        scenario: ErrorScenario,
        operation: string
    ): string[] {
        switch (scenario) {
            case ErrorScenario.AUTHENTICATION_FAILURE:
                return [
                    'Verify your SSH key is added to your git hosting service (GitHub, GitLab, etc.)',
                    'For HTTPS: Check your stored credentials using: git config credential.helper',
                    'Generate a new SSH key if needed: ssh-keygen -t ed25519 -C "your_email@example.com"',
                    'Test your SSH connection: ssh -T git@github.com (or your git host)',
                    'For HTTPS: Try using a personal access token instead of your password'
                ];

            case ErrorScenario.MERGE_CONFLICT:
                return [
                    'Open the repository folder and look for files with conflict markers (<<<<<<<, =======, >>>>>>>)',
                    'Edit each conflicted file to resolve the conflicts by choosing which changes to keep',
                    'Remove the conflict markers after resolving',
                    'Stage the resolved files: git add <filename>',
                    'Complete the merge: git commit',
                    'Then retry your operation'
                ];

            case ErrorScenario.NETWORK_ERROR:
                return [
                    'Check your internet connection',
                    'Verify the remote repository URL is correct',
                    'Try again in a few moments - the issue may be temporary',
                    'Check if your git hosting service is experiencing downtime',
                    'If using a VPN, try connecting with and without it'
                ];

            case ErrorScenario.PERMISSION_DENIED:
                return [
                    'Check file permissions for the repository directory',
                    'Ensure you have write access to the repository',
                    'Verify you have the correct permissions on the remote repository',
                    'Try closing other applications that might be accessing the repository files',
                    'On Windows, check if antivirus software is blocking git operations'
                ];

            case ErrorScenario.REPOSITORY_ERROR:
                return [
                    'Verify the repository path in settings is correct',
                    'Check that the directory exists and contains a .git folder',
                    'Ensure the repository hasn\'t been deleted or moved',
                    'Try removing and re-adding the repository in settings',
                    'Clone the repository again if it appears corrupted'
                ];

            case ErrorScenario.UNKNOWN:
            default:
                return [
                    `Retry the ${operation} operation`,
                    'Check the technical details below for more information',
                    'Review the repository settings to ensure they are correct',
                    'Try running the git command manually in a terminal to see detailed output',
                    'If the issue persists, consult the git documentation or seek help'
                ];
        }
    }

    /**
     * Get help documentation link for the error scenario.
     * Returns stable URLs to relevant documentation.
     * 
     * @param scenario - Detected error scenario
     * @returns Help documentation URL or undefined
     */
    private getHelpLink(scenario: ErrorScenario): string | undefined {
        switch (scenario) {
            case ErrorScenario.AUTHENTICATION_FAILURE:
                return 'https://docs.github.com/en/authentication/connecting-to-github-with-ssh';

            case ErrorScenario.MERGE_CONFLICT:
                return 'https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging#_basic_merge_conflicts';

            case ErrorScenario.NETWORK_ERROR:
            case ErrorScenario.PERMISSION_DENIED:
            case ErrorScenario.REPOSITORY_ERROR:
            case ErrorScenario.UNKNOWN:
            default:
                return undefined;
        }
    }
}
