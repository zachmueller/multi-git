import { Plugin } from 'obsidian';
import { MultiGitSettings, DEFAULT_SETTINGS } from './settings/data';
import { RepositoryConfigService } from './services/RepositoryConfigService';
import { GitCommandService } from './services/GitCommandService';

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

		// TODO: Register commands
		// TODO: Add settings tab
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
	 */
	async loadSettings() {
		const savedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
	}

	/**
	 * Save plugin settings to data.json
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
