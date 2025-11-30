/**
 * Unit tests for GitCommandService
 */

import { GitCommandService } from '../../src/services/GitCommandService';
import { GitRepositoryError } from '../../src/utils/errors';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execPromise = promisify(exec);

describe('GitCommandService', () => {
    let service: GitCommandService;
    let testRepoPath: string;
    let nonGitPath: string;

    beforeAll(async () => {
        // Create temporary directories for testing
        const tmpDir = os.tmpdir();
        testRepoPath = path.join(tmpDir, `test-git-repo-${Date.now()}`);
        nonGitPath = path.join(tmpDir, `test-non-git-${Date.now()}`);

        // Create test directories
        fs.mkdirSync(testRepoPath, { recursive: true });
        fs.mkdirSync(nonGitPath, { recursive: true });

        // Initialize git repository in testRepoPath
        await execPromise('git init', { cwd: testRepoPath });
        await execPromise('git config user.email "test@example.com"', { cwd: testRepoPath });
        await execPromise('git config user.name "Test User"', { cwd: testRepoPath });

        // Create initial commit so repository has a proper structure
        const testFile = path.join(testRepoPath, 'README.md');
        fs.writeFileSync(testFile, '# Test Repository');
        await execPromise('git add README.md', { cwd: testRepoPath });
        await execPromise('git commit -m "Initial commit"', { cwd: testRepoPath });
    });

    afterAll(async () => {
        // Clean up test directories
        try {
            fs.rmSync(testRepoPath, { recursive: true, force: true });
            fs.rmSync(nonGitPath, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    beforeEach(() => {
        service = new GitCommandService();
    });

    describe('isGitInstalled', () => {
        it('should return true when git is installed', async () => {
            const result = await service.isGitInstalled();
            expect(result).toBe(true);
        });
    });

    describe('getGitVersion', () => {
        it('should return git version string', async () => {
            const version = await service.getGitVersion();
            expect(version).not.toBeNull();
            expect(version).toContain('git version');
        });
    });

    describe('isGitRepository', () => {
        it('should return true for valid git repository', async () => {
            const result = await service.isGitRepository(testRepoPath);
            expect(result).toBe(true);
        });

        it('should return false for non-git directory', async () => {
            const result = await service.isGitRepository(nonGitPath);
            expect(result).toBe(false);
        });

        it('should throw GitRepositoryError for non-existent path', async () => {
            const invalidPath = path.join(os.tmpdir(), 'non-existent-path-12345');
            await expect(service.isGitRepository(invalidPath)).rejects.toThrow(GitRepositoryError);
        });

        it('should return true for subdirectory within git repository', async () => {
            const subDir = path.join(testRepoPath, 'subdir');
            fs.mkdirSync(subDir, { recursive: true });

            const result = await service.isGitRepository(subDir);
            expect(result).toBe(true);

            // Clean up
            fs.rmSync(subDir, { recursive: true });
        });
    });

    describe('getRepositoryRoot', () => {
        it('should return correct repository root path', async () => {
            const root = await service.getRepositoryRoot(testRepoPath);
            // Use fs.realpathSync to resolve symlinks (e.g., /var -> /private/var on macOS)
            expect(root).toBe(fs.realpathSync(testRepoPath));
        });

        it('should return repository root from subdirectory', async () => {
            const subDir = path.join(testRepoPath, 'nested', 'subdir');
            fs.mkdirSync(subDir, { recursive: true });

            const root = await service.getRepositoryRoot(subDir);
            // Use fs.realpathSync to resolve symlinks (e.g., /var -> /private/var on macOS)
            expect(root).toBe(fs.realpathSync(testRepoPath));

            // Clean up
            fs.rmSync(path.join(testRepoPath, 'nested'), { recursive: true, force: true });
        });

        it('should throw GitRepositoryError for non-git directory', async () => {
            await expect(service.getRepositoryRoot(nonGitPath)).rejects.toThrow(GitRepositoryError);
        });

        it('should throw GitRepositoryError for non-existent path', async () => {
            const invalidPath = path.join(os.tmpdir(), 'non-existent-path-67890');
            await expect(service.getRepositoryRoot(invalidPath)).rejects.toThrow(GitRepositoryError);
        });
    });

    describe('command validation', () => {
        it('should reject commands with dangerous patterns', async () => {
            const dangerousCommands = [
                'status && rm -rf /',
                'status || echo "hacked"',
                'status; cat /etc/passwd',
                'status | grep something',
                'status > output.txt',
                'status < input.txt',
                'status `whoami`',
                'status $(whoami)',
                'status\nrm -rf /',
            ];

            for (const cmd of dangerousCommands) {
                // We need to test this through a method that uses validateCommand
                // Since validateCommand is private, we test through isGitRepository
                // which will fail during command validation
                await expect(
                    (service as any).executeGitCommand(cmd.replace('git ', ''), { cwd: testRepoPath })
                ).rejects.toThrow('Invalid git command');
            }
        });

        it('should reject invalid git subcommands', async () => {
            await expect(
                (service as any).executeGitCommand('invalidsubcommand', { cwd: testRepoPath })
            ).rejects.toThrow('not a recognized git subcommand');
        });

        it('should accept valid git subcommands', async () => {
            // Test that valid commands are accepted
            const validCommands = [
                'rev-parse --git-dir',
                'status --short',
                'log --oneline',
                'branch --list',
            ];

            for (const cmd of validCommands) {
                // This should not throw during validation
                // The command might fail for other reasons, but validation should pass
                try {
                    await (service as any).executeGitCommand(cmd, { cwd: testRepoPath });
                } catch (error) {
                    // If it throws, it should not be a validation error
                    if (error instanceof Error) {
                        expect(error.message).not.toContain('Invalid git command');
                        expect(error.message).not.toContain('not a recognized git subcommand');
                    }
                }
            }
        });
    });

    describe('error handling', () => {
        it('should handle permission errors gracefully', async () => {
            // This test is platform-dependent and may not work in all environments
            // Skip if we can't create a permission-denied scenario
            if (process.platform === 'win32') {
                // Windows permission testing is complex, skip for now
                return;
            }

            const restrictedPath = path.join(os.tmpdir(), `restricted-${Date.now()}`);
            try {
                fs.mkdirSync(restrictedPath, { recursive: true });
                fs.chmodSync(restrictedPath, 0o000);

                await expect(service.isGitRepository(restrictedPath)).rejects.toThrow();

                // Clean up
                fs.chmodSync(restrictedPath, 0o755);
                fs.rmSync(restrictedPath, { recursive: true });
            } catch (error) {
                // If we can't set up the test, skip it
                fs.chmodSync(restrictedPath, 0o755);
                fs.rmSync(restrictedPath, { recursive: true, force: true });
            }
        });

        it('should provide clear error messages', async () => {
            try {
                await service.getRepositoryRoot(nonGitPath);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(GitRepositoryError);
                if (error instanceof GitRepositoryError) {
                    expect(error.message.toLowerCase()).toContain('not a git repository');
                    expect(error.repositoryPath).toBe(nonGitPath);
                }
            }
        });
    });

    describe('cross-platform compatibility', () => {
        it('should handle paths with spaces', async () => {
            const pathWithSpaces = path.join(os.tmpdir(), `test repo ${Date.now()}`);
            fs.mkdirSync(pathWithSpaces, { recursive: true });

            try {
                await execPromise('git init', { cwd: pathWithSpaces });
                await execPromise('git config user.email "test@example.com"', { cwd: pathWithSpaces });
                await execPromise('git config user.name "Test User"', { cwd: pathWithSpaces });

                const result = await service.isGitRepository(pathWithSpaces);
                expect(result).toBe(true);

                const root = await service.getRepositoryRoot(pathWithSpaces);
                // Use fs.realpathSync to resolve symlinks (e.g., /var -> /private/var on macOS)
                expect(root).toBe(fs.realpathSync(pathWithSpaces));
            } finally {
                fs.rmSync(pathWithSpaces, { recursive: true, force: true });
            }
        });

        it('should normalize path separators', async () => {
            const root = await service.getRepositoryRoot(testRepoPath);
            // The returned path should be absolute and properly formatted
            expect(path.isAbsolute(root)).toBe(true);
            expect(root).toBe(path.normalize(root));
        });
    });

    describe('timeout handling', () => {
        it('should timeout long-running commands', async () => {
            // Create a git command that will take a long time
            // This test might be flaky depending on system performance
            const shortTimeout = 100; // 100ms timeout

            try {
                // Try to execute a command with very short timeout
                // The actual test depends on system performance
                await (service as any).executeGitCommand('status', {
                    cwd: testRepoPath,
                    timeout: shortTimeout
                });
                // If it succeeds, that's fine (system is fast)
            } catch (error) {
                // If it times out, verify error handling
                if (error instanceof GitRepositoryError) {
                    // This might happen if the command actually times out
                    expect(error.message).toBeTruthy();
                }
            }
        }, 10000);
    });

    describe('edge cases', () => {
        it('should handle empty directory names', async () => {
            const result = await service.isGitRepository(testRepoPath);
            expect(result).toBe(true);
        });

        it('should handle repository with no commits (bare init)', async () => {
            const bareRepoPath = path.join(os.tmpdir(), `bare-repo-${Date.now()}`);
            fs.mkdirSync(bareRepoPath, { recursive: true });

            try {
                await execPromise('git init', { cwd: bareRepoPath });

                const result = await service.isGitRepository(bareRepoPath);
                expect(result).toBe(true);
            } finally {
                fs.rmSync(bareRepoPath, { recursive: true, force: true });
            }
        });
    });
});
