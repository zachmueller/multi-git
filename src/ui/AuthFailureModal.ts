import { App } from 'obsidian';
import { CriticalErrorModal } from './CriticalErrorModal';
import { ClassifiedError } from '../utils/errors';

/**
 * Modal for displaying authentication failure errors with setup guidance.
 * 
 * This modal provides detailed instructions for:
 * - SSH key setup and configuration
 * - HTTPS credential configuration
 * - Platform-specific guidance
 * - Links to relevant documentation
 */
export class AuthFailureModal extends CriticalErrorModal {
    /**
     * Create a new authentication failure modal
     * 
     * @param app - The Obsidian app instance
     * @param classifiedError - The classified authentication error
     */
    constructor(app: App, classifiedError: ClassifiedError) {
        super(app, classifiedError);
    }

    /**
     * Override header to show authentication-specific icon and title
     */
    protected renderHeader(container: HTMLElement): void {
        const header = container.createEl('div');
        header.addClass('multi-git-error-header');

        const iconContainer = header.createEl('div');
        iconContainer.addClass('multi-git-error-icon');
        iconContainer.innerHTML = '🔐';

        const titleContainer = header.createEl('div');
        titleContainer.addClass('multi-git-error-title-container');

        const title = titleContainer.createEl('h2', {
            text: 'Authentication Failed',
        });
        title.addClass('multi-git-error-title');

        const subtitle = titleContainer.createEl('div', {
            text: this.classifiedError.repositoryName,
        });
        subtitle.addClass('multi-git-error-subtitle');
    }

    /**
     * Override to render authentication-specific content
     */
    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('multi-git-error-modal');
        contentEl.addClass('multi-git-auth-modal');

        // Modal header
        this.renderHeader(contentEl);

        // Error message
        this.renderMessage(contentEl);

        // Authentication setup instructions
        this.renderAuthSetupInstructions(contentEl);

        // Technical details (collapsible)
        if (this.classifiedError.technicalDetails) {
            this.renderTechnicalDetails(contentEl);
        }

        // Help link
        if (this.classifiedError.helpLink) {
            this.renderHelpLink(contentEl);
        }

