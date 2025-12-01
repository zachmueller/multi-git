import { Plugin } from 'obsidian';
import { MultiGitSettings, DEFAULT_SETTINGS } from './settings/data';
import { RepositoryConfigService } from './services/RepositoryConfigService';
import { GitCommandService } from './services/GitCommandService';
import { MultiGitSettingTab } from './settings/SettingTab';

/**
 * Multi-Git Plugin for Obsidian
 * Manages multiple git repositories from within Obsidian
 */
export default class MultiGitPlugin extends Plugin {
	settings!: MultiGitSettings;
	repositoryConfigService!: RepositoryConfigService;
	gitCommandService!: GitCommandService;

	/**
	 * Called when the plugin is loaded
	 * Initializes settings, services, and UI components
	 */
	async onload() {
		console.log('Loading Multi-Git plugin');

		// Load settings from data.json
		await this.loadSettings();

		// Initialize services
		this.gitCommandService = new GitCommandService();
		this.repositoryConfigService = new RepositoryConfigService(this);

		// Apply settings migration for backward compatibility
		this.settings = this.repositoryConfigService.migrateSettings(this.settings);
		await this.saveSettings();

		// Register settings tab
		this.addSettingTab(new MultiGitSettingTab(this.app, this));

		// TODO: Register commands
	}

	/**
	 * Called when the plugin is unloaded
	 * Performs cleanup of resources
	 */
	onunload() {
		console.log('Unloading Multi-Git plugin');

		// TODO: Cleanup resources
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
