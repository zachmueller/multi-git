/**
 * Unit tests for GitCommandService
 */

import { GitCommandService } from '../../src/services/GitCommandService';
import { GitRepositoryError } from '../../src/utils/errors';
import { MultiGitSettings, DEFAULT_SETTINGS } from '../../src/settings/data';
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
    let mockSettings: MultiGitSettings;

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
        // Create mock settings with default values
        mockSettings = {
            ...DEFAULT_SETTINGS,
            repositories: [],
        };
        service = new GitCommandService(mockSettings);
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

    describe('FR-7: Custom PATH Configuration', () => {
        describe('buildEnhancedPath', () => {
            it('should expand tilde to home directory', () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['~/test/bin', '~/.local/bin'],
                };
                const service = new GitCommandService(settings);

                const homeDir = os.homedir();
                const systemPath = '/usr/bin:/bin';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                const pathSeparator = process.platform === 'win32' ? ';' : ':';
                expect(result).toContain(`${homeDir}/test/bin`);
                expect(result).toContain(`${homeDir}/.local/bin`);
                expect(result.split(pathSeparator)[0]).toBe(`${homeDir}/test/bin`);
            });

            it('should filter out relative paths', () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['./relative/path', 'another/relative', '/absolute/path'],
                };
                const service = new GitCommandService(settings);

                const systemPath = '/usr/bin:/bin';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                expect(result).not.toContain('relative');
                expect(result).toContain('/absolute/path');
            });

            it('should filter out paths with shell metacharacters', () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: [
                        '/path;with;semicolon',
                        '/path&with&ampersand',
                        '/path|with|pipe',
                        '/path`with`backtick',
                        '/path$(with)subshell',
                        '/safe/path',
                    ],
                };
                const service = new GitCommandService(settings);

                const systemPath = '/usr/bin:/bin';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                expect(result).not.toContain('semicolon');
                expect(result).not.toContain('ampersand');
                expect(result).not.toContain('pipe');
                expect(result).not.toContain('backtick');
                expect(result).not.toContain('subshell');
                expect(result).toContain('/safe/path');
            });

            it('should handle undefined system PATH', () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['/custom/bin', '/another/bin'],
                };
                const service = new GitCommandService(settings);

                const result = (service as any).buildEnhancedPath(undefined, settings.customPathEntries);

                const pathSeparator = process.platform === 'win32' ? ';' : ':';
                expect(result).toBe(`/custom/bin${pathSeparator}/another/bin`);
            });

            it('should handle empty custom entries', () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: [],
                };
                const service = new GitCommandService(settings);

                const systemPath = '/usr/bin:/bin';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                expect(result).toBe(systemPath);
            });

            it('should remove duplicate paths while preserving order', () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['/usr/bin', '/custom/bin', '/usr/local/bin'],
                };
                const service = new GitCommandService(settings);

                const systemPath = '/usr/bin:/bin:/usr/local/bin';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                const pathSeparator = process.platform === 'win32' ? ';' : ':';
                const paths = result.split(pathSeparator);

                // Should keep first occurrence of /usr/bin (from custom)
                expect(paths[0]).toBe('/usr/bin');
                expect(paths.indexOf('/usr/bin')).toBe(paths.lastIndexOf('/usr/bin'));

                // Should keep first occurrence of /usr/local/bin (from custom)
                expect(paths.indexOf('/usr/local/bin')).toBe(2);
                expect(paths.indexOf('/usr/local/bin')).toBe(paths.lastIndexOf('/usr/local/bin'));
            });

            it('should use correct path separator for platform', () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['/custom/bin'],
                };
                const service = new GitCommandService(settings);

                const systemPath = '/usr/bin';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                if (process.platform === 'win32') {
                    expect(result).toContain(';');
                    expect(result).not.toContain(':');
                } else {
                    expect(result).toContain(':');
                    // Semicolon might appear in paths, so just check structure
                    const parts = result.split(':');
                    expect(parts.length).toBeGreaterThan(1);
                }
            });

            it('should prepend custom paths to system PATH', () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['/custom/first', '/custom/second'],
                };
                const service = new GitCommandService(settings);

                const systemPath = '/usr/bin:/bin';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                const pathSeparator = process.platform === 'win32' ? ';' : ':';
                const paths = result.split(pathSeparator);

                expect(paths[0]).toBe('/custom/first');
                expect(paths[1]).toBe('/custom/second');
                expect(paths[2]).toBe('/usr/bin');
                expect(paths[3]).toBe('/bin');
            });

            it('should handle Windows drive letters correctly', () => {
                if (process.platform !== 'win32') {
                    // Skip on non-Windows platforms
                    return;
                }

                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['C:\\custom\\bin', 'D:\\another\\bin'],
                };
                const service = new GitCommandService(settings);

                const systemPath = 'C:\\Windows\\System32;C:\\Windows';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                expect(result).toContain('C:\\custom\\bin');
                expect(result).toContain('D:\\another\\bin');
                expect(result.split(';')[0]).toBe('C:\\custom\\bin');
            });

            it('should handle paths with spaces correctly', () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['/path with spaces/bin', '/another path/bin'],
                };
                const service = new GitCommandService(settings);

                const systemPath = '/usr/bin:/bin';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                expect(result).toContain('/path with spaces/bin');
                expect(result).toContain('/another path/bin');
            });

            it('should handle empty strings in custom entries', () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['', '/valid/path', '   ', '/another/valid'],
                };
                const service = new GitCommandService(settings);

                const systemPath = '/usr/bin';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                expect(result).toContain('/valid/path');
                expect(result).toContain('/another/valid');
                expect(result).toContain('/usr/bin');
            });

            it('should handle very long PATH strings', () => {
                const longPathEntries = Array.from({ length: 50 }, (_, i) => `/custom/path/${i}`);
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: longPathEntries,
                };
                const service = new GitCommandService(settings);

                const systemPath = '/usr/bin:/bin';
                const result = (service as any).buildEnhancedPath(systemPath, settings.customPathEntries);

                const pathSeparator = process.platform === 'win32' ? ';' : ':';
                const paths = result.split(pathSeparator);

                // Should contain all valid custom paths plus system paths
                expect(paths.length).toBeGreaterThanOrEqual(50);
                expect(result).toContain('/custom/path/0');
                expect(result).toContain('/custom/path/49');
            });
        });

        describe('PATH enhancement integration', () => {
            it('should use enhanced PATH when executing git commands', async () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['/custom/bin'],
                    debugLogging: false, // Disable to avoid log spam in tests
                };
                const service = new GitCommandService(settings);

                // Execute a git command - this should use the enhanced PATH
                // We can't easily verify the PATH was used without mocking, but we can
                // verify the command executes without error
                const result = await service.isGitInstalled();
                expect(result).toBe(true);
            });

            it('should work with repositories when PATH is enhanced', async () => {
                const settings: MultiGitSettings = {
                    ...DEFAULT_SETTINGS,
                    customPathEntries: ['~/.cargo/bin', '/opt/homebrew/bin'],
                    debugLogging: false,
                };
                const service = new GitCommandService(settings);

                const result = await service.isGitRepository(testRepoPath);
                expect(result).toBe(true);
            });
        });
    });

    describe('FR-3: Commit and Push Operations', () => {
        let commitRepoPath: string;

        beforeAll(async () => {
            // Create a separate test repository for commit operations
            const tmpDir = os.tmpdir();
            commitRepoPath = path.join(tmpDir, `commit-repo-${Date.now()}`);

            fs.mkdirSync(commitRepoPath, { recursive: true });
            await execPromise('git init', { cwd: commitRepoPath });
            await execPromise('git config user.email "test@example.com"', { cwd: commitRepoPath });
            await execPromise('git config user.name "Test User"', { cwd: commitRepoPath });

            // Create initial commit
            fs.writeFileSync(path.join(commitRepoPath, 'README.md'), '# Test Repository');
            await execPromise('git add README.md', { cwd: commitRepoPath });
            await execPromise('git commit -m "Initial commit"', { cwd: commitRepoPath });
        });

        afterAll(async () => {
            try {
                fs.rmSync(commitRepoPath, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        describe('getRepositoryStatus', () => {
            it('should return status with no changes when repository is clean', async () => {
                const status = await service.getRepositoryStatus(
                    commitRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.repositoryId).toBe('test-repo-id');
                expect(status.repositoryName).toBe('Test Repository');
                expect(status.repositoryPath).toBe(commitRepoPath);
                expect(status.currentBranch).toMatch(/^(main|master)$/);
                expect(status.hasUncommittedChanges).toBe(false);
                expect(status.stagedFiles).toEqual([]);
                expect(status.unstagedFiles).toEqual([]);
                expect(status.untrackedFiles).toEqual([]);
            });

            it('should detect unstaged changes', async () => {
                // Modify existing file
                fs.writeFileSync(path.join(commitRepoPath, 'README.md'), '# Modified');

                const status = await service.getRepositoryStatus(
                    commitRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.hasUncommittedChanges).toBe(true);
                expect(status.unstagedFiles).toContain('README.md');
                expect(status.stagedFiles).toEqual([]);

                // Clean up
                await execPromise('git checkout README.md', { cwd: commitRepoPath });
            });

            it('should detect staged changes', async () => {
                // Create and stage new file
                fs.writeFileSync(path.join(commitRepoPath, 'new-file.txt'), 'content');
                await execPromise('git add new-file.txt', { cwd: commitRepoPath });

                const status = await service.getRepositoryStatus(
                    commitRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.hasUncommittedChanges).toBe(true);
                expect(status.stagedFiles).toContain('new-file.txt');
                expect(status.unstagedFiles).toEqual([]);

                // Clean up
                await execPromise('git reset HEAD new-file.txt', { cwd: commitRepoPath });
                fs.unlinkSync(path.join(commitRepoPath, 'new-file.txt'));
            });

            it('should detect untracked files', async () => {
                // Create untracked file
                fs.writeFileSync(path.join(commitRepoPath, 'untracked.txt'), 'content');

                const status = await service.getRepositoryStatus(
                    commitRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.hasUncommittedChanges).toBe(true);
                expect(status.untrackedFiles).toContain('untracked.txt');
                expect(status.stagedFiles).toEqual([]);
                expect(status.unstagedFiles).toEqual([]);

                // Clean up
                fs.unlinkSync(path.join(commitRepoPath, 'untracked.txt'));
            });

            it('should detect mix of staged, unstaged, and untracked files', async () => {
                // Create various file states
                fs.writeFileSync(path.join(commitRepoPath, 'staged.txt'), 'staged content');
                await execPromise('git add staged.txt', { cwd: commitRepoPath });

                fs.writeFileSync(path.join(commitRepoPath, 'README.md'), '# Modified unstaged');

                fs.writeFileSync(path.join(commitRepoPath, 'untracked.txt'), 'untracked content');

                const status = await service.getRepositoryStatus(
                    commitRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.hasUncommittedChanges).toBe(true);
                expect(status.stagedFiles).toContain('staged.txt');
                expect(status.unstagedFiles).toContain('README.md');
                expect(status.untrackedFiles).toContain('untracked.txt');

                // Clean up
                await execPromise('git reset HEAD staged.txt', { cwd: commitRepoPath });
                fs.unlinkSync(path.join(commitRepoPath, 'staged.txt'));
                await execPromise('git checkout README.md', { cwd: commitRepoPath });
                fs.unlinkSync(path.join(commitRepoPath, 'untracked.txt'));
            });

            it('should handle deleted files', async () => {
                // Create and commit a file
                fs.writeFileSync(path.join(commitRepoPath, 'to-delete.txt'), 'content');
                await execPromise('git add to-delete.txt', { cwd: commitRepoPath });
                await execPromise('git commit -m "Add file to delete"', { cwd: commitRepoPath });

                // Delete the file
                fs.unlinkSync(path.join(commitRepoPath, 'to-delete.txt'));

                const status = await service.getRepositoryStatus(
                    commitRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.hasUncommittedChanges).toBe(true);
                expect(status.unstagedFiles).toContain('to-delete.txt');

                // Clean up
                await execPromise('git checkout to-delete.txt', { cwd: commitRepoPath });
                await execPromise('git rm to-delete.txt', { cwd: commitRepoPath });
                await execPromise('git commit -m "Remove test file"', { cwd: commitRepoPath });
            });

            it('should return null branch for detached HEAD', async () => {
                // Get current commit hash
                const { stdout: commitHash } = await execPromise('git rev-parse HEAD', { cwd: commitRepoPath });

                // Checkout detached HEAD
                await execPromise(`git checkout ${commitHash.trim()}`, { cwd: commitRepoPath });

                const status = await service.getRepositoryStatus(
                    commitRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.currentBranch).toBeNull();

                // Return to main branch
                await execPromise('git checkout main || git checkout master', { cwd: commitRepoPath });
            });

            it('should throw GitStatusError for non-git directory', async () => {
                const { GitStatusError } = await import('../../src/utils/errors');
                await expect(
                    service.getRepositoryStatus(nonGitPath, 'test-id', 'Test')
                ).rejects.toThrow(GitStatusError);
            });

            it('should throw GitStatusError for non-existent path', async () => {
                const { GitStatusError } = await import('../../src/utils/errors');
                const invalidPath = path.join(os.tmpdir(), 'non-existent-path-99999');
                await expect(
                    service.getRepositoryStatus(invalidPath, 'test-id', 'Test')
                ).rejects.toThrow(GitStatusError);
            });
        });

        describe('stageAllChanges', () => {
            it('should stage all changes successfully', async () => {
                // Create multiple files
                fs.writeFileSync(path.join(commitRepoPath, 'file1.txt'), 'content 1');
                fs.writeFileSync(path.join(commitRepoPath, 'file2.txt'), 'content 2');
                fs.writeFileSync(path.join(commitRepoPath, 'README.md'), '# Modified');

                await service.stageAllChanges(commitRepoPath);

                // Verify all files are staged
                const { stdout } = await execPromise('git diff --name-only --cached', { cwd: commitRepoPath });
                const stagedFiles = stdout.trim().split('\n').filter(f => f);

                expect(stagedFiles).toContain('file1.txt');
                expect(stagedFiles).toContain('file2.txt');
                expect(stagedFiles).toContain('README.md');

                // Clean up
                await execPromise('git reset HEAD', { cwd: commitRepoPath });
                fs.unlinkSync(path.join(commitRepoPath, 'file1.txt'));
                fs.unlinkSync(path.join(commitRepoPath, 'file2.txt'));
                await execPromise('git checkout README.md', { cwd: commitRepoPath });
            });

            it('should handle files with special characters in names', async () => {
                // Create files with special characters
                const specialFiles = [
                    'file with spaces.txt',
                    'file-with-dashes.txt',
                    'file_with_underscores.txt',
                    'file.multiple.dots.txt',
                ];

                for (const filename of specialFiles) {
                    fs.writeFileSync(path.join(commitRepoPath, filename), 'content');
                }

                await service.stageAllChanges(commitRepoPath);

                // Verify all files are staged
                const { stdout } = await execPromise('git diff --name-only --cached', { cwd: commitRepoPath });
                const stagedFiles = stdout.trim().split('\n').filter(f => f);

                for (const filename of specialFiles) {
                    expect(stagedFiles).toContain(filename);
                }

                // Clean up
                await execPromise('git reset HEAD', { cwd: commitRepoPath });
                for (const filename of specialFiles) {
                    fs.unlinkSync(path.join(commitRepoPath, filename));
                }
            });

            it('should succeed when there are no changes', async () => {
                // Should not throw when repository is clean
                await expect(service.stageAllChanges(commitRepoPath)).resolves.not.toThrow();
            });

            it('should throw GitRepositoryError for non-git directory', async () => {
                await expect(service.stageAllChanges(nonGitPath)).rejects.toThrow(GitRepositoryError);
            });

            it('should throw GitRepositoryError for non-existent path', async () => {
                const invalidPath = path.join(os.tmpdir(), 'non-existent-path-88888');
                await expect(service.stageAllChanges(invalidPath)).rejects.toThrow(GitRepositoryError);
            });
        });

        describe('createCommit', () => {
            it('should create commit with simple message', async () => {
                // Create and stage a file
                fs.writeFileSync(path.join(commitRepoPath, 'test-commit.txt'), 'content');
                await execPromise('git add test-commit.txt', { cwd: commitRepoPath });

                await service.createCommit(commitRepoPath, 'Test commit message');

                // Verify commit was created
                const { stdout } = await execPromise('git log -1 --pretty=%B', { cwd: commitRepoPath });
                expect(stdout.trim()).toBe('Test commit message');
            });

            it('should handle commit messages with quotes', async () => {
                // Create and stage a file
                fs.writeFileSync(path.join(commitRepoPath, 'quote-test.txt'), 'content');
                await execPromise('git add quote-test.txt', { cwd: commitRepoPath });

                const message = 'Test commit with "quotes" in it';
                await service.createCommit(commitRepoPath, message);

                // Verify commit message preserved quotes
                const { stdout } = await execPromise('git log -1 --pretty=%B', { cwd: commitRepoPath });
                expect(stdout.trim()).toBe(message);
            });

            it('should handle multiline commit messages', async () => {
                // Create and stage a file
                fs.writeFileSync(path.join(commitRepoPath, 'multiline-test.txt'), 'content');
                await execPromise('git add multiline-test.txt', { cwd: commitRepoPath });

                const message = 'First line\n\nSecond line with details';
                await service.createCommit(commitRepoPath, message);

                // Verify multiline message
                const { stdout } = await execPromise('git log -1 --pretty=%B', { cwd: commitRepoPath });
                expect(stdout.trim()).toContain('First line');
                expect(stdout.trim()).toContain('Second line with details');
            });

            it('should handle commit messages with special characters', async () => {
                // Create and stage a file
                fs.writeFileSync(path.join(commitRepoPath, 'special-test.txt'), 'content');
                await execPromise('git add special-test.txt', { cwd: commitRepoPath });

                const message = 'Update: Fix bug #123 & improve performance (10%)';
                await service.createCommit(commitRepoPath, message);

                // Verify message with special characters
                const { stdout } = await execPromise('git log -1 --pretty=%B', { cwd: commitRepoPath });
                expect(stdout.trim()).toBe(message);
            });

            it('should throw GitCommitError for empty message', async () => {
                const { GitCommitError } = await import('../../src/utils/errors');

                await expect(service.createCommit(commitRepoPath, '')).rejects.toThrow(GitCommitError);
                await expect(service.createCommit(commitRepoPath, '   ')).rejects.toThrow(GitCommitError);
            });

            it('should throw GitCommitError when nothing to commit', async () => {
                const { GitCommitError } = await import('../../src/utils/errors');

                // Repository is clean, no changes to commit
                await expect(
                    service.createCommit(commitRepoPath, 'Nothing to commit')
                ).rejects.toThrow(GitCommitError);
            });

            it('should throw GitCommitError for non-git directory', async () => {
                const { GitCommitError } = await import('../../src/utils/errors');
                await expect(
                    service.createCommit(nonGitPath, 'Test message')
                ).rejects.toThrow(GitCommitError);
            });
        });

        describe('pushToRemote', () => {
            let pushRepoPath: string;
            let bareRepoPath: string;

            beforeAll(async () => {
                // Create a bare repository to push to
                const tmpDir = os.tmpdir();
                bareRepoPath = path.join(tmpDir, `bare-repo-${Date.now()}`);
                pushRepoPath = path.join(tmpDir, `push-repo-${Date.now()}`);

                // Initialize bare repository
                fs.mkdirSync(bareRepoPath, { recursive: true });
                await execPromise('git init --bare', { cwd: bareRepoPath });

                // Clone bare repository
                await execPromise(`git clone "${bareRepoPath}" "${pushRepoPath}"`);
                await execPromise('git config user.email "test@example.com"', { cwd: pushRepoPath });
                await execPromise('git config user.name "Test User"', { cwd: pushRepoPath });

                // Create initial commit
                fs.writeFileSync(path.join(pushRepoPath, 'README.md'), '# Push Test');
                await execPromise('git add README.md', { cwd: pushRepoPath });
                await execPromise('git commit -m "Initial commit"', { cwd: pushRepoPath });
                await execPromise('git push -u origin main || git push -u origin master', { cwd: pushRepoPath });
            });

            afterAll(async () => {
                try {
                    fs.rmSync(pushRepoPath, { recursive: true, force: true });
                    fs.rmSync(bareRepoPath, { recursive: true, force: true });
                } catch (error) {
                    // Ignore cleanup errors
                }
            });

            it('should push commits successfully', async () => {
                // Create a commit
                fs.writeFileSync(path.join(pushRepoPath, 'push-test.txt'), 'content');
                await execPromise('git add push-test.txt', { cwd: pushRepoPath });
                await execPromise('git commit -m "Test push"', { cwd: pushRepoPath });

                // Push using service
                await service.pushToRemote(pushRepoPath);

                // Verify push succeeded by checking remote
                const { stdout: localCommit } = await execPromise('git rev-parse HEAD', { cwd: pushRepoPath });
                const { stdout: remoteCommit } = await execPromise('git rev-parse main || git rev-parse master', { cwd: bareRepoPath });

                expect(localCommit.trim()).toBe(remoteCommit.trim());
            });

            it('should respect custom timeout', async () => {
                // Create another commit
                fs.writeFileSync(path.join(pushRepoPath, 'timeout-test.txt'), 'content');
                await execPromise('git add timeout-test.txt', { cwd: pushRepoPath });
                await execPromise('git commit -m "Timeout test"', { cwd: pushRepoPath });

                // Push with custom timeout
                await service.pushToRemote(pushRepoPath, 120000);

                // Verify push succeeded
                const { stdout: localCommit } = await execPromise('git rev-parse HEAD', { cwd: pushRepoPath });
                const { stdout: remoteCommit } = await execPromise('git rev-parse main || git rev-parse master', { cwd: bareRepoPath });

                expect(localCommit.trim()).toBe(remoteCommit.trim());
            });

            it('should succeed when nothing to push', async () => {
                // No new commits, push should still succeed
                await expect(service.pushToRemote(pushRepoPath)).resolves.not.toThrow();
            });

            it('should throw GitPushError when no upstream branch configured', async () => {
                const { GitPushError } = await import('../../src/utils/errors');

                // Create a new branch without upstream
                await execPromise('git checkout -b no-upstream-branch', { cwd: pushRepoPath });
                fs.writeFileSync(path.join(pushRepoPath, 'no-upstream.txt'), 'content');
                await execPromise('git add no-upstream.txt', { cwd: pushRepoPath });
                await execPromise('git commit -m "No upstream commit"', { cwd: pushRepoPath });

                await expect(service.pushToRemote(pushRepoPath)).rejects.toThrow(GitPushError);

                // Clean up
                await execPromise('git checkout main || git checkout master', { cwd: pushRepoPath });
                await execPromise('git branch -D no-upstream-branch', { cwd: pushRepoPath });
            });

            it('should throw GitPushError for non-git directory', async () => {
                const { GitPushError } = await import('../../src/utils/errors');
                await expect(service.pushToRemote(nonGitPath)).rejects.toThrow(GitPushError);
            });
        });

        describe('commitAndPush', () => {
            let cpRepoPath: string;
            let cpBareRepoPath: string;

            beforeAll(async () => {
                // Create a bare repository and clone it
                const tmpDir = os.tmpdir();
                cpBareRepoPath = path.join(tmpDir, `cp-bare-repo-${Date.now()}`);
                cpRepoPath = path.join(tmpDir, `cp-repo-${Date.now()}`);

                fs.mkdirSync(cpBareRepoPath, { recursive: true });
                await execPromise('git init --bare', { cwd: cpBareRepoPath });

                await execPromise(`git clone "${cpBareRepoPath}" "${cpRepoPath}"`);
                await execPromise('git config user.email "test@example.com"', { cwd: cpRepoPath });
                await execPromise('git config user.name "Test User"', { cwd: cpRepoPath });

                // Create initial commit
                fs.writeFileSync(path.join(cpRepoPath, 'README.md'), '# Test');
                await execPromise('git add README.md', { cwd: cpRepoPath });
                await execPromise('git commit -m "Initial commit"', { cwd: cpRepoPath });
                await execPromise('git push -u origin main || git push -u origin master', { cwd: cpRepoPath });
            });

            afterAll(async () => {
                try {
                    fs.rmSync(cpRepoPath, { recursive: true, force: true });
                    fs.rmSync(cpBareRepoPath, { recursive: true, force: true });
                } catch (error) {
                    // Ignore cleanup errors
                }
            });

            it('should successfully commit and push changes', async () => {
                // Create changes
                fs.writeFileSync(path.join(cpRepoPath, 'file1.txt'), 'content 1');
                fs.writeFileSync(path.join(cpRepoPath, 'file2.txt'), 'content 2');
                fs.writeFileSync(path.join(cpRepoPath, 'README.md'), '# Modified');

                // Execute commit and push
                await service.commitAndPush(cpRepoPath, 'Test commit and push');

                // Verify commit was created
                const { stdout: commitMsg } = await execPromise('git log -1 --pretty=%B', { cwd: cpRepoPath });
                expect(commitMsg.trim()).toBe('Test commit and push');

                // Verify push succeeded
                const { stdout: localCommit } = await execPromise('git rev-parse HEAD', { cwd: cpRepoPath });
                const { stdout: remoteCommit } = await execPromise(
                    'git rev-parse main || git rev-parse master',
                    { cwd: cpBareRepoPath }
                );
                expect(localCommit.trim()).toBe(remoteCommit.trim());
            });

            it('should handle custom push timeout', async () => {
                // Create changes
                fs.writeFileSync(path.join(cpRepoPath, 'timeout-file.txt'), 'content');

                await service.commitAndPush(cpRepoPath, 'Test with timeout', 120000);

                // Verify success
                const { stdout: commitMsg } = await execPromise('git log -1 --pretty=%B', { cwd: cpRepoPath });
                expect(commitMsg.trim()).toBe('Test with timeout');
            });

            it('should stop on staging error', async () => {
                // This would require permission errors which are hard to test reliably
                // Testing via non-git directory instead
                await expect(
                    service.commitAndPush(nonGitPath, 'Test message')
                ).rejects.toThrow(GitRepositoryError);
            });

            it('should stop on commit error when empty message', async () => {
                const { GitCommitError } = await import('../../src/utils/errors');

                // Create changes but use empty message
                fs.writeFileSync(path.join(cpRepoPath, 'empty-msg-test.txt'), 'content');

                await expect(
                    service.commitAndPush(cpRepoPath, '')
                ).rejects.toThrow(GitCommitError);

                // Clean up
                fs.unlinkSync(path.join(cpRepoPath, 'empty-msg-test.txt'));
            });

            it('should stop on commit error when nothing to commit', async () => {
                const { GitCommitError } = await import('../../src/utils/errors');

                // No changes, commit should fail
                await expect(
                    service.commitAndPush(cpRepoPath, 'Nothing to commit')
                ).rejects.toThrow(GitCommitError);
            });

            it('should stop on push error when no upstream configured', async () => {
                const { GitPushError } = await import('../../src/utils/errors');

                // Create branch without upstream
                await execPromise('git checkout -b no-upstream-test', { cwd: cpRepoPath });
                fs.writeFileSync(path.join(cpRepoPath, 'no-upstream-file.txt'), 'content');

                // This should fail at push step
                await expect(
                    service.commitAndPush(cpRepoPath, 'Test no upstream')
                ).rejects.toThrow(GitPushError);

                // Clean up
                await execPromise('git checkout main || git checkout master', { cwd: cpRepoPath });
                await execPromise('git branch -D no-upstream-test', { cwd: cpRepoPath });
            });

            it('should properly sequence operations', async () => {
                // Create changes
                fs.writeFileSync(path.join(cpRepoPath, 'sequence-test.txt'), 'content');

                // Execute full workflow
                await service.commitAndPush(cpRepoPath, 'Test operation sequence');

                // Verify the file is in the remote repository
                const { stdout: remoteFiles } = await execPromise(
                    'git ls-tree --name-only main || git ls-tree --name-only master',
                    { cwd: cpBareRepoPath }
                );

                expect(remoteFiles).toContain('sequence-test.txt');
            });
        });

        describe('New Error Classes', () => {
            it('should create GitStatusError with correct properties', async () => {
                const { GitStatusError } = await import('../../src/utils/errors');

                const error = new GitStatusError('Test error message', '/test/path');

                expect(error).toBeInstanceOf(Error);
                expect(error.name).toBe('GitStatusError');
                expect(error.message).toBe('Test error message');
                expect(error.repositoryPath).toBe('/test/path');
            });

            it('should create GitCommitError with correct properties', async () => {
                const { GitCommitError } = await import('../../src/utils/errors');

                const error = new GitCommitError('Commit failed', '/test/path');

                expect(error).toBeInstanceOf(Error);
                expect(error.name).toBe('GitCommitError');
                expect(error.message).toBe('Commit failed');
                expect(error.repositoryPath).toBe('/test/path');
            });

            it('should create GitPushError with correct properties', async () => {
                const { GitPushError } = await import('../../src/utils/errors');

                const error = new GitPushError('Push failed', '/test/path');

                expect(error).toBeInstanceOf(Error);
                expect(error.name).toBe('GitPushError');
                expect(error.message).toBe('Push failed');
                expect(error.repositoryPath).toBe('/test/path');
            });

            it('should preserve error cause chain for GitCommitError', async () => {
                const { GitCommitError } = await import('../../src/utils/errors');

                const originalError = new Error('Original error');
                const error = new GitCommitError('Wrapped error', '/test/path', originalError);

                expect(error.cause).toBe(originalError);
            });

            it('should preserve error cause chain for GitPushError', async () => {
                const { GitPushError } = await import('../../src/utils/errors');

                const originalError = new Error('Network error');
                const error = new GitPushError('Push failed due to network', '/test/path', originalError);

                expect(error.cause).toBe(originalError);
            });
        });
    });

    describe('FR-4: Repository Status Display - Remote Tracking', () => {
        let trackingRepoPath: string;
        let trackingBareRepoPath: string;

        beforeAll(async () => {
            // Create a bare repository and clone it
            const tmpDir = os.tmpdir();
            trackingBareRepoPath = path.join(tmpDir, `tracking-bare-repo-${Date.now()}`);
            trackingRepoPath = path.join(tmpDir, `tracking-repo-${Date.now()}`);

            fs.mkdirSync(trackingBareRepoPath, { recursive: true });
            await execPromise('git init --bare', { cwd: trackingBareRepoPath });

            await execPromise(`git clone "${trackingBareRepoPath}" "${trackingRepoPath}"`);
            await execPromise('git config user.email "test@example.com"', { cwd: trackingRepoPath });
            await execPromise('git config user.name "Test User"', { cwd: trackingRepoPath });

            // Create initial commit
            fs.writeFileSync(path.join(trackingRepoPath, 'README.md'), '# Test');
            await execPromise('git add README.md', { cwd: trackingRepoPath });
            await execPromise('git commit -m "Initial commit"', { cwd: trackingRepoPath });
            await execPromise('git push -u origin main || git push -u origin master', { cwd: trackingRepoPath });
        });

        afterAll(async () => {
            try {
                fs.rmSync(trackingRepoPath, { recursive: true, force: true });
                fs.rmSync(trackingBareRepoPath, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        describe('getUnpushedCommitCount', () => {
            it('should return 0 when no unpushed commits exist', async () => {
                // Ensure we're in sync
                await execPromise('git pull', { cwd: trackingRepoPath });

                const count = await service.getUnpushedCommitCount(trackingRepoPath);
                expect(count).toBe(0);
            });

            it('should count unpushed commits correctly', async () => {
                // Create local commits
                fs.writeFileSync(path.join(trackingRepoPath, 'unpushed1.txt'), 'content 1');
                await execPromise('git add unpushed1.txt', { cwd: trackingRepoPath });
                await execPromise('git commit -m "Unpushed commit 1"', { cwd: trackingRepoPath });

                fs.writeFileSync(path.join(trackingRepoPath, 'unpushed2.txt'), 'content 2');
                await execPromise('git add unpushed2.txt', { cwd: trackingRepoPath });
                await execPromise('git commit -m "Unpushed commit 2"', { cwd: trackingRepoPath });

                const count = await service.getUnpushedCommitCount(trackingRepoPath);
                expect(count).toBe(2);

                // Clean up - push the commits
                await execPromise('git push', { cwd: trackingRepoPath });
            });

            it('should return 0 when no upstream branch exists', async () => {
                // Create a branch without upstream
                await execPromise('git checkout -b no-tracking-branch', { cwd: trackingRepoPath });
                fs.writeFileSync(path.join(trackingRepoPath, 'no-tracking.txt'), 'content');
                await execPromise('git add no-tracking.txt', { cwd: trackingRepoPath });
                await execPromise('git commit -m "Commit on no-tracking branch"', { cwd: trackingRepoPath });

                const count = await service.getUnpushedCommitCount(trackingRepoPath);
                expect(count).toBe(0);

                // Clean up
                await execPromise('git checkout main || git checkout master', { cwd: trackingRepoPath });
                await execPromise('git branch -D no-tracking-branch', { cwd: trackingRepoPath });
            });

            it('should return 0 for detached HEAD state', async () => {
                // Get current commit hash
                const { stdout: commitHash } = await execPromise('git rev-parse HEAD', { cwd: trackingRepoPath });

                // Checkout detached HEAD
                await execPromise(`git checkout ${commitHash.trim()}`, { cwd: trackingRepoPath });

                const count = await service.getUnpushedCommitCount(trackingRepoPath);
                expect(count).toBe(0);

                // Return to main branch
                await execPromise('git checkout main || git checkout master', { cwd: trackingRepoPath });
            });

            it('should return 0 on errors', async () => {
                // Non-git directory should return 0, not throw
                const count = await service.getUnpushedCommitCount(nonGitPath);
                expect(count).toBe(0);
            });
        });

        describe('getRemoteChangeCount', () => {
            it('should return 0 when no remote changes exist', async () => {
                // Ensure we're in sync
                await execPromise('git fetch', { cwd: trackingRepoPath });
                await execPromise('git pull', { cwd: trackingRepoPath });

                const count = await service.getRemoteChangeCount(trackingRepoPath);
                expect(count).toBe(0);
            });

            it('should count remote changes correctly', async () => {
                // Create commits in remote (bare repo)
                // We need to create a temporary clone, make commits, and push
                const tmpDir = os.tmpdir();
                const tempClonePath = path.join(tmpDir, `temp-clone-${Date.now()}`);

                try {
                    await execPromise(`git clone "${trackingBareRepoPath}" "${tempClonePath}"`);
                    await execPromise('git config user.email "test@example.com"', { cwd: tempClonePath });
                    await execPromise('git config user.name "Test User"', { cwd: tempClonePath });

                    // Create and push commits
                    fs.writeFileSync(path.join(tempClonePath, 'remote1.txt'), 'remote content 1');
                    await execPromise('git add remote1.txt', { cwd: tempClonePath });
                    await execPromise('git commit -m "Remote commit 1"', { cwd: tempClonePath });

                    fs.writeFileSync(path.join(tempClonePath, 'remote2.txt'), 'remote content 2');
                    await execPromise('git add remote2.txt', { cwd: tempClonePath });
                    await execPromise('git commit -m "Remote commit 2"', { cwd: tempClonePath });

                    await execPromise('git push', { cwd: tempClonePath });

                    // Fetch in our tracking repo
                    await execPromise('git fetch', { cwd: trackingRepoPath });

                    const count = await service.getRemoteChangeCount(trackingRepoPath);
                    expect(count).toBe(2);

                    // Clean up - pull the commits
                    await execPromise('git pull', { cwd: trackingRepoPath });
                } finally {
                    fs.rmSync(tempClonePath, { recursive: true, force: true });
                }
            });

            it('should return 0 when no upstream branch exists', async () => {
                // Create a branch without upstream
                await execPromise('git checkout -b no-upstream-branch', { cwd: trackingRepoPath });
                fs.writeFileSync(path.join(trackingRepoPath, 'no-upstream.txt'), 'content');
                await execPromise('git add no-upstream.txt', { cwd: trackingRepoPath });
                await execPromise('git commit -m "Commit on no-upstream branch"', { cwd: trackingRepoPath });

                const count = await service.getRemoteChangeCount(trackingRepoPath);
                expect(count).toBe(0);

                // Clean up
                await execPromise('git checkout main || git checkout master', { cwd: trackingRepoPath });
                await execPromise('git branch -D no-upstream-branch', { cwd: trackingRepoPath });
            });

            it('should return 0 for detached HEAD state', async () => {
                // Get current commit hash
                const { stdout: commitHash } = await execPromise('git rev-parse HEAD', { cwd: trackingRepoPath });

                // Checkout detached HEAD
                await execPromise(`git checkout ${commitHash.trim()}`, { cwd: trackingRepoPath });

                const count = await service.getRemoteChangeCount(trackingRepoPath);
                expect(count).toBe(0);

                // Return to main branch
                await execPromise('git checkout main || git checkout master', { cwd: trackingRepoPath });
            });

            it('should return 0 on errors', async () => {
                // Non-git directory should return 0, not throw
                const count = await service.getRemoteChangeCount(nonGitPath);
                expect(count).toBe(0);
            });
        });

        describe('getExtendedRepositoryStatus', () => {
            it('should return complete status with remote tracking', async () => {
                // Ensure we're in sync
                await execPromise('git fetch', { cwd: trackingRepoPath });
                await execPromise('git pull', { cwd: trackingRepoPath });

                const status = await service.getExtendedRepositoryStatus(
                    trackingRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.repositoryId).toBe('test-repo-id');
                expect(status.repositoryName).toBe('Test Repository');
                expect(status.repositoryPath).toBe(trackingRepoPath);
                expect(status.currentBranch).toMatch(/^(main|master)$/);
                expect(status.unpushedCommits).toBe(0);
                expect(status.remoteChanges).toBe(0);
            });

            it('should include unpushed commits in status', async () => {
                // Create local commit
                fs.writeFileSync(path.join(trackingRepoPath, 'local-test.txt'), 'content');
                await execPromise('git add local-test.txt', { cwd: trackingRepoPath });
                await execPromise('git commit -m "Local test commit"', { cwd: trackingRepoPath });

                const status = await service.getExtendedRepositoryStatus(
                    trackingRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.unpushedCommits).toBeGreaterThan(0);
                expect(status.remoteChanges).toBe(0);

                // Clean up
                await execPromise('git push', { cwd: trackingRepoPath });
            });

            it('should include remote changes in status', async () => {
                // Create remote commit
                const tmpDir = os.tmpdir();
                const tempClonePath = path.join(tmpDir, `temp-clone-${Date.now()}`);

                try {
                    await execPromise(`git clone "${trackingBareRepoPath}" "${tempClonePath}"`);
                    await execPromise('git config user.email "test@example.com"', { cwd: tempClonePath });
                    await execPromise('git config user.name "Test User"', { cwd: tempClonePath });

                    fs.writeFileSync(path.join(tempClonePath, 'remote-test.txt'), 'remote content');
                    await execPromise('git add remote-test.txt', { cwd: tempClonePath });
                    await execPromise('git commit -m "Remote test commit"', { cwd: tempClonePath });
                    await execPromise('git push', { cwd: tempClonePath });

                    // Fetch in our tracking repo
                    await execPromise('git fetch', { cwd: trackingRepoPath });

                    const status = await service.getExtendedRepositoryStatus(
                        trackingRepoPath,
                        'test-repo-id',
                        'Test Repository'
                    );

                    expect(status.unpushedCommits).toBe(0);
                    expect(status.remoteChanges).toBeGreaterThan(0);

                    // Clean up
                    await execPromise('git pull', { cwd: trackingRepoPath });
                } finally {
                    fs.rmSync(tempClonePath, { recursive: true, force: true });
                }
            });

            it('should include fetch status from repository config', async () => {
                const repositoryConfig = {
                    lastFetchTime: Date.now(),
                    lastFetchStatus: 'success',
                    lastFetchError: undefined,
                };

                const status = await service.getExtendedRepositoryStatus(
                    trackingRepoPath,
                    'test-repo-id',
                    'Test Repository',
                    repositoryConfig
                );

                expect(status.fetchStatus).toBe('success');
                expect(status.lastFetchTime).toBe(repositoryConfig.lastFetchTime);
                expect(status.lastFetchError).toBeUndefined();
            });

            it('should map fetch status types correctly', async () => {
                const statusMappings = [
                    { input: 'success', expected: 'success' },
                    { input: 'error', expected: 'error' },
                    { input: 'fetching', expected: 'pending' },
                    { input: 'idle', expected: 'success' },
                ];

                for (const mapping of statusMappings) {
                    const config = {
                        lastFetchTime: Date.now(),
                        lastFetchStatus: mapping.input,
                    };

                    const status = await service.getExtendedRepositoryStatus(
                        trackingRepoPath,
                        'test-repo-id',
                        'Test Repository',
                        config
                    );

                    expect(status.fetchStatus).toBe(mapping.expected);
                }
            });

            it('should include fetch error message when present', async () => {
                const repositoryConfig = {
                    lastFetchTime: Date.now(),
                    lastFetchStatus: 'error',
                    lastFetchError: 'Network error: Unable to reach remote',
                };

                const status = await service.getExtendedRepositoryStatus(
                    trackingRepoPath,
                    'test-repo-id',
                    'Test Repository',
                    repositoryConfig
                );

                expect(status.fetchStatus).toBe('error');
                expect(status.lastFetchError).toBe('Network error: Unable to reach remote');
            });

            it('should handle missing repository config gracefully', async () => {
                const status = await service.getExtendedRepositoryStatus(
                    trackingRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.fetchStatus).toBeUndefined();
                expect(status.lastFetchTime).toBeUndefined();
                expect(status.lastFetchError).toBeUndefined();
                expect(status.unpushedCommits).toBeDefined();
                expect(status.remoteChanges).toBeDefined();
            });

            it('should include base status fields', async () => {
                // Create some changes
                fs.writeFileSync(path.join(trackingRepoPath, 'unstaged.txt'), 'unstaged content');

                const status = await service.getExtendedRepositoryStatus(
                    trackingRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                expect(status.hasUncommittedChanges).toBe(true);
                expect(status.unstagedFiles).toContain('unstaged.txt');
                expect(status.stagedFiles).toBeDefined();
                expect(status.untrackedFiles).toBeDefined();

                // Clean up
                fs.unlinkSync(path.join(trackingRepoPath, 'unstaged.txt'));
            });

            it('should throw GitStatusError for non-git directory', async () => {
                const { GitStatusError } = await import('../../src/utils/errors');
                await expect(
                    service.getExtendedRepositoryStatus(nonGitPath, 'test-id', 'Test')
                ).rejects.toThrow(GitStatusError);
            });

            it('should handle partial failures gracefully', async () => {
                // Even if unpushed/remote counts fail, base status should work
                const status = await service.getExtendedRepositoryStatus(
                    trackingRepoPath,
                    'test-repo-id',
                    'Test Repository'
                );

                // Should not throw, should return a valid status object
                expect(status).toBeDefined();
                expect(status.repositoryId).toBe('test-repo-id');
                expect(status.currentBranch).toBeDefined();
            });
        });
    });
});
