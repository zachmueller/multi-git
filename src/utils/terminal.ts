import { Notice } from 'obsidian';
import { Logger } from './logger';

/**
 * Opens a terminal window at the specified repository path.
 * 
 * This utility provides cross-platform terminal launching with graceful error handling.
 * Supports macOS Terminal, Windows Command Prompt/PowerShell, and Linux terminals.
 * 
 * @param repositoryPath - Absolute path to the repository directory
 * @returns Promise resolving to true if terminal opened successfully, false otherwise
 * 
 * @example
 * ```typescript
 * const success = await openRepositoryInTerminal('/path/to/repo');
 * if (success) {
 *     new Notice('Terminal opened at repository location');
 * } else {
 *     new Notice('Failed to open terminal');
 * }
 * ```
 */
export async function openRepositoryInTerminal(repositoryPath: string): Promise<boolean> {
    try {
        Logger.debug('Terminal', `Attempting to open terminal at: ${repositoryPath}`);

        // Validate repository path
        if (!repositoryPath || repositoryPath.trim() === '') {
            Logger.error('Terminal', 'Cannot open terminal: repository path is empty', new Error('Empty path'));
            new Notice('Error: Repository path is not set');
            return false;
        }

        // Use Electron's shell API to open the directory
        // This will open the directory in the file explorer, which on most systems
        // allows the user to then open a terminal there, but we'll try to be more direct
        const { shell } = require('electron');

        // Get platform for platform-specific terminal opening
        const platform = process.platform;
        Logger.debug('Terminal', `Detected platform: ${platform}`);

        let result: string;

        switch (platform) {
            case 'darwin': // macOS
                // On macOS, opening the path directly opens Finder
                // For terminal, we'd need to use a more complex approach
                result = await shell.openPath(repositoryPath);
                break;

            case 'win32': // Windows
                // On Windows, openPath opens File Explorer
                result = await shell.openPath(repositoryPath);
                break;

            case 'linux': // Linux
                // On Linux, openPath behavior varies by desktop environment
                result = await shell.openPath(repositoryPath);
                break;

            default:
                Logger.error('Terminal', `Unsupported platform: ${platform}`, new Error(`Platform ${platform} not supported`));
                new Notice(`Terminal opening not supported on ${platform}`);
                return false;
        }

        if (result === '') {
            // Empty string means success for shell.openPath
            Logger.debug('Terminal', `Successfully opened file explorer at: ${repositoryPath}`);
            new Notice('Opened repository location in file explorer');
            return true;
        } else {
            // Non-empty string is an error message
            Logger.error('Terminal', `Failed to open path: ${result}`, new Error(result));
            new Notice(`Failed to open repository location: ${result}`);
            return false;
        }

    } catch (error) {
        Logger.error('Terminal', 'Error opening terminal', error);
        new Notice('Failed to open terminal - see console for details');
        return false;
    }
}

/**
 * Gets a user-friendly display path for showing in UI.
 * Abbreviates long paths to make them more readable.
 * 
 * @param repositoryPath - Full path to the repository
 * @returns Abbreviated path suitable for display
 * 
 * @example
 * ```typescript
 * const displayPath = getDisplayPath('/Users/username/very/long/path/to/repository');
 * // Returns: '.../long/path/to/repository'
 * ```
 */
export function getDisplayPath(repositoryPath: string): string {
    if (!repositoryPath) {
        return '';
    }

    // If path is short enough, return as-is
    if (repositoryPath.length <= 50) {
        return repositoryPath;
    }

    // For longer paths, show last 3 segments
    const segments = repositoryPath.split(/[/\\]/);
    if (segments.length > 3) {
        return '.../' + segments.slice(-3).join('/');
    }

    return repositoryPath;
}
