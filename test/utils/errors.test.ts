/**
 * Unit tests for error classes
 * These tests can be run in VSCode with Jest (no Obsidian required)
 */

import {
    RepositoryConfigError,
    ValidationError,
    DuplicateError,
    GitRepositoryError,
    RepositoryNotFoundError,
    FileSystemError,
} from '../../src/utils/errors';

describe('RepositoryConfigError', () => {
    it('should create error with message and code', () => {
        const error = new RepositoryConfigError('Test error', 'TEST_CODE');
        expect(error.message).toBe('Test error');
        expect(error.code).toBe('TEST_CODE');
        expect(error.name).toBe('RepositoryConfigError');
        expect(error instanceof Error).toBe(true);
    });

    it('should have stack trace', () => {
        const error = new RepositoryConfigError('Test error', 'TEST_CODE');
        expect(error.stack).toBeDefined();
    });
});

describe('ValidationError', () => {
    it('should create validation error', () => {
        const error = new ValidationError('Invalid path');
        expect(error.message).toBe('Invalid path');
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.name).toBe('ValidationError');
        expect(error instanceof RepositoryConfigError).toBe(true);
    });
});

describe('DuplicateError', () => {
    it('should create duplicate error with path', () => {
        const error = new DuplicateError(
            'Repository already exists',
            '/path/to/repo'
        );
        expect(error.message).toBe('Repository already exists');
        expect(error.code).toBe('DUPLICATE_ERROR');
        expect(error.name).toBe('DuplicateError');
        expect(error.duplicatePath).toBe('/path/to/repo');
        expect(error instanceof RepositoryConfigError).toBe(true);
    });
});

describe('GitRepositoryError', () => {
    it('should create git repository error with path', () => {
        const error = new GitRepositoryError(
            'Not a git repository',
            '/path/to/dir'
        );
        expect(error.message).toBe('Not a git repository');
        expect(error.code).toBe('GIT_REPOSITORY_ERROR');
        expect(error.name).toBe('GitRepositoryError');
        expect(error.repositoryPath).toBe('/path/to/dir');
        expect(error instanceof RepositoryConfigError).toBe(true);
    });
});

describe('RepositoryNotFoundError', () => {
    it('should create repository not found error with ID', () => {
        const error = new RepositoryNotFoundError(
            'Repository not found',
            'repo-123'
        );
        expect(error.message).toBe('Repository not found');
        expect(error.code).toBe('REPOSITORY_NOT_FOUND');
        expect(error.name).toBe('RepositoryNotFoundError');
        expect(error.repositoryId).toBe('repo-123');
        expect(error instanceof RepositoryConfigError).toBe(true);
    });
});

describe('FileSystemError', () => {
    it('should create file system error with path', () => {
        const error = new FileSystemError(
            'Cannot access path',
            '/restricted/path'
        );
        expect(error.message).toBe('Cannot access path');
        expect(error.code).toBe('FILESYSTEM_ERROR');
        expect(error.name).toBe('FileSystemError');
        expect(error.fsPath).toBe('/restricted/path');
        expect(error instanceof RepositoryConfigError).toBe(true);
    });
});

describe('Error instanceof checks', () => {
    it('should correctly identify error types', () => {
        const validation = new ValidationError('test');
        const duplicate = new DuplicateError('test', '/path');
        const git = new GitRepositoryError('test', '/path');
        const notFound = new RepositoryNotFoundError('test', 'id');
        const fs = new FileSystemError('test', '/path');

        // All should be RepositoryConfigError
        expect(validation instanceof RepositoryConfigError).toBe(true);
        expect(duplicate instanceof RepositoryConfigError).toBe(true);
        expect(git instanceof RepositoryConfigError).toBe(true);
        expect(notFound instanceof RepositoryConfigError).toBe(true);
        expect(fs instanceof RepositoryConfigError).toBe(true);

        // All should be Error
        expect(validation instanceof Error).toBe(true);
        expect(duplicate instanceof Error).toBe(true);
        expect(git instanceof Error).toBe(true);
        expect(notFound instanceof Error).toBe(true);
        expect(fs instanceof Error).toBe(true);

        // Should not be other types
        expect(validation instanceof DuplicateError).toBe(false);
        expect(duplicate instanceof ValidationError).toBe(false);
    });
});
