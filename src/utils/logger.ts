/**
 * Centralized logging utility for Multi-Git plugin
 * Provides debug logging functionality that can be toggled via settings
 */

import type { MultiGitSettings } from '../settings/data';

/**
 * Logger service for debug output
 * All logging is controlled by the debugLogging setting in data.json
 */
export class Logger {
    private static settings: MultiGitSettings | null = null;

    /**
     * Initialize the logger with plugin settings
     * Must be called during plugin initialization
     * @param settings - Plugin settings containing debugLogging flag
     */
    static initialize(settings: MultiGitSettings): void {
        this.settings = settings;
    }

    /**
     * Check if debug logging is currently enabled
     * @returns true if debug logging is enabled
     */
    private static isEnabled(): boolean {
        return this.settings?.debugLogging ?? false;
    }

    /**
     * Format timestamp for log messages
     * @returns ISO timestamp string
     */
    private static getTimestamp(): string {
        return new Date().toISOString();
    }

    /**
     * Format a log message with consistent structure
     * @param component - Component name (e.g., 'FetchScheduler', 'GitCommand')
     * @param message - Log message
     * @returns Formatted log message
     */
    private static formatMessage(component: string, message: string): string {
        const timestamp = this.getTimestamp();
        return `[Multi-Git Debug] [${timestamp}] [${component}] ${message}`;
    }

    /**
     * Log a debug message
     * Only outputs if debugLogging is enabled
     * @param component - Component name (e.g., 'FetchScheduler', 'GitCommand')
     * @param message - Log message
     * @param data - Optional additional data to log
     */
    static debug(component: string, message: string, data?: unknown): void {
        if (!this.isEnabled()) return;

        const formattedMessage = this.formatMessage(component, message);
        if (data !== undefined) {
            console.log(formattedMessage, data);
        } else {
            console.log(formattedMessage);
        }
    }

    /**
     * Log an error with full details
     * Only outputs if debugLogging is enabled
     * @param component - Component name
     * @param message - Error description
     * @param error - Error object (will be sanitized)
     */
    static error(component: string, message: string, error: unknown): void {
        if (!this.isEnabled()) return;

        const formattedMessage = this.formatMessage(component, message);

        // Sanitize error to avoid logging sensitive data
        const sanitizedError = this.sanitizeError(error);
        console.error(formattedMessage, sanitizedError);
    }

    /**
     * Log operation timing information
     * Only outputs if debugLogging is enabled
     * @param component - Component name
     * @param operation - Operation description
     * @param durationMs - Duration in milliseconds
     * @param details - Optional operation details
     */
    static timing(
        component: string,
        operation: string,
        durationMs: number,
        details?: string
    ): void {
        if (!this.isEnabled()) return;

        const detailsStr = details ? ` (${details})` : '';
        const message = `${operation} completed in ${durationMs}ms${detailsStr}`;
        this.debug(component, message);
    }

    /**
     * Sanitize error object to remove sensitive data
     * @param error - Error to sanitize
     * @returns Sanitized error representation
     */
    private static sanitizeError(error: unknown): unknown {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: this.sanitizeMessage(error.message),
                stack: error.stack ? this.sanitizeStack(error.stack) : undefined,
            };
        }
        return error;
    }

    /**
     * Sanitize error message to remove potential credentials
     * Enhanced to handle SSH keys, tokens, and various credential formats
     * @param message - Original error message
     * @returns Sanitized message
     */
    private static sanitizeMessage(message: string): string {
        if (!message) return message;

        let sanitized = message;

        // Remove credentials from HTTPS URLs (more comprehensive pattern)
        sanitized = sanitized.replace(
            /(https?:\/\/)([^:@\s]+):([^@\s]+)@/g,
            '$1[CREDENTIALS]@'
        );

        // Remove SSH key data (BEGIN/END blocks)
        sanitized = sanitized.replace(
            /-----BEGIN [A-Z ]+ KEY-----[\s\S]*?-----END [A-Z ]+ KEY-----/g,
            '[SSH_KEY_REDACTED]'
        );

        // Remove various token formats (order matters - more specific patterns first)
        sanitized = sanitized
            .replace(/Authorization:\s+\S+\s+\S+/gi, 'Authorization: [REDACTED]')
            .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
            .replace(/token([=:])\s*[^\s]+/gi, 'token$1[REDACTED]')
            .replace(/password([=:])\s*\S+/gi, 'password$1[REDACTED]')
            .replace(/api[_-]?key([=:])\s*\S+/gi, 'api_key$1[REDACTED]')
            .replace(/secret([=:])\s*\S+/gi, 'secret$1[REDACTED]');

        // Remove SSH URLs with usernames
        sanitized = sanitized.replace(/ssh:\/\/[^@]+@/g, 'ssh://[USER]@');

        // Remove git URLs with credentials
        sanitized = sanitized.replace(/git@([^:]+):/g, 'git@$1:');

        return sanitized;
    }
    /**
     * Sanitize git output to remove sensitive information
     * Public method for use in services that need to sanitize git command output
     * @param output - Raw git output or error message
     * @returns Sanitized output safe for logging
     */
    static sanitizeGitOutput(output: string): string {
        return this.sanitizeMessage(output);
    }

    /**
     * Sanitize stack trace to remove potential credentials
     * @param stack - Original stack trace
     * @returns Sanitized stack trace
     */
    private static sanitizeStack(stack: string): string {
        return this.sanitizeMessage(stack);
    }

    /**
     * Log git command execution
     * Sanitizes command to remove credentials before logging
     * @param component - Component name
     * @param command - Git command being executed
     * @param repoPath - Repository path (safe to log)
     */
    static gitCommand(component: string, command: string, repoPath: string): void {
        if (!this.isEnabled()) return;

        const sanitizedCommand = this.sanitizeMessage(command);
        const message = `Executing git command in ${repoPath}: ${sanitizedCommand}`;
        this.debug(component, message);
    }

    /**
     * Log git command result
     * @param component - Component name
     * @param command - Git command that was executed
     * @param success - Whether command succeeded
     * @param durationMs - Execution time in milliseconds
     * @param output - Command output (will be sanitized)
     */
    static gitResult(
        component: string,
        command: string,
        success: boolean,
        durationMs: number,
        output?: string
    ): void {
        if (!this.isEnabled()) return;

        const status = success ? 'succeeded' : 'failed';
        const sanitizedCommand = this.sanitizeMessage(command);
        let message = `Git command ${status} in ${durationMs}ms: ${sanitizedCommand}`;

        if (output) {
            const sanitizedOutput = this.sanitizeMessage(output);
            message += `\nOutput: ${sanitizedOutput}`;
        }

        this.debug(component, message);
    }
}
