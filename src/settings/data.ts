/**
 * Data model for Multi-Git plugin settings
 * Defines the structure for repository configuration and plugin settings
 */

/**
 * Fetch status for a repository
 */
export type FetchStatus = 'idle' | 'fetching' | 'success' | 'error';

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

    /** Fetch interval in milliseconds (defaults to global setting) */
    fetchInterval: number;

    /** Timestamp of last fetch attempt (Unix timestamp in milliseconds) */
    lastFetchTime?: number;

    /** Status of the last fetch operation */
    lastFetchStatus: FetchStatus;

    /** Error message from last fetch failure */
    lastFetchError?: string;

    /** Whether remote has changes compared to local */
    remoteChanges: boolean;

    /** Number of commits remote is ahead/behind */
    remoteCommitCount?: number;
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

    /** Global default fetch interval in milliseconds */
    globalFetchInterval: number;

    /** Whether to fetch all repositories on plugin startup */
    fetchOnStartup: boolean;

    /** Whether to show notifications for remote changes */
    notifyOnRemoteChanges: boolean;

    /** Timestamp of last global fetch operation */
    lastGlobalFetch?: number;

    /** 
     * Enable comprehensive debug logging to console
     * Hidden setting - not exposed in UI, must be edited in data.json directly
     * @default false
     */
    debugLogging: boolean;

    /**
     * Custom PATH entries to prepend when executing git commands
     * Useful for credential helpers (e.g., git-remote-codecommit) or custom git installations
     * Supports tilde expansion (~) for home directory
     * One path per array entry
     * @default ['~/.cargo/bin', '~/.local/bin', '/opt/homebrew/bin', '/usr/local/bin']
     */
    customPathEntries: string[];
}

/**
 * Default plugin settings
 * Used when no saved settings exist or for initialization
 */
export const DEFAULT_SETTINGS: MultiGitSettings = {
    repositories: [],
    version: '0.1.0',
    globalFetchInterval: 300000, // 5 minutes
    fetchOnStartup: true,
    notifyOnRemoteChanges: true,
    debugLogging: false, // Hidden setting for troubleshooting
    customPathEntries: [
        '~/.cargo/bin',      // Rust/cargo installations (e.g., git-remote-codecommit)
        '~/.local/bin',      // Python pip --user installs, other local tools
        '/opt/homebrew/bin', // Homebrew on Apple Silicon Macs
        '/usr/local/bin',    // Homebrew on Intel Macs, common Linux installs
    ],
};
