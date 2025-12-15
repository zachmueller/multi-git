# Task Breakdown: PATH Configuration Fix for Auto-Pull

**Created:** 2025-12-15  
**Issue:** git-remote-codecommit not found during pull operations  
**Root Cause:** AutoPullService bypasses GitCommandService, missing enhanced PATH from FR-7  
**Status:** Planning

## Issue Summary

**Problem:**
```
Pull failed: Command failed: git pull --ff-only 
git: 'remote-codecommit' is not a git command. See 'git --help'. 
fatal: remote helper 'codecommit' aborted session
```

**Root Cause Analysis:**
- AutoPullService uses `execPromise()` directly to execute git commands
- This bypasses GitCommandService which implements FR-7 (Custom PATH Configuration)
- Without enhanced PATH, git cannot find credential helpers like git-remote-codecommit
- GitCommandService already has the solution implemented and working for fetch operations

**Solution:**
- Refactor AutoPullService to use GitCommandService.executeGitCommand() instead of execPromise
- This will automatically apply enhanced PATH to all pull operations
- No changes needed to GitCommandService (FR-7 already implemented)

---

## Phase 1: Code Analysis and Planning

### ANALYZE-001: Identify All Direct Git Command Executions
**Description:** Audit AutoPullService for all locations using execPromise directly
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** None
**Acceptance Criteria:**
- [x] List all methods calling execPromise
- [x] Identify which commands need PATH enhancement
- [x] Document current command signatures
- [x] Map to GitCommandService equivalents

**Findings:**
```typescript
// Current direct executions:
1. executePull() - line ~220: 'git pull --ff-only'
2. getCurrentCommitHash() - line ~300: 'git rev-parse HEAD'
3. calculateCommitsPulled() - line ~330: 'git rev-list --count ${beforeHash}..${afterHash}'
```

### ANALYZE-002: Review GitCommandService API
**Description:** Document GitCommandService methods available for use
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** None
**Acceptance Criteria:**
- [x] Document executeGitCommand() signature
- [x] Verify it supports all needed git commands
- [x] Confirm timeout handling compatibility
- [x] Check error handling patterns

**Findings:**
- GitCommandService has private executeGitCommand(command: string, options) method
- Need to add public method to expose this functionality with PATH enhancement
- Timeout handling compatible (options.timeout parameter)
- Error handling returns GitRepositoryError which we can catch

---

## Phase 2: Refactoring Implementation

### REFACTOR-001: Replace executePull() Git Command
**Description:** Replace direct git pull execution with GitCommandService call
**Files:** `src/services/AutoPullService.ts` (lines ~215-235)
**Dependencies:** ANALYZE-001, ANALYZE-002
**Acceptance Criteria:**
- [x] Replace `execPromise('git pull --ff-only')` with GitCommandService call
- [x] Maintain 5-second timeout requirement
- [x] Preserve error handling behavior
- [x] Keep commit hash capture logic intact
- [x] Verify PATH enhancement applies automatically

**Current Code:**
```typescript
await execPromise('git pull --ff-only', {
    cwd: repoPath,
    timeout: 5000,
});
```

**New Code:**
```typescript
await this.gitCommandService.executeGitCommand(
    ['pull', '--ff-only'],
    repoPath,
    'Pull changes',
    5000  // timeout in ms
);
```

### REFACTOR-002: Replace getCurrentCommitHash() Git Command
**Description:** Replace direct git rev-parse execution with GitCommandService call
**Files:** `src/services/AutoPullService.ts` (lines ~295-310)
**Dependencies:** ANALYZE-001, ANALYZE-002
**Acceptance Criteria:**
- [x] Replace `execPromise('git rev-parse HEAD')` with GitCommandService call
- [x] Maintain 5-second timeout
- [x] Preserve return value (commit hash)
- [x] Keep error handling behavior

