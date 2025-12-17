# Implementation Plan: Custom PATH Configuration (FR-7)

**Related Spec:** [FR-7 Specification](./spec.md)  
**Status:** Draft  
**Created:** 2025-12-14  
**Last Updated:** 2025-12-14

## Constitutional Check

- [x] **Specification-First Development**: This plan is based on approved FR-7 specification
- [x] **Iterative Simplicity**: Implementation approach is minimal and focused
- [x] **Documentation as Context**: Plan provides clear context for execution

## Implementation Approach

### Overview
Enhance git command execution to include user-configurable PATH entries, solving credential helper discovery issues when Obsidian launches with limited environment. Implementation requires changes to settings model, settings UI, and git command service.

### Breaking Down the Work
The spec requirements translate into three main implementation areas:
1. **Settings Model** - Add data structure for custom PATH entries with defaults
2. **Settings UI** - Expose PATH configuration with user-friendly interface
3. **Git Command Service** - Enhance command execution to use custom PATH

## Implementation Steps

### Phase 1: Settings Model Update

1. **Update MultiGitSettings Interface**
   - Action: Add `customPathEntries: string[]` field to `MultiGitSettings` interface
   - Files: `src/settings/data.ts`
   - Rationale: Foundation for storing user-configured PATH entries
   - Dependencies: None

2. **Update Default Settings**
   - Action: Add default PATH entries to `DEFAULT_SETTINGS`
   - Files: `src/settings/data.ts`
   - Rationale: Provide sensible defaults covering common credential helper locations
   - Dependencies: Step 1 complete
   - Default values:
     ```typescript
     customPathEntries: [
         '~/.cargo/bin',
         '~/.local/bin',
         '/opt/homebrew/bin',
         '/usr/local/bin'
     ]
     ```

### Phase 2: GitCommandService Enhancement

3. **Add buildEnhancedPath Method**
   - Action: Implement private method to construct enhanced PATH
   - Files: `src/services/GitCommandService.ts`
   - Rationale: Centralize PATH construction logic with validation and deduplication
   - Dependencies: Phase 1 complete
   - Key functionality:
     - Expand tilde (`~`) to home directory using `os.homedir()`
     - Validate paths (absolute, no shell metacharacters)
     - Remove duplicates
     - Prepend custom paths to system PATH
     - Handle missing system PATH gracefully

4. **Update GitCommandService Constructor**
   - Action: Add settings parameter to constructor, store as private field
   - Files: `src/services/GitCommandService.ts`
   - Rationale: Enable access to customPathEntries for PATH construction
   - Dependencies: Step 3 complete
   - Changes:
     ```typescript
     constructor(private settings: MultiGitSettings) {}
     ```

5. **Modify executeGitCommand Method**
   - Action: Use enhanced PATH in env option when executing git commands
   - Files: `src/services/GitCommandService.ts`
   - Rationale: Apply custom PATH to all git command executions
   - Dependencies: Steps 3-4 complete
   - Implementation:
     ```typescript
     const enhancedPath = this.buildEnhancedPath(
         process.env.PATH,
         this.settings.customPathEntries
     );
     
     const { stdout, stderr } = await execPromise(fullCommand, {
         cwd,
         timeout,
         maxBuffer: 10 * 1024 * 1024,
         env: {
             ...process.env,
             PATH: enhancedPath
         }
     });
     ```

6. **Add Debug Logging for PATH**
   - Action: Log effective PATH when debug mode enabled
   - Files: `src/services/GitCommandService.ts`
   - Rationale: Aid troubleshooting of PATH-related issues
   - Dependencies: Step 5 complete

### Phase 3: Dependency Injection

7. **Update Main Plugin Initialization**
   - Action: Pass settings to GitCommandService constructor
   - Files: `src/main.ts`
   - Rationale: Wire up dependency injection for settings access
   - Dependencies: Phase 2 complete
   - Changes:
     - Update GitCommandService instantiation to pass `this.settings`
     - Ensure settings are loaded before service creation

### Phase 4: Settings UI

8. **Add PATH Configuration UI**
   - Action: Add text area setting for custom PATH entries
   - Files: `src/settings/SettingTab.ts`
   - Rationale: Provide user-friendly interface for PATH configuration
   - Dependencies: Phases 1-3 complete
   - Implementation details:
     - Text area with one path per line
     - Helpful description explaining use case and format
     - Placeholder showing example paths
     - Real-time save on change
     - Parse newline-separated values into array

