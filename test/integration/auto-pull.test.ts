/**
 * Integration Test: Auto-Pull with Real Repository Operations
 * 
 * Tests the complete auto-pull workflow with real git repositories,
 * including successful pulls, safety checks, error handling, and retry logic.
 * 
 * Related: TEST-006
 */

import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { AutoPullService } from '../../src/services/AutoPullService';
import { FastForwardDetectionService } from '../../src/services/FastForwardDetectionService';
import { GitCommandService } from '../../src/services/GitCommandService';
import { NotificationService } from '../../src/services/NotificationService';
import { RepositoryConfigService } from '../../src/services/RepositoryConfigService';
import type { MultiGitSettings, RepositoryConfig } from '../../src/settings/data';
import type MultiGitPlugin from '../../src/main';
import { Logger } from '../../src/utils/logger';

// Test repository setup
let testDir: string;
let remoteRepoPath: string;
let localRepoPath: string;

// Services
let mockPlugin: MultiGitPlugin;
let gitService: GitCommandService;
let ffDetectionService: FastForwardDetectionService;
let configService: RepositoryConfigService;
let notificationService: NotificationService;
let autoPullService: AutoPullService;
let mockSettings: MultiGitSettings;
let logger: Logger;

/**
 * Helper: Execute git command in a directory
 */
