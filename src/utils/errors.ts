/**
 * Custom error classes for Multi-Git plugin
 * Provides specific error types for better error handling and user feedback
 */

/**
 * Base error class for repository configuration errors
 */
export class RepositoryConfigError extends Error {
    code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = 'RepositoryConfigError';
        this.code = code;

        // Maintains proper stack trace for where error was thrown (available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, RepositoryConfigError);
        }
    }
}

/**
 * Error thrown when path or repository validation fails
 */
export class ValidationError extends RepositoryConfigError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

/**
 * Error thrown when attempting to add a duplicate repository
 */
export class DuplicateError extends RepositoryConfigError {
    duplicatePath: string;

    constructor(message: string, path: string) {
        super(message, 'DUPLICATE_ERROR');
        this.name = 'DuplicateError';
        this.duplicatePath = path;
    }
}

/**
 * Error thrown when a git repository is not found or invalid
 */
export class GitRepositoryError extends RepositoryConfigError {
    repositoryPath: string;

    constructor(message: string, path: string) {
        super(message, 'GIT_REPOSITORY_ERROR');
        this.name = 'GitRepositoryError';
        this.repositoryPath = path;
    }
}

/**
 * Error thrown when a repository is not found in configuration
 */
export class RepositoryNotFoundError extends RepositoryConfigError {
    repositoryId: string;

    constructor(message: string, id: string) {
        super(message, 'REPOSITORY_NOT_FOUND');
        this.name = 'RepositoryNotFoundError';
        this.repositoryId = id;
    }
}

/**
 * Error thrown when file system operations fail
 */
export class FileSystemError extends RepositoryConfigError {
    fsPath: string;

    constructor(message: string, path: string) {
        super(message, 'FILESYSTEM_ERROR');
        this.name = 'FileSystemError';
        this.fsPath = path;
    }
}

/**
 * Error codes for fetch operation failures
 */
export enum FetchErrorCode {
    NETWORK_ERROR = 'NETWORK_ERROR',
    AUTH_ERROR = 'AUTH_ERROR',
    TIMEOUT = 'TIMEOUT',
    REPO_ERROR = 'REPO_ERROR',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Error thrown when git fetch operation fails
 */
export class FetchError extends Error {
    repoPath: string;
    code: FetchErrorCode;
    originalError?: Error;

    constructor(
        message: string,
        repoPath: string,
        code: FetchErrorCode,
        originalError?: Error
    ) {
        super(message);
        this.name = 'FetchError';
        this.repoPath = repoPath;
        this.code = code;
        this.originalError = originalError;

        // Maintains proper stack trace for where error was thrown (available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, FetchError);
        }
    }
}

/**
 * Error thrown when git status check fails
 */
export class GitStatusError extends RepositoryConfigError {
    repositoryPath: string;

    constructor(message: string, path: string) {
        super(message, 'GIT_STATUS_ERROR');
        this.name = 'GitStatusError';
        this.repositoryPath = path;
    }
}

/**
 * Error thrown when git commit operation fails
 */
export class GitCommitError extends RepositoryConfigError {
    repositoryPath: string;
    originalError?: Error;

    constructor(message: string, path: string, originalError?: Error) {
        super(message, 'GIT_COMMIT_ERROR');
        this.name = 'GitCommitError';
        this.repositoryPath = path;
        this.originalError = originalError;

        // Maintains proper stack trace for where error was thrown (available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GitCommitError);
        }
    }
}

/**
 * Error thrown when git push operation fails
 */
export class GitPushError extends RepositoryConfigError {
    repositoryPath: string;
    originalError?: Error;

    constructor(message: string, path: string, originalError?: Error) {
        super(message, 'GIT_PUSH_ERROR');
        this.name = 'GitPushError';
        this.repositoryPath = path;
        this.originalError = originalError;

        // Maintains proper stack trace for where error was thrown (available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GitPushError);
        }
    }
}

/**
 * Classification of error severity for presentation strategy.
 * Determines how the error should be presented to the user.
 */
export enum ErrorSeverity {
    /**
     * Critical errors require immediate user acknowledgment via modal dialog.
     * Examples: authentication failures, merge conflicts, repository corruption.
     * These errors prevent the user from proceeding and must be addressed.
     */
    CRITICAL = 'CRITICAL',

    /**
     * Minor errors can be shown as notifications or inline messages.
     * Examples: network timeouts, status check failures.
     * Users can dismiss these and continue working.
     */
    MINOR = 'MINOR',

    /**
     * Warning messages that don't prevent operation but inform the user.
     * Examples: uncommitted changes, behind remote branch.
     */
    WARNING = 'WARNING'
}

/**
 * Specific error scenarios that require special handling.
 * Each scenario has tailored user guidance and presentation.
 */
export enum ErrorScenario {
    /**
     * Git authentication failure (SSH key issues, HTTPS credentials).
     * Requires credential setup or SSH key configuration.
     */
    AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',

    /**
     * Merge conflict detected during pull or push operation.
     * Requires manual conflict resolution before proceeding.
     */
    MERGE_CONFLICT = 'MERGE_CONFLICT',

    /**
     * Network connectivity issue (host unreachable, connection timeout).
     * May be temporary, user can retry when network is restored.
     */
    NETWORK_ERROR = 'NETWORK_ERROR',

    /**
     * Permission denied (file system or git repository access).
     * Requires fixing file/directory permissions.
     */
    PERMISSION_DENIED = 'PERMISSION_DENIED',

    /**
     * Repository not found or invalid (missing .git directory).
     * Repository path may be incorrect or repository deleted.
     */
    REPOSITORY_ERROR = 'REPOSITORY_ERROR',

    /**
     * Generic error that doesn't match known patterns.
     * Presents raw error message with option to get help.
     */
    UNKNOWN = 'UNKNOWN'
}

/**
 * Error with classification information for appropriate presentation.
 * Contains all information needed to present the error to the user
 * with actionable guidance and technical details.
 */
export interface ClassifiedError {
    /**
     * Original error object that was classified.
     */
    error: Error;

    /**
     * Severity level that determines presentation strategy.
     * CRITICAL errors show modals, MINOR errors show notifications.
     */
    severity: ErrorSeverity;

    /**
     * Specific scenario if detected, or UNKNOWN if pattern didn't match.
     */
    scenario: ErrorScenario;

    /**
     * Repository identifier where the error occurred.
     */
    repositoryId: string;

    /**
     * Repository display name for user-facing messages.
     */
    repositoryName: string;

    /**
     * User-friendly error message explaining what went wrong.
     * Should be clear and non-technical when possible.
     */
    userMessage: string;

    /**
     * Technical details for debugging (git stderr, stack traces).
     * Optional, displayed in collapsible section for advanced users.
     */
    technicalDetails?: string;

    /**
     * Suggested actions for resolving the error.
     * Each action should be specific and actionable.
     * Example: "Generate an SSH key using: ssh-keygen -t ed25519"
     */
    suggestedActions: string[];

    /**
     * Link to help documentation if available.
     * Should be a stable URL that provides detailed resolution steps.
     */
    helpLink?: string;

    /**
     * Git operation that failed (fetch, push, commit, status).
     * Used to provide context-specific guidance.
     */
    operation: string;
}
