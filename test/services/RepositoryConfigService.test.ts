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
        // Create mock plugin with settings
        mockPlugin = {
            settings: {
                repositories: [],
                version: '0.1.0',
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
                'Repository already exists'
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
});
