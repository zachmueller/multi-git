# Feature Requirement 7: Custom PATH Configuration

**Status:** Draft  
**Version:** 0.1.0  
**Created:** 2025-12-14  
**Last Updated:** 2025-12-14  
**Author:** Zach Mueller  
**Parent Spec:** [Multi-Git Core Specification](../spec.md)

## Constitutional Alignment

**Relevant Principles:**
- [x] Specification-First Development - This spec defines requirements before implementation
- [x] Iterative Simplicity - Minimal scope focused on solving PATH environment issues
- [x] Documentation as Context - Clear documentation for future reference and troubleshooting

## Overview

### Purpose
Enable the plugin to successfully execute git commands that depend on credential helpers and other git-related tools installed in non-standard locations. This addresses scenarios where Obsidian's limited environment doesn't include user-specific PATH entries needed for tools like AWS CodeCommit's `git-remote-codecommit`, GitHub CLI credential helpers, or custom git installations.

### Problem Statement
When Obsidian launches from Spotlight/Finder (not from Terminal), it inherits only the system's default PATH environment variable. This causes git operations to fail when:
- Credential helpers are installed in user directories (`~/.cargo/bin`, `~/.local/bin`)
- Git tools require additional PATH entries to function
- Users have custom git installations in non-standard locations

The plugin currently passes the minimal system PATH to git commands, causing failures like:
```
Git command failed: git: 'remote-codecommit' is not a git command
fatal: remote helper 'codecommit' aborted session
```

### Success Criteria
- [x] Users can configure additional PATH entries for git command execution
- [x] Plugin provides sensible defaults covering common credential helper locations
- [x] PATH configuration is easily discoverable and well-documented in settings UI
- [x] Git commands successfully find credential helpers without requiring Obsidian restart
- [x] Solution works cross-platform (macOS, Windows, Linux)

## Requirements

### Functional Requirements

#### FR-7.1: Custom PATH Setting
- **Description:** Plugin must support user-configurable PATH entries that are prepended to the system PATH when executing git commands
- **Priority:** High
- **Acceptance Criteria:**
  - [x] Settings include `customPathEntries` array field
  - [x] Default entries cover common credential helper locations:
    - `~/.cargo/bin` (Rust/cargo installations)
    - `~/.local/bin` (common user-local installs)
    - `/opt/homebrew/bin` (Homebrew Apple Silicon)
    - `/usr/local/bin` (Homebrew Intel Mac, common Linux)
  - [x] Tilde (`~`) expansion is supported for home directory
  - [x] Paths are prepended to existing system PATH (not replaced)
  - [x] Duplicate paths are automatically removed
  - [x] Invalid paths (non-existent directories) are silently skipped
  - [x] Empty array is valid (uses system PATH only)

#### FR-7.2: Settings UI Integration
- **Description:** Settings UI must expose PATH configuration in an accessible, user-friendly way
- **Priority:** High
- **Acceptance Criteria:**
  - [x] Text area setting displays current PATH entries (one per line)
  - [x] Helpful description explains:
    - When this setting is needed (credential helpers, custom git)
    - Format requirements (absolute paths, one per line)
    - That `~` expansion is supported
  - [x] Placeholder text shows example paths when field is empty
  - [x] Setting appears in appropriate section of settings UI (after repository config)
  - [x] Changes take effect immediately (no reload required)
  - [x] UI validation provides feedback for invalid path formats

#### FR-7.3: Git Command Execution Enhancement
- **Description:** Git command execution must use enhanced PATH including user-configured entries
- **Priority:** High
- **Acceptance Criteria:**
  - [x] `GitCommandService` constructs enhanced PATH before each git command
  - [x] Enhanced PATH includes both system PATH and custom entries
  - [x] Custom entries are prepended (checked first)
  - [x] PATH construction handles missing `process.env.PATH` gracefully
  - [x] PATH is passed to child process via `env` option
  - [x] Other environment variables remain unchanged
  - [x] Debug logging shows effective PATH when debug mode enabled

#### FR-7.4: Error Handling
- **Description:** PATH-related configuration errors must be handled gracefully
- **Priority:** Medium
- **Acceptance Criteria:**
  - [x] Invalid path formats in settings don't crash plugin
  - [x] Non-existent directories are logged (debug mode) but don't cause errors
  - [x] Git command failures still provide clear error messages
  - [x] PATH construction failures fall back to system PATH only
  - [x] Settings UI validates path format before saving

### Non-Functional Requirements

#### NFR-7.1: Performance
- **Description:** PATH construction must not significantly impact git command execution time
- **Acceptance Criteria:**
  - [x] PATH construction completes in under 1ms
  - [x] No noticeable delay in git command execution
  - [x] Tilde expansion is cached appropriately

#### NFR-7.2: Security
- **Description:** Custom PATH entries must not introduce security vulnerabilities
- **Acceptance Criteria:**
  - [x] Path injection attacks are prevented through validation
  - [x] Only absolute paths are accepted (no relative paths)
  - [x] No PATH entries containing shell metacharacters
  - [x] User cannot inject commands via PATH configuration

#### NFR-7.3: Cross-Platform Compatibility
- **Description:** PATH configuration must work consistently across platforms
- **Acceptance Criteria:**
  - [x] Works on macOS, Windows, and Linux
  - [x] Handles platform-specific path separators correctly
  - [x] Tilde expansion works on all platforms
  - [x] Default paths are appropriate for each platform

## Design Considerations

### Data Model Changes

