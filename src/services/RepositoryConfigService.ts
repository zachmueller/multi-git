import { v4 as uuidv4 } from 'uuid';
import { RepositoryConfig, FetchStatus, MultiGitSettings } from '../settings/data';
import MultiGitPlugin from '../main';
import { GitCommandService } from './GitCommandService';
import { validateAbsolutePath, isDirectory } from '../utils/validation';
import { ValidationError, DuplicateError } from '../utils/errors';
import { FetchResult } from './FetchSchedulerService';

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

        // Create new repository config with fetch defaults
        const newRepo: RepositoryConfig = {
            id: uuidv4(),
            path,
            name: repoName,
            enabled: true,
            createdAt: Date.now(),
            fetchInterval: this.plugin.settings.globalFetchInterval,
            lastFetchStatus: 'idle',
            remoteChanges: false,
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

    /**
     * Update fetch status for a repository
     * 
     * @param id - Repository identifier
     * @param status - New fetch status
     * @param error - Optional error message for failed fetches
     */
    async updateFetchStatus(
        id: string,
        status: FetchStatus,
        error?: string
    ): Promise<void> {
        const repo = this.plugin.settings.repositories.find(
            repo => repo.id === id
        );

        if (!repo) {
            throw new Error(`Repository not found: ${id}`);
        }

        // Update status fields
        repo.lastFetchStatus = status;
        repo.lastFetchTime = Date.now();

        if (error) {
            repo.lastFetchError = error;
        } else {
            // Clear error on successful fetch
            delete repo.lastFetchError;
        }

        await this.plugin.saveSettings();
    }

    /**
     * Set remote changes flag for a repository
     * 
     * @param id - Repository identifier
     * @param hasChanges - Whether remote has changes
     * @param commitCount - Number of commits behind (optional)
     */
    async setRemoteChanges(
        id: string,
        hasChanges: boolean,
        commitCount?: number
    ): Promise<void> {
        const repo = this.plugin.settings.repositories.find(
            repo => repo.id === id
        );

        if (!repo) {
            throw new Error(`Repository not found: ${id}`);
        }

        repo.remoteChanges = hasChanges;

        if (commitCount !== undefined) {
            repo.remoteCommitCount = commitCount;
        } else if (!hasChanges) {
            // Clear commit count if no changes
            delete repo.remoteCommitCount;
        }

        await this.plugin.saveSettings();
    }

    /**
     * Process a fetch result and update repository configuration
     * Combines status and remote change updates in one operation
     * 
     * @param result - FetchResult from scheduler service
     */
    async recordFetchResult(result: FetchResult): Promise<void> {
        const repo = this.plugin.settings.repositories.find(
            repo => repo.id === result.repositoryId
        );

        if (!repo) {
            throw new Error(`Repository not found: ${result.repositoryId}`);
        }

        // Update fetch status
        repo.lastFetchStatus = result.success ? 'success' : 'error';
        repo.lastFetchTime = result.timestamp;

        if (result.error) {
            repo.lastFetchError = result.error;
        } else {
            delete repo.lastFetchError;
        }

        // Update remote changes
        repo.remoteChanges = result.remoteChanges;

        if (result.commitsBehind !== undefined) {
            repo.remoteCommitCount = result.commitsBehind;
        } else if (!result.remoteChanges) {
            delete repo.remoteCommitCount;
        }

        await this.plugin.saveSettings();
    }

    /**
     * Get enriched status for a specific repository
     * 
     * @param id - Repository identifier
     * @returns Repository configuration with all status information
     */
    getRepositoryStatus(id: string): RepositoryConfig | null {
        return this.getRepository(id);
    }

    /**
     * Get status for all repositories
     * 
     * @returns Array of all repository configurations with status
     */
    getAllRepositoryStatuses(): RepositoryConfig[] {
        return this.getRepositories();
    }

    /**
     * Get repositories that have remote changes available
     * 
     * @returns Array of repositories with remoteChanges flag set
     */
    getRepositoriesWithRemoteChanges(): RepositoryConfig[] {
        return this.plugin.settings.repositories
            .filter(repo => repo.remoteChanges)
            .map(repo => ({ ...repo }));
    }

    /**
     * Migrate settings from older versions without fetch fields
     * Adds default values for new fields to maintain backward compatibility
     * 
     * @param settings - Settings object to migrate
     * @returns Migrated settings object
     */
    migrateSettings(settings: MultiGitSettings): MultiGitSettings {
        let needsSave = false;

        // Migrate global settings if missing
        if (settings.globalFetchInterval === undefined) {
            settings.globalFetchInterval = 300000; // 5 minutes default
            needsSave = true;
        }
        if (settings.fetchOnStartup === undefined) {
            settings.fetchOnStartup = true;
            needsSave = true;
        }
        if (settings.notifyOnRemoteChanges === undefined) {
            settings.notifyOnRemoteChanges = true;
            needsSave = true;
        }

        // Migrate repository configurations
        for (const repo of settings.repositories) {
            if (repo.fetchInterval === undefined) {
                repo.fetchInterval = settings.globalFetchInterval;
                needsSave = true;
            }
            if (repo.lastFetchStatus === undefined) {
                repo.lastFetchStatus = 'idle';
                needsSave = true;
            }
            if (repo.remoteChanges === undefined) {
                repo.remoteChanges = false;
                needsSave = true;
            }
        }

        return settings;
    }
}
