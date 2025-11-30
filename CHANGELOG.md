# Changelog

All notable changes to Multi-Git for Obsidian will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- End-to-end integration testing in Obsidian
- Error handling validation
- Performance benchmarks
- Complete API documentation with TypeDoc

## [0.1.0] - 2025-01-12

### Added
- **Repository Configuration Management**
  - Add git repositories by specifying absolute paths
  - Remove repositories from configuration
  - Enable/disable repositories without removing them
  - View list of all configured repositories
  - Display full paths, status, and creation dates

- **Path Validation & Security**
  - Absolute path requirement and validation
  - Directory existence checks
  - Git repository validation
  - Path traversal attack prevention
  - Cross-platform path handling (macOS, Windows, Linux)
  - Security checks for malicious patterns

- **Settings User Interface**
  - Settings tab in Obsidian preferences
  - Add Repository modal with form validation
  - Repository list with status indicators
  - Toggle buttons for enable/disable
  - Remove button with confirmation dialog
  - Empty state messaging
  - Responsive design for different window sizes

- **Services Architecture**
  - GitCommandService for git CLI operations
  - RepositoryConfigService for repository management
  - Defensive copying for immutability
  - Error handling with custom error classes

- **Testing Infrastructure**
  - 115+ unit tests (85 service/util + 38 cross-platform)
  - Jest test framework with TypeScript support
  - Cross-platform path validation tests
  - 100% coverage for critical paths
  - Mock support for Obsidian APIs

- **Documentation**
  - Comprehensive README with installation and usage
  - Detailed configuration guide
  - Architecture documentation for developers
  - Contributing guidelines
  - Troubleshooting guide

- **Development Tooling**
  - TypeScript with strict mode
  - ESLint for code quality
  - Hot reload development mode
  - Build configuration with esbuild

### Technical Details
- Minimum Obsidian version: 1.4.0
- Node.js 18+ for development
- Git CLI required for repository validation
- Settings stored in `data.json` with version tracking

### Constitutional Alignment
- ✅ Specification-First Development: Full spec-driven implementation
- ✅ Iterative Simplicity: Minimal viable feature set
- ✅ Documentation as Context: Comprehensive docs alongside code

## Release Notes

### Version 0.1.0 - Initial Release

This is the first release of Multi-Git for Obsidian, providing core repository configuration functionality. Users can now:

1. **Configure Multiple Repositories**: Add multiple git repositories to track within Obsidian
2. **Secure Path Validation**: Only absolute paths to valid git repositories are accepted
3. **Flexible Management**: Enable/disable repositories without removing configuration
4. **Persistent Settings**: All configurations persist across Obsidian sessions
5. **Cross-Platform Support**: Works on macOS, Windows, and Linux

**What's Working:**
- Repository CRUD operations (Create, Read, Update, Delete)
- Path validation with security checks
- Settings UI with modals and confirmations
- Comprehensive test coverage
- Full documentation

**Known Limitations:**
- Manual path entry required (no directory picker yet)
- No git operations beyond validation (coming in v0.2.0)
- Single configuration workspace (multi-workspace in v0.4.0)

**For Developers:**
- Clean architecture with service layer
- Extensive test coverage (115+ tests)
- TypeScript with strict mode
- Complete technical documentation

### Upgrade Instructions

**First Installation:**
1. Install from Obsidian Community Plugins
2. Enable the plugin
3. Navigate to Settings → Multi-Git
4. Add your first repository

**From Future Versions:**
- Backup `data.json` before upgrading
- Configuration migrations will be automatic
- Check changelog for breaking changes

## Future Roadmap

### v0.2.0 - Git Operations (Planned)
- Execute git commands on repositories
- Display git status and branch information
- View commit history
- Remote repository operations

### v0.3.0 - UI Enhancements (Planned)
- Repository status indicators in file explorer
- Quick actions from sidebar ribbon
- Bulk operations on multiple repositories
- Search and filter repositories

### v0.4.0 - Advanced Features (Planned)
- Automatic repository detection
- Git submodule support
- Multiple workspace configurations
- Repository templates

## Support & Feedback

- Report bugs: [GitHub Issues](https://github.com/YOUR_USERNAME/multi-git/issues)
- Request features: [GitHub Discussions](https://github.com/YOUR_USERNAME/multi-git/discussions)
- Ask questions: [Obsidian Forum](https://forum.obsidian.md/)

---

**Legend:**
- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements
