# Multi-Git for Obsidian

A powerful Obsidian plugin for managing multiple git repositories from within your vault. Configure and track multiple git repositories, each with independent settings and status.

## Features

- 🗂️ **Multiple Repository Management** - Configure and manage multiple git repositories
- ✅ **Path Validation** - Automatic validation ensures only valid git repositories are added
- 🔄 **Enable/Disable** - Toggle repositories on/off without removing them
- 💾 **Persistent Configuration** - Repository settings persist across Obsidian sessions
- 🛡️ **Security** - Path validation prevents traversal attacks and invalid paths
- 🌍 **Cross-Platform** - Works on macOS, Windows, and Linux
- 📥 **Automated Remote Fetch** - Automatically fetch remote changes at configurable intervals
- 🔔 **Smart Notifications** - Get notified only when remote changes require your attention
- ⚡ **Manual Fetch** - Trigger immediate fetch for any repository with one click
- 📊 **Fetch Status** - See last fetch time and remote change indicators for each repository
- 🚀 **Hotkey-Driven Push** - Quickly commit and push changes with a single hotkey
- 💬 **Smart Commit Messages** - Auto-generated commit message suggestions based on changed files
- 📝 **Repository Picker** - Select from multiple repositories with uncommitted changes

## Quick Start

1. **Add a repository** in plugin settings
2. **Configure hotkey** for "Commit and push changes" command
3. **Make changes** to files in your repository
4. **Press hotkey** to commit and push
5. **Select repository** (if multiple have changes)
6. **Review and edit** commit message
7. **Confirm** to commit and push

## Requirements

