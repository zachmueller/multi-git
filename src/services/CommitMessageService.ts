/**
 * Service for generating commit message suggestions
 * Analyzes repository status and creates smart default commit messages
 */

import { RepositoryStatus } from '../settings/data';

/**
 * Suggested commit message with summary and optional details
 */
export interface CommitMessageSuggestion {
    /** First line of commit message (50 char max) */
    summary: string;

    /** Optional additional lines for details */
    details?: string[];
}

/**
 * Types of file changes detected in git status
 */
interface FileChangeAnalysis {
    added: string[];
    modified: string[];
    deleted: string[];
    renamed: string[];
    totalCount: number;
}

/**
 * Service for generating commit message suggestions based on changed files
 */
export class CommitMessageService {
    /**
     * Maximum length for commit message summary (first line)
     */
    private static readonly MAX_SUMMARY_LENGTH = 50;

    /**
     * Maximum filename length before truncation
     */
    private static readonly MAX_FILENAME_LENGTH = 30;

    /**
     * Generate a commit message suggestion based on repository status
     * 
     * @param status - Current repository status with file changes
     * @returns Suggested commit message
     */
    generateSuggestion(status: RepositoryStatus): CommitMessageSuggestion {
        // Analyze what types of changes exist
        const analysis = this.analyzeChanges(status);

        // Handle empty repository (initial commit)
        if (this.isInitialCommit(status, analysis)) {
            return {
                summary: 'Initial commit',
            };
        }

        // Generate summary based on change patterns
        const summary = this.generateSummary(analysis);

        return { summary };
    }

    /**
     * Analyze file changes to categorize them by type
     * 
     * @param status - Repository status
     * @returns Analysis of file changes by type
     */
    private analyzeChanges(status: RepositoryStatus): FileChangeAnalysis {
        const added: string[] = [];
        const modified: string[] = [];
        const deleted: string[] = [];
        const renamed: string[] = [];

        // Analyze staged files
        for (const file of status.stagedFiles) {
            if (this.isRenamedFile(file)) {
                renamed.push(this.extractRenamedFilename(file));
            } else if (file.startsWith('A ')) {
                added.push(file.substring(2).trim());
            } else if (file.startsWith('M ')) {
                modified.push(file.substring(2).trim());
            } else if (file.startsWith('D ')) {
                deleted.push(file.substring(2).trim());
            }
        }

        // Analyze unstaged files (all modifications)
        for (const file of status.unstagedFiles) {
            if (file.startsWith('M ')) {
                const filename = file.substring(2).trim();
                if (!modified.includes(filename)) {
                    modified.push(filename);
                }
            } else if (file.startsWith('D ')) {
                const filename = file.substring(2).trim();
                if (!deleted.includes(filename)) {
                    deleted.push(filename);
                }
            }
        }

        // Untracked files are all additions
        for (const file of status.untrackedFiles) {
            const filename = file.startsWith('?? ') ? file.substring(3).trim() : file.trim();
            if (!added.includes(filename)) {
                added.push(filename);
            }
        }

        return {
            added,
            modified,
            deleted,
            renamed,
            totalCount: added.length + modified.length + deleted.length + renamed.length,
        };
    }

    /**
     * Check if a file entry represents a renamed file
     * Git represents renames as "R old_name -> new_name"
     * 
     * @param file - File status entry
     * @returns True if file was renamed
     */
    private isRenamedFile(file: string): boolean {
        return file.startsWith('R ') && file.includes(' -> ');
    }

    /**
     * Extract the new filename from a renamed file entry
     * 
     * @param file - Renamed file entry (format: "R old_name -> new_name")
     * @returns The new filename
     */
    private extractRenamedFilename(file: string): string {
        const match = file.match(/-> (.+)$/);
        return match ? match[1] : file.substring(2);
    }

    /**
     * Check if this is an initial commit (empty repository)
     * 
     * @param status - Repository status
     * @param analysis - File change analysis
     * @returns True if this is an initial commit
     */
    private isInitialCommit(status: RepositoryStatus, analysis: FileChangeAnalysis): boolean {
        // Initial commit if:
        // 1. All changes are additions (no modifications or deletions)
        // 2. Three or more files being added (suggests initial project setup)
        return analysis.totalCount >= 3 &&
            analysis.modified.length === 0 &&
            analysis.deleted.length === 0 &&
            analysis.renamed.length === 0 &&
            analysis.added.length === analysis.totalCount;
    }