**Current Code:**
```typescript
const { stdout } = await execPromise('git rev-parse HEAD', {
    cwd: repoPath,
    timeout: 5000,
});
return stdout.trim();
```

**New Code:**
```typescript
const result = await this.gitCommandService.executeGitCommand(
    ['rev-parse', 'HEAD'],
    repoPath,
    'Get current commit hash',
    5000
);
return result.stdout.trim();
```

### REFACTOR-003: Replace calculateCommitsPulled() Git Command
**Description:** Replace direct git rev-list execution with GitCommandService call
**Files:** `src/services/AutoPullService.ts` (lines ~325-345)
**Dependencies:** ANALYZE-001, ANALYZE-002
**Acceptance Criteria:**
- [x] Replace `execPromise('git rev-list --count')` with GitCommandService call
- [x] Maintain 5-second timeout
- [x] Preserve commit count calculation
- [x] Keep error handling behavior

**Current Code:**
```typescript
const { stdout } = await execPromise(
    `git rev-list --count ${beforeHash}..${afterHash}`,
    { cwd: repoPath, timeout: 5000 }
);
```

**New Code:**
```typescript
const result = await this.gitCommandService.executeGitCommand(
    ['rev-list', '--count', `${beforeHash}..${afterHash}`],
    repoPath,
    'Calculate commits pulled',
    5000
);
```

### REFACTOR-004: Remove execPromise Import
**Description:** Clean up unused imports after refactoring
**Files:** `src/services/AutoPullService.ts` (lines ~8-9)
**Dependencies:** REFACTOR-001, REFACTOR-002, REFACTOR-003
**Acceptance Criteria:**
- [x] Remove `exec` import from 'child_process'
- [x] Remove `promisify` import from 'util'
- [x] Remove `execPromise` constant declaration
- [x] Verify no other code depends on these imports

**Current Code:**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
```

**New Code:**
```typescript
// Remove these imports - no longer needed
```

---

## Phase 3: Testing and Validation

### TEST-001: Unit Test Updates
**Description:** Update AutoPullService unit tests for GitCommandService usage
**Files:** `test/services/AutoPullService.test.ts`
**Dependencies:** REFACTOR-004
**Acceptance Criteria:**
- [ ] Update mocks to use GitCommandService instead of child_process
- [ ] Verify all existing tests still pass
- [ ] Add test cases for PATH enhancement scenarios
- [ ] Confirm error handling tests work with new implementation

### TEST-002: Integration Test - AWS CodeCommit
**Description:** Test pull operations with git-remote-codecommit repository
**Files:** Manual testing checklist
**Dependencies:** TEST-001
**Acceptance Criteria:**
- [ ] Configure test repository using CodeCommit remote
- [ ] Verify custom PATH entries include ~/.cargo/bin
- [ ] Test automatic pull with remote changes
- [ ] Confirm no "remote-codecommit not found" errors
- [ ] Validate pull history records success

**Test Steps:**
```bash
# 1. Ensure git-remote-codecommit is installed
pip install git-remote-codecommit

# 2. Verify it's in ~/.cargo/bin or ~/.local/bin
which git-remote-codecommit

# 3. Configure plugin with CodeCommit repository
# Add repository using codecommit:// URL

# 4. Enable debug logging to verify PATH
# Check console for "Enhanced PATH:" log entries

# 5. Trigger fetch to detect remote changes
# Should automatically attempt pull

