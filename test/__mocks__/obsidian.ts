/**
 * Mock implementation of Obsidian API for testing
 * This allows us to test plugin logic without requiring the full Obsidian environment
 */

export class Plugin {
    app: any;
    manifest: any;

    async loadData(): Promise<any> {
        return {};
    }

    async saveData(_data: any): Promise<void> {
        // Mock implementation
    }
}

export class PluginSettingTab {
    app: any;
    plugin: Plugin;

    constructor(app: any, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
    }

    display(): void {
        // Mock implementation
    }

    hide(): void {
        // Mock implementation
    }
}

export class Modal {
    app: any;

    constructor(app: any) {
        this.app = app;
    }

    open(): void {
        // Mock implementation
    }

    close(): void {
        // Mock implementation
    }
}

export class Notice {
    constructor(_message: string, _timeout?: number) {
        // Mock implementation
    }
}
