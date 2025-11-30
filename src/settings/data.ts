/**
 * Data model for Multi-Git plugin settings
 * Defines the structure for repository configuration and plugin settings
 */

/**
 * Configuration for a single git repository
 */
export interface RepositoryConfig {
    /** Unique identifier for the repository (UUID v4) */
    id: string;

    /** Absolute path to the repository directory */
    path: string;

    /** Human-readable name for the repository */
    name: string;

    /** Whether the repository is currently enabled */
    enabled: boolean;

    /** Timestamp when the repository was added (Unix timestamp in milliseconds) */
    createdAt: number;

    /** Timestamp of last successful validation (Unix timestamp in milliseconds) */
    lastValidated?: number;
}

/**
 * Plugin settings structure
 * Persisted to data.json in the plugin directory
 */
export interface MultiGitSettings {
    /** List of configured repositories */
    repositories: RepositoryConfig[];

    /** Settings version for migration tracking */
    version: string;
}

/**
 * Default plugin settings
 * Used when no saved settings exist or for initialization
 */
export const DEFAULT_SETTINGS: MultiGitSettings = {
    repositories: [],
    version: '0.1.0',
};
