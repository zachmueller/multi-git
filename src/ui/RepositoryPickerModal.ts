import { App, Modal } from 'obsidian';
import { RepositoryStatus } from '../settings/data';

/**
 * Modal for selecting a repository when multiple repositories have uncommitted changes
 * 
 * Displays a list of repositories with their current branch and change count,
 * allowing the user to select which repository to commit and push.
 */
export class RepositoryPickerModal extends Modal {
    private repositories: RepositoryStatus[];
    private onSelect: (repo: RepositoryStatus) => void;
    private selectedIndex: number = 0;
    private repositoryElements: HTMLElement[] = [];

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
    }

    /**
     * Called when the modal is opened
     * Renders the repository list and sets up event handlers
     */
    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('multi-git-picker-modal');

        // Modal title
        const title = contentEl.createEl('h2', {
            text: 'Select Repository',
        });
        title.addClass('multi-git-picker-title');

        // Handle empty state
        if (this.repositories.length === 0) {
            const emptyMessage = contentEl.createEl('p', {
                text: 'No repositories with uncommitted changes.',
            });
            emptyMessage.addClass('multi-git-picker-empty');
            return;
        }

        // Repository list container
        const listContainer = contentEl.createEl('div');
        listContainer.addClass('multi-git-picker-list');

        // Render each repository
        this.repositories.forEach((repo, index) => {
            const repoItem = this.createRepositoryItem(repo, index);
            listContainer.appendChild(repoItem);
            this.repositoryElements.push(repoItem);
        });

        // Highlight the first item by default
        this.updateSelection();

        // Set up keyboard event handlers
        this.setupKeyboardNavigation();
    }

    /**
     * Create a repository list item element
     * 
     * @param repo - Repository status information
     * @param index - Index in the repository list
     * @returns HTMLElement for the repository item
     */
    private createRepositoryItem(repo: RepositoryStatus, index: number): HTMLElement {
        const item = document.createElement('div');
        item.addClass('multi-git-picker-item');
        item.setAttribute('data-index', index.toString());

        // Repository name
        const nameEl = item.createEl('div', {
            text: repo.repositoryName,
        });
        nameEl.addClass('multi-git-picker-item-name');

        // Repository info (branch and change count)
        const infoEl = item.createEl('div');
        infoEl.addClass('multi-git-picker-item-info');

        // Branch name
        const branchText = repo.currentBranch ?? 'detached HEAD';
        const branchEl = infoEl.createEl('span', {
            text: `Branch: ${branchText}`,
        });
        branchEl.addClass('multi-git-picker-item-branch');

        // Change count
        const totalChanges =
            repo.stagedFiles.length +
            repo.unstagedFiles.length +
            repo.untrackedFiles.length;
        const changesText = totalChanges === 1 ? '1 change' : `${totalChanges} changes`;
        const changesEl = infoEl.createEl('span', {
            text: changesText,
        });
        changesEl.addClass('multi-git-picker-item-changes');

        // Click handler
        item.addEventListener('click', () => {
            this.selectRepository(index);
        });

        return item;
    }

    /**
     * Update the visual selection state
     * Highlights the currently selected repository item
     */
    private updateSelection(): void {
        this.repositoryElements.forEach((el, index) => {
            if (index === this.selectedIndex) {
                el.addClass('multi-git-picker-item-selected');
            } else {
                el.removeClass('multi-git-picker-item-selected');
            }
        });

        // Ensure selected item is visible (scroll into view)
        const selectedEl = this.repositoryElements[this.selectedIndex];
        if (selectedEl) {
            selectedEl.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }

    /**
     * Set up keyboard navigation handlers
     */
    private setupKeyboardNavigation(): void {
        this.scope.register([], 'ArrowDown', (evt: KeyboardEvent) => {
            evt.preventDefault();
            this.moveSelection(1);
            return false;
        });

        this.scope.register([], 'ArrowUp', (evt: KeyboardEvent) => {
            evt.preventDefault();
            this.moveSelection(-1);
            return false;
        });

        this.scope.register([], 'Enter', (evt: KeyboardEvent) => {
            evt.preventDefault();
            this.confirmSelection();
            return false;
        });
    }

    /**
     * Move the selection up or down
     * 
     * @param delta - Direction to move (-1 for up, 1 for down)
     */
    private moveSelection(delta: number): void {
        const newIndex = this.selectedIndex + delta;

        // Wrap around at boundaries
        if (newIndex < 0) {
            this.selectedIndex = this.repositories.length - 1;
        } else if (newIndex >= this.repositories.length) {
            this.selectedIndex = 0;
        } else {
            this.selectedIndex = newIndex;
        }

        this.updateSelection();
    }

    /**
     * Select a repository by index (from click or keyboard)
     * 
     * @param index - Index of the repository to select
     */
    private selectRepository(index: number): void {
        this.selectedIndex = index;
        this.confirmSelection();
    }

    /**
     * Confirm the current selection and invoke the callback
     */
    private confirmSelection(): void {
        const selectedRepo = this.repositories[this.selectedIndex];
        if (selectedRepo) {
            this.close();
            this.onSelect(selectedRepo);
        }
    }

    /**
     * Called when the modal is closed
     * Cleanup is handled automatically by Obsidian
     */
    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
        this.repositoryElements = [];
    }
}
