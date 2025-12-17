/**
 * Service for generating commit message suggestions
 * Generates timestamp-based commit messages for automated commits
 */

/**
 * Suggested commit message with summary
 */
export interface CommitMessageSuggestion {
    /** Commit message summary in format: "Auto-commit {ISO 8601 timestamp}" */
    summary: string;
}

/**
 * Service for generating timestamp-based commit message suggestions
 */
export class CommitMessageService {
    /**
     * Generate a timestamp-based commit message suggestion
     * 
     * @returns Suggested commit message with ISO 8601 timestamp
     * @example
     * ```typescript
     * const service = new CommitMessageService();
     * const suggestion = service.generateSuggestion();
     * // suggestion.summary = "Auto-commit 2025-12-14T21:30:00+13:00"
     * ```
     */
    generateSuggestion(): CommitMessageSuggestion {
        // Generate ISO 8601 timestamp with timezone
        const timestamp = new Date().toISOString();

        return {
            summary: `Auto-commit ${timestamp}`
        };
    }
}
