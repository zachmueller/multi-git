# Multi-Git for Obsidian

A powerful Obsidian plugin for managing multiple git repositories from within your vault. Configure and track multiple git repositories, each with independent settings and status.

## Features

- 🗂️ **Multiple Repository Management** - Configure and manage multiple git repositories
- ✅ **Path Validation** - Automatic validation ensures only valid git repositories are added
- 🔄 **Enable/Disable** - Toggle repositories on/off without removing them
- 💾 **Persistent Configuration** - Repository settings persist across Obsidian sessions
- 🛡️ **Security** - Path validation prevents traversal attacks and invalid paths
- 🌍 **Cross-Platform** - Works on macOS, Windows, and Linux

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
- **Creation date**

Available actions:
- **Toggle** - Enable or disable a repository
- **Remove** - Delete the repository from configuration (does not affect files on disk)

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
      "lastValidated": 1704153600000
    }
  ],
  "version": "0.1.0"
}
```

**Fields:**
- `id` - Unique identifier (UUID v4)
- `path` - Absolute path to git repository
- `name` - Display name for the repository
- `enabled` - Whether repository is active
- `createdAt` - Timestamp when repository was added
- `lastValidated` - Timestamp of last validation (optional)
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
- ✅ Repository configuration management
- ✅ Path validation and security
- ✅ Settings UI
- ✅ Cross-platform support

### Future Versions

**v0.2.0 - Git Operations**
- Execute git commands on repositories
- Status monitoring
- Branch information
- Commit history

**v0.3.0 - UI Enhancements**
- Repository status indicators in file explorer
- Quick actions from sidebar
- Bulk operations

**v0.4.0 - Advanced Features**
- Automatic repository detection
- Submodule support
- Workspace presets

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
