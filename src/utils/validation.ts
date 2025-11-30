/**
 * Path validation and directory checking utilities
 * Pure Node.js functions for validating file system paths
 */

import { existsSync, statSync } from 'fs';
import { resolve, normalize, isAbsolute } from 'path';

/**
 * Validates that a path is an absolute path
 * @param path - The path to validate
 * @returns true if the path is absolute, false otherwise
 */
export function validateAbsolutePath(path: string): boolean {
    if (!path || typeof path !== 'string') {
        return false;
    }

    // Trim whitespace
    const trimmedPath = path.trim();
    if (trimmedPath.length === 0) {
        return false;
    }

    // Check if path is absolute
    return isAbsolute(trimmedPath);
}

/**
 * Checks if a path exists and is a directory
 * @param path - The path to check
 * @returns true if the path exists and is a directory, false otherwise
 */
export function isDirectory(path: string): boolean {
    try {
        const stats = statSync(path);
        return stats.isDirectory();
    } catch {
        // Path doesn't exist or is inaccessible
        return false;
    }
}

/**
 * Checks if a path exists (file or directory)
 * @param path - The path to check
 * @returns true if the path exists, false otherwise
 */
export function pathExists(path: string): boolean {
    try {
        return existsSync(path);
    } catch {
        return false;
    }
}

/**
 * Normalizes a path to a consistent format
 * Resolves relative paths, removes trailing slashes, and normalizes separators
 * @param path - The path to normalize
 * @returns The normalized absolute path
 */
export function normalizePath(path: string): string {
    if (!path || typeof path !== 'string') {
        return '';
    }

    // Resolve to absolute path and normalize
    const normalized = normalize(resolve(path));

    // Remove trailing slash (except for root)
    if (normalized.length > 1 && normalized.endsWith('/')) {
        return normalized.slice(0, -1);
    }

    return normalized;
}

/**
 * Validates a path for security concerns
 * Checks for path traversal attempts and other malicious patterns
 * @param path - The path to validate
 * @returns true if the path is safe, false if it contains suspicious patterns
 */
export function isSecurePath(path: string): boolean {
    if (!path || typeof path !== 'string') {
        return false;
    }

    // Check for path traversal patterns
    const pathTraversalPatterns = [
        /\.\.[/\\]/,  // ../ or ..\
        /^\.\.$/,     // Exactly ".."
        /[/\\]\.\.$/  // Ends with /.. or \..
    ];

    for (const pattern of pathTraversalPatterns) {
        if (pattern.test(path)) {
            return false;
        }
    }

    // Check for null bytes (directory traversal attack)
    if (path.includes('\0')) {
        return false;
    }

    return true;
}

/**
 * Validates that a path is suitable for use as a repository path
 * Combines multiple validation checks
 * @param path - The path to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateRepositoryPath(path: string): {
    isValid: boolean;
    error?: string;
} {
    // Check if path is provided
    if (path === null || path === undefined || typeof path !== 'string') {
        return {
            isValid: false,
            error: 'Path is required',
        };
    }

    const trimmedPath = path.trim();

    // Check for empty path
    if (trimmedPath.length === 0) {
        return {
            isValid: false,
            error: 'Path cannot be empty',
        };
    }

    // Check for security issues
    if (!isSecurePath(trimmedPath)) {
        return {
            isValid: false,
            error: 'Path contains invalid or suspicious patterns',
        };
    }

    // Check if path is absolute
    if (!validateAbsolutePath(trimmedPath)) {
        return {
            isValid: false,
            error: 'Path must be an absolute path',
        };
    }

    // Check if path exists
    if (!pathExists(trimmedPath)) {
        return {
            isValid: false,
            error: 'Path does not exist',
        };
    }

    // Check if path is a directory
    if (!isDirectory(trimmedPath)) {
        return {
            isValid: false,
            error: 'Path must be a directory',
        };
    }

    return { isValid: true };
}
