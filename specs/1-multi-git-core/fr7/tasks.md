# Implementation Tasks: Custom PATH Configuration (FR-7)

**Related Spec:** [FR-7 Specification](./spec.md)  
**Related Plan:** [Implementation Plan](./plan.md)  
**Status:** Not Started  
**Created:** 2025-12-14  
**Last Updated:** 2025-12-14

## Phase 1: Settings Model Update

- [ ] Add `customPathEntries: string[]` field to `MultiGitSettings` interface in `src/settings/data.ts`
- [ ] Add JSDoc documentation for `customPathEntries` field explaining purpose and format
- [ ] Add default PATH entries to `DEFAULT_SETTINGS` object:
  - [ ] `~/.cargo/bin`
  - [ ] `~/.local/bin`
  - [ ] `/opt/homebrew/bin`
  - [ ] `/usr/local/bin`
- [ ] Verify settings model compiles without errors

## Phase 2: GitCommandService Enhancement

- [ ] Import `os` module at top of `src/services/GitCommandService.ts`
- [ ] Add `buildEnhancedPath()` private method to `GitCommandService`:
  - [ ] Accept `systemPath: string | undefined` and `customEntries: string[]` parameters
  - [ ] Implement tilde expansion using `os.homedir()`
  - [ ] Implement path validation (absolute paths, no shell metacharacters)
  - [ ] Filter out invalid paths with debug logging
  - [ ] Merge custom and system paths
  - [ ] Remove duplicate paths while preserving order
  - [ ] Determine correct path separator for platform (`:` or `;`)
  - [ ] Return joined path string
- [ ] Add `settings` private field to `GitCommandService` class
- [ ] Update `GitCommandService` constructor to accept `settings: MultiGitSettings` parameter
- [ ] Modify `executeGitCommand()` method:
  - [ ] Call `buildEnhancedPath()` before executing command
  - [ ] Pass enhanced PATH in `env` option to `execPromise`
  - [ ] Preserve all other environment variables using spread operator
- [ ] Add debug logging for effective PATH when debug mode enabled
- [ ] Verify service compiles without errors

## Phase 3: Dependency Injection

- [ ] Update `src/main.ts` to pass settings to `GitCommandService`:
  - [ ] Locate `GitCommandService` instantiation
  - [ ] Pass `this.settings` as constructor argument
  - [ ] Verify settings are loaded before service instantiation
- [ ] Update all other service instantiations if they create `GitCommandService`:
  - [ ] Check `FetchSchedulerService` instantiation
  - [ ] Check `RepositoryConfigService` instantiation
  - [ ] Update any other services that depend on `GitCommandService`
- [ ] Verify plugin loads and initializes without errors

## Phase 4: Settings UI

- [ ] Add PATH configuration UI to `src/settings/SettingTab.ts`:
  - [ ] Add new `Setting` after existing repository settings
  - [ ] Set name to "Custom PATH entries"
  - [ ] Create description fragment with:
    - [ ] Explanation of when this is needed (credential helpers, custom git)
    - [ ] Format instructions (one absolute path per line)
    - [ ] Note about tilde expansion support
    - [ ] Example usage
  - [ ] Add `TextAreaComponent` with:
    - [ ] Placeholder showing example paths
    - [ ] Value populated from `this.plugin.settings.customPathEntries.join('\n')`
    - [ ] `onChange` handler that:
      - [ ] Splits value by newlines
      - [ ] Trims each line
      - [ ] Filters empty lines
      - [ ] Updates `this.plugin.settings.customPathEntries`
      - [ ] Calls `this.plugin.saveSettings()`
- [ ] Add basic path validation (optional):
  - [ ] Warn if paths aren't absolute
  - [ ] Warn if paths contain shell metacharacters
- [ ] Test settings UI loads and displays correctly
- [ ] Test settings can be modified and saved

## Phase 5: Testing

### Unit Tests

- [ ] Add unit tests for `buildEnhancedPath()` in `test/services/GitCommandService.test.ts`:
  - [ ] Test tilde expansion to home directory
  - [ ] Test duplicate path removal
  - [ ] Test invalid path filtering (relative paths)
  - [ ] Test shell metacharacter rejection (`;`, `&`, `|`, etc.)
  - [ ] Test undefined/empty system PATH handling
  - [ ] Test undefined/empty custom entries handling
  - [ ] Test path separator handling (platform-specific if possible)
  - [ ] Test path ordering (custom paths first)
- [ ] Run unit tests and verify all pass

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
