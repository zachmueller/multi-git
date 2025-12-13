import { Plugin, Notice } from 'obsidian';
import { MultiGitSettings, DEFAULT_SETTINGS, RepositoryConfig, RepositoryStatus } from './settings/data';
import { RepositoryConfigService } from './services/RepositoryConfigService';
import { GitCommandService } from './services/GitCommandService';
import { FetchSchedulerService } from './services/FetchSchedulerService';
import { NotificationService } from './services/NotificationService';
import { CommitMessageService } from './services/CommitMessageService';
import { MultiGitSettingTab } from './settings/SettingTab';
import { RepositoryPickerModal } from './ui/RepositoryPickerModal';
import { CommitMessageModal } from './ui/CommitMessageModal';
import { Logger } from './utils/logger';
import { GitCommitError, GitPushError, FetchError, FetchErrorCode } from './utils/errors';

/**
 * Multi-Git Plugin for Obsidian
 * Manages multiple git repositories from within Obsidian
 */
export default class MultiGitPlugin extends Plugin {
	settings!: MultiGitSettings;
	repositoryConfigService!: RepositoryConfigService;
	gitCommandService!: GitCommandService;
	fetchSchedulerService!: FetchSchedulerService;
	notificationService!: NotificationService;
	commitMessageService!: CommitMessageService;

	/**
	 * Called when the plugin is loaded
	 * Initializes settings, services, and UI components
	 */
	async onload() {
		console.log('Loading Multi-Git plugin');

		// Load settings from data.json
		await this.loadSettings();

		// Initialize logger with settings
		Logger.initialize(this.settings);
		Logger.debug('Plugin', 'Multi-Git plugin loading');

		// Initialize services
		this.gitCommandService = new GitCommandService(this.settings);
		this.repositoryConfigService = new RepositoryConfigService(this, this.gitCommandService);
		this.notificationService = new NotificationService(this.settings);
		this.commitMessageService = new CommitMessageService();
		this.fetchSchedulerService = new FetchSchedulerService(
			this.repositoryConfigService,
			this.gitCommandService,
			this.notificationService
		);

		// Apply settings migration for backward compatibility
		this.settings = this.repositoryConfigService.migrateSettings(this.settings);
		await this.saveSettings();

		// Register settings tab
		this.addSettingTab(new MultiGitSettingTab(this.app, this));

		// Start automated fetching for all enabled repositories
		this.fetchSchedulerService.startAll();

		// Optionally fetch on startup if enabled
		if (this.settings.fetchOnStartup) {
			// Delay initial fetch to avoid blocking plugin load
			setTimeout(async () => {
				await this.fetchSchedulerService.fetchAllNow();
			}, 2000);
		}

		// Register commands
		this.registerCommands();
	}

	/**
	 * Register plugin commands
	 */
	registerCommands() {
		// Command: Commit and push changes
		this.addCommand({
			id: 'multi-git:commit-push',
			name: 'Commit and push changes',
			callback: () => this.handleCommitAndPush(),
		});
	}

	/**
	 * Handle the commit and push workflow
	 * Orchestrates the entire process from repository selection to push
	 */
	async handleCommitAndPush() {
		try {
			Logger.debug('Command', 'Starting commit and push workflow');

			// Get all enabled repositories
			const repositories = this.repositoryConfigService.getEnabledRepositories();
			if (repositories.length === 0) {
				new Notice('No repositories configured. Add repositories in settings.');
				Logger.debug('Command', 'No repositories configured');
				return;
			}

			// Check status for each repository and filter those with changes
			Logger.debug('Command', `Checking status for ${repositories.length} repositories`);
			const reposWithChanges = await this.getRepositoriesWithChanges(repositories);

			if (reposWithChanges.length === 0) {
				new Notice('No uncommitted changes in any repository.');
				Logger.debug('Command', 'No repositories with uncommitted changes');
				return;
			}

			Logger.debug('Command', `Found ${reposWithChanges.length} repositories with changes`);

			// Handle single repository case (skip picker)
			if (reposWithChanges.length === 1) {
				await this.proceedWithCommit(reposWithChanges[0]);
				return;
			}

			// Handle multiple repositories case (show picker)
			this.showRepositoryPicker(reposWithChanges);

		} catch (error) {
			Logger.error('Command', 'Failed to execute commit and push workflow', error);
			this.handleWorkflowError(error);
		}
	}

