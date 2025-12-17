import { ErrorClassificationService } from '../../src/services/ErrorClassificationService';
import { ErrorSeverity, ErrorScenario } from '../../src/utils/errors';

describe('ErrorClassificationService', () => {
    let service: ErrorClassificationService;

    beforeEach(() => {
        service = new ErrorClassificationService();
    });

    describe('Authentication Failure Detection', () => {
        it('should detect SSH publickey authentication failure', () => {
            const error = new Error('Failed to connect');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'Permission denied (publickey)'
            });

            expect(result.scenario).toBe(ErrorScenario.AUTHENTICATION_FAILURE);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
            expect(result.userMessage).toContain('Authentication failed');
            expect(result.suggestedActions.length).toBeGreaterThan(0);
            expect(result.suggestedActions[0]).toContain('SSH key');
        });

        it('should detect HTTPS authentication failure', () => {
            const error = new Error('Failed to connect');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'push',
                stderr: 'fatal: Authentication failed for \'https://github.com/user/repo.git\''
            });

            expect(result.scenario).toBe(ErrorScenario.AUTHENTICATION_FAILURE);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
            expect(result.helpLink).toBeDefined();
        });

        it('should detect "could not read from remote repository" error', () => {
            const error = new Error('Failed');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'fatal: Could not read from remote repository'
            });

            expect(result.scenario).toBe(ErrorScenario.AUTHENTICATION_FAILURE);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
        });

        it('should detect invalid username or password', () => {
            const error = new Error('Auth failed');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'push',
                stderr: 'remote: Invalid username or password'
            });

            expect(result.scenario).toBe(ErrorScenario.AUTHENTICATION_FAILURE);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
        });

        it('should detect HTTP Basic access denied', () => {
            const error = new Error('Access denied');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'fatal: HTTP Basic: Access denied'
            });

            expect(result.scenario).toBe(ErrorScenario.AUTHENTICATION_FAILURE);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
        });
    });

    describe('Merge Conflict Detection', () => {
        it('should detect merge conflict from CONFLICT marker', () => {
            const error = new Error('Merge failed');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'pull',
                stderr: 'CONFLICT (content): Merge conflict in src/file.ts'
            });

            expect(result.scenario).toBe(ErrorScenario.MERGE_CONFLICT);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
            expect(result.userMessage).toContain('Merge conflict');
            expect(result.suggestedActions[0]).toContain('conflict markers');
        });

        it('should detect automatic merge failed message', () => {
            const error = new Error('Merge failed');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'pull',
                stderr: 'Automatic merge failed; fix conflicts and then commit the result'
            });

            expect(result.scenario).toBe(ErrorScenario.MERGE_CONFLICT);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
            expect(result.helpLink).toBeDefined();
        });

        it('should detect "fix conflicts and then commit" message', () => {
            const error = new Error('Conflicts');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'merge',
                stderr: 'fix conflicts and then commit'
            });

            expect(result.scenario).toBe(ErrorScenario.MERGE_CONFLICT);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
        });
    });

    describe('Network Error Detection', () => {
        it('should detect "could not resolve host" error', () => {
            const error = new Error('Network error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'fatal: Could not resolve host: github.com'
            });

            expect(result.scenario).toBe(ErrorScenario.NETWORK_ERROR);
            expect(result.severity).toBe(ErrorSeverity.MINOR);
            expect(result.userMessage).toContain('Network error');
        });

        it('should detect connection refused error', () => {
            const error = new Error('Connection failed');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'fatal: unable to access: Connection refused'
            });

            expect(result.scenario).toBe(ErrorScenario.NETWORK_ERROR);
            expect(result.severity).toBe(ErrorSeverity.MINOR);
            expect(result.suggestedActions[0]).toContain('internet connection');
        });

        it('should detect connection timeout error', () => {
            const error = new Error('Timeout');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'fatal: Connection timed out'
            });

            expect(result.scenario).toBe(ErrorScenario.NETWORK_ERROR);
            expect(result.severity).toBe(ErrorSeverity.MINOR);
        });

        it('should detect "unable to access" network error', () => {
            const error = new Error('Network issue');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'push',
                stderr: 'fatal: Unable to access \'https://github.com/\': Failed to connect to github.com port 443'
            });

            expect(result.scenario).toBe(ErrorScenario.NETWORK_ERROR);
            expect(result.severity).toBe(ErrorSeverity.MINOR);
        });
    });

    describe('Permission Denied Detection', () => {
        it('should detect file permission denied error', () => {
            const error = new Error('Permission error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'commit',
                stderr: 'error: insufficient permission for adding an object'
            });

            expect(result.scenario).toBe(ErrorScenario.PERMISSION_DENIED);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
            expect(result.userMessage).toContain('Permission denied');
        });

        it('should detect "cannot open" permission error', () => {
            const error = new Error('Cannot write');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'status',
                stderr: 'error: cannot open .git/index: Permission denied'
            });

            expect(result.scenario).toBe(ErrorScenario.PERMISSION_DENIED);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
            expect(result.suggestedActions[0]).toContain('file permissions');
        });

        it('should detect lock file permission error', () => {
            const error = new Error('Lock error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'commit',
                stderr: 'fatal: Unable to create \'.git/index.lock\': Permission denied'
            });

            expect(result.scenario).toBe(ErrorScenario.PERMISSION_DENIED);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
        });
    });

    describe('Repository Error Detection', () => {
        it('should detect "not a git repository" error', () => {
            const error = new Error('Invalid repo');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'status',
                stderr: 'fatal: not a git repository (or any of the parent directories): .git'
            });

            expect(result.scenario).toBe(ErrorScenario.REPOSITORY_ERROR);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
            expect(result.userMessage).toContain('Repository error');
        });

        it('should detect repository not found error', () => {
            const error = new Error('Not found');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'fatal: repository \'https://github.com/user/nonexistent.git\' not found'
            });

            expect(result.scenario).toBe(ErrorScenario.REPOSITORY_ERROR);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
            expect(result.suggestedActions[0]).toContain('repository path');
        });

        it('should detect "does not appear to be a git repository"', () => {
            const error = new Error('Invalid');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'fatal: \'/path/to/repo\' does not appear to be a git repository'
            });

            expect(result.scenario).toBe(ErrorScenario.REPOSITORY_ERROR);
            expect(result.severity).toBe(ErrorSeverity.CRITICAL);
        });
    });

    describe('Unknown Error Handling', () => {
        it('should classify unknown errors as UNKNOWN with MINOR severity', () => {
            const error = new Error('Something went wrong');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'Some unrecognized error message'
            });

            expect(result.scenario).toBe(ErrorScenario.UNKNOWN);
            expect(result.severity).toBe(ErrorSeverity.MINOR);
            expect(result.userMessage).toContain('Error during');
        });

        it('should provide generic suggested actions for unknown errors', () => {
            const error = new Error('Generic error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'push',
                stderr: 'Unrecognized error'
            });

            expect(result.suggestedActions.length).toBeGreaterThan(0);
            expect(result.suggestedActions[0]).toContain('Retry');
        });

        it('should not have help link for unknown errors', () => {
            const error = new Error('Unknown');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch'
            });

            expect(result.helpLink).toBeUndefined();
        });
    });

    describe('Context Information', () => {
        it('should include repository name in user message', () => {
            const error = new Error('Test error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'My Project',
                operation: 'fetch',
                stderr: 'Network error'
            });

            expect(result.userMessage).toContain('[My Project]');
        });

        it('should include operation in user message', () => {
            const error = new Error('Test error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'push',
                stderr: 'Authentication failed'
            });

            expect(result.userMessage).toContain('push');
        });

        it('should preserve repository ID', () => {
            const error = new Error('Test error');
            const result = service.classifyError(error, {
                repositoryId: 'unique-id-123',
                repositoryName: 'Test Repo',
                operation: 'fetch'
            });

            expect(result.repositoryId).toBe('unique-id-123');
        });

        it('should include technical details from stderr', () => {
            const error = new Error('Error');
            const stderr = 'fatal: detailed git error message';
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr
            });

            expect(result.technicalDetails).toBe(stderr);
        });

        it('should use error message as technical details when stderr is not provided', () => {
            const error = new Error('Detailed error message');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch'
            });

            expect(result.technicalDetails).toBe('Detailed error message');
        });

        it('should include operation in result', () => {
            const error = new Error('Error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'commit'
            });

            expect(result.operation).toBe('commit');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty stderr', () => {
            const error = new Error('Error message');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: ''
            });

            expect(result.scenario).toBe(ErrorScenario.UNKNOWN);
        });

        it('should handle missing stderr', () => {
            const error = new Error('Error message');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch'
            });

            expect(result).toBeDefined();
            expect(result.scenario).toBeDefined();
        });

        it('should handle error message with authentication pattern', () => {
            const error = new Error('Permission denied (publickey)');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch'
            });

            expect(result.scenario).toBe(ErrorScenario.AUTHENTICATION_FAILURE);
        });

        it('should be case-insensitive in pattern matching', () => {
            const error = new Error('Error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'AUTHENTICATION FAILED'
            });

            expect(result.scenario).toBe(ErrorScenario.AUTHENTICATION_FAILURE);
        });

        it('should handle mixed case in error messages', () => {
            const error = new Error('Error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'pull',
                stderr: 'CoNfLiCt (content): Merge conflict in file'
            });

            expect(result.scenario).toBe(ErrorScenario.MERGE_CONFLICT);
        });
    });

    describe('Suggested Actions', () => {
        it('should provide SSH-specific actions for auth failures', () => {
            const error = new Error('Auth failed');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'Permission denied (publickey)'
            });

            const actionsText = result.suggestedActions.join(' ');
            expect(actionsText).toContain('SSH');
            expect(actionsText).toContain('ssh-keygen');
        });

        it('should provide conflict resolution steps for merge conflicts', () => {
            const error = new Error('Conflict');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'pull',
                stderr: 'CONFLICT'
            });

            const actionsText = result.suggestedActions.join(' ');
            expect(actionsText).toContain('conflict markers');
            expect(actionsText).toContain('git add');
            expect(actionsText).toContain('git commit');
        });

        it('should provide network troubleshooting for network errors', () => {
            const error = new Error('Network error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'Could not resolve host'
            });

            const actionsText = result.suggestedActions.join(' ');
            expect(actionsText).toContain('internet');
            expect(actionsText).toContain('URL');
        });

        it('should include operation in generic suggested actions', () => {
            const error = new Error('Unknown error');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'status'
            });

            const actionsText = result.suggestedActions.join(' ');
            expect(actionsText).toContain('status');
        });
    });

    describe('Help Links', () => {
        it('should provide GitHub SSH docs link for auth failures', () => {
            const error = new Error('Auth failed');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'Authentication failed'
            });

            expect(result.helpLink).toContain('github.com');
            expect(result.helpLink).toContain('ssh');
        });

        it('should provide git docs link for merge conflicts', () => {
            const error = new Error('Conflict');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'pull',
                stderr: 'CONFLICT'
            });

            expect(result.helpLink).toContain('git-scm.com');
            expect(result.helpLink).toContain('merge');
        });

        it('should not provide help link for network errors', () => {
            const error = new Error('Network');
            const result = service.classifyError(error, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch',
                stderr: 'Connection timed out'
            });

            expect(result.helpLink).toBeUndefined();
        });
    });

    describe('Original Error Preservation', () => {
        it('should preserve the original error object', () => {
            const originalError = new Error('Original message');
            const result = service.classifyError(originalError, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch'
            });

            expect(result.error).toBe(originalError);
            expect(result.error.message).toBe('Original message');
        });

        it('should preserve error name and stack', () => {
            const originalError = new Error('Test error');
            originalError.name = 'CustomError';
            const result = service.classifyError(originalError, {
                repositoryId: 'repo1',
                repositoryName: 'Test Repo',
                operation: 'fetch'
            });

            expect(result.error.name).toBe('CustomError');
            expect(result.error.stack).toBeDefined();
        });
    });
});
