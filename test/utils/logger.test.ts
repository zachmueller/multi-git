/**
 * Unit tests for Logger utility
 * Tests debug logging, sanitization, and security features
 */

import { Logger } from '../../src/utils/logger';
import type { MultiGitSettings } from '../../src/settings/data';

describe('Logger', () => {
    let mockSettings: MultiGitSettings;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        // Reset logger state
        mockSettings = {
            repositories: [],
            version: '0.1.0',
            globalFetchInterval: 300000,
            fetchOnStartup: true,
            notifyOnRemoteChanges: true,
            debugLogging: false,
            customPathEntries: [],
            autoPullEnabled: true,
            autoPullPerRepository: {},
            autoPullNotificationVerbosity: 'all',
        };

        // Spy on console methods
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('Debug Mode Toggle', () => {
        it('should not log when debug mode is disabled', () => {
            mockSettings.debugLogging = false;
            Logger.initialize(mockSettings);

            Logger.debug('TestComponent', 'Test message');

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should log when debug mode is enabled', () => {
            mockSettings.debugLogging = true;
            Logger.initialize(mockSettings);

            Logger.debug('TestComponent', 'Test message');

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('[Multi-Git Debug]');
            expect(logMessage).toContain('[TestComponent]');
            expect(logMessage).toContain('Test message');
        });

        it('should include optional data in logs when provided', () => {
            mockSettings.debugLogging = true;
            Logger.initialize(mockSettings);

            const testData = { key: 'value', count: 42 };
            Logger.debug('TestComponent', 'Test message', testData);

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Test message'),
                testData
            );
        });
    });

    describe('Sensitive Data Sanitization', () => {
        describe('HTTPS URL Credentials', () => {
            it('should sanitize HTTPS URLs with embedded credentials', () => {
                const input = 'https://user:password@github.com/repo.git';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('https://[CREDENTIALS]@github.com/repo.git');
                expect(output).not.toContain('user');
                expect(output).not.toContain('password');
            });

            it('should sanitize HTTPS URLs with token credentials', () => {
                const input = 'https://oauth:ghp_abc123xyz@github.com/repo.git';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('https://[CREDENTIALS]@github.com/repo.git');
                expect(output).not.toContain('oauth');
                expect(output).not.toContain('ghp_abc123xyz');
            });

            it('should sanitize HTTP URLs with credentials', () => {
                const input = 'http://admin:secret@example.com/git/repo.git';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('http://[CREDENTIALS]@example.com/git/repo.git');
                expect(output).not.toContain('admin');
                expect(output).not.toContain('secret');
            });

            it('should handle multiple URLs in same string', () => {
                const input = 'Cloning https://user1:pass1@github.com/repo1.git and https://user2:pass2@github.com/repo2.git';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toContain('https://[CREDENTIALS]@github.com/repo1.git');
                expect(output).toContain('https://[CREDENTIALS]@github.com/repo2.git');
                expect(output).not.toContain('user1');
                expect(output).not.toContain('pass1');
                expect(output).not.toContain('user2');
                expect(output).not.toContain('pass2');
            });
        });

        describe('SSH Key Data', () => {
            it('should sanitize RSA private keys', () => {
                const input = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef
ghijklmnopqrstuvwxyz
-----END RSA PRIVATE KEY-----`;
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('[SSH_KEY_REDACTED]');
                expect(output).not.toContain('MIIEpAIBAAKCAQEA');
            });

            it('should sanitize OpenSSH private keys', () => {
                const input = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmU
-----END OPENSSH PRIVATE KEY-----`;
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('[SSH_KEY_REDACTED]');
                expect(output).not.toContain('b3BlbnNzaC1rZXk');
            });

            it('should sanitize EC private keys', () => {
                const input = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIIGlRJQdmVVMHJ8wJQ==
-----END EC PRIVATE KEY-----`;
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('[SSH_KEY_REDACTED]');
                expect(output).not.toContain('MHcCAQEEIIGlRJQdmVVMHJ8wJQ==');
            });

            it('should handle multiple keys in output', () => {
                const input = `Found keys:
-----BEGIN RSA PRIVATE KEY-----
key1data
-----END RSA PRIVATE KEY-----
and
-----BEGIN OPENSSH PRIVATE KEY-----
key2data
-----END OPENSSH PRIVATE KEY-----`;
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toContain('[SSH_KEY_REDACTED]');
                expect(output).not.toContain('key1data');
                expect(output).not.toContain('key2data');
                // Count occurrences
                const redactedCount = (output.match(/\[SSH_KEY_REDACTED\]/g) || []).length;
                expect(redactedCount).toBe(2);
            });
        });

        describe('Token Formats', () => {
            it('should sanitize token= format', () => {
                const input = 'Authentication failed: token=ghp_1234567890abcdef';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('Authentication failed: token=[REDACTED]');
                expect(output).not.toContain('ghp_1234567890abcdef');
            });

            it('should sanitize token: format', () => {
                const input = 'Using token: abc123xyz789';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('Using token:[REDACTED]');
                expect(output).not.toContain('abc123xyz789');
            });

            it('should sanitize Bearer token format', () => {
                const input = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('Bearer [REDACTED]');
                expect(output).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
            });

            it('should sanitize Authorization header', () => {
                const input = 'Authorization: Basic dXNlcjpwYXNzd29yZA==';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('Authorization: [REDACTED]');
                expect(output).not.toContain('dXNlcjpwYXNzd29yZA==');
            });

            it('should sanitize password formats', () => {
                const input = 'Login failed: password=mysecretpass';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('Login failed: password=[REDACTED]');
                expect(output).not.toContain('mysecretpass');
            });

            it('should sanitize API key formats', () => {
                const input1 = 'api_key=sk_live_1234567890';
                const output1 = Logger.sanitizeGitOutput(input1);

                expect(output1).toBe('api_key=[REDACTED]');
                expect(output1).not.toContain('sk_live_1234567890');

                const input2 = 'api-key: pk_test_abcdefg';
                const output2 = Logger.sanitizeGitOutput(input2);

                expect(output2).toContain('[REDACTED]');
                expect(output2).not.toContain('pk_test_abcdefg');
            });

            it('should sanitize secret formats', () => {
                const input = 'Configuration: secret=my_secret_value';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('Configuration: secret=[REDACTED]');
                expect(output).not.toContain('my_secret_value');
            });

            it('should be case-insensitive for token patterns', () => {
                const input1 = 'TOKEN=ABC123';
                const output1 = Logger.sanitizeGitOutput(input1);
                expect(output1).toContain('[REDACTED]');

                const input2 = 'Token=xyz789';
                const output2 = Logger.sanitizeGitOutput(input2);
                expect(output2).toContain('[REDACTED]');

                const input3 = 'PASSWORD=secret';
                const output3 = Logger.sanitizeGitOutput(input3);
                expect(output3).toContain('[REDACTED]');
            });
        });

        describe('SSH URLs', () => {
            it('should sanitize SSH URLs with usernames', () => {
                const input = 'ssh://git@github.com/user/repo.git';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('ssh://[USER]@github.com/user/repo.git');
                expect(output).not.toContain('git@');
            });

            it('should handle standard git@ URLs correctly', () => {
                const input = 'git@github.com:user/repo.git';
                const output = Logger.sanitizeGitOutput(input);

                // git@ format is kept but normalized
                expect(output).toContain('git@github.com:');
            });
        });

        describe('Edge Cases', () => {
            it('should handle null input gracefully', () => {
                const output = Logger.sanitizeGitOutput(null as any);
                expect(output).toBeNull();
            });

            it('should handle undefined input gracefully', () => {
                const output = Logger.sanitizeGitOutput(undefined as any);
                expect(output).toBeUndefined();
            });

            it('should handle empty string', () => {
                const output = Logger.sanitizeGitOutput('');
                expect(output).toBe('');
            });

            it('should preserve commit hashes', () => {
                const input = 'commit hash: a1b2c3d4e5f6789012345678901234567890abcd';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toContain('a1b2c3d4e5f6789012345678901234567890abcd');
            });

            it('should preserve branch names', () => {
                const input = 'On branch feature/add-logging';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('On branch feature/add-logging');
            });

            it('should preserve safe git output', () => {
                const input = 'Already up to date.';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toBe('Already up to date.');
            });

            it('should handle mixed sensitive and safe content', () => {
                const input = 'Fetching from https://user:pass@github.com/repo.git\nAlready up to date.\nCurrent commit: abc123def456';
                const output = Logger.sanitizeGitOutput(input);

                expect(output).toContain('https://[CREDENTIALS]@github.com/repo.git');
                expect(output).toContain('Already up to date.');
                expect(output).toContain('abc123def456');
                expect(output).not.toContain('user:pass');
            });
        });

        describe('Performance', () => {
            it('should sanitize quickly for typical messages', () => {
                const input = 'https://user:pass@github.com/repo.git';
                const iterations = 1000;

                const start = Date.now();
                for (let i = 0; i < iterations; i++) {
                    Logger.sanitizeGitOutput(input);
                }
                const duration = Date.now() - start;

                // Should complete 1000 iterations in under 100ms (< 0.1ms per call)
                expect(duration).toBeLessThan(100);
            });
        });
    });

    describe('Error Logging with Sanitization', () => {
        beforeEach(() => {
            mockSettings.debugLogging = true;
            Logger.initialize(mockSettings);
        });

        it('should sanitize error messages', () => {
            const error = new Error('Authentication failed: token=ghp_secret123');

            Logger.error('TestComponent', 'Operation failed', error);

            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            const [, sanitizedError] = consoleErrorSpy.mock.calls[0];
            expect(sanitizedError.message).toContain('[REDACTED]');
            expect(sanitizedError.message).not.toContain('ghp_secret123');
        });

        it('should sanitize credentials in error stack traces', () => {
            const error = new Error('Failed');
            error.stack = 'Error at https://user:pass@github.com/repo.git';

            Logger.error('TestComponent', 'Operation failed', error);

            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            const [, sanitizedError] = consoleErrorSpy.mock.calls[0];
            expect(sanitizedError.stack).toContain('[CREDENTIALS]');
            expect(sanitizedError.stack).not.toContain('user:pass');
        });

        it('should preserve error name and type', () => {
            const error = new TypeError('Invalid token=abc123');

            Logger.error('TestComponent', 'Type error occurred', error);

            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            const [, sanitizedError] = consoleErrorSpy.mock.calls[0];
            expect(sanitizedError.name).toBe('TypeError');
            expect(sanitizedError.message).toContain('[REDACTED]');
        });
    });

    describe('Git Command Logging', () => {
        beforeEach(() => {
            mockSettings.debugLogging = true;
            Logger.initialize(mockSettings);
        });

        it('should sanitize git commands with credentials', () => {
            Logger.gitCommand('GitCommand', 'git clone https://user:pass@github.com/repo.git', '/path/to/repo');

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('[CREDENTIALS]');
            expect(logMessage).not.toContain('user:pass');
        });

        it('should sanitize git command results', () => {
            const output = 'Cloning into repository https://token:ghp_abc@github.com/repo.git';

            Logger.gitResult('GitCommand', 'git clone', true, 1000, output);

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('[CREDENTIALS]');
            expect(logMessage).not.toContain('ghp_abc');
        });
    });

    describe('Timing Logs', () => {
        beforeEach(() => {
            mockSettings.debugLogging = true;
            Logger.initialize(mockSettings);
        });

        it('should log timing information when debug enabled', () => {
            Logger.timing('TestComponent', 'Test operation', 150);

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('Test operation completed in 150ms');
        });

        it('should include optional details in timing logs', () => {
            Logger.timing('TestComponent', 'Fetch operation', 2500, '/path/to/repo');

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('2500ms (/path/to/repo)');
        });

        it('should not log timing when debug disabled', () => {
            mockSettings.debugLogging = false;
            Logger.initialize(mockSettings);

            Logger.timing('TestComponent', 'Test operation', 150);

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });
});