9. **Add Path Validation**
   - Action: Validate path format in settings UI
   - Files: `src/settings/SettingTab.ts`
   - Rationale: Prevent invalid configurations
   - Dependencies: Step 8 complete
   - Validation rules:
     - Warn if paths aren't absolute
     - Warn if paths contain shell metacharacters
     - Allow empty (uses system PATH only)

### Phase 5: Testing

10. **Unit Tests for buildEnhancedPath**
    - Action: Test PATH construction logic
    - Files: `test/services/GitCommandService.test.ts`
    - Rationale: Verify core PATH manipulation logic
    - Dependencies: Phase 2 complete
    - Test cases:
      - Tilde expansion
      - Duplicate removal
      - Security validation (reject shell metacharacters)
      - Empty/undefined PATH handling
      - Path separator handling

11. **Integration Test with Credential Helper**
    - Action: Test git fetch with CodeCommit repository
    - Files: Manual testing
    - Rationale: Verify real-world credential helper discovery
    - Dependencies: All implementation phases complete
    - Test scenario:
      - Configure repository using AWS CodeCommit
      - Verify fetch fails without custom PATH
      - Add `~/.cargo/bin` to customPathEntries
      - Verify fetch succeeds

12. **Cross-Platform Testing**
    - Action: Test on macOS, Windows, Linux
    - Files: Manual testing
    - Rationale: Ensure platform compatibility
    - Dependencies: All implementation complete
    - Verify:
      - Tilde expansion works on all platforms
      - Path separators handled correctly (`:` vs `;`)
      - Default paths appropriate for each platform

13. **Regression Testing**
    - Action: Test existing repositories without credential helpers
    - Files: Manual testing
    - Rationale: Ensure no breaking changes to existing functionality
    - Dependencies: All implementation complete
    - Verify:
      - Standard git operations still work
      - No performance degradation
      - No errors in normal use cases

## Testing Strategy

### Unit Testing
- `buildEnhancedPath()` method with various inputs
- PATH validation logic
- Tilde expansion edge cases

### Integration Testing
- GitCommandService with custom PATH entries
- Settings persistence and loading
- Settings UI updates and validation

### Manual Testing
1. Test AWS CodeCommit repository (your 'zm' repo)
2. Test with other credential helper scenarios
3. Test with empty customPathEntries (system PATH only)
4. Test with invalid paths (ensure graceful handling)
5. Verify debug logging shows effective PATH

### Platform Testing
- macOS (primary development platform)
- Windows (if available)
- Linux (if available)

## Rollback Strategy

If implementation causes issues:
1. **Immediate rollback**: Remove customPathEntries from settings, use system PATH only
2. **Safe fallback**: buildEnhancedPath can return system PATH on any error
3. **Feature flag**: Could add hidden setting to disable PATH enhancement
4. **Revert commits**: Git history allows clean revert of changes

## Notes

### Platform-Specific Considerations

**macOS:**
- Default paths include Homebrew locations
- Tilde expansion straightforward
- PATH separator: `:`

**Windows:**
- Default paths should include common Windows locations
- Tilde may expand differently (use `os.homedir()`)
- PATH separator: `;`
- Path format: `C:\Users\...` instead of `/home/...`

**Linux:**
- Default paths similar to macOS
- Common user local paths: `~/.local/bin`
- PATH separator: `:`

### Security Considerations

PATH manipulation could introduce security risks:
1. **Path injection**: Prevented by validating paths (no shell metacharacters)
2. **Privilege escalation**: Only user-configured paths, no elevation
3. **Malicious helpers**: User's responsibility to trust installed tools
4. **Path ordering**: Custom paths prepended (checked first) - document this behavior

### Performance Considerations

- PATH construction is fast (string operations only)
- No filesystem checks in hot path (for performance)
- Settings read once per command execution
- Negligible impact on git command performance

## Approval

- [x] Plan aligns with approved specification
- [x] Steps are clear and actionable
- [x] Testing approach is defined
- [x] Ready for implementation

---

**Next Steps:** Create tasks checklist, then begin implementation in Act Mode.