	/**
	 * Get repositories that have uncommitted changes
	 */
	async getRepositoriesWithChanges(
		repositories: RepositoryConfig[]
	): Promise<RepositoryStatus[]> {
		const results: RepositoryStatus[] = [];

		for (const repo of repositories) {
			try {
				const status = await this.gitCommandService.getRepositoryStatus(
					repo.path,
					repo.id,
					repo.name
				);

				if (status.hasUncommittedChanges) {
					results.push(status);
					const totalChanges = status.stagedFiles.length + status.unstagedFiles.length + status.untrackedFiles.length;
					Logger.debug('Command', `Repository "${repo.name}" has ${totalChanges} changes`);
				}
			} catch (error) {
				Logger.error('Command', `Failed to get status for repository "${repo.name}"`, error);
				// Continue checking other repositories
			}
		}

		return results;
	}

	/**
	 * Show repository picker modal for user to select which repository to commit
	 */
	showRepositoryPicker(reposWithChanges: RepositoryStatus[]) {
		const modal = new RepositoryPickerModal(
			this.app,
			reposWithChanges,
			async (selected) => {
				Logger.debug('Command', `User selected repository: ${selected.repositoryName}`);
				await this.proceedWithCommit(selected);
			}
		);
		modal.open();
	}

	/**
	 * Proceed with commit workflow for the selected repository
	 */
	async proceedWithCommit(status: RepositoryStatus) {
		try {
			Logger.debug('Command', `Proceeding with commit for repository: ${status.repositoryName}`);

			// Generate commit message suggestion
			const suggestion = this.commitMessageService.generateSuggestion(status);
			Logger.debug('Command', `Generated commit message suggestion: ${suggestion.summary}`);

			// Show commit message modal
			const modal = new CommitMessageModal(
				this.app,
				status,
				suggestion.summary,
				async (message: string) => {
					await this.executeCommitAndPush(status.repositoryPath, status.repositoryName, message);
				}
			);
			modal.open();

		} catch (error) {
			Logger.error('Command', `Failed to proceed with commit for "${status.repositoryName}"`, error);
			this.handleWorkflowError(error, status.repositoryName);
		}
	}

	/**
	 * Execute the commit and push operation
	 */
	async executeCommitAndPush(repoPath: string, repoName: string, message: string) {
		try {
			Logger.debug('Command', `Executing commit and push for repository: ${repoName}`);
			Logger.debug('Command', `Commit message: ${message}`);

			// Execute the commit and push workflow
			await this.gitCommandService.commitAndPush(repoPath, message);

			// Show success notification
			new Notice(`Successfully committed and pushed changes to "${repoName}"`);
			Logger.debug('Command', `Successfully committed and pushed to "${repoName}"`);

		} catch (error) {
			Logger.error('Command', `Failed to commit and push to "${repoName}"`, error);
			throw error; // Re-throw to be handled by the modal
		}
	}

	/**
	 * Handle errors during the workflow
	 * Maps error types to user-friendly messages
	 */
	handleWorkflowError(error: unknown, repositoryName?: string) {
		const repoContext = repositoryName ? ` for repository "${repositoryName}"` : '';

		if (error instanceof FetchError) {
			if (error.code === FetchErrorCode.AUTH_ERROR) {
				new Notice(`Authentication failed${repoContext}. Please configure your git credentials.`);
			} else if (error.code === FetchErrorCode.NETWORK_ERROR) {
				new Notice(`Network error${repoContext}. Please check your internet connection.`);
			} else {
				new Notice(`Git error${repoContext}: ${error.message}`);
			}
		} else if (error instanceof GitCommitError) {
			new Notice(`Commit failed${repoContext}: ${error.message}`);
		} else if (error instanceof GitPushError) {
			new Notice(`Push failed${repoContext}: ${error.message}`);
		} else if (error instanceof Error) {
			new Notice(`Error${repoContext}: ${error.message}`);
		} else {
			new Notice(`An unexpected error occurred${repoContext}.`);
		}
	}

	/**
	 * Called when the plugin is unloaded
	 * Performs cleanup of resources
	 */
	onunload() {
		console.log('Unloading Multi-Git plugin');
		Logger.debug('Plugin', 'Multi-Git plugin unloading');

		// Stop all scheduled fetches
		this.fetchSchedulerService.stopAll();

		Logger.debug('Plugin', 'Multi-Git plugin unloaded successfully');
	}

	/**
	 * Load plugin settings from data.json
	 * Merges saved settings with defaults to handle new fields
	 * Applies migration for backward compatibility
	 */
	async loadSettings() {
		const savedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);

		// Apply migrations for backward compatibility
		// This will be done after repositoryConfigService is initialized
	}

	/**
	 * Save plugin settings to data.json
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
