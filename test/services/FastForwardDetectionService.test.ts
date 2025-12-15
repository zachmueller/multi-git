/**
 * Unit tests for FastForwardDetectionService
 */

import { FastForwardDetectionService, FastForwardDetectionResult } from '../../src/services/FastForwardDetectionService';
import { GitCommandService } from '../../src/services/GitCommandService';
import { Logger } from '../../src/utils/logger';

// Mock GitCommandService
jest.mock('../../src/services/GitCommandService');

// Mock Logger
jest.mock('../../src/utils/logger');

describe('FastForwardDetectionService', () => {
    let service: FastForwardDetectionService;
    let mockGitCommandService: jest.Mocked<GitCommandService>;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create mock instance
        mockGitCommandService = new GitCommandService({
            repositories: [],
            version: '0.1.0',
            globalFetchInterval: 300000,
            fetchOnStartup: false,
            notifyOnRemoteChanges: true,
            debugLogging: false,
            customPathEntries: [],
        }) as jest.Mocked<GitCommandService>;

        // Create service with mocked dependencies
        service = new FastForwardDetectionService(mockGitCommandService);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('detectFastForward', () => {
        describe('can-fast-forward scenario', () => {
            it('should detect fast-forward opportunity when local is behind remote', async () => {
                // Arrange
                const repoPath = '/test/repo';
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('main');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue('origin/main');
                mockGitCommandService.compareWithRemote = jest.fn().mockResolvedValue({
                    ahead: 0,
                    behind: 3,
                });

                // Act
                const result = await service.detectFastForward(repoPath);

                // Assert
                expect(result.status).toBe('can-fast-forward');
                expect(result.commitsAhead).toBe(0);
                expect(result.commitsBehind).toBe(3);
                expect(result.localBranch).toBe('main');
                expect(result.remoteBranch).toBe('origin/main');
                expect(result.detectionTime).toBeGreaterThanOrEqual(0);
                expect(result.timestamp).toBeInstanceOf(Date);
                expect(result.errorMessage).toBeUndefined();
                expect(result.errorCode).toBeUndefined();
            });

            it('should return true from canSafelyFastForward for fast-forward scenario', async () => {
                // Arrange
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('main');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue('origin/main');
                mockGitCommandService.compareWithRemote = jest.fn().mockResolvedValue({
                    ahead: 0,
                    behind: 3,
                });

                // Act
                const result = await service.detectFastForward('/test/repo');

                // Assert
                expect(service.canSafelyFastForward(result)).toBe(true);
            });
        });

        describe('up-to-date scenario', () => {
            it('should detect when local and remote are synchronized', async () => {
                // Arrange
                const repoPath = '/test/repo';
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('main');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue('origin/main');
                mockGitCommandService.compareWithRemote = jest.fn().mockResolvedValue({
                    ahead: 0,
                    behind: 0,
                });

                // Act
                const result = await service.detectFastForward(repoPath);

                // Assert
                expect(result.status).toBe('up-to-date');
                expect(result.commitsAhead).toBe(0);
                expect(result.commitsBehind).toBe(0);
                expect(result.localBranch).toBe('main');
                expect(result.remoteBranch).toBe('origin/main');
            });

            it('should return false from canSafelyFastForward for up-to-date scenario', async () => {
                // Arrange
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('main');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue('origin/main');
                mockGitCommandService.compareWithRemote = jest.fn().mockResolvedValue({
                    ahead: 0,
                    behind: 0,
                });

                // Act
                const result = await service.detectFastForward('/test/repo');

                // Assert
                expect(service.canSafelyFastForward(result)).toBe(false);
            });
        });

        describe('local-ahead scenario', () => {
            it('should detect when local has commits not on remote', async () => {
                // Arrange
                const repoPath = '/test/repo';
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('feature');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue('origin/feature');
                mockGitCommandService.compareWithRemote = jest.fn().mockResolvedValue({
                    ahead: 2,
                    behind: 0,
                });

                // Act
                const result = await service.detectFastForward(repoPath);

                // Assert
                expect(result.status).toBe('local-ahead');
                expect(result.commitsAhead).toBe(2);
                expect(result.commitsBehind).toBe(0);
                expect(result.localBranch).toBe('feature');
                expect(result.remoteBranch).toBe('origin/feature');
            });

            it('should return false from canSafelyFastForward for local-ahead scenario', async () => {
                // Arrange
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('feature');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue('origin/feature');
                mockGitCommandService.compareWithRemote = jest.fn().mockResolvedValue({
                    ahead: 2,
                    behind: 0,
                });

                // Act
                const result = await service.detectFastForward('/test/repo');

                // Assert
                expect(service.canSafelyFastForward(result)).toBe(false);
            });
        });

        describe('diverged scenario', () => {
            it('should detect when branches have diverged', async () => {
                // Arrange
                const repoPath = '/test/repo';
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('develop');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue('origin/develop');
                mockGitCommandService.compareWithRemote = jest.fn().mockResolvedValue({
                    ahead: 2,
                    behind: 3,
                });

                // Act
                const result = await service.detectFastForward(repoPath);

                // Assert
                expect(result.status).toBe('diverged');
                expect(result.commitsAhead).toBe(2);
                expect(result.commitsBehind).toBe(3);
                expect(result.localBranch).toBe('develop');
                expect(result.remoteBranch).toBe('origin/develop');
            });

            it('should return false from canSafelyFastForward for diverged scenario', async () => {
                // Arrange
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('develop');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue('origin/develop');
                mockGitCommandService.compareWithRemote = jest.fn().mockResolvedValue({
                    ahead: 2,
                    behind: 3,
                });

                // Act
                const result = await service.detectFastForward('/test/repo');

                // Assert
                expect(service.canSafelyFastForward(result)).toBe(false);
            });
        });

        describe('error scenarios', () => {
            it('should handle no upstream branch gracefully', async () => {
                // Arrange
                const repoPath = '/test/repo';
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('main');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue(null);

                // Act
                const result = await service.detectFastForward(repoPath);

                // Assert
                expect(result.status).toBe('error');
                expect(result.commitsAhead).toBe(0);
                expect(result.commitsBehind).toBe(0);
                expect(result.errorMessage).toContain('No upstream tracking branch configured');
                expect(result.errorCode).toBe('no-upstream');
            });

            it('should return false from canSafelyFastForward for no upstream error', async () => {
                // Arrange
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('main');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue(null);

                // Act
                const result = await service.detectFastForward('/test/repo');

                // Assert
                expect(service.canSafelyFastForward(result)).toBe(false);
            });

            it('should handle detached HEAD state gracefully', async () => {
                // Arrange
                const repoPath = '/test/repo';
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue(null);

                // Act
                const result = await service.detectFastForward(repoPath);

                // Assert
                expect(result.status).toBe('error');
                expect(result.commitsAhead).toBe(0);
                expect(result.commitsBehind).toBe(0);
                expect(result.errorMessage).toContain('detached HEAD state');
                expect(result.errorCode).toBe('detached-head');
            });

            it('should return false from canSafelyFastForward for detached HEAD error', async () => {
                // Arrange
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue(null);

                // Act
                const result = await service.detectFastForward('/test/repo');

                // Assert
                expect(service.canSafelyFastForward(result)).toBe(false);
            });

            it('should handle git command failures gracefully', async () => {
                // Arrange
                const repoPath = '/test/repo';
                mockGitCommandService.getCurrentBranch = jest.fn().mockRejectedValue(
                    new Error('Git command failed: not a git repository')
                );

                // Act
                const result = await service.detectFastForward(repoPath);

                // Assert
                expect(result.status).toBe('error');
                expect(result.commitsAhead).toBe(0);
                expect(result.commitsBehind).toBe(0);
                expect(result.errorMessage).toBeDefined();
                expect(result.errorCode).toBe('invalid-repo');
            });

            it('should return false from canSafelyFastForward for git command failure', async () => {
                // Arrange
                mockGitCommandService.getCurrentBranch = jest.fn().mockRejectedValue(
                    new Error('Git command failed')
                );

                // Act
                const result = await service.detectFastForward('/test/repo');

                // Assert
                expect(service.canSafelyFastForward(result)).toBe(false);
            });
        });

        describe('performance requirements', () => {
            it('should complete detection within 500ms', async () => {
                // Arrange
                const repoPath = '/test/repo';
                // Simulate realistic command execution times
                mockGitCommandService.getCurrentBranch = jest.fn().mockImplementation(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 'main';
                });
                mockGitCommandService.getTrackingBranch = jest.fn().mockImplementation(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 'origin/main';
                });
                mockGitCommandService.compareWithRemote = jest.fn().mockImplementation(async () => {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return { ahead: 0, behind: 3 };
                });

                // Act
                const result = await service.detectFastForward(repoPath);

                // Assert
                expect(result.detectionTime).toBeLessThan(500);
                expect(result.status).toBe('can-fast-forward');
            });
        });

        describe('conservative failure mode', () => {
            it('should use conservative counts on comparison failure', async () => {
                // Arrange
                const repoPath = '/test/repo';
                mockGitCommandService.getCurrentBranch = jest.fn().mockResolvedValue('main');
                mockGitCommandService.getTrackingBranch = jest.fn().mockResolvedValue('origin/main');
                // compareWithRemote is called twice (once for ahead, once for behind)
                // First call succeeds, second call fails - both return conservative 0
                mockGitCommandService.compareWithRemote = jest.fn()
                    .mockResolvedValueOnce({ ahead: 0, behind: 3 })
                    .mockRejectedValueOnce(new Error('Git error'));

                // Act
                const result = await service.detectFastForward(repoPath);

                // Assert
                // With ahead=0, behind=0 (conservative failure on second call), status should be 'up-to-date'
                expect(result.status).toBe('up-to-date');
                expect(result.commitsAhead).toBe(0);
                expect(result.commitsBehind).toBe(0); // Conservative: failed count returns 0
            });
        });
    });

    describe('canSafelyFastForward', () => {
        it('should only return true for can-fast-forward status', () => {
            // Test all possible statuses
            const statuses: Array<FastForwardDetectionResult['status']> = [
                'can-fast-forward',
                'up-to-date',
                'local-ahead',
                'diverged',
                'error',
            ];

            const results = statuses.map(status => ({
                status,
                commitsAhead: 0,
                commitsBehind: 0,
                localBranch: 'main',
                remoteBranch: 'origin/main',
                detectionTime: 100,
                timestamp: new Date(),
            }));

            // Assert
            expect(service.canSafelyFastForward(results[0])).toBe(true); // can-fast-forward
            expect(service.canSafelyFastForward(results[1])).toBe(false); // up-to-date
            expect(service.canSafelyFastForward(results[2])).toBe(false); // local-ahead
            expect(service.canSafelyFastForward(results[3])).toBe(false); // diverged
            expect(service.canSafelyFastForward(results[4])).toBe(false); // error
        });
    });
});
