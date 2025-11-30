import { Plugin } from 'obsidian';

/**
 * Multi-Git Plugin for Obsidian
 * Manages multiple git repositories from within Obsidian
 */
export default class MultiGitPlugin extends Plugin {
	/**
	 * Called when the plugin is loaded
	 * Initializes settings, services, and UI components
	 */
	async onload() {
		console.log('Loading Multi-Git plugin');
		
		// Plugin initialization will be implemented here
		// - Load settings
		// - Initialize services
		// - Register commands
		// - Add settings tab
	}

	/**
	 * Called when the plugin is unloaded
	 * Performs cleanup of resources
	 */
	onunload() {
		console.log('Unloading Multi-Git plugin');
		
		// Cleanup will be implemented here
		// - Save any pending state
		// - Cleanup resources
	}
}
