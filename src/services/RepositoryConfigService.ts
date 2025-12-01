import { v4 as uuidv4 } from 'uuid';
import { RepositoryConfig, FetchStatus, MultiGitSettings } from '../settings/data';
import MultiGitPlugin from '../main';
import { GitCommandService } from './GitCommandService';
import { validateAbsolutePath, isDirectory } from '../utils/validation';
import { ValidationError, DuplicateError } from '../utils/errors';
import { FetchResult } from './FetchSchedulerService';
import { Logger } from '../utils/logger';

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
        Logger.debug('RepositoryConfig', `Added new repository: ${repoName} (${path})`);
        await this.plugin.saveSettings();
        Logger.debug('RepositoryConfig', `Repository configuration persisted for ${repoName}`);

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
        const removedRepo = this.plugin.settings.repositories[index];
        this.plugin.settings.repositories.splice(index, 1);
        Logger.debug('RepositoryConfig', `Removed repository: ${removedRepo.name} (${id})`);
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

        Logger.debug('RepositoryConfig', `Toggled repository ${repo.name} to ${repo.enabled ? 'enabled' : 'disabled'}`);
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

        Logger.debug('RepositoryConfig', `Updated fetch status for ${repo.name}: ${status}${error ? ` (${error})` : ''}`);
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

        Logger.debug('RepositoryConfig', `Updated remote changes for ${repo.name}: ${hasChanges}${commitCount !== undefined ? ` (${commitCount} commits)` : ''}`);
        await this.plugin.saveSettings();
    }

    /**
     * Update fetch interval for a repository
     * 
     * @param id - Repository identifier
     * @param intervalMs - New fetch interval in milliseconds
     */
    async updateFetchInterval(id: string, intervalMs: number): Promise<void> {
        const repo = this.plugin.settings.repositories.find(
            repo => repo.id === id
        );

        if (!repo) {
            throw new Error(`Repository not found: ${id}`);
        }

        repo.fetchInterval = intervalMs;
        Logger.debug('RepositoryConfig', `Updated fetch interval for ${repo.name}: ${intervalMs}ms`);
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

        Logger.debug('RepositoryConfig', `Recorded fetch result for ${repo.name}: ${result.success ? 'success' : 'error'}, remoteChanges: ${result.remoteChanges}`);
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
        let migrationNeeded = false;

        // Migrate global settings if missing
        if (settings.globalFetchInterval === undefined) {
            settings.globalFetchInterval = 300000; // 5 minutes default
            migrationNeeded = true;
        }
        if (settings.fetchOnStartup === undefined) {
            settings.fetchOnStartup = true;
            migrationNeeded = true;
        }
        if (settings.notifyOnRemoteChanges === undefined) {
            settings.notifyOnRemoteChanges = true;
            migrationNeeded = true;
        }
        if (settings.debugLogging === undefined) {
            settings.debugLogging = false;
            migrationNeeded = true;
        }

        // Migrate repository configurations
        let reposMigrated = 0;
        for (const repo of settings.repositories) {
            let repoMigrated = false;
            if (repo.fetchInterval === undefined) {
                repo.fetchInterval = settings.globalFetchInterval;
                repoMigrated = true;
            }
            if (repo.lastFetchStatus === undefined) {
                repo.lastFetchStatus = 'idle';
                repoMigrated = true;
            }
            if (repo.remoteChanges === undefined) {
                repo.remoteChanges = false;
                repoMigrated = true;
            }
            if (repoMigrated) {
                reposMigrated++;
            }
        }

        if (migrationNeeded || reposMigrated > 0) {
            Logger.debug('RepositoryConfig', `Settings migration completed: ${reposMigrated}/${settings.repositories.length} repositories migrated`);
        }

        return settings;
    }
}
