# Specification: Multi-Git Core for Obsidian

**Status:** Draft  
**Version:** 0.1.0  
**Created:** 2025-01-12  
**Last Updated:** 2025-01-12  
**Author:** Zach Mueller

## Constitutional Alignment

**Relevant Principles:**
- [x] Specification-First Development - This spec defines requirements before implementation
- [x] Iterative Simplicity - Scope is minimal and focused on core functionality
- [x] Documentation as Context - Provides clear context for implementation and future reference

## Overview

### Purpose
Enable efficient management of multiple git repositories within an Obsidian vault through automated syncing and keyboard-driven operations. This plugin addresses the challenge of maintaining multiple connected repositories (e.g., submodules, related projects, or separate content repositories) that users need to keep in sync while working in Obsidian.

## Clarifications

### Session 2025-01-12
- Q: How should repository paths be stored in the configuration? → A: Absolute paths only - Store full file system paths to support symlink-based workflows where repositories exist elsewhere on the system and configurations are device-specific
- Q: When remote changes are detected during automated fetching, how should users be notified? → A: Per-repository notifications only when remote changes exist requiring user action; no notifications for successful fetches without changes
- Q: When the user triggers the push hotkey, how should the plugin determine which repository to commit/push to? → A: Always prompt - Show repository picker dialog requiring explicit selection each time
- Q: Where should repository status information be displayed within Obsidian? → A: Dedicated side panel - Add panel icon in left/right ribbon that opens full status view
- Q: How should error messages and failure notifications be presented to users when git operations fail? → A: Context-dependent - Critical errors use modals; minor errors in status panel; background failures as notifications

### Success Criteria
- [ ] Users can configure and monitor multiple git repositories from within Obsidian without leaving the editor
- [ ] Remote changes are automatically fetched at configurable intervals without manual intervention
- [ ] Users can commit and push changes to any configured repository using hotkeys within 2 seconds
- [ ] 95% of git operations complete without requiring terminal access or command-line interaction

## Requirements

### Functional Requirements

#### FR-1: Repository Configuration
- **Description:** Users must be able to configure multiple git repositories to be managed by the plugin using absolute file system paths
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Users can add new repositories by specifying their absolute file system path
  - [ ] Repository paths are stored as absolute paths to support device-specific configurations
  - [ ] Users can remove repositories from management
  - [ ] Users can view a list of all configured repositories with their full paths
  - [ ] Repository configurations persist across Obsidian restarts
  - [ ] Users can enable/disable management for specific repositories without removing them
  - [ ] Path validation confirms repository exists at absolute location and is a valid git repository

#### FR-2: Automated Remote Fetch
- **Description:** The plugin must automatically fetch remote changes for all configured repositories at regular intervals, notifying users only when actionable changes are detected
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Fetch operations run automatically at user-configurable intervals (default: 5 minutes)
  - [ ] Users can see the last fetch time for each repository
  - [ ] Users can manually trigger an immediate fetch for all or specific repositories
  - [ ] Fetch operations do not interrupt active user workflows
  - [ ] Users receive per-repository notification only when remote changes are available requiring action
  - [ ] No notifications are displayed for successful fetches that find no remote changes
  - [ ] Notification clearly identifies which repository has remote changes

#### FR-3: Hotkey-Driven Push Operations
- **Description:** Users must be able to commit and push changes using keyboard shortcuts without leaving Obsidian
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Users can assign custom hotkeys for push operations
  - [ ] Hotkey presents repository picker dialog requiring explicit selection
  - [ ] After repository selection, commit dialog appears with pre-filled suggested commit message
  - [ ] Users can edit commit message before confirming push
  - [ ] Push operation provides immediate feedback on success or failure
  - [ ] Repository picker only shows enabled repositories with uncommitted changes

#### FR-4: Repository Status Display
- **Description:** Users must be able to view the current state of all managed repositories in a dedicated side panel
- **Priority:** Medium
- **Acceptance Criteria:**
  - [ ] Plugin adds ribbon icon that toggles dedicated status panel view
  - [ ] Status panel displays list of all configured repositories
  - [ ] Users can see which repositories have uncommitted changes
  - [ ] Users can see which repositories have unpushed commits
  - [ ] Users can see which repositories have remote changes available
  - [ ] Status information updates in real-time or within 30 seconds of changes
  - [ ] Users can view basic git information per repository (current branch, last commit message)
  - [ ] Panel supports manual refresh action for all repositories

