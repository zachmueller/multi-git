# Implementation Tasks: Custom PATH Configuration (FR-7)

**Related Spec:** [FR-7 Specification](./spec.md)  
**Related Plan:** [Implementation Plan](./plan.md)  
**Status:** Not Started  
**Created:** 2025-12-14  
**Last Updated:** 2025-12-14

## Phase 1: Settings Model Update

- [x] Add `customPathEntries: string[]` field to `MultiGitSettings` interface in `src/settings/data.ts`
- [x] Add JSDoc documentation for `customPathEntries` field explaining purpose and format
- [x] Add default PATH entries to `DEFAULT_SETTINGS` object:
  - [x] `~/.cargo/bin`
  - [x] `~/.local/bin`
  - [x] `/opt/homebrew/bin`
  - [x] `/usr/local/bin`
- [x] Verify settings model compiles without errors

## Phase 2: GitCommandService Enhancement

- [x] Import `os` module at top of `src/services/GitCommandService.ts`
- [x] Add `buildEnhancedPath()` private method to `GitCommandService`:
  - [x] Accept `systemPath: string | undefined` and `customEntries: string[]` parameters
  - [x] Implement tilde expansion using `os.homedir()`
  - [x] Implement path validation (absolute paths, no shell metacharacters)
  - [x] Filter out invalid paths with debug logging
  - [x] Merge custom and system paths
  - [x] Remove duplicate paths while preserving order
  - [x] Determine correct path separator for platform (`:` or `;`)
  - [x] Return joined path string
- [x] Add `settings` private field to `GitCommandService` class
- [x] Update `GitCommandService` constructor to accept `settings: MultiGitSettings` parameter
- [x] Modify `executeGitCommand()` method:
  - [x] Call `buildEnhancedPath()` before executing command
  - [x] Pass enhanced PATH in `env` option to `execPromise`
  - [x] Preserve all other environment variables using spread operator
- [x] Add debug logging for effective PATH when debug mode enabled
- [x] Verify service compiles without errors

## Phase 3: Dependency Injection

- [x] Update `src/main.ts` to pass settings to `GitCommandService`:
  - [x] Locate `GitCommandService` instantiation
  - [x] Pass `this.settings` as constructor argument
  - [x] Verify settings are loaded before service instantiation
- [x] Update all other service instantiations if they create `GitCommandService`:
  - [x] Check `FetchSchedulerService` instantiation
  - [x] Check `RepositoryConfigService` instantiation
  - [x] Update any other services that depend on `GitCommandService`
- [x] Verify plugin loads and initializes without errors

## Phase 4: Settings UI

- [x] Add PATH configuration UI to `src/settings/SettingTab.ts`:
  - [x] Add new `Setting` after existing repository settings
  - [x] Set name to "Custom PATH entries"
  - [x] Create description fragment with:
    - [x] Explanation of when this is needed (credential helpers, custom git)
    - [x] Format instructions (one absolute path per line)
    - [x] Note about tilde expansion support
    - [x] Example usage
  - [x] Add `TextAreaComponent` with:
    - [x] Placeholder showing example paths
    - [x] Value populated from `this.plugin.settings.customPathEntries.join('\n')`
    - [x] `onChange` handler that:
      - [x] Splits value by newlines
      - [x] Trims each line
      - [x] Filters empty lines
      - [x] Updates `this.plugin.settings.customPathEntries`
      - [x] Calls `this.plugin.saveSettings()`
- [x] Add basic path validation (optional):
  - [x] Warn if paths aren't absolute
  - [x] Warn if paths contain shell metacharacters
- [x] Test settings UI loads and displays correctly
- [x] Test settings can be modified and saved

## Phase 5: Testing

### Unit Tests

- [x] Add unit tests for `buildEnhancedPath()` in `test/services/GitCommandService.test.ts`:
  - [x] Test tilde expansion to home directory
  - [x] Test duplicate path removal
  - [x] Test invalid path filtering (relative paths)
  - [x] Test shell metacharacter rejection (`;`, `&`, `|`, etc.)
  - [x] Test undefined/empty system PATH handling
  - [x] Test undefined/empty custom entries handling
  - [x] Test path separator handling (platform-specific if possible)
  - [x] Test path ordering (custom paths first)
  - [x] Test Windows drive letters (platform-specific)
  - [x] Test paths with spaces
  - [x] Test empty strings in custom entries
  - [x] Test very long PATH strings