**MultiGitSettings Interface:**
```typescript
interface MultiGitSettings {
    // ... existing fields ...
    
    /**
     * Custom PATH entries to prepend when executing git commands
     * Useful for credential helpers or custom git installations
     * Supports tilde expansion (~) for home directory
     * One path per array entry
     * @default ['~/.cargo/bin', '~/.local/bin', '/opt/homebrew/bin', '/usr/local/bin']
     */
    customPathEntries: string[];
}
```

### Service Changes

**GitCommandService:**
- Add constructor parameter to accept settings
- Add `buildEnhancedPath(systemPath: string | undefined, customEntries: string[]): string` method
- Modify `executeGitCommand()` to use enhanced PATH in env option

**buildEnhancedPath Implementation:**
```typescript
private buildEnhancedPath(systemPath: string | undefined, customEntries: string[]): string {
    // Expand tildes and validate paths
    const expandedEntries = customEntries
        .map(entry => entry.replace(/^~/, os.homedir()))
        .filter(path => {
            // Validate path format (absolute, no shell metacharacters)
            if (!path.startsWith('/')) return false;
            if (/[;&|`$()]/.test(path)) return false;
            // Optionally: check if directory exists (with debug logging)
            return true;
        });
    
    // Prepend custom paths to system PATH
    const allPaths = [...expandedEntries, ...(systemPath?.split(':') || [])];
    
    // Remove duplicates while preserving order
    const uniquePaths = Array.from(new Set(allPaths));
    
    return uniquePaths.join(':');
}
```

### Settings UI Changes

**SettingTab:**
```typescript
new Setting(containerEl)
    .setName('Custom PATH entries')
    .setDesc(createFragment(frag => {
        frag.appendText('Additional directories to include in PATH when executing git commands. ');
        frag.appendText('Useful for credential helpers (e.g., git-remote-codecommit) or custom git installations.');
        frag.createEl('br');
        frag.createEl('br');
        frag.appendText('Enter one absolute path per line. Tilde (~) expands to your home directory.');
        frag.createEl('br');
        frag.appendText('Example: ~/.cargo/bin');
    }))
    .addTextArea(text => text
        .setPlaceholder('~/.cargo/bin\n~/.local/bin\n/opt/homebrew/bin\n/usr/local/bin')
        .setValue(this.plugin.settings.customPathEntries.join('\n'))
        .onChange(async (value) => {
            this.plugin.settings.customPathEntries = value
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            await this.plugin.saveSettings();
        }));
```

### Dependencies
- `os` module for `homedir()` path expansion
- Existing `GitCommandService` and settings infrastructure
- No new external dependencies required

### Risks & Mitigations

- **Risk:** Users configure incorrect paths causing git failures
  - **Mitigation:** Provide clear documentation and validation; log warnings for non-existent paths in debug mode

- **Risk:** PATH injection security vulnerabilities
  - **Mitigation:** Strict validation rejecting relative paths and shell metacharacters; only allow absolute paths

- **Risk:** Platform-specific path format issues
  - **Mitigation:** Use Node.js path APIs for platform-agnostic handling; test on all major platforms

- **Risk:** Performance impact from PATH construction on every git command
  - **Mitigation:** Keep PATH construction simple and fast; avoid filesystem checks in hot path

## Implementation Notes

### Dependency Injection
`GitCommandService` needs access to settings to read `customPathEntries`. Options:
1. **Constructor injection (Recommended):** Pass settings object in constructor
2. Static service with settings parameter: Pass settings to each method call

Constructor injection is cleaner and aligns with existing patterns.

### Default Values Strategy
Provide sensible defaults that cover 80% of use cases:
- `~/.cargo/bin` - Rust tools (codecommit helper often installed this way)
- `~/.local/bin` - Python pip --user installs, other local tools
- `/opt/homebrew/bin` - Homebrew on Apple Silicon Macs
- `/usr/local/bin` - Homebrew on Intel Macs, common Linux installs

Users only need to modify if:
- Tools in non-standard locations
- Using Windows with custom paths
- Minimal PATH desired for security reasons

### Migration Strategy
This is a new setting, so no data migration needed. For new installs:
- `DEFAULT_SETTINGS` includes default `customPathEntries` array
- Existing installs will get defaults on first save after update

### Testing Approach
1. Unit tests for `buildEnhancedPath()`:
   - Tilde expansion
   - Duplicate removal
   - Security validation
   - Empty/undefined handling
2. Integration tests:
   - Git commands execute with enhanced PATH
   - Credential helpers are found
   - Cross-platform path handling
3. Manual testing:
   - AWS CodeCommit repository fetch
   - Other credential helper scenarios

## User Experience

### Settings Flow
1. User navigates to plugin settings
2. User sees "Custom PATH entries" setting with helpful description
3. Default values are pre-filled (can see them in text area)
4. User can:
   - Keep defaults (works for most cases)
   - Add custom paths for their specific tools
   - Remove defaults if not needed
   - Clear all for minimal PATH
5. Changes save automatically and take effect immediately

### Troubleshooting Flow
1. User encounters credential helper error
2. User checks git command works in Terminal (to verify git setup)
3. User runs `which <credential-helper>` to find tool location
4. User adds that directory to Custom PATH entries in settings
5. User triggers fetch again - should now work

### Documentation Needs
- Add PATH configuration section to main documentation
- Include common credential helper scenarios (CodeCommit, GitHub CLI, etc.)
- Explain when and why this setting is needed
- Provide platform-specific examples

## Open Questions

None - design is straightforward and proven pattern.

## Approval

- [x] Reviewed against constitutional principles
- [x] Scope is clear and minimal
- [x] Requirements are testable
- [x] Ready for implementation planning

---

**Next Steps:** Create implementation plan and task checklist.