# 6. Verify pull succeeds without credential helper errors
```

### TEST-003: Cross-Platform Validation
**Description:** Verify fix works on macOS, Windows, and Linux
**Files:** CI/CD test results
**Dependencies:** TEST-002
**Acceptance Criteria:**
- [ ] macOS: Test with Homebrew-installed credential helpers
- [ ] Windows: Test with custom PATH entries
- [ ] Linux: Test with ~/.local/bin credential helpers
- [ ] All platforms pass integration tests
- [ ] No platform-specific issues introduced

### TEST-004: Regression Testing
**Description:** Ensure fix doesn't break existing functionality
**Files:** All existing test suites
**Dependencies:** TEST-001, TEST-002, TEST-003
**Acceptance Criteria:**
- [ ] All existing unit tests pass (385+ tests)
- [ ] All integration tests pass
- [ ] Manual testing checklists for FR-1, FR-2, FR-3 still valid
- [ ] No performance degradation (< 5 seconds pull time)
- [ ] No new error cases introduced

---

## Phase 4: Documentation and Deployment

### DOC-001: Update Technical Documentation
**Description:** Document the PATH configuration dependency
**Files:** `docs/troubleshooting.md`, `docs/architecture.md`
**Dependencies:** TEST-004
**Acceptance Criteria:**
- [ ] Add troubleshooting entry for credential helper errors
- [ ] Document PATH configuration importance for pull operations
- [ ] Update architecture docs to show AutoPullService → GitCommandService flow
- [ ] Include CodeCommit as example use case

**Troubleshooting Entry:**
```markdown
## Pull Operations Fail with "not a git command" Error

**Symptom:**
```
Pull failed: git: 'remote-codecommit' is not a git command
```

**Cause:** 
Credential helper not found in PATH. Obsidian's environment doesn't include
user-specific PATH entries by default.

**Solution:**
1. Open plugin settings
2. Navigate to "Custom PATH entries"
3. Ensure the directory containing your credential helper is listed
4. Default entries should include:
   - ~/.cargo/bin (Rust tools)
   - ~/.local/bin (Python pip --user installs)
   - /opt/homebrew/bin (Homebrew on Apple Silicon)
   - /usr/local/bin (Homebrew on Intel, common Linux)

**Verify credential helper location:**
```bash
which git-remote-codecommit
# Should output path like /Users/you/.local/bin/git-remote-codecommit
```
```

### DOC-002: Update CHANGELOG
**Description:** Document the fix in changelog
**Files:** `CHANGELOG.md`
**Dependencies:** DOC-001
**Acceptance Criteria:**
- [ ] Add entry under appropriate version
- [ ] Describe the bug that was fixed
- [ ] Note that GitCommandService is now used consistently
- [ ] Credit the issue reporter if applicable

**Changelog Entry:**
```markdown
### Fixed
- Auto-pull operations now correctly find credential helpers like git-remote-codecommit
  by using GitCommandService consistently throughout the codebase. This ensures the 
  enhanced PATH configuration from FR-7 applies to all git operations, not just fetches.
  Fixes issue where AWS CodeCommit repositories would fail with "remote-codecommit is 
  not a git command" error.
```

### DEPLOY-001: Create Pull Request
**Description:** Prepare changes for code review and merge
**Files:** All modified files
**Dependencies:** DOC-002
**Acceptance Criteria:**
- [ ] All changes committed on feature branch
- [ ] Branch rebased on latest main
- [ ] PR description includes issue summary and solution
- [ ] PR links to original issue/bug report
- [ ] All CI/CD checks passing

---

## Summary

**Total Tasks:** 14 tasks across 4 phases  
**Estimated Complexity:** Low (straightforward refactoring)  
**Risk Assessment:** Low (well-tested solution already exists in GitCommandService)

**Key Points:**
- GitCommandService already implements the solution (FR-7)
- Only need to refactor AutoPullService to use it
- No changes to GitCommandService required
- All git commands in AutoPullService need updating
- Comprehensive testing ensures no regressions

**Dependencies:**
- FR-7 (Custom PATH Configuration) must be implemented ✅ (already done)
- GitCommandService.executeGitCommand() must be available ✅ (already exists)
- Unit tests must be updated to mock GitCommandService

**Next Steps:**
1. Review and approve this task breakdown
2. Execute Phase 1 (Analysis) tasks
3. Begin Phase 2 (Refactoring) implementation
4. Complete Phase 3 (Testing) validation
5. Finalize Phase 4 (Documentation) and deploy