#### FR-5: Error Handling and Recovery
- **Description:** The plugin must gracefully handle git operation failures and provide clear feedback using context-appropriate presentation methods
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Users receive clear, actionable error messages when operations fail
  - [ ] Critical errors (authentication failures, merge conflicts) display as modal dialogs requiring acknowledgment
  - [ ] Background fetch failures show as dismissible notifications
  - [ ] Minor errors and warnings display inline in status panel without interrupting workflow
  - [ ] Failed fetch operations do not prevent subsequent attempts
  - [ ] Users can retry failed operations from status panel or error dialogs without restarting Obsidian
  - [ ] Merge conflicts are detected and reported in modal dialog with guidance for manual resolution
  - [ ] Authentication failures provide clear instructions in modal for configuring credentials
  - [ ] All error presentations include repository name and specific failure reason

#### FR-6: Debug Logging (Hidden Setting)
- **Description:** The plugin must provide a hidden debug logging capability to aid in troubleshooting issues without cluttering the UI
- **Priority:** Low
- **Acceptance Criteria:**
  - [ ] Debug logging can be enabled via direct modification of plugin's data.json file
  - [ ] Setting is not exposed in the plugin's settings UI
  - [ ] When enabled, comprehensive debug logs are written to the browser console
  - [ ] Debug logs include key operations: fetch attempts, status updates, git command execution, error details
  - [ ] Debug logs include timestamps and context (repository name, operation type)
  - [ ] Debug logs do not contain sensitive information (passwords, tokens)
  - [ ] Setting persists across Obsidian restarts
  - [ ] Debug logging can be toggled on/off without plugin reload (takes effect on next operation)

#### FR-7: Custom PATH Configuration
- **Description:** The plugin must support user-configurable PATH entries to enable git commands to find credential helpers and tools installed in non-standard locations
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Users can configure additional PATH entries via settings UI
  - [ ] Default PATH entries cover common credential helper locations (~/.cargo/bin, ~/.local/bin, /opt/homebrew/bin, /usr/local/bin)
  - [ ] Tilde (~) expansion is supported for home directory
  - [ ] Custom PATH entries are prepended to system PATH when executing git commands
  - [ ] Path validation prevents security issues (no shell metacharacters, absolute paths only)
  - [ ] Changes take effect immediately without plugin reload
  - [ ] Works cross-platform (macOS, Windows, Linux)
  - [ ] Debug logging shows effective PATH when enabled

### Non-Functional Requirements

#### NFR-1: Performance
- **Description:** Git operations must not significantly impact Obsidian's responsiveness
- **Acceptance Criteria:**
  - [ ] Automated fetch operations complete in the background without UI blocking
  - [ ] Hotkey-triggered operations provide feedback within 500ms
  - [ ] Plugin startup time adds no more than 1 second to Obsidian launch
  - [ ] Memory usage remains under 50MB for typical configurations (up to 10 repositories)

#### NFR-2: Compatibility  
- **Description:** Plugin must work across platforms where Obsidian runs
- **Acceptance Criteria:**
  - [ ] Fully functional on macOS, Windows, and Linux
  - [ ] Compatible with Obsidian API version 1.0.0 and later
  - [ ] Works with git version 2.20.0 and later
  - [ ] Supports repositories with SSH and HTTPS authentication

#### NFR-3: Usability
- **Description:** Plugin must be intuitive and require minimal configuration
- **Acceptance Criteria:**
  - [ ] Initial setup can be completed in under 2 minutes for first repository
  - [ ] Settings interface follows Obsidian's design patterns
  - [ ] All operations provide clear visual feedback
  - [ ] Documentation explains all features and common workflows

## Scope

### In Scope
- Configuration and management of multiple git repositories
- Automated fetching of remote changes at configurable intervals
- Hotkey-driven commit and push operations
- Repository status monitoring and display
- Basic error handling and user feedback
- Cross-platform support (macOS, Windows, Linux)

### Out of Scope
- Advanced git operations (rebase, cherry-pick, stash, etc.)
- Visual diff viewing or merge conflict resolution tools
- Branch management and switching
- Git history browsing or log viewing
- Pull request or issue tracking integration
- Submodule-specific operations
- Custom git hooks or workflow automation
- Multi-repository batch operations (will be addressed in future iterations if needed)

## Design Considerations

### Technical Approach
The plugin will interact with git through command-line interface calls, monitoring repository states and executing operations as needed. Background processes will handle automated fetching while UI components provide status visibility and operation triggers.

