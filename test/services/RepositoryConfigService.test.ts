import { RepositoryConfigService } from '../../src/services/RepositoryConfigService';
import { GitCommandService } from '../../src/services/GitCommandService';
import { ValidationError, DuplicateError } from '../../src/utils/errors';
import { validateAbsolutePath, isDirectory } from '../../src/utils/validation';
import MultiGitPlugin from '../../src/main';

// Mock dependencies
jest.mock('../../src/services/GitCommandService');
jest.mock('../../src/utils/validation');
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substring(7)),
}));

describe('RepositoryConfigService', () => {
    let service: RepositoryConfigService;
    let mockPlugin: jest.Mocked<MultiGitPlugin>;
    let mockGitService: jest.Mocked<GitCommandService>;

    beforeEach(() => {
        // Create mock plugin with settings including fetch fields
        mockPlugin = {
            settings: {
                repositories: [],
                version: '0.1.0',
                globalFetchInterval: 300000,
                fetchOnStartup: true,
                notifyOnRemoteChanges: true,
            },
            saveSettings: jest.fn().mockResolvedValue(undefined),
        } as any;

        // Create service instance
        service = new RepositoryConfigService(mockPlugin);

        // Get mocked git service instance
        mockGitService = (service as any).gitService;

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('addRepository', () => {
        const validPath = '/valid/repo/path';
        const validName = 'Test Repository';

        beforeEach(() => {
            // Setup default mock responses for valid scenario
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);
        });

        it('should successfully add a repository with all valid inputs', async () => {
            const result = await service.addRepository(validPath, validName);

            expect(result).toMatchObject({
                id: expect.any(String),
                path: validPath,
                name: validName,
                enabled: true,
                createdAt: expect.any(Number),
            });
            expect(mockPlugin.settings.repositories).toHaveLength(1);
            expect(mockPlugin.saveSettings).toHaveBeenCalledTimes(1);
        });

        it('should generate repository name from path when name not provided', async () => {
            const result = await service.addRepository(validPath);

            expect(result.name).toBe('path');
            expect(mockPlugin.settings.repositories).toHaveLength(1);
        });

        it('should generate unique IDs for multiple repositories', async () => {
            const repo1 = await service.addRepository('/repo1');
            const repo2 = await service.addRepository('/repo2');

            expect(repo1.id).not.toBe(repo2.id);
        });

        it('should throw ValidationError if path is not absolute', async () => {
            (validateAbsolutePath as jest.Mock).mockReturnValue(false);

            await expect(service.addRepository('relative/path')).rejects.toThrow(
                ValidationError
            );
            await expect(service.addRepository('relative/path')).rejects.toThrow(
                'Path must be absolute'
            );
            expect(mockPlugin.saveSettings).not.toHaveBeenCalled();
        });

        it('should throw ValidationError if directory does not exist', async () => {
            (isDirectory as jest.Mock).mockResolvedValue(false);

            await expect(service.addRepository(validPath)).rejects.toThrow(
                ValidationError
            );
            await expect(service.addRepository(validPath)).rejects.toThrow(
                'Directory does not exist'
            );
            expect(mockPlugin.saveSettings).not.toHaveBeenCalled();
        });

        it('should throw ValidationError if path is not a git repository', async () => {
            mockGitService.isGitRepository.mockResolvedValue(false);

            await expect(service.addRepository(validPath)).rejects.toThrow(
                ValidationError
            );
            await expect(service.addRepository(validPath)).rejects.toThrow(
                'not a valid git repository'
            );
            expect(mockPlugin.saveSettings).not.toHaveBeenCalled();
        });

        it('should throw DuplicateError if repository path already exists', async () => {
            // Add first repository
            await service.addRepository(validPath);

            // Try to add duplicate
            await expect(service.addRepository(validPath)).rejects.toThrow(
                DuplicateError
            );
            await expect(service.addRepository(validPath)).rejects.toThrow(
                'Repository already configured'
            );
            expect(mockPlugin.settings.repositories).toHaveLength(1);
        });

        it('should call validation functions in correct order', async () => {
            await service.addRepository(validPath);

            expect(validateAbsolutePath).toHaveBeenCalledWith(validPath);
            expect(isDirectory).toHaveBeenCalledWith(validPath);
            expect(mockGitService.isGitRepository).toHaveBeenCalledWith(validPath);
        });

        it('should set enabled to true by default', async () => {
            const result = await service.addRepository(validPath);

            expect(result.enabled).toBe(true);
        });

        it('should set createdAt timestamp', async () => {
            const beforeTime = Date.now();
            const result = await service.addRepository(validPath);
            const afterTime = Date.now();

            expect(result.createdAt).toBeGreaterThanOrEqual(beforeTime);
            expect(result.createdAt).toBeLessThanOrEqual(afterTime);
        });

        it('should not set lastValidated on creation', async () => {
            const result = await service.addRepository(validPath);

            expect(result.lastValidated).toBeUndefined();
        });
    });

    describe('removeRepository', () => {
        it('should successfully remove an existing repository', async () => {
            // Add a repository first
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            const repo = await service.addRepository('/test/repo');
            jest.clearAllMocks(); // Clear the add operation calls

            // Remove it
            const result = await service.removeRepository(repo.id);

            expect(result).toBe(true);
            expect(mockPlugin.settings.repositories).toHaveLength(0);
            expect(mockPlugin.saveSettings).toHaveBeenCalledTimes(1);
        });

        it('should return false when repository ID does not exist', async () => {
            const result = await service.removeRepository('non-existent-id');

            expect(result).toBe(false);
            expect(mockPlugin.saveSettings).not.toHaveBeenCalled();
        });

        it('should remove correct repository when multiple exist', async () => {
            // Add multiple repositories
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            const repo1 = await service.addRepository('/repo1');
            const repo2 = await service.addRepository('/repo2');
            const repo3 = await service.addRepository('/repo3');
            jest.clearAllMocks();

            // Remove middle repository
            const result = await service.removeRepository(repo2.id);

            expect(result).toBe(true);
            expect(mockPlugin.settings.repositories).toHaveLength(2);
            expect(mockPlugin.settings.repositories).toContainEqual(
                expect.objectContaining({ id: repo1.id })
            );
            expect(mockPlugin.settings.repositories).toContainEqual(
                expect.objectContaining({ id: repo3.id })
            );
            expect(mockPlugin.settings.repositories).not.toContainEqual(
                expect.objectContaining({ id: repo2.id })
            );
        });

        it('should not affect repository on disk', async () => {
            // Add and remove a repository
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            const repo = await service.addRepository('/test/repo');
            await service.removeRepository(repo.id);

            // Verify git service was only called during add, not remove
            expect(mockGitService.isGitRepository).toHaveBeenCalledTimes(1);
        });
    });

    describe('toggleRepository', () => {
        it('should toggle repository from enabled to disabled', async () => {
            // Add a repository (enabled by default)
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            const repo = await service.addRepository('/test/repo');
            jest.clearAllMocks();

            // Toggle it
            const result = await service.toggleRepository(repo.id);

            expect(result).toBe(false);
            expect(mockPlugin.settings.repositories[0].enabled).toBe(false);
            expect(mockPlugin.saveSettings).toHaveBeenCalledTimes(1);
        });

        it('should toggle repository from disabled to enabled', async () => {
            // Add a repository
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            const repo = await service.addRepository('/test/repo');

            // Toggle to disabled
            await service.toggleRepository(repo.id);

            // Toggle back to enabled
            jest.clearAllMocks();
            const result = await service.toggleRepository(repo.id);

            expect(result).toBe(true);
            expect(mockPlugin.settings.repositories[0].enabled).toBe(true);
        });

        it('should return null when repository ID does not exist', async () => {
            const result = await service.toggleRepository('non-existent-id');

            expect(result).toBeNull();
            expect(mockPlugin.saveSettings).not.toHaveBeenCalled();
        });

        it('should update lastValidated timestamp', async () => {
            // Add a repository
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            const repo = await service.addRepository('/test/repo');
            const beforeToggle = Date.now();

            // Toggle it
            await service.toggleRepository(repo.id);
            const afterToggle = Date.now();

            const updatedRepo = mockPlugin.settings.repositories[0];
            expect(updatedRepo.lastValidated).toBeDefined();
            expect(updatedRepo.lastValidated!).toBeGreaterThanOrEqual(beforeToggle);
            expect(updatedRepo.lastValidated!).toBeLessThanOrEqual(afterToggle);
        });
    });

    describe('getRepositories', () => {
        it('should return empty array when no repositories exist', () => {
            const result = service.getRepositories();

            expect(result).toEqual([]);
            expect(Array.isArray(result)).toBe(true);
        });

        it('should return all repositories', async () => {
            // Add multiple repositories
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            await service.addRepository('/repo1');
            await service.addRepository('/repo2');
            await service.addRepository('/repo3');

            const result = service.getRepositories();

            expect(result).toHaveLength(3);
            expect(result[0].path).toBe('/repo1');
            expect(result[1].path).toBe('/repo2');
            expect(result[2].path).toBe('/repo3');
        });

        it('should return defensive copy to prevent direct modification', async () => {
            // Add a repository
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            await service.addRepository('/test/repo');

            const result = service.getRepositories();
            result[0].name = 'Modified Name';

            // Original should not be affected
            expect(mockPlugin.settings.repositories[0].name).toBe('repo');
        });
    });

    describe('getRepository', () => {
        it('should return repository by ID', async () => {
            // Add a repository
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            const repo = await service.addRepository('/test/repo', 'Test Repo');

            const result = service.getRepository(repo.id);

            expect(result).toMatchObject({
                id: repo.id,
                path: '/test/repo',
                name: 'Test Repo',
            });
        });

        it('should return null when repository ID does not exist', () => {
            const result = service.getRepository('non-existent-id');

            expect(result).toBeNull();
        });

        it('should return defensive copy to prevent direct modification', async () => {
            // Add a repository
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            const repo = await service.addRepository('/test/repo');

            const result = service.getRepository(repo.id);
            result!.name = 'Modified Name';

            // Original should not be affected
            expect(mockPlugin.settings.repositories[0].name).toBe('repo');
        });
    });

    describe('getEnabledRepositories', () => {
        it('should return empty array when no repositories exist', () => {
            const result = service.getEnabledRepositories();

            expect(result).toEqual([]);
        });

        it('should return only enabled repositories', async () => {
            // Add multiple repositories
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            const repo1 = await service.addRepository('/repo1');
            const repo2 = await service.addRepository('/repo2');
            const repo3 = await service.addRepository('/repo3');

            // Disable repo2
            await service.toggleRepository(repo2.id);

            const result = service.getEnabledRepositories();

            expect(result).toHaveLength(2);
            expect(result).toContainEqual(expect.objectContaining({ id: repo1.id }));
            expect(result).toContainEqual(expect.objectContaining({ id: repo3.id }));
            expect(result).not.toContainEqual(expect.objectContaining({ id: repo2.id }));
        });

        it('should return empty array when all repositories are disabled', async () => {
            // Add repositories
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            const repo1 = await service.addRepository('/repo1');
            const repo2 = await service.addRepository('/repo2');

            // Disable both
            await service.toggleRepository(repo1.id);
            await service.toggleRepository(repo2.id);

            const result = service.getEnabledRepositories();

            expect(result).toEqual([]);
        });

        it('should return defensive copies to prevent direct modification', async () => {
            // Add a repository
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);

            await service.addRepository('/test/repo');

            const result = service.getEnabledRepositories();
            result[0].name = 'Modified Name';

            // Original should not be affected
            expect(mockPlugin.settings.repositories[0].name).toBe('repo');
        });
    });

    describe('updateFetchStatus', () => {
        beforeEach(() => {
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);
        });

        it('should update fetch status to success and clear error', async () => {
            const repo = await service.addRepository('/test/repo');
            jest.clearAllMocks();

            await service.updateFetchStatus(repo.id, 'success');

            const updated = mockPlugin.settings.repositories[0];
            expect(updated.lastFetchStatus).toBe('success');
            expect(updated.lastFetchTime).toBeDefined();
            expect(updated.lastFetchError).toBeUndefined();
            expect(mockPlugin.saveSettings).toHaveBeenCalledTimes(1);
        });

        it('should update fetch status to error with error message', async () => {
            const repo = await service.addRepository('/test/repo');
            jest.clearAllMocks();

            await service.updateFetchStatus(repo.id, 'error', 'Network timeout');

            const updated = mockPlugin.settings.repositories[0];
            expect(updated.lastFetchStatus).toBe('error');
            expect(updated.lastFetchError).toBe('Network timeout');
            expect(mockPlugin.saveSettings).toHaveBeenCalledTimes(1);
        });

        it('should update lastFetchTime timestamp', async () => {
            const repo = await service.addRepository('/test/repo');
            const beforeUpdate = Date.now();
            jest.clearAllMocks();

            await service.updateFetchStatus(repo.id, 'success');
            const afterUpdate = Date.now();

            const updated = mockPlugin.settings.repositories[0];
            expect(updated.lastFetchTime).toBeGreaterThanOrEqual(beforeUpdate);
            expect(updated.lastFetchTime).toBeLessThanOrEqual(afterUpdate);
        });

        it('should throw error when repository not found', async () => {
            await expect(
                service.updateFetchStatus('non-existent-id', 'success')
            ).rejects.toThrow('Repository not found');
            expect(mockPlugin.saveSettings).not.toHaveBeenCalled();
        });

        it('should clear error on successful status update', async () => {
            const repo = await service.addRepository('/test/repo');

            // First set an error
            await service.updateFetchStatus(repo.id, 'error', 'Some error');
            expect(mockPlugin.settings.repositories[0].lastFetchError).toBe('Some error');

            jest.clearAllMocks();

            // Then update to success
            await service.updateFetchStatus(repo.id, 'success');

            const updated = mockPlugin.settings.repositories[0];
            expect(updated.lastFetchError).toBeUndefined();
        });
    });

    describe('setRemoteChanges', () => {
        beforeEach(() => {
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);
        });

        it('should set remote changes flag and commit count', async () => {
            const repo = await service.addRepository('/test/repo');
            jest.clearAllMocks();

            await service.setRemoteChanges(repo.id, true, 5);

            const updated = mockPlugin.settings.repositories[0];
            expect(updated.remoteChanges).toBe(true);
            expect(updated.remoteCommitCount).toBe(5);
            expect(mockPlugin.saveSettings).toHaveBeenCalledTimes(1);
        });

        it('should clear remote changes and commit count', async () => {
            const repo = await service.addRepository('/test/repo');

            // First set changes
            await service.setRemoteChanges(repo.id, true, 3);
            jest.clearAllMocks();

            // Then clear changes
            await service.setRemoteChanges(repo.id, false);

            const updated = mockPlugin.settings.repositories[0];
            expect(updated.remoteChanges).toBe(false);
            expect(updated.remoteCommitCount).toBeUndefined();
        });

        it('should set remote changes without commit count', async () => {
            const repo = await service.addRepository('/test/repo');
            jest.clearAllMocks();

            await service.setRemoteChanges(repo.id, true);

            const updated = mockPlugin.settings.repositories[0];
            expect(updated.remoteChanges).toBe(true);
            expect(updated.remoteCommitCount).toBeUndefined();
        });

        it('should throw error when repository not found', async () => {
            await expect(
                service.setRemoteChanges('non-existent-id', true)
            ).rejects.toThrow('Repository not found');
            expect(mockPlugin.saveSettings).not.toHaveBeenCalled();
        });
    });

    describe('recordFetchResult', () => {
        beforeEach(() => {
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);
        });

        it('should record successful fetch result with remote changes', async () => {
            const repo = await service.addRepository('/test/repo');
            jest.clearAllMocks();

            const fetchResult = {
                repositoryId: repo.id,
                timestamp: Date.now(),
                success: true,
                remoteChanges: true,
                commitsBehind: 3,
            };

            await service.recordFetchResult(fetchResult);

            const updated = mockPlugin.settings.repositories[0];
            expect(updated.lastFetchStatus).toBe('success');
            expect(updated.lastFetchTime).toBe(fetchResult.timestamp);
            expect(updated.remoteChanges).toBe(true);
            expect(updated.remoteCommitCount).toBe(3);
            expect(updated.lastFetchError).toBeUndefined();
            expect(mockPlugin.saveSettings).toHaveBeenCalledTimes(1);
        });

        it('should record failed fetch result with error', async () => {
            const repo = await service.addRepository('/test/repo');
            jest.clearAllMocks();

            const fetchResult = {
                repositoryId: repo.id,
                timestamp: Date.now(),
                success: false,
                remoteChanges: false,
                error: 'Network error',
            };

            await service.recordFetchResult(fetchResult);

            const updated = mockPlugin.settings.repositories[0];
            expect(updated.lastFetchStatus).toBe('error');
            expect(updated.lastFetchError).toBe('Network error');
            expect(updated.remoteChanges).toBe(false);
        });

        it('should clear commit count when no remote changes', async () => {
            const repo = await service.addRepository('/test/repo');

            // First set some changes
            await service.setRemoteChanges(repo.id, true, 5);
            jest.clearAllMocks();

            // Then fetch result with no changes
            const fetchResult = {
                repositoryId: repo.id,
                timestamp: Date.now(),
                success: true,
                remoteChanges: false,
            };

            await service.recordFetchResult(fetchResult);

            const updated = mockPlugin.settings.repositories[0];
            expect(updated.remoteChanges).toBe(false);
            expect(updated.remoteCommitCount).toBeUndefined();
        });

        it('should throw error when repository not found', async () => {
            const fetchResult = {
                repositoryId: 'non-existent-id',
                timestamp: Date.now(),
                success: true,
                remoteChanges: false,
            };

            await expect(
                service.recordFetchResult(fetchResult)
            ).rejects.toThrow('Repository not found');
            expect(mockPlugin.saveSettings).not.toHaveBeenCalled();
        });
    });

    describe('getRepositoriesWithRemoteChanges', () => {
        beforeEach(() => {
            (validateAbsolutePath as jest.Mock).mockReturnValue(true);
            (isDirectory as jest.Mock).mockResolvedValue(true);
            mockGitService.isGitRepository.mockResolvedValue(true);
        });

        it('should return only repositories with remote changes', async () => {
            const repo1 = await service.addRepository('/repo1');
            const repo2 = await service.addRepository('/repo2');
            const repo3 = await service.addRepository('/repo3');

            // Set remote changes for repo1 and repo3
            await service.setRemoteChanges(repo1.id, true, 2);
            await service.setRemoteChanges(repo3.id, true, 5);

            const result = service.getRepositoriesWithRemoteChanges();

            expect(result).toHaveLength(2);
            expect(result).toContainEqual(expect.objectContaining({ id: repo1.id }));
            expect(result).toContainEqual(expect.objectContaining({ id: repo3.id }));
            expect(result).not.toContainEqual(expect.objectContaining({ id: repo2.id }));
        });

        it('should return empty array when no repositories have remote changes', async () => {
            await service.addRepository('/repo1');
            await service.addRepository('/repo2');

            const result = service.getRepositoriesWithRemoteChanges();

            expect(result).toEqual([]);
        });

        it('should return defensive copies', async () => {
            const repo = await service.addRepository('/test/repo');
            await service.setRemoteChanges(repo.id, true);

            const result = service.getRepositoriesWithRemoteChanges();
            result[0].name = 'Modified Name';

            expect(mockPlugin.settings.repositories[0].name).toBe('repo');
        });
    });

    describe('migrateSettings', () => {
        it('should add missing global fetch settings', () => {
            const oldSettings: any = {
                repositories: [],
                version: '0.1.0',
            };

            const migrated = service.migrateSettings(oldSettings);

            expect(migrated.globalFetchInterval).toBe(300000);
            expect(migrated.fetchOnStartup).toBe(true);
            expect(migrated.notifyOnRemoteChanges).toBe(true);
        });

        it('should add missing repository fetch fields', () => {
            const oldSettings: any = {
                repositories: [
                    {
                        id: 'test-id',
                        path: '/test/repo',
                        name: 'Test',
                        enabled: true,
                        createdAt: Date.now(),
                    },
                ],
                version: '0.1.0',
                globalFetchInterval: 300000,
                fetchOnStartup: true,
                notifyOnRemoteChanges: true,
            };

            const migrated = service.migrateSettings(oldSettings);

            const repo = migrated.repositories[0];
            expect(repo.fetchInterval).toBe(300000);
            expect(repo.lastFetchStatus).toBe('idle');
            expect(repo.remoteChanges).toBe(false);
        });

        it('should not modify settings that already have fetch fields', () => {
            const currentSettings: any = {
                repositories: [
                    {
                        id: 'test-id',
                        path: '/test/repo',
                        name: 'Test',
                        enabled: true,
                        createdAt: Date.now(),
                        fetchInterval: 600000,
                        lastFetchStatus: 'success',
                        remoteChanges: true,
                    },
                ],
                version: '0.1.0',
                globalFetchInterval: 300000,
                fetchOnStartup: true,
                notifyOnRemoteChanges: true,
            };

            const migrated = service.migrateSettings(currentSettings);

            const repo = migrated.repositories[0];
            expect(repo.fetchInterval).toBe(600000);
            expect(repo.lastFetchStatus).toBe('success');
            expect(repo.remoteChanges).toBe(true);
        });

        it('should use global fetch interval for repository defaults', () => {
            const oldSettings: any = {
                repositories: [
                    {
                        id: 'test-id',
                        path: '/test/repo',
                        name: 'Test',
                        enabled: true,
                        createdAt: Date.now(),
                    },
                ],
                version: '0.1.0',
                globalFetchInterval: 600000,
                fetchOnStartup: true,
                notifyOnRemoteChanges: true,
            };

            const migrated = service.migrateSettings(oldSettings);

            expect(migrated.repositories[0].fetchInterval).toBe(600000);
        });

        it('should be idempotent - running twice has same result', () => {
            const oldSettings: any = {
                repositories: [],
                version: '0.1.0',
            };

            const migrated1 = service.migrateSettings(oldSettings);
            const migrated2 = service.migrateSettings(migrated1);

            expect(migrated1).toEqual(migrated2);
        });
    });
});