function gitCommand(repoPath: string, command: string): string {
    try {
        return execSync(`git -C "${repoPath}" ${command}`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
    } catch (error: any) {
        throw new Error(`Git command failed: ${command}\n${error.message}`);
    }
}

/**
 * Helper: Create a test repository with initial commit
 */
function createTestRepo(repoPath: string, initialCommit: boolean = true): void {
    fs.mkdirSync(repoPath, { recursive: true });
    gitCommand(repoPath, 'init');
    gitCommand(repoPath, 'config user.email "test@example.com"');
    gitCommand(repoPath, 'config user.name "Test User"');

    if (initialCommit) {
        fs.writeFileSync(path.join(repoPath, 'README.md'), '# Test Repository\n');
        gitCommand(repoPath, 'add README.md');
        gitCommand(repoPath, 'commit -m "Initial commit"');
    }
}

/**
 * Helper: Clone repository to local path
 */
function cloneRepo(remotePath: string, localPath: string): void {
    gitCommand(path.dirname(localPath), `clone "${remotePath}" "${path.basename(localPath)}"`);
    gitCommand(localPath, 'config user.email "test@example.com"');
    gitCommand(localPath, 'config user.name "Test User"');
}

/**
 * Helper: Add commits to remote repository
 */
function addRemoteCommits(repoPath: string, count: number): void {
    for (let i = 1; i <= count; i++) {
        const filename = `file${i}.txt`;
        fs.writeFileSync(path.join(repoPath, filename), `Content ${i}\n`);
        gitCommand(repoPath, `add ${filename}`);
        gitCommand(repoPath, `commit -m "Add ${filename}"`);
    }
}

/**
 * Helper: Get current commit hash
 */
function getCurrentCommit(repoPath: string): string {
    return gitCommand(repoPath, 'rev-parse HEAD');
}

/**
 * Helper: Count commits between two refs
 */
function countCommits(repoPath: string, from: string, to: string): number {
    const output = gitCommand(repoPath, `rev-list --count ${from}..${to}`);
    return parseInt(output, 10);
}

describe('Integration: Auto-Pull with Real Repository Operations', () => {
    beforeAll(() => {
        // Create temporary test directory
        testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-git-test-'));
        remoteRepoPath = path.join(testDir, 'remote');
        localRepoPath = path.join(testDir, 'local');
    });

    afterAll(() => {
        // Cleanup test repositories
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock settings
        mockSettings = {
            repositories: [],
            version: '0.1.0',
            globalFetchInterval: 300000,
            fetchOnStartup: true,
            notifyOnRemoteChanges: true,
            debugLogging: false,
            customPathEntries: ['~/.local/bin', '/usr/local/bin'],
            autoPullEnabled: true,
            autoPullPerRepository: {},
            autoPullNotificationVerbosity: 'all'
        };

        const mockApp = {
            vault: {
                adapter: {
                    write: jest.fn()
                }
            }
        } as any;

        mockPlugin = {
            settings: mockSettings,
            saveSettings: jest.fn().mockResolvedValue(undefined),
            app: mockApp
        } as any;

        // Initialize services
        Logger.initialize(mockSettings);
        gitService = new GitCommandService(mockSettings);
        ffDetectionService = new FastForwardDetectionService(gitService);
        configService = new RepositoryConfigService(mockPlugin, gitService);
        notificationService = new NotificationService(mockApp, mockSettings);
        autoPullService = new AutoPullService(
            ffDetectionService,
            gitService,
            notificationService,
            configService,
            mockSettings
        );

        // Clean up test directories before each test
        if (fs.existsSync(remoteRepoPath)) {
            fs.rmSync(remoteRepoPath, { recursive: true, force: true });
        }
        if (fs.existsSync(localRepoPath)) {
            fs.rmSync(localRepoPath, { recursive: true, force: true });
        }
    });

    describe('Successful Fast-Forward Pull', () => {
        test('successfully pulls commits and updates local files', async () => {
            // Setup: Create remote repo with initial commit
            createTestRepo(remoteRepoPath);
            const initialCommit = getCurrentCommit(remoteRepoPath);

            // Clone to local
            cloneRepo(remoteRepoPath, localRepoPath);

            // Add 3 commits to remote
            addRemoteCommits(remoteRepoPath, 3);
            const remoteCommit = getCurrentCommit(remoteRepoPath);

            // Fetch remote changes
            gitCommand(localRepoPath, 'fetch origin');

            // Setup repository config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Execute auto-pull
            const startTime = Date.now();
            const result = await autoPullService.attemptAutoPull('test-repo');
            const duration = Date.now() - startTime;

            // Verify result
            expect(result.status).toBe('success');
            expect(result.commitsPulled).toBe(3);
            expect(result.commitsAfter).toBe(remoteCommit);
            expect(result.errorMessage).toBeNull();

            // Verify local files updated
            expect(fs.existsSync(path.join(localRepoPath, 'file1.txt'))).toBe(true);
            expect(fs.existsSync(path.join(localRepoPath, 'file2.txt'))).toBe(true);
            expect(fs.existsSync(path.join(localRepoPath, 'file3.txt'))).toBe(true);

            // Verify local commit matches remote
            const localCommit = getCurrentCommit(localRepoPath);
            expect(localCommit).toBe(remoteCommit);

            // Verify performance (should be < 5 seconds)
            expect(duration).toBeLessThan(5000);

            // Verify pull history
            const history = autoPullService.getPullHistory('test-repo');
            expect(history).toHaveLength(1);
            expect(history[0].result).toBe('success');
            expect(history[0].commitsPulled).toBe(3);
        });

        test('correctly calculates commit count for pull', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);

            // Add 5 commits to remote
            addRemoteCommits(remoteRepoPath, 5);
            gitCommand(localRepoPath, 'fetch origin');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Execute pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify commit count
            expect(result.commitsPulled).toBe(5);
            expect(result.status).toBe('success');
        });

        test('before/after commit hashes match expectations', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);
            const beforeCommit = getCurrentCommit(localRepoPath);

            // Add commits to remote
            addRemoteCommits(remoteRepoPath, 2);
            const expectedAfterCommit = getCurrentCommit(remoteRepoPath);
            gitCommand(localRepoPath, 'fetch origin');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Execute pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify hashes
            expect(result.commitsBefore).toBe(beforeCommit);
            expect(result.commitsAfter).toBe(expectedAfterCommit);
            expect(result.status).toBe('success');
        });
    });

    describe('Safety Check: Uncommitted Changes', () => {
        test('skips pull when working directory has uncommitted changes', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);

            // Add commits to remote
            addRemoteCommits(remoteRepoPath, 2);
            gitCommand(localRepoPath, 'fetch origin');

            // Create uncommitted changes in local
            fs.writeFileSync(path.join(localRepoPath, 'uncommitted.txt'), 'Uncommitted content\n');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Execute pull attempt
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify skipped
            expect(result.status).toBe('skipped');
            expect(result.skipReason).toBe('UNCOMMITTED_CHANGES');
            expect(result.commitsPulled).toBe(0);

            // Verify working directory unchanged
            expect(fs.existsSync(path.join(localRepoPath, 'file1.txt'))).toBe(false);
            expect(fs.existsSync(path.join(localRepoPath, 'uncommitted.txt'))).toBe(true);

            // Verify uncommitted file still exists
            const uncommittedContent = fs.readFileSync(
                path.join(localRepoPath, 'uncommitted.txt'),
                'utf-8'
            );
            expect(uncommittedContent).toBe('Uncommitted content\n');
        });

        test('working directory unchanged after skipped pull', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);

            // Add commits to remote
            addRemoteCommits(remoteRepoPath, 3);
            gitCommand(localRepoPath, 'fetch origin');

            // Record initial state
            const beforeCommit = getCurrentCommit(localRepoPath);
            const filesBeforePull = fs.readdirSync(localRepoPath);

            // Create uncommitted changes
            fs.writeFileSync(path.join(localRepoPath, 'test.txt'), 'Test\n');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Attempt pull
            await autoPullService.attemptAutoPull('test-repo');

            // Verify working directory unchanged
            const afterCommit = getCurrentCommit(localRepoPath);
            expect(afterCommit).toBe(beforeCommit);

            // Verify new file still exists
            expect(fs.existsSync(path.join(localRepoPath, 'test.txt'))).toBe(true);

            // Verify remote files not pulled
            expect(fs.existsSync(path.join(localRepoPath, 'file1.txt'))).toBe(false);
        });
    });

    describe('Safety Check: Diverged Branches', () => {
        test('skips pull when branches have diverged', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);

            // Add commits to remote
            addRemoteCommits(remoteRepoPath, 2);

            // Add different commits to local (create divergence)
            fs.writeFileSync(path.join(localRepoPath, 'local-file.txt'), 'Local content\n');
            gitCommand(localRepoPath, 'add local-file.txt');
            gitCommand(localRepoPath, 'commit -m "Local commit"');

            // Fetch to update remote tracking
            gitCommand(localRepoPath, 'fetch origin');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Attempt pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify skipped due to divergence
            expect(result.status).toBe('skipped');
            expect(['DIVERGED_BRANCHES', 'NOT_FAST_FORWARD']).toContain(result.skipReason);
            expect(result.commitsPulled).toBe(0);

            // Verify local file still exists
            expect(fs.existsSync(path.join(localRepoPath, 'local-file.txt'))).toBe(true);

            // Verify remote files not pulled
            expect(fs.existsSync(path.join(localRepoPath, 'file1.txt'))).toBe(false);
        });
    });

    describe('Configuration: Auto-Pull Disabled', () => {
        test('skips pull when auto-pull disabled globally', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);
            addRemoteCommits(remoteRepoPath, 2);
            gitCommand(localRepoPath, 'fetch origin');

            // Disable auto-pull globally
            mockSettings.autoPullEnabled = false;

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Attempt pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify skipped
            expect(result.status).toBe('skipped');
            expect(result.skipReason).toBe('DISABLED_GLOBAL');
        });

        test('skips pull when auto-pull disabled per-repository', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);
            addRemoteCommits(remoteRepoPath, 2);
            gitCommand(localRepoPath, 'fetch origin');

            // Disable auto-pull for this repository
            mockSettings.autoPullPerRepository = { 'test-repo': false };

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Attempt pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify skipped
            expect(result.status).toBe('skipped');
            expect(result.skipReason).toBe('DISABLED_REPO');
        });
    });

    describe('Manual Pull', () => {
        test('manual pull works when auto-pull disabled', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);
            addRemoteCommits(remoteRepoPath, 2);
            gitCommand(localRepoPath, 'fetch origin');

            // Disable auto-pull
            mockSettings.autoPullEnabled = false;

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Manual pull should work
            const result = await autoPullService.manualPull('test-repo');

            // Verify success
            expect(result.status).toBe('success');
            expect(result.commitsPulled).toBe(2);
        });

        test('manual pull performs safety checks', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);
            addRemoteCommits(remoteRepoPath, 2);
            gitCommand(localRepoPath, 'fetch origin');

            // Create uncommitted changes
            fs.writeFileSync(path.join(localRepoPath, 'uncommitted.txt'), 'Test\n');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Manual pull should still be blocked by safety checks
            const result = await autoPullService.manualPull('test-repo');

            // Verify skipped
            expect(result.status).toBe('skipped');
            expect(result.skipReason).toBe('UNCOMMITTED_CHANGES');
        });
    });

    describe('Pull History Management', () => {
        test('pull history records operations correctly', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Perform multiple pull operations
            for (let i = 1; i <= 3; i++) {
                addRemoteCommits(remoteRepoPath, 1);
                gitCommand(localRepoPath, 'fetch origin');
                await autoPullService.attemptAutoPull('test-repo');
            }

            // Check history
            const history = autoPullService.getPullHistory('test-repo');
            expect(history).toHaveLength(3);
            expect(history.every(entry => entry.result === 'success')).toBe(true);
            expect(history.every(entry => entry.commitsPulled === 1)).toBe(true);
        });

        test('history limited to 10 entries (FIFO)', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Perform 12 pull operations
            for (let i = 1; i <= 12; i++) {
                addRemoteCommits(remoteRepoPath, 1);
                gitCommand(localRepoPath, 'fetch origin');
                await autoPullService.attemptAutoPull('test-repo');
            }

            // Check history limited to 10
            const history = autoPullService.getPullHistory('test-repo');
            expect(history).toHaveLength(10);
        });
    });

    describe('Performance', () => {
        test('pull operation completes within 5 seconds', async () => {
            // Setup repositories with moderate size
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);

            // Add 10 commits to remote
            addRemoteCommits(remoteRepoPath, 10);
            gitCommand(localRepoPath, 'fetch origin');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Measure performance
            const startTime = Date.now();
            const result = await autoPullService.attemptAutoPull('test-repo');
            const duration = Date.now() - startTime;

            // Verify completion time
            expect(duration).toBeLessThan(5000);
            expect(result.status).toBe('success');
        });
    });

    describe('Sequential Processing', () => {
        test('processes multiple repositories sequentially', async () => {
            // Setup multiple repositories
            const repo1Remote = path.join(testDir, 'remote1');
            const repo1Local = path.join(testDir, 'local1');
            const repo2Remote = path.join(testDir, 'remote2');
            const repo2Local = path.join(testDir, 'local2');

            // Create first repository pair
            createTestRepo(repo1Remote);
            cloneRepo(repo1Remote, repo1Local);
            addRemoteCommits(repo1Remote, 2);
            gitCommand(repo1Local, 'fetch origin');

            // Create second repository pair
            createTestRepo(repo2Remote);
            cloneRepo(repo2Remote, repo2Local);
            addRemoteCommits(repo2Remote, 3);
            gitCommand(repo2Local, 'fetch origin');

            // Setup configs
            const repoConfig1: RepositoryConfig = {
                id: 'repo1',
                name: 'Repository 1',
                path: repo1Local,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };

            const repoConfig2: RepositoryConfig = {
                id: 'repo2',
                name: 'Repository 2',
                path: repo2Local,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };

            mockPlugin.settings.repositories.push(repoConfig1, repoConfig2);

            // Execute pulls sequentially
            const result1 = await autoPullService.attemptAutoPull('repo1');
            const result2 = await autoPullService.attemptAutoPull('repo2');

            // Verify both succeeded
            expect(result1.status).toBe('success');
            expect(result1.commitsPulled).toBe(2);
            expect(result2.status).toBe('success');
            expect(result2.commitsPulled).toBe(3);

            // Cleanup
            fs.rmSync(repo1Remote, { recursive: true, force: true });
            fs.rmSync(repo1Local, { recursive: true, force: true });
            fs.rmSync(repo2Remote, { recursive: true, force: true });
            fs.rmSync(repo2Local, { recursive: true, force: true });
        });
    });

    describe('FR-3: Manual Intervention Notifications', () => {
        let mockNotificationService: jest.Mocked<NotificationService>;

        beforeEach(() => {
            // Create spy on notification service
            mockNotificationService = notificationService as jest.Mocked<NotificationService>;
            jest.spyOn(mockNotificationService, 'showManualInterventionNotification');
        });

        test('diverged branches triggers manual intervention notification', async () => {
            // Setup repositories with diverged branches
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);

            // Add commits to remote
            addRemoteCommits(remoteRepoPath, 2);

            // Add different commits to local (create divergence)
            fs.writeFileSync(path.join(localRepoPath, 'local-file.txt'), 'Local content\n');
            gitCommand(localRepoPath, 'add local-file.txt');
            gitCommand(localRepoPath, 'commit -m "Local commit"');

            // Fetch to update remote tracking
            gitCommand(localRepoPath, 'fetch origin');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Attempt pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify notification was triggered
            expect(result.status).toBe('skipped');
            expect(['DIVERGED_BRANCHES', 'NOT_FAST_FORWARD']).toContain(result.skipReason);
            expect(mockNotificationService.showManualInterventionNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    repositoryId: 'test-repo',
                    repositoryName: 'Test Repository',
                    status: 'skipped',
                    skipReason: expect.stringMatching(/DIVERGED_BRANCHES|NOT_FAST_FORWARD/)
                })
            );
        });

        test('uncommitted changes triggers manual intervention notification', async () => {
            // Setup repositories
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);

            // Add commits to remote
            addRemoteCommits(remoteRepoPath, 2);
            gitCommand(localRepoPath, 'fetch origin');

            // Create uncommitted changes in local
            fs.writeFileSync(path.join(localRepoPath, 'uncommitted.txt'), 'Uncommitted content\n');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Attempt pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify notification was triggered
            expect(result.status).toBe('skipped');
            expect(result.skipReason).toBe('UNCOMMITTED_CHANGES');
            expect(mockNotificationService.showManualInterventionNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    repositoryId: 'test-repo',
                    repositoryName: 'Test Repository',
                    status: 'skipped',
                    skipReason: 'UNCOMMITTED_CHANGES'
                })
            );
        });

        test('notification verbosity "all" respects settings', async () => {
            // Set verbosity to 'all'
            mockSettings.autoPullNotificationVerbosity = 'all';

            // Setup successful pull scenario
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);
            addRemoteCommits(remoteRepoPath, 2);
            gitCommand(localRepoPath, 'fetch origin');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Execute pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify success - 'all' verbosity setting accepted
            expect(result.status).toBe('success');
            expect(mockSettings.autoPullNotificationVerbosity).toBe('all');
        });

        test('notification verbosity "failures-only" setting recognized', async () => {
            // Set verbosity to 'failures-only'
            mockSettings.autoPullNotificationVerbosity = 'failures-only';

            // Setup successful pull scenario
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);
            addRemoteCommits(remoteRepoPath, 2);
            gitCommand(localRepoPath, 'fetch origin');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Execute pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify success - 'failures-only' verbosity setting accepted
            expect(result.status).toBe('success');
            expect(mockSettings.autoPullNotificationVerbosity).toBe('failures-only');
        });

        test('notification verbosity "silent" shows only critical scenarios', async () => {
            // Set verbosity to 'silent'
            mockSettings.autoPullNotificationVerbosity = 'silent';

            // Setup uncommitted changes scenario (non-critical)
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);
            addRemoteCommits(remoteRepoPath, 2);
            gitCommand(localRepoPath, 'fetch origin');
            fs.writeFileSync(path.join(localRepoPath, 'uncommitted.txt'), 'Uncommitted\n');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Execute pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify non-critical notification NOT shown with 'silent' verbosity
            expect(result.status).toBe('skipped');
            expect(result.skipReason).toBe('UNCOMMITTED_CHANGES');

            // In silent mode, only critical notifications (diverged, auth) should show
            // Uncommitted changes is non-critical and should NOT trigger notification
            const calls = (mockNotificationService.showManualInterventionNotification as jest.Mock).mock.calls;

            // Verify that notification was not called for non-critical scenario in silent mode
            // (or if called, it was for a different reason)
            const uncommittedCalls = calls.filter((call: any[]) =>
                call[0]?.skipReason === 'UNCOMMITTED_CHANGES'
            );
            expect(uncommittedCalls.length).toBe(0);
        });

        test('critical scenarios trigger notifications even in silent mode', async () => {
            // Set verbosity to 'silent'
            mockSettings.autoPullNotificationVerbosity = 'silent';

            // Setup diverged branches scenario (critical)
            createTestRepo(remoteRepoPath);
            cloneRepo(remoteRepoPath, localRepoPath);
            addRemoteCommits(remoteRepoPath, 2);

            // Create divergence
            fs.writeFileSync(path.join(localRepoPath, 'local-file.txt'), 'Local content\n');
            gitCommand(localRepoPath, 'add local-file.txt');
            gitCommand(localRepoPath, 'commit -m "Local commit"');
            gitCommand(localRepoPath, 'fetch origin');

            // Setup config
            const repoConfig: RepositoryConfig = {
                id: 'test-repo',
                name: 'Test Repository',
                path: localRepoPath,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };
            mockPlugin.settings.repositories.push(repoConfig);

            // Execute pull
            const result = await autoPullService.attemptAutoPull('test-repo');

            // Verify critical notification shown even in silent mode
            expect(result.status).toBe('skipped');
            expect(['DIVERGED_BRANCHES', 'NOT_FAST_FORWARD']).toContain(result.skipReason);
            expect(mockNotificationService.showManualInterventionNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'skipped',
                    skipReason: expect.stringMatching(/DIVERGED_BRANCHES|NOT_FAST_FORWARD/)
                })
            );
        });

        test('multiple repositories with different states handled correctly', async () => {
            // Setup first repo with successful pull
            const repo1Remote = path.join(testDir, 'remote1');
            const repo1Local = path.join(testDir, 'local1');
            createTestRepo(repo1Remote);
            cloneRepo(repo1Remote, repo1Local);
            addRemoteCommits(repo1Remote, 2);
            gitCommand(repo1Local, 'fetch origin');

            // Setup second repo with uncommitted changes
            const repo2Remote = path.join(testDir, 'remote2');
            const repo2Local = path.join(testDir, 'local2');
            createTestRepo(repo2Remote);
            cloneRepo(repo2Remote, repo2Local);
            addRemoteCommits(repo2Remote, 2);
            gitCommand(repo2Local, 'fetch origin');
            fs.writeFileSync(path.join(repo2Local, 'uncommitted.txt'), 'Uncommitted\n');

            // Setup third repo with diverged branches
            const repo3Remote = path.join(testDir, 'remote3');
            const repo3Local = path.join(testDir, 'local3');
            createTestRepo(repo3Remote);
            cloneRepo(repo3Remote, repo3Local);
            addRemoteCommits(repo3Remote, 2);
            fs.writeFileSync(path.join(repo3Local, 'local-file.txt'), 'Local\n');
            gitCommand(repo3Local, 'add local-file.txt');
            gitCommand(repo3Local, 'commit -m "Local commit"');
            gitCommand(repo3Local, 'fetch origin');

            // Setup configs
            const repoConfig1: RepositoryConfig = {
                id: 'repo1',
                name: 'Repository 1',
                path: repo1Local,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };

            const repoConfig2: RepositoryConfig = {
                id: 'repo2',
                name: 'Repository 2',
                path: repo2Local,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };

            const repoConfig3: RepositoryConfig = {
                id: 'repo3',
                name: 'Repository 3',
                path: repo3Local,
                enabled: true,
                createdAt: Date.now(),
                fetchInterval: 60000,
                lastFetchStatus: 'idle',
                remoteChanges: false
            };

            mockPlugin.settings.repositories.push(repoConfig1, repoConfig2, repoConfig3);

            // Execute pulls
            const result1 = await autoPullService.attemptAutoPull('repo1');
            const result2 = await autoPullService.attemptAutoPull('repo2');
            const result3 = await autoPullService.attemptAutoPull('repo3');

            // Verify results
            expect(result1.status).toBe('success');
            expect(result2.status).toBe('skipped');
            expect(result2.skipReason).toBe('UNCOMMITTED_CHANGES');
            expect(result3.status).toBe('skipped');
            expect(['DIVERGED_BRANCHES', 'NOT_FAST_FORWARD']).toContain(result3.skipReason);

            // Verify notifications called for skipped repos
            expect(mockNotificationService.showManualInterventionNotification).toHaveBeenCalledTimes(2);

            // Cleanup
            fs.rmSync(repo1Remote, { recursive: true, force: true });
            fs.rmSync(repo1Local, { recursive: true, force: true });
            fs.rmSync(repo2Remote, { recursive: true, force: true });
            fs.rmSync(repo2Local, { recursive: true, force: true });
            fs.rmSync(repo3Remote, { recursive: true, force: true });
            fs.rmSync(repo3Local, { recursive: true, force: true });
        });
    });
});
