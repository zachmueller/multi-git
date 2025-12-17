/**
 * Tests for AuthFailureModal
 */

import { App } from 'obsidian';
import { AuthFailureModal } from '../../src/ui/AuthFailureModal';
import { ClassifiedError, ErrorSeverity, ErrorScenario } from '../../src/utils/errors';

// Mock Obsidian App
const mockApp = {
    vault: {},
    workspace: {},
} as App;

describe('AuthFailureModal', () => {
    let containerEl: HTMLElement;
    const originalPlatform = process.platform;

    beforeEach(() => {
        containerEl = document.createElement('div');

        // Mock Obsidian-specific methods recursively
        const mockElement = (el: HTMLElement) => {
            (el as any).empty = jest.fn(function (this: HTMLElement) {
                this.innerHTML = '';
            });
            (el as any).createEl = jest.fn((tag: string, attrs?: any) => {
                const child = document.createElement(tag);
                if (attrs?.text) child.textContent = attrs.text;
                if (attrs?.cls) child.className = attrs.cls;
                if (attrs?.href) (child as any).href = attrs.href;
                el.appendChild(child);
                mockElement(child); // Recursively mock child elements
                return child;
            });
            (el as any).addClass = jest.fn(function (this: HTMLElement, className: string) {
                this.classList.add(className);
            });
            (el as any).setAttribute = jest.fn(function (this: HTMLElement, name: string, value: string) {
                (this as any)[name] = value;
            });
        };

        mockElement(containerEl);

        document.body.appendChild(containerEl);
    });

    afterEach(() => {
        document.body.removeChild(containerEl);
        // Restore original platform
        Object.defineProperty(process, 'platform', {
            value: originalPlatform,
        });
    });

    const createAuthError = (overrides?: Partial<ClassifiedError>): ClassifiedError => ({
        error: new Error('Authentication failed'),
        severity: ErrorSeverity.CRITICAL,
        scenario: ErrorScenario.AUTHENTICATION_FAILURE,
        repositoryId: 'test-repo-id',
        repositoryName: 'test-repo',
        userMessage: 'Authentication failed for this repository',
        suggestedActions: [
            'Set up SSH keys for your git provider',
            'Or configure HTTPS credentials',
        ],
        technicalDetails: 'fatal: Authentication failed for \'https://github.com/user/repo.git\'',
        helpLink: 'https://docs.github.com/authentication',
        operation: 'fetch',
        ...overrides,
    });

    describe('constructor', () => {
        it('should create modal with authentication error', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            expect(modal).toBeInstanceOf(AuthFailureModal);
        });
    });

    describe('onOpen', () => {
        it('should render authentication-specific header', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const title = containerEl.querySelector('.multi-git-error-title');
            expect(title?.textContent).toBe('Authentication Failed');

            const icon = containerEl.querySelector('.multi-git-error-icon');
            expect(icon?.innerHTML).toBe('🔐');
        });

        it('should apply auth modal specific class', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            expect(containerEl.classList.contains('multi-git-auth-modal')).toBe(true);
        });

        it('should render SSH setup instructions', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const sshTitle = containerEl.querySelector('.multi-git-auth-section-title');
            expect(sshTitle?.textContent).toContain('SSH Key Setup');

            const sshSteps = containerEl.querySelectorAll('.multi-git-auth-step');
            expect(sshSteps.length).toBeGreaterThan(0);
        });

        it('should render HTTPS setup instructions', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const sections = containerEl.querySelectorAll('.multi-git-auth-section-title');
            const httpsSection = Array.from(sections).find(s => s.textContent?.includes('HTTPS'));
            expect(httpsSection).toBeTruthy();
        });

        it('should render divider between SSH and HTTPS options', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const divider = containerEl.querySelector('.multi-git-auth-divider');
            expect(divider?.textContent).toContain('OR');
        });

        it('should include links to git hosting services', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const links = containerEl.querySelectorAll('.multi-git-auth-link');
            expect(links.length).toBeGreaterThan(0);

            // Check for GitHub link
            const githubLink = Array.from(links).find(link =>
                link.textContent?.includes('GitHub')
            ) as HTMLAnchorElement;
            expect(githubLink).toBeTruthy();
            expect(githubLink?.href).toContain('github.com');
        });
    });

    describe('platform-specific instructions', () => {
        it('should show macOS SSH copy command on macOS', () => {
            Object.defineProperty(process, 'platform', {
                value: 'darwin',
            });

            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const codeBlocks = containerEl.querySelectorAll('.multi-git-auth-code');
            const copyCommand = Array.from(codeBlocks).find(code =>
                code.textContent?.includes('pbcopy')
            );
            expect(copyCommand).toBeTruthy();
        });

        it('should show Windows SSH copy command on Windows', () => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
            });

            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const codeBlocks = containerEl.querySelectorAll('.multi-git-auth-code');
            const copyCommand = Array.from(codeBlocks).find(code =>
                code.textContent?.includes('clip')
            );
            expect(copyCommand).toBeTruthy();
        });

        it('should show Linux SSH copy command on Linux', () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
            });

            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const codeBlocks = containerEl.querySelectorAll('.multi-git-auth-code');
            const copyCommand = Array.from(codeBlocks).find(code =>
                code.textContent?.includes('cat ~/.ssh')
            );
            expect(copyCommand).toBeTruthy();
        });

        it('should show macOS credential helper on macOS', () => {
            Object.defineProperty(process, 'platform', {
                value: 'darwin',
            });

            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const codeBlocks = containerEl.querySelectorAll('.multi-git-auth-code');
            const credHelper = Array.from(codeBlocks).find(code =>
                code.textContent?.includes('osxkeychain')
            );
            expect(credHelper).toBeTruthy();
        });

        it('should show Windows credential helper on Windows', () => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
            });

            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const codeBlocks = containerEl.querySelectorAll('.multi-git-auth-code');
            const credHelper = Array.from(codeBlocks).find(code =>
                code.textContent?.includes('wincred')
            );
            expect(credHelper).toBeTruthy();
        });

        it('should show Linux credential helper on Linux', () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
            });

            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const codeBlocks = containerEl.querySelectorAll('.multi-git-auth-code');
            const credHelper = Array.from(codeBlocks).find(code =>
                code.textContent?.includes('credential.helper store')
            );
            expect(credHelper).toBeTruthy();
        });
    });

    describe('SSH setup instructions', () => {
        it('should include SSH key generation command', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const codeBlocks = containerEl.querySelectorAll('.multi-git-auth-code');
            const keygenCommand = Array.from(codeBlocks).find(code =>
                code.textContent?.includes('ssh-keygen')
            );
            expect(keygenCommand).toBeTruthy();
            expect(keygenCommand?.textContent).toContain('ed25519');
        });

        it('should include SSH test connection command', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const codeBlocks = containerEl.querySelectorAll('.multi-git-auth-code');
            const testCommand = Array.from(codeBlocks).find(code =>
                code.textContent?.includes('ssh -T')
            );
            expect(testCommand).toBeTruthy();
        });

        it('should link to GitHub SSH settings', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const links = containerEl.querySelectorAll('.multi-git-auth-link');
            const githubLink = Array.from(links).find(link =>
                link.textContent?.includes('GitHub') && (link as HTMLAnchorElement).href.includes('keys')
            ) as HTMLAnchorElement;

            expect(githubLink).toBeTruthy();
            expect(githubLink?.href).toBe('https://github.com/settings/keys');
        });
    });

    describe('HTTPS setup instructions', () => {
        it('should include personal access token links', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const links = containerEl.querySelectorAll('.multi-git-auth-link');
            const tokenLinks = Array.from(links).filter(link =>
                link.textContent?.includes('Token') || link.textContent?.includes('Password')
            );

            expect(tokenLinks.length).toBeGreaterThan(0);
        });

        it('should explain how to use token as password', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const notes = containerEl.querySelectorAll('.multi-git-auth-note');
            const tokenNote = Array.from(notes).find(note =>
                note.textContent?.includes('Personal Access Token')
            );

            expect(tokenNote).toBeTruthy();
        });
    });

    describe('external links', () => {
        it('should open links in new tab', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const links = containerEl.querySelectorAll('.multi-git-auth-link');
            links.forEach(link => {
                expect((link as HTMLAnchorElement).target).toBe('_blank');
                expect((link as HTMLAnchorElement).rel).toBe('noopener noreferrer');
            });
        });

        it('should include links for major git hosting services', () => {
            const error = createAuthError();
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');
            modal.onOpen();

            const links = Array.from(containerEl.querySelectorAll('.multi-git-auth-link'));
            const linkTexts = links.map(l => l.textContent);

            expect(linkTexts.some(t => t?.includes('GitHub'))).toBe(true);
            expect(linkTexts.some(t => t?.includes('GitLab'))).toBe(true);
            expect(linkTexts.some(t => t?.includes('Bitbucket'))).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle error without technical details', () => {
            const error = createAuthError({
                technicalDetails: undefined,
            });
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');

            expect(() => modal.onOpen()).not.toThrow();
        });

        it('should handle error without help link', () => {
            const error = createAuthError({
                helpLink: undefined,
            });
            const modal = new AuthFailureModal(mockApp, error);

            modal.contentEl = containerEl;
            modal.titleEl = document.createElement('div');

            expect(() => modal.onOpen()).not.toThrow();
        });
    });
});
