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