- [x] Run unit tests and verify all pass (54 tests passed)

### Integration Testing

- [ ] Test settings persistence:
  - [ ] Add custom PATH entries via UI
  - [ ] Reload plugin
  - [ ] Verify settings persist
- [ ] Test GitCommandService with custom PATH:
  - [ ] Mock settings with custom PATH entries
  - [ ] Verify git commands receive enhanced PATH
  - [ ] Verify custom paths are prepended to system PATH
- [ ] Run integration tests and verify all pass

### Manual Testing

- [ ] Test with AWS CodeCommit repository ('zm' repo):
  - [ ] Verify fetch fails with helpful error before fix
  - [ ] Apply custom PATH configuration
  - [ ] Verify fetch succeeds after fix
  - [ ] Check debug logs show enhanced PATH
- [ ] Test with other repositories without credential helpers:
  - [ ] Verify no regression in standard git operations
  - [ ] Verify performance is not degraded
- [ ] Test edge cases:
  - [ ] Empty customPathEntries (uses system PATH only)
  - [ ] Invalid paths in customPathEntries (gracefully handled)
  - [ ] Paths with spaces (properly escaped)
  - [ ] Very long PATH (no issues)
- [ ] Test settings UI:
  - [ ] Add/remove PATH entries
  - [ ] Clear all entries
  - [ ] Add back default entries
  - [ ] Verify immediate effect (no reload required)

### Cross-Platform Testing (if available)

- [ ] Test on macOS:
  - [ ] Verify tilde expansion
  - [ ] Verify PATH separator (`:`)
  - [ ] Verify Homebrew paths work
- [ ] Test on Windows (if available):
  - [ ] Verify tilde expansion to user home
  - [ ] Verify PATH separator (`;`)
  - [ ] Verify Windows path formats
- [ ] Test on Linux (if available):
  - [ ] Verify tilde expansion
  - [ ] Verify PATH separator (`:`)
  - [ ] Verify common Linux paths work

## Phase 6: Documentation

- [ ] Update `docs/configuration.md`:
  - [ ] Add section on Custom PATH Configuration
  - [ ] Explain when and why it's needed
  - [ ] Provide examples for common scenarios:
    - [ ] AWS CodeCommit (`git-remote-codecommit`)
    - [ ] GitHub CLI credential helper
    - [ ] Custom git installations
  - [ ] Document default values
  - [ ] Explain tilde expansion
  - [ ] Provide platform-specific guidance
- [ ] Update `README.md` if appropriate:
  - [ ] Mention PATH configuration capability
  - [ ] Link to detailed docs
- [ ] Add troubleshooting guide:
  - [ ] How to find credential helper location
  - [ ] How to debug PATH issues
  - [ ] Common error messages and solutions

## Phase 7: Finalization

- [ ] Review all code changes for quality
- [ ] Verify all acceptance criteria met from spec
- [ ] Run full test suite (unit + integration)
- [ ] Perform final manual testing with real repositories
- [ ] Update CHANGELOG.md with new feature
- [ ] Commit changes following git workflow standards
- [ ] Mark FR-7 spec as Implemented
- [ ] Update main spec to reference FR-7

## Success Criteria Checklist

From FR-7 specification, verify:

- [ ] Users can configure additional PATH entries for git command execution
- [ ] Plugin provides sensible defaults covering common credential helper locations
- [ ] PATH configuration is easily discoverable and well-documented in settings UI
- [ ] Git commands successfully find credential helpers without requiring Obsidian restart
- [ ] Solution works cross-platform (at least on macOS, ideally Windows/Linux too)
- [ ] No security vulnerabilities introduced (path injection prevented)
- [ ] No performance degradation in git command execution
- [ ] Existing functionality remains intact (no regressions)

---

**Notes:**
- Test incrementally after each phase
- Use debug logging to verify PATH construction
- Keep changes focused and atomic for easier troubleshooting
- Document any deviations from plan with rationale
