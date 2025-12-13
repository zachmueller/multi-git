import { Plugin } from 'obsidian';
import { MultiGitSettings, DEFAULT_SETTINGS } from './settings/data';
import { RepositoryConfigService } from './services/RepositoryConfigService';
import { GitCommandService } from './services/GitCommandService';
import { FetchSchedulerService } from './services/FetchSchedulerService';
import { NotificationService } from './services/NotificationService';
import { MultiGitSettingTab } from './settings/SettingTab';
import { Logger } from './utils/logger';

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

		// TODO: Register commands
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
