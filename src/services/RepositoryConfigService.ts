import { v4 as uuidv4 } from 'uuid';
import { RepositoryConfig } from '../settings/data';
import MultiGitPlugin from '../main';
import { GitCommandService } from './GitCommandService';
import { validateAbsolutePath, isDirectory } from '../utils/validation';
import { ValidationError, DuplicateError } from '../utils/errors';

/**
 * Service for managing repository configurations
 * Handles CRUD operations for repository settings
 */
export class RepositoryConfigService {
    private plugin: MultiGitPlugin;
    private gitService: GitCommandService;

    constructor(plugin: MultiGitPlugin) {
        this.plugin = plugin;
        this.gitService = new GitCommandService();
    }

    /**
     * Add a new repository to the configuration
     * 
     * @param path - Absolute path to the repository directory
     * @param name - Optional human-readable name (defaults to directory name)
     * @returns The created RepositoryConfig
     * @throws ValidationError if path is invalid or not a git repository
     * @throws DuplicateError if repository path already exists
     */
    async addRepository(path: string, name?: string): Promise<RepositoryConfig> {
        // Validate path is absolute
        if (!validateAbsolutePath(path)) {
            throw new ValidationError(`Path must be absolute: ${path}`);
        }

        // Verify directory exists
        if (!(await isDirectory(path))) {
            throw new ValidationError(`Directory does not exist: ${path}`);
        }

        // Verify it's a git repository
        const isGitRepo = await this.gitService.isGitRepository(path);
        if (!isGitRepo) {
            throw new ValidationError(`Path is not a valid git repository: ${path}`);
        }

        // Check for duplicate paths
        const existingRepo = this.plugin.settings.repositories.find(
            repo => repo.path === path
        );
        if (existingRepo) {
            throw new DuplicateError('Repository already configured', path);
        }

        // Generate repository name from directory if not provided
        const repoName = name || path.split('/').pop() || path;

        // Create new repository config
        const newRepo: RepositoryConfig = {
            id: uuidv4(),
            path,
            name: repoName,
            enabled: true,
            createdAt: Date.now(),
        };

        // Add to settings and save
        this.plugin.settings.repositories.push(newRepo);
        await this.plugin.saveSettings();

        return newRepo;
    }

    /**
     * Remove a repository from the configuration
     * Does not affect the repository on disk
     * 
     * @param id - The unique ID of the repository to remove
     * @returns true if removed, false if not found
     */
    async removeRepository(id: string): Promise<boolean> {
        const index = this.plugin.settings.repositories.findIndex(
            repo => repo.id === id
        );

        if (index === -1) {
            return false;
        }

        // Remove from array
        this.plugin.settings.repositories.splice(index, 1);
        await this.plugin.saveSettings();

        return true;
    }

    /**
     * Toggle the enabled state of a repository
     * 
     * @param id - The unique ID of the repository to toggle
     * @returns The new enabled state, or null if repository not found
     */
    async toggleRepository(id: string): Promise<boolean | null> {
        const repo = this.plugin.settings.repositories.find(
            repo => repo.id === id
        );

        if (!repo) {
            return null;
        }

        // Toggle enabled state
        repo.enabled = !repo.enabled;
        repo.lastValidated = Date.now();

        await this.plugin.saveSettings();

        return repo.enabled;
    }

    /**
     * Get all repositories
     * Returns defensive copy to prevent direct modification
     * 
     * @returns Array of all repository configurations
     */
    getRepositories(): RepositoryConfig[] {
        return this.plugin.settings.repositories.map(repo => ({ ...repo }));
    }

    /**
     * Get a single repository by ID
     * Returns defensive copy to prevent direct modification
     * 
     * @param id - The unique ID of the repository
     * @returns The repository configuration or null if not found
     */
    getRepository(id: string): RepositoryConfig | null {
        const repo = this.plugin.settings.repositories.find(
            repo => repo.id === id
        );

        return repo ? { ...repo } : null;
    }

    /**
     * Get all enabled repositories
     * Returns defensive copy to prevent direct modification
     * 
     * @returns Array of enabled repository configurations
     */
    getEnabledRepositories(): RepositoryConfig[] {
        return this.plugin.settings.repositories
            .filter(repo => repo.enabled)
            .map(repo => ({ ...repo }));
    }
}