    /**
     * Generate commit message summary based on change analysis
     * 
     * @param analysis - File change analysis
     * @returns Commit message summary
     */
    private generateSummary(analysis: FileChangeAnalysis): string {
        const { added, modified, deleted, renamed, totalCount } = analysis;

        // No changes (shouldn't happen, but handle gracefully)
        if (totalCount === 0) {
            return 'Update files';
        }

        // Only additions
        if (added.length === totalCount) {
            return this.generateAddMessage(added);
        }

        // Only deletions
        if (deleted.length === totalCount) {
            return this.generateDeleteMessage(deleted);
        }

        // Only renames
        if (renamed.length === totalCount) {
            return this.generateRenameMessage(renamed);
        }

        // Mixed changes - use generic update message
        return this.generateUpdateMessage(totalCount, analysis);
    }

    /**
     * Generate message for file additions
     * 
     * @param files - List of added files
     * @returns Commit message summary
     */
    private generateAddMessage(files: string[]): string {
        if (files.length === 1) {
            const filename = this.getDisplayFilename(files[0]);
            return this.truncateSummary(`Add ${filename}`);
        }

        return `Add ${files.length} file${files.length > 1 ? 's' : ''}`;
    }

    /**
     * Generate message for file deletions
     * 
     * @param files - List of deleted files
     * @returns Commit message summary
     */
    private generateDeleteMessage(files: string[]): string {
        if (files.length === 1) {
            const filename = this.getDisplayFilename(files[0]);
            return this.truncateSummary(`Remove ${filename}`);
        }

        return `Remove ${files.length} file${files.length > 1 ? 's' : ''}`;
    }

    /**
     * Generate message for file renames
     * 
     * @param files - List of renamed files (new names)
     * @returns Commit message summary
     */
    private generateRenameMessage(files: string[]): string {
        if (files.length === 1) {
            const filename = this.getDisplayFilename(files[0]);
            return this.truncateSummary(`Rename ${filename}`);
        }

        return `Rename ${files.length} file${files.length > 1 ? 's' : ''}`;
    }

    /**
     * Generate message for mixed file changes
     * 
     * @param totalCount - Total number of changed files
     * @param analysis - File change analysis for context
     * @returns Commit message summary
     */
    private generateUpdateMessage(totalCount: number, analysis: FileChangeAnalysis): string {
        // Single file - be specific about what changed
        if (totalCount === 1) {
            const file = [
                ...analysis.modified,
                ...analysis.added,
                ...analysis.deleted,
                ...analysis.renamed
            ][0];
            const filename = this.getDisplayFilename(file);
            return this.truncateSummary(`Update ${filename}`);
        }

        // 2-3 files - list them if summary fits
        if (totalCount >= 2 && totalCount <= 3) {
            const allFiles = [
                ...analysis.modified,
                ...analysis.added,
                ...analysis.deleted,
                ...analysis.renamed
            ];
            const filenames = allFiles.map(f => this.getDisplayFilename(f, 15));
            const summary = `Update ${filenames.join(', ')}`;

            if (summary.length <= CommitMessageService.MAX_SUMMARY_LENGTH) {
                return summary;
            }
        }

        // 4+ files or summary too long - use count
        return `Update ${totalCount} file${totalCount > 1 ? 's' : ''}`;
    }

    /**
     * Get display-friendly filename (basename only, handle binary files)
     * 
     * @param filepath - Full file path
     * @param maxLength - Maximum length for filename (default: MAX_FILENAME_LENGTH)
     * @returns Display filename
     */
    private getDisplayFilename(filepath: string, maxLength?: number): string {
        // Extract basename from path
        const filename = filepath.split('/').pop() || filepath;

        // Truncate if too long
        const limit = maxLength || CommitMessageService.MAX_FILENAME_LENGTH;
        if (filename.length > limit) {
            return filename.substring(0, limit - 3) + '...';
        }

        return filename;
    }

    /**
     * Truncate summary to maximum length while preserving readability
     * 
     * @param summary - Commit message summary
     * @returns Truncated summary if needed
     */
    private truncateSummary(summary: string): string {
        if (summary.length <= CommitMessageService.MAX_SUMMARY_LENGTH) {
            return summary;
        }

        // Truncate with ellipsis, ensuring we don't cut in middle of word
        const truncated = summary.substring(0, CommitMessageService.MAX_SUMMARY_LENGTH - 3);
        const lastSpace = truncated.lastIndexOf(' ');

        if (lastSpace > CommitMessageService.MAX_SUMMARY_LENGTH * 0.7) {
            return truncated.substring(0, lastSpace) + '...';
        }

        return truncated + '...';
    }
}