        // Acknowledgment button
        this.renderButtons(contentEl);
    }

    /**
     * Render authentication setup instructions
     */
    private renderAuthSetupInstructions(container: HTMLElement): void {
        const setupContainer = container.createEl('div');
        setupContainer.addClass('multi-git-auth-setup');

        // Determine platform
        const platform = this.detectPlatform();

        // SSH Instructions
        this.renderSSHInstructions(setupContainer, platform);

        // OR divider
        const divider = setupContainer.createEl('div');
        divider.addClass('multi-git-auth-divider');
        divider.textContent = '— OR —';

        // HTTPS Instructions
        this.renderHTTPSInstructions(setupContainer, platform);
    }

    /**
     * Render SSH key setup instructions
     */
    private renderSSHInstructions(container: HTMLElement, platform: string): void {
        const sshContainer = container.createEl('div');
        sshContainer.addClass('multi-git-auth-section');

        const sshTitle = sshContainer.createEl('h3', {
            text: '🔑 Option 1: SSH Key Setup',
        });
        sshTitle.addClass('multi-git-auth-section-title');

        const sshSteps = sshContainer.createEl('ol');
        sshSteps.addClass('multi-git-auth-steps');

        // Step 1: Generate SSH key
        const step1 = sshSteps.createEl('li');
        step1.addClass('multi-git-auth-step');

        const step1Text = step1.createEl('div', {
            text: 'Generate an SSH key (if you don\'t have one):',
        });

        const step1Code = step1.createEl('code');
        step1Code.addClass('multi-git-auth-code');
        step1Code.textContent = 'ssh-keygen -t ed25519 -C "your_email@example.com"';

        const step1Note = step1.createEl('div', {
            text: 'Press Enter to accept defaults, optionally set a passphrase.',
        });
        step1Note.addClass('multi-git-auth-note');

        // Step 2: Copy SSH key
        const step2 = sshSteps.createEl('li');
        step2.addClass('multi-git-auth-step');

        const step2Text = step2.createEl('div', {
            text: 'Copy your public key:',
        });

        const step2Code = step2.createEl('code');
        step2Code.addClass('multi-git-auth-code');
        step2Code.textContent = this.getSSHCopyCommand(platform);

        // Step 3: Add to git host
        const step3 = sshSteps.createEl('li');
        step3.addClass('multi-git-auth-step');

        const step3Text = step3.createEl('div', {
            text: 'Add the key to your git hosting service:',
        });

        const step3Links = step3.createEl('ul');
        step3Links.addClass('multi-git-auth-links');

        this.addExternalLink(
            step3Links,
            'GitHub SSH Keys',
            'https://github.com/settings/keys'
        );
        this.addExternalLink(
            step3Links,
            'GitLab SSH Keys',
            'https://gitlab.com/-/profile/keys'
        );
        this.addExternalLink(
            step3Links,
            'Bitbucket SSH Keys',
            'https://bitbucket.org/account/settings/ssh-keys/'
        );

        // Step 4: Test connection
        const step4 = sshSteps.createEl('li');
        step4.addClass('multi-git-auth-step');

        const step4Text = step4.createEl('div', {
            text: 'Test your SSH connection:',
        });

        const step4Code = step4.createEl('code');
        step4Code.addClass('multi-git-auth-code');
        step4Code.textContent = 'ssh -T git@github.com';

        const step4Note = step4.createEl('div', {
            text: '(Replace github.com with your git host)',
        });
        step4Note.addClass('multi-git-auth-note');
    }

    /**
     * Render HTTPS credential setup instructions
     */
    private renderHTTPSInstructions(container: HTMLElement, platform: string): void {
        const httpsContainer = container.createEl('div');
        httpsContainer.addClass('multi-git-auth-section');

        const httpsTitle = httpsContainer.createEl('h3', {
            text: '🌐 Option 2: HTTPS Credentials',
        });
        httpsTitle.addClass('multi-git-auth-section-title');

        const httpsSteps = httpsContainer.createEl('ol');
        httpsSteps.addClass('multi-git-auth-steps');

        // Step 1: Configure credential helper
        const step1 = httpsSteps.createEl('li');
        step1.addClass('multi-git-auth-step');

        const step1Text = step1.createEl('div', {
            text: 'Configure git to store credentials:',
        });

        const step1Code = step1.createEl('code');
        step1Code.addClass('multi-git-auth-code');
        step1Code.textContent = this.getCredentialHelperCommand(platform);

        // Step 2: Create personal access token
        const step2 = httpsSteps.createEl('li');
        step2.addClass('multi-git-auth-step');

        const step2Text = step2.createEl('div', {
            text: 'Create a Personal Access Token (PAT):',
        });

        const step2Links = step2.createEl('ul');
        step2Links.addClass('multi-git-auth-links');

        this.addExternalLink(
            step2Links,
            'GitHub Tokens',
            'https://github.com/settings/tokens'
        );
        this.addExternalLink(
            step2Links,
            'GitLab Tokens',
            'https://gitlab.com/-/profile/personal_access_tokens'
        );
        this.addExternalLink(
            step2Links,
            'Bitbucket App Passwords',
            'https://bitbucket.org/account/settings/app-passwords/'
        );

        const step2Note = step2.createEl('div', {
            text: 'Grant "repo" or "write_repository" permissions.',
        });
        step2Note.addClass('multi-git-auth-note');

        // Step 3: Use token as password
        const step3 = httpsSteps.createEl('li');
        step3.addClass('multi-git-auth-step');

        const step3Text = step3.createEl('div', {
            text: 'When prompted for credentials:',
        });

        const step3Note = step3.createEl('div', {
            text: 'Username: your git username\nPassword: paste your Personal Access Token',
        });
        step3Note.addClass('multi-git-auth-note');
        step3Note.style.whiteSpace = 'pre-line';
    }

    /**
     * Detect the current platform
     */
    private detectPlatform(): string {
        const platform = process.platform;
        if (platform === 'darwin') return 'macOS';
        if (platform === 'win32') return 'Windows';
        return 'Linux';
    }

    /**
     * Get platform-specific SSH copy command
     */
    private getSSHCopyCommand(platform: string): string {
        if (platform === 'macOS') {
            return 'pbcopy < ~/.ssh/id_ed25519.pub';
        } else if (platform === 'Windows') {
            return 'type %USERPROFILE%\\.ssh\\id_ed25519.pub | clip';
        } else {
            return 'cat ~/.ssh/id_ed25519.pub';
        }
    }

    /**
     * Get platform-specific credential helper command
     */
    private getCredentialHelperCommand(platform: string): string {
        if (platform === 'macOS') {
            return 'git config --global credential.helper osxkeychain';
        } else if (platform === 'Windows') {
            return 'git config --global credential.helper wincred';
        } else {
            return 'git config --global credential.helper store';
        }
    }

    /**
     * Add an external link to a list
     */
    private addExternalLink(list: HTMLElement, text: string, url: string): void {
        const listItem = list.createEl('li');
        const link = listItem.createEl('a', {
            text: text,
            href: url,
        });
        link.addClass('multi-git-auth-link');
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    }
}