### Dependencies
- Git must be installed and accessible via command line on user's system
- Obsidian Plugin API for UI integration and settings management
- File system access for repository path validation
- Node.js child process capabilities for git command execution

### Risks & Mitigations
- **Risk:** Git authentication failures in automated operations
  - **Mitigation:** Provide clear setup guidance for credential caching; detect auth failures early with helpful error messages

- **Risk:** Performance impact with many large repositories
  - **Mitigation:** Implement configurable fetch intervals; allow selective repository management; use efficient git commands

- **Risk:** Conflicting with manual git operations
  - **Mitigation:** Detect when repository state changes externally; refresh status automatically; avoid destructive operations without confirmation

- **Risk:** Cross-platform git command differences
  - **Mitigation:** Test on all major platforms; use standard git commands; handle platform-specific paths correctly

## User Scenarios

### Primary Flow: Daily Usage
1. User opens Obsidian vault containing multiple repositories
2. Plugin automatically begins fetching updates for configured repositories in background
3. User receives notification that remote changes are available for one repository
4. User makes edits to vault files
5. User triggers commit/push hotkey
6. Plugin presents commit dialog with suggested message
7. User confirms and changes are pushed immediately
8. User continues working while background fetches continue

### Alternative Flow: Initial Setup
1. User installs plugin and opens settings
2. User adds first repository by browsing to its path
3. Plugin validates repository and displays current status
4. User configures fetch interval preference (or accepts default)
5. User assigns preferred hotkey for push operations
6. Plugin begins automated fetching
7. User adds additional repositories as needed

### Edge Cases
- **Repository Not Found:** Plugin detects invalid path and prompts user to verify location
- **Authentication Required:** Plugin detects auth failure and guides user to configure credentials
- **Merge Conflict:** Plugin detects conflict and notifies user that manual resolution is required
- **No Remote Changes:** User pushes changes; plugin confirms push succeeded even though fetch showed no updates
- **Offline Operation:** Plugin detects network unavailability and queues operations for later retry

## Success Criteria

### Measurable Outcomes
- [ ] 90% of git fetch operations complete successfully without user intervention
- [ ] Users can push changes using hotkeys with 100% success rate when network is available
- [ ] Average time from hotkey press to push completion is under 3 seconds
- [ ] Plugin handles at least 10 repositories simultaneously without performance degradation
- [ ] Error recovery success rate above 80% (users can resolve issues without external tools)

### Key Entities

#### Repository Configuration
- **Attributes:** path (absolute string), enabled (boolean), last_fetch (timestamp), fetch_interval (number), display_name (string)
- **Validation:** Path must be absolute file system path to valid git repository; fetch_interval must be positive integer
- **State:** active, disabled, error, syncing
- **Notes:** Absolute paths enable device-specific configurations for symlink-based workflows where repository locations vary across synced devices

#### Repository Status
- **Attributes:** has_changes (boolean), unpushed_commits (number), remote_changes (boolean), current_branch (string), last_commit (string)
- **Updates:** On fetch completion, on manual refresh, on file system changes detected

## Assumptions

- Users have git installed and properly configured on their system
- Users have appropriate permissions for repositories they want to manage
- Repository authentication (SSH keys or HTTPS credentials) is configured at system level
- Users understand basic git concepts (commit, push, fetch, remote)
- Obsidian vault may contain one or more git repositories in various subdirectories
- Network connectivity is generally available but may be intermittent
- Default fetch interval of 5 minutes is reasonable for most users

## Out of Scope

### Explicitly Excluded (This Iteration)
- Visual merge conflict resolution interface
- Branch creation, deletion, or switching
- Git log or history visualization
- Pull operations (only fetch + status, user handles merge separately)
- Tagging operations
- Remote repository management (add/remove remotes)
- Submodule initialization or updates
- Git LFS support
- Custom commit message templates
- Batch operations across multiple repositories
- Integration with external git services (GitHub, GitLab, etc.)

### Future Considerations
- Enhanced branch management capabilities
- Visual diff viewing within Obsidian
- Customizable commit message templates
- Batch operations for multiple repositories
- Integration with issue tracking systems
- Advanced workflow automation

## Open Questions

None - proceeding with reasonable defaults based on standard git workflows and Obsidian plugin patterns.

## Approval

- [x] Reviewed against constitutional principles
- [x] Scope is clear and minimal
- [x] Requirements are testable
- [ ] Ready for implementation (pending validation)

---

**Next Steps:** Create quality validation checklist, validate specification completeness, then proceed to `plan` workflow for implementation planning.
