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

export class ItemView {
    leaf: any;
    containerEl: HTMLElement;

    constructor(leaf: any) {
        this.leaf = leaf;

        // Use the leaf's containerEl if it exists, otherwise create one
        if (leaf && leaf.containerEl) {
            this.containerEl = leaf.containerEl;
        } else {
            this.containerEl = document.createElement('div');
        }

        // Ensure the structure that Obsidian's ItemView creates exists
        // children[0] is typically the view header
        if (this.containerEl.children.length === 0) {
            const viewHeader = document.createElement('div');
            viewHeader.className = 'view-header';
            this.containerEl.appendChild(viewHeader);

            // children[1] is the view content container
            const viewContent = document.createElement('div');
            viewContent.className = 'view-content';
            this.containerEl.appendChild(viewContent);
        }
    }

    getViewType(): string {
        return 'mock-view';
    }

    getDisplayText(): string {
        return 'Mock View';
    }

    getIcon(): string {
        return 'document';
    }

    async onOpen(): Promise<void> {
        // Mock implementation
    }

    async onClose(): Promise<void> {
        // Mock implementation
    }
}

export function setIcon(_element: HTMLElement, _iconId: string): void {
    // Mock implementation - does nothing
}
