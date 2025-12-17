import { App, SuggestModal } from 'obsidian';
import { RepositoryStatus } from '../settings/data';

/**
 * Modal for selecting a repository when multiple repositories have uncommitted changes
 * 
 * Uses Obsidian's native SuggestModal for consistent UI and built-in keyboard navigation.
 * Displays repositories with their current branch and change count.
 */
export class RepositoryPickerModal extends SuggestModal<RepositoryStatus> {
    private repositories: RepositoryStatus[];
    private onSelect: (repo: RepositoryStatus) => void;

    /**
     * Create a new repository picker modal
     * 
     * @param app - The Obsidian app instance
     * @param repositories - List of repositories with uncommitted changes
     * @param onSelect - Callback invoked when user selects a repository
     */
    constructor(
        app: App,
        repositories: RepositoryStatus[],
        onSelect: (repo: RepositoryStatus) => void
    ) {
        super(app);
        this.repositories = repositories;
        this.onSelect = onSelect;

        // Set modal title
        this.setPlaceholder('Select a repository to commit and push...');
    }

    /**
     * Get suggestions based on query
     * Filters repositories by name matching the query string
     * 
     * @param query - User's search query
     * @returns Filtered list of repositories
     */
    getSuggestions(query: string): RepositoryStatus[] {
        const lowerQuery = query.toLowerCase();

        return this.repositories.filter((repo) =>
            repo.repositoryName.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Render a suggestion item
     * Shows repository name with change count, and branch information
     * 
     * @param repo - Repository to render
     * @param el - Container element to render into
     */
    renderSuggestion(repo: RepositoryStatus, el: HTMLElement): void {
        // Calculate total changes
        const totalChanges =
            repo.stagedFiles.length +
            repo.unstagedFiles.length +
            repo.untrackedFiles.length;

        const changeText = totalChanges === 1 ? '1 change' : `${totalChanges} changes`;

        // Primary text: repository name with change count
        const primaryText = el.createDiv({ cls: 'suggestion-content' });
        primaryText.createDiv({
            text: `${repo.repositoryName} (${changeText})`,
            cls: 'suggestion-title',
        });

        // Secondary text: branch information
        const branchText = repo.currentBranch ?? 'detached HEAD';
        primaryText.createDiv({
            text: `Branch: ${branchText}`,
            cls: 'suggestion-note',
        });
    }

    /**
     * Handle user selecting a suggestion
     * Calls the onSelect callback with the selected repository
     * 
     * @param repo - Selected repository
     */
    onChooseSuggestion(repo: RepositoryStatus): void {
        this.onSelect(repo);
    }
}
