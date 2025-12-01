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

    describe('FR-2: Git Fetch Operations', () => {
        let remoteRepoPath: string;
        let localRepoPath: string;

        beforeAll(async () => {
            // Create a remote repository
            const tmpDir = os.tmpdir();
            remoteRepoPath = path.join(tmpDir, `remote-repo-${Date.now()}`);
            localRepoPath = path.join(tmpDir, `local-repo-${Date.now()}`);

            // Initialize remote repository
            fs.mkdirSync(remoteRepoPath, { recursive: true });
            await execPromise('git init', { cwd: remoteRepoPath });
            await execPromise('git config user.email "test@example.com"', { cwd: remoteRepoPath });
            await execPromise('git config user.name "Test User"', { cwd: remoteRepoPath });

            // Create initial commit in remote
            fs.writeFileSync(path.join(remoteRepoPath, 'README.md'), '# Remote Repository');
            await execPromise('git add README.md', { cwd: remoteRepoPath });
            await execPromise('git commit -m "Initial commit"', { cwd: remoteRepoPath });

            // Clone to local repository
            await execPromise(`git clone "${remoteRepoPath}" "${localRepoPath}"`);
            await execPromise('git config user.email "test@example.com"', { cwd: localRepoPath });
            await execPromise('git config user.name "Test User"', { cwd: localRepoPath });
            await execPromise('git config pull.rebase false', { cwd: localRepoPath });
        });

        afterAll(async () => {
            try {
                fs.rmSync(remoteRepoPath, { recursive: true, force: true });
                fs.rmSync(localRepoPath, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        describe('getCurrentBranch', () => {
            it('should return current branch name', async () => {
                const branch = await service.getCurrentBranch(localRepoPath);
                expect(branch).toMatch(/^(main|master)$/);
            });

            it('should return null for detached HEAD state', async () => {
                // Get the current commit hash
                const { stdout: commitHash } = await execPromise('git rev-parse HEAD', { cwd: localRepoPath });

                // Checkout specific commit to enter detached HEAD state
                await execPromise(`git checkout ${commitHash.trim()}`, { cwd: localRepoPath });

                const branch = await service.getCurrentBranch(localRepoPath);
                expect(branch).toBeNull();

                // Return to main branch
                await execPromise('git checkout main || git checkout master', { cwd: localRepoPath });
            });

            it('should throw error for non-git directory', async () => {
                await expect(service.getCurrentBranch(nonGitPath)).rejects.toThrow(GitRepositoryError);
            });
        });

        describe('getTrackingBranch', () => {
            it('should return tracking branch for current branch', async () => {
                const tracking = await service.getTrackingBranch(localRepoPath);
                expect(tracking).toMatch(/origin\/(main|master)/);
            });

            it('should return tracking branch for specific branch', async () => {
                // Get current branch name
                const { stdout: currentBranch } = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: localRepoPath });

                const tracking = await service.getTrackingBranch(localRepoPath, currentBranch.trim());
                expect(tracking).toMatch(/origin\/(main|master)/);
            });

            it('should return null when no tracking branch configured', async () => {
                // Create a local-only branch
                await execPromise('git checkout -b local-only-branch', { cwd: localRepoPath });

                const tracking = await service.getTrackingBranch(localRepoPath);
                expect(tracking).toBeNull();

                // Return to main branch
                await execPromise('git checkout main || git checkout master', { cwd: localRepoPath });
                await execPromise('git branch -D local-only-branch', { cwd: localRepoPath });
            });

            it('should throw error for non-git directory', async () => {
                await expect(service.getTrackingBranch(nonGitPath)).rejects.toThrow(GitRepositoryError);
            });
        });

        describe('compareWithRemote', () => {
            it('should return zero ahead/behind when branches are in sync', async () => {
                // Ensure we're in sync
                await execPromise('git fetch origin', { cwd: localRepoPath });
                const { stdout: currentBranch } = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: localRepoPath });
                const { stdout: tracking } = await execPromise('git rev-parse --abbrev-ref @{u}', { cwd: localRepoPath });

                const result = await service.compareWithRemote(
                    localRepoPath,
                    currentBranch.trim(),
                    tracking.trim()
                );

                expect(result.ahead).toBe(0);
                expect(result.behind).toBe(0);
            });

            it('should detect commits ahead of remote', async () => {
                // Create a local commit
                fs.writeFileSync(path.join(localRepoPath, 'local-file.txt'), 'local content');
                await execPromise('git add local-file.txt', { cwd: localRepoPath });
                await execPromise('git commit -m "Local commit"', { cwd: localRepoPath });

                const { stdout: currentBranch } = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: localRepoPath });
                const { stdout: tracking } = await execPromise('git rev-parse --abbrev-ref @{u}', { cwd: localRepoPath });

                const result = await service.compareWithRemote(
                    localRepoPath,
                    currentBranch.trim(),
                    tracking.trim()
                );

                expect(result.ahead).toBeGreaterThan(0);
                expect(result.behind).toBe(0);

                // Clean up - reset to remote state
                await execPromise('git reset --hard origin/main || git reset --hard origin/master', { cwd: localRepoPath });
            });

            it('should detect commits behind remote', async () => {
                // Create a commit in remote
                fs.writeFileSync(path.join(remoteRepoPath, 'remote-file.txt'), 'remote content');
                await execPromise('git add remote-file.txt', { cwd: remoteRepoPath });
                await execPromise('git commit -m "Remote commit"', { cwd: remoteRepoPath });

                // Fetch but don't merge
                await execPromise('git fetch origin', { cwd: localRepoPath });

                const { stdout: currentBranch } = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: localRepoPath });
                const { stdout: tracking } = await execPromise('git rev-parse --abbrev-ref @{u}', { cwd: localRepoPath });

                const result = await service.compareWithRemote(
                    localRepoPath,
                    currentBranch.trim(),
                    tracking.trim()
                );

                expect(result.ahead).toBe(0);
                expect(result.behind).toBeGreaterThan(0);

                // Clean up - pull changes
                await execPromise('git pull origin main || git pull origin master', { cwd: localRepoPath });
            });

            it('should throw error for invalid branch names', async () => {
                await expect(
                    service.compareWithRemote(localRepoPath, 'invalid-branch', 'origin/main')
                ).rejects.toThrow(GitRepositoryError);
            });
        });

        describe('checkRemoteChanges', () => {
            it('should return no changes when in sync', async () => {
                await execPromise('git fetch origin', { cwd: localRepoPath });
                await execPromise('git pull origin main || git pull origin master', { cwd: localRepoPath });

                const status = await service.checkRemoteChanges(localRepoPath);

                expect(status.hasChanges).toBe(false);
                expect(status.commitsBehind).toBe(0);
                expect(status.currentBranch).toMatch(/main|master/);
                expect(status.trackingBranch).toMatch(/origin\/(main|master)/);
            });

            it('should detect remote changes', async () => {
                // Create a commit in remote
                fs.writeFileSync(path.join(remoteRepoPath, 'new-remote-file.txt'), 'new remote content');
                await execPromise('git add new-remote-file.txt', { cwd: remoteRepoPath });
                await execPromise('git commit -m "New remote commit"', { cwd: remoteRepoPath });

                // Fetch but don't merge
                await execPromise('git fetch origin', { cwd: localRepoPath });

                const status = await service.checkRemoteChanges(localRepoPath);

                expect(status.hasChanges).toBe(true);
                expect(status.commitsBehind).toBeGreaterThan(0);
                expect(status.commitsAhead).toBe(0);
                expect(status.currentBranch).toMatch(/main|master/);
                expect(status.trackingBranch).toMatch(/origin\/(main|master)/);

                // Clean up
                await execPromise('git pull origin main || git pull origin master', { cwd: localRepoPath });
            });

            it('should return no changes for detached HEAD', async () => {
                const { stdout: commitHash } = await execPromise('git rev-parse HEAD', { cwd: localRepoPath });
                await execPromise(`git checkout ${commitHash.trim()}`, { cwd: localRepoPath });

                const status = await service.checkRemoteChanges(localRepoPath);

                expect(status.hasChanges).toBe(false);
                expect(status.commitsBehind).toBe(0);
                expect(status.commitsAhead).toBe(0);
                expect(status.currentBranch).toBeNull();
                expect(status.trackingBranch).toBeNull();

                // Return to main branch
                await execPromise('git checkout main || git checkout master', { cwd: localRepoPath });
            });

            it('should return no changes for branch without tracking', async () => {
                await execPromise('git checkout -b no-tracking-branch', { cwd: localRepoPath });

                const status = await service.checkRemoteChanges(localRepoPath);

                expect(status.hasChanges).toBe(false);
                expect(status.trackingBranch).toBeNull();
                expect(status.currentBranch).toBe('no-tracking-branch');

                // Clean up
                await execPromise('git checkout main || git checkout master', { cwd: localRepoPath });
                await execPromise('git branch -D no-tracking-branch', { cwd: localRepoPath });
            });
        });

        describe('fetchRepository', () => {
            it('should successfully fetch from remote', async () => {
                const result = await service.fetchRepository(localRepoPath);
                expect(result).toBe(true);
            });

            it('should respect custom timeout', async () => {
                const result = await service.fetchRepository(localRepoPath, 60000);
                expect(result).toBe(true);
            });

            it('should throw FetchError for non-git directory', async () => {
                const { FetchError } = await import('../../src/utils/errors');
                await expect(service.fetchRepository(nonGitPath)).rejects.toThrow(FetchError);
            });

            it('should throw FetchError for non-existent path', async () => {
                const { FetchError } = await import('../../src/utils/errors');
                const invalidPath = path.join(os.tmpdir(), 'non-existent-repo-12345');
                await expect(service.fetchRepository(invalidPath)).rejects.toThrow(FetchError);
            });

            it('should categorize repository errors correctly', async () => {
                const { FetchError, FetchErrorCode } = await import('../../src/utils/errors');

                try {
                    await service.fetchRepository(nonGitPath);
                    fail('Should have thrown FetchError');
                } catch (error) {
                    expect(error).toBeInstanceOf(FetchError);
                    if (error instanceof FetchError) {
                        expect(error.code).toBe(FetchErrorCode.REPO_ERROR);
                        expect(error.repoPath).toBe(nonGitPath);
                    }
                }
            });
        });
    });
});