- **Obsidian** v1.4.0 or higher
- **Git** installed and accessible from command line
  - macOS: Install via [Homebrew](https://brew.sh/) (`brew install git`) or [Xcode Command Line Tools](https://developer.apple.com/xcode/)
  - Windows: Install from [git-scm.com](https://git-scm.com/download/win)
  - Linux: Install via package manager (`apt install git`, `dnf install git`, etc.)

To verify git is installed, run in terminal:
```bash
git --version
```

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Obsidian Settings
2. Navigate to **Community plugins**
3. Click **Browse** and search for "Multi-Git"
4. Click **Install**
5. Enable the plugin

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/YOUR_USERNAME/multi-git/releases)
2. Extract the files to your vault's plugins folder:
   - `<vault>/.obsidian/plugins/multi-git/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

### Development Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/multi-git.git
   cd multi-git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Create a symlink to your vault's plugins folder:
   ```bash
   ln -s $(pwd) /path/to/vault/.obsidian/plugins/multi-git
   ```

5. Reload Obsidian and enable the plugin

## Usage

### Adding a Repository

1. Open Obsidian Settings
2. Navigate to **Multi-Git** under Plugin Options
3. Click **Add Repository**
4. Enter the absolute path to your git repository
   - Example (macOS/Linux): `/Users/username/projects/my-repo`
   - Example (Windows): `C:\Users\username\projects\my-repo`
5. Optionally provide a custom name (defaults to directory name)
6. Click **Add**

The plugin will validate that:
- The path is an absolute path
- The directory exists
- The directory is a valid git repository

### Managing Repositories

Each repository in the list shows:
- **Repository name** and full path
- **Status** (Enabled/Disabled)
- **Last fetch time** - When remote changes were last checked
- **Fetch status** - Current state (idle, fetching, success, error)
- **Remote changes indicator** - Shows if new commits are available
- **Creation date**

Available actions:
- **Toggle** - Enable or disable a repository
- **Fetch Now** - Manually trigger immediate fetch for this repository
- **Remove** - Delete the repository from configuration (does not affect files on disk)

### Automated Remote Fetch

The plugin automatically fetches remote changes for all enabled repositories:

1. **Default Behavior:**
   - Fetch runs every 5 minutes by default
   - Operates silently in the background
   - Does not interrupt your workflow

2. **Notifications:**
   - You receive a notification ONLY when remote changes are detected
   - Notification shows repository name and number of new commits
   - No notifications for successful fetches without changes

3. **Configuration:**
   - Set global fetch interval in plugin settings
   - Override interval per repository if needed
   - Enable fetch on plugin startup (enabled by default)
   - Toggle notifications on/off globally

4. **Manual Fetch:**
   - Click "Fetch Now" button for any repository
   - Click "Fetch All Now" to check all repositories immediately
   - Manual fetches show real-time status updates

**Example notification:**
```
📥 Repository 'my-vault' has 3 new commits available
```

### Fetch Status Indicators

Each repository displays its fetch status:

- **✓ Success** - Last fetch completed successfully
- **⟳ Fetching** - Fetch operation currently in progress
- **✗ Error** - Last fetch failed (see error message)
- **◯ Idle** - No fetch has run yet
- **📥 Changes Available** - Remote changes detected, action needed

### Repository List

The settings page displays:
- Total repository count
- List of all configured repositories
- Empty state message when no repositories are configured

## Configuration

All repository configurations are stored in:
```
<vault>/.obsidian/plugins/multi-git/data.json
```

### Configuration Schema

```json
{
  "repositories": [
    {
      "id": "unique-uuid-v4",
      "path": "/absolute/path/to/repository",
      "name": "Repository Name",
      "enabled": true,
      "createdAt": 1704067200000,
      "lastValidated": 1704153600000,
      "fetchInterval": 300000,
      "lastFetchTime": 1704153600000,
      "lastFetchStatus": "success",
      "lastFetchError": null,
      "remoteChanges": false,
      "remoteCommitCount": 0
    }
  ],
  "globalFetchInterval": 300000,
  "fetchOnStartup": true,
  "notifyOnRemoteChanges": true,
  "lastGlobalFetch": 1704153600000,
  "version": "0.1.0"
}
```

**Repository Fields:**
- `id` - Unique identifier (UUID v4)
- `path` - Absolute path to git repository
- `name` - Display name for the repository
- `enabled` - Whether repository is active
- `createdAt` - Timestamp when repository was added
- `lastValidated` - Timestamp of last validation (optional)
- `fetchInterval` - Fetch interval in milliseconds (default: 300000 / 5 min)
- `lastFetchTime` - Timestamp of last successful fetch
- `lastFetchStatus` - Current fetch state: 'idle', 'fetching', 'success', 'error'
- `lastFetchError` - Error message from last failed fetch (if any)
- `remoteChanges` - Boolean indicating if remote changes are available
- `remoteCommitCount` - Number of commits behind remote

**Global Settings:**
- `globalFetchInterval` - Default fetch interval for all repositories (milliseconds)
- `fetchOnStartup` - Whether to fetch all repos when plugin loads
- `notifyOnRemoteChanges` - Show notifications for remote changes
- `lastGlobalFetch` - Timestamp of last global fetch operation
- `debugLogging` - Enable comprehensive console logging for troubleshooting (default: false, hidden setting)
- `version` - Configuration schema version

For detailed configuration options, see [Configuration Guide](docs/configuration.md).

## Troubleshooting

### "Git not found" error

**Problem:** Plugin cannot find git installation

**Solution:**
1. Verify git is installed: `git --version`
2. Ensure git is in your system PATH
3. Restart Obsidian after installing git

### "Path must be absolute" error

**Problem:** Provided path is not an absolute path

**Solution:**
- Use full path starting from root
- macOS/Linux: Starts with `/` (e.g., `/Users/name/repo`)
- Windows: Starts with drive letter (e.g., `C:\Users\name\repo`)
- Do NOT use relative paths (`./repo`, `../repo`)
- Do NOT use `~` for home directory

### "Path does not exist" error

**Problem:** Specified directory does not exist

**Solution:**
1. Verify the path is correct
2. Check for typos in the path
3. Ensure all parent directories exist
4. Use file explorer to copy the exact path

### "Not a valid git repository" error

**Problem:** Directory exists but is not a git repository

**Solution:**
1. Navigate to the directory in terminal
2. Check if `.git` folder exists
3. Initialize git if needed: `git init`
4. Clone a repository instead: `git clone <url>`

### Repository not appearing after adding

**Problem:** Repository added but not visible in list

**Solution:**
1. Close and reopen settings tab
2. Reload Obsidian
3. Check console for errors (Ctrl+Shift+I / Cmd+Option+I)

### Cannot remove repository

**Problem:** Remove button not working

**Solution:**
1. Check if confirmation modal appears
2. Try reloading Obsidian
3. Manually edit `data.json` as last resort (backup first!)

### Fetch operations failing

**Problem:** Automatic fetch shows error status

**Common Causes & Solutions:**

1. **Network Error:**
   - Check internet connection
   - Verify repository remote URL is accessible
   - Check firewall settings

2. **Authentication Error:**
   - Ensure SSH keys are configured (for SSH URLs)
   - Check HTTPS credentials are cached (for HTTPS URLs)
   - Test manual fetch: `git fetch` in repository directory

3. **Timeout Error:**
   - Repository may be very large
   - Network may be slow
   - Increase timeout in git config: `git config http.timeout 60`

4. **Repository Error:**
   - Repository may be in invalid state
   - Try running `git status` manually
   - Check for uncommitted changes or conflicts

### Fetch running too frequently

**Problem:** Fetch operations consuming resources

**Solution:**
1. Increase fetch interval in settings (default is 5 minutes)
2. Disable fetch for specific repositories
3. Disable "Fetch on Startup" if not needed
4. Monitor performance with dev tools

### Not receiving notifications

**Problem:** No notifications when remote changes available

**Solution:**
1. Check "Notify on Remote Changes" is enabled in settings
2. Verify Obsidian notifications are enabled in system preferences
3. Check if repository actually has remote changes: `git fetch && git status`
4. Test with manual fetch to see if notification appears

### Fetch shows "success" but no remote changes

**Problem:** Expected to see remote changes but none shown

**Explanation:** This is normal behavior:
- Fetch checks for changes but finds none
- Repository is up-to-date with remote
- Status shows "success" (operation worked correctly)
- No notification (nothing requires your attention)

### Commit and Push Workflow

The plugin provides a streamlined workflow for committing and pushing changes:

1. **Trigger the command:**
   - Use configured hotkey (e.g., Cmd/Ctrl+Shift+P)
   - Or search "Commit and push changes" in command palette

2. **Repository Selection (if needed):**
   - If only one repository has changes, it's selected automatically
   - If multiple repositories have changes, a picker modal appears
   - Use arrow keys to navigate, Enter to select, Escape to cancel

3. **Commit Message:**
   - Modal shows repository name, branch, and changed files
   - Text area pre-filled with smart suggestion based on changes:
     - Single file: "Update filename.txt"
     - Multiple files: "Update file1.txt, file2.txt" or "Update 5 files"
     - New files only: "Add filename.txt" or "Add 3 files"
     - Deletions only: "Remove filename.txt" or "Remove 2 files"
   - Edit message as needed (supports multiline with Shift+Enter)
   - Press Enter or click "Commit & Push" to proceed

4. **Operation Execution:**
   - All changes are staged automatically (`git add -A`)
   - Commit is created with your message
   - Changes are pushed to remote
   - Success notification appears

5. **Error Handling:**
   - Authentication failures: Clear message to configure credentials
   - Network errors: Changes remain committed locally
   - Pre-commit/pre-push hook failures: Hook output displayed
   - All errors allow retry or manual intervention

**Example workflow:**
```
[Hotkey pressed]
  ↓
[Repository selected from picker]
  ↓
[Commit message suggested: "Update 3 files"]
  ↓
[Edit message to: "Update documentation and configs"]
  ↓
[Confirm]
  ↓
[Success: "Successfully committed and pushed to my-project"]
```

### Hotkey Configuration

1. Open Obsidian Settings
2. Navigate to **Hotkeys**
3. Search for "Multi-Git"
4. Find "Multi-Git: Commit and push changes"
5. Click the + icon and press your desired key combination
6. Recommended: Cmd/Ctrl+Shift+P (if not conflicting)

### Commit Message Suggestions

The plugin analyzes your changes and generates appropriate commit messages:

- **Single file changed:**
  - "Update README.md"
  - "Add new-feature.ts"
  - "Remove old-file.txt"

- **2-3 files changed:**
  - "Update config.json, package.json"
  - "Add utils.ts, types.ts"

- **4+ files changed:**
  - "Update 5 files"
  - "Add 8 files"
  - "Remove 3 files"

- **Mixed changes:**
  - "Update 10 files" (additions, modifications, and deletions)

- **Initial commit:**
  - "Initial commit" (when adding many files to empty repository)

All suggestions keep the summary under 50 characters for good git practice. You can always edit the message before committing.

### Enabling Debug Logging

**When to use:** For troubleshooting fetch operations, performance issues, or unexpected behavior

**How to enable:**

1. Close Obsidian completely
2. Navigate to your vault's plugin data directory:
   - macOS: `/path/to/vault/.obsidian/plugins/multi-git/data.json`
   - Windows: `C:\path\to\vault\.obsidian\plugins\multi-git\data.json`
   - Linux: `/path/to/vault/.obsidian/plugins/multi-git/data.json`
3. Open `data.json` in a text editor
4. Add or change the `debugLogging` field to `true`:
   ```json
   {
     "repositories": [...],
     "debugLogging": true,
     ...
   }
   ```
5. Save the file and restart Obsidian
6. Open Developer Console (Ctrl+Shift+I / Cmd+Option+I)

**What gets logged:**
- Git command execution with timing
- Fetch operation flow and results
- Scheduler events (interval management, batch operations)
- Status updates and persistence
- Notification triggers and suppression logic
- Configuration changes and migrations

**Log format:**
```
[Multi-Git Debug] [2025-01-12T22:30:15.123Z] [Component] Message
```

**Example logs:**
```
[Multi-Git Debug] [2025-01-12T22:30:15.123Z] [FetchScheduler] Starting automated fetch for 3 enabled repositories
[Multi-Git Debug] [2025-01-12T22:30:15.234Z] [GitCommand] Executing git command in /path/to/repo: git fetch --all --tags --prune
[Multi-Git Debug] [2025-01-12T22:30:16.456Z] [GitCommand] Fetch operation completed in 1222ms (my-vault)
[Multi-Git Debug] [2025-01-12T22:30:16.567Z] [FetchScheduler] Remote changes detected for my-vault: 3 commits behind
```

**Security:** Debug logs automatically sanitize sensitive information:
- Passwords and tokens are masked
- SSH keys are not logged
- Git credentials are removed from output
- Only safe information (paths, timing, status) is logged

**Performance:** When disabled (default), debug logging has negligible overhead (single boolean check per log call).

**To disable:** Change `debugLogging` back to `false` in `data.json` and restart Obsidian.

## Contributing

Contributions are welcome! See [Contributing Guide](docs/contributing.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/multi-git.git
cd multi-git

# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Type check
npm run type-check

# Build for production
npm run build
```

### Project Structure

```
multi-git/
├── src/                 # Source code
│   ├── main.ts         # Plugin entry point
│   ├── services/       # Business logic services
│   ├── settings/       # Settings UI components
│   └── utils/          # Utility functions
├── test/               # Test files
│   ├── services/       # Service tests
│   ├── utils/          # Utility tests
│   └── integration/    # Integration tests
├── specs/              # Specifications
└── docs/               # Documentation
```

## Roadmap

### Current Version (0.1.0)
- ✅ Repository configuration management (FR-1)
- ✅ Path validation and security
- ✅ Settings UI
- ✅ Cross-platform support
- ✅ Automated remote fetch (FR-2)
- ✅ Smart notifications
- ✅ Fetch status monitoring
- ✅ Manual fetch operations
- ✅ Hotkey-driven commit and push (FR-3)
- ✅ Repository picker for multiple repos
- ✅ Smart commit message generation
- ✅ Comprehensive error handling

### Future Versions

**v0.3.0 - Status Display (FR-4)**
- Dedicated status panel
- Repository status view
- Real-time updates
- Manual refresh

**v0.4.0 - Enhanced Error Handling (FR-5)**
- Modal dialogs for critical errors
- Context-appropriate error presentation
- Improved error recovery
- Detailed error guidance

**v0.5.0 - Advanced Features**
- Branch information display
- Commit history viewing
- Repository status indicators in file explorer
- Automatic repository detection
- Submodule support

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## Support

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/YOUR_USERNAME/multi-git/issues)
- 💡 **Feature Requests:** [GitHub Discussions](https://github.com/YOUR_USERNAME/multi-git/discussions)
- 📖 **Documentation:** [docs/](docs/)
- 💬 **Community:** [Obsidian Forum](https://forum.obsidian.md/)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- Inspired by the Obsidian community's need for multi-repository management
- Thanks to all contributors and users

## Related Plugins

- [Obsidian Git](https://github.com/denolehov/obsidian-git) - Automatic git backup
- [Git Integration](https://github.com/konhi/obsidian-git-integration) - Git workflow integration

---

**Made with ❤️ for the Obsidian community**
