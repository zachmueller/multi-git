# Implementation Plan: FR-4 Pull Operation Logging

**Created:** 2025-12-16  
**Specification:** [specs/2-auto-pull/spec.md](../spec.md)  
**Status:** Draft

## Constitutional Compliance Check

### Principle 1: Specification-First Development
- ✅ **Compliance:** This plan implements FR-4 from approved specification
- ✅ **Validation:** All requirements traced directly to spec acceptance criteria
- ✅ **Scope Control:** No features added beyond FR-4 requirements

### Principle 2: Iterative Simplicity
- ✅ **Compliance:** Minimal implementation using existing logger infrastructure
- ✅ **Validation:** Extends existing `src/utils/logger.ts` rather than creating new logging system
- ✅ **Approach:** Leverage already-implemented debug mode from FR-2 (1-multi-git-core)

### Principle 3: Documentation as Context
- ✅ **Compliance:** Log messages are self-documenting with structured data
- ✅ **Validation:** Log format provides complete context for debugging
- ✅ **Future Context:** Logs serve as audit trail for AI-assisted troubleshooting

**Gate Evaluation:** ✅ PASS - All constitutional principles satisfied

## Technical Context

### Existing Infrastructure
The plugin already has a robust logging system from 1-multi-git-core:

**Available Components:**
- `src/utils/logger.ts` - Centralized logging utility with debug mode support
- Debug mode controlled via plugin settings (FR-2 from 1-multi-git-core)
- Console output infrastructure for development and troubleshooting
- Structured logging pattern already established for fetch operations

**Current Capabilities:**
- Log level filtering (debug mode on/off)
- Timestamp inclusion
- Repository context awareness
- Error sanitization (sensitive data removal)

### Integration Points
FR-4 logging will integrate with:
- `AutoPullService` - Primary pull operation orchestrator
- `FastForwardDetectionService` - Fast-forward safety checks (FR-1)
- `GitCommandService` - Git command execution with enhanced PATH
- Existing logger utility for consistent output format

### Privacy and Security
**Critical Requirement:** Logs must NEVER contain sensitive information

**Sensitive Data to Exclude:**
- Git remote URLs with embedded credentials (e.g., `https://user:token@github.com/repo.git`)
- Authentication tokens or API keys
- SSH private key data
- User passwords or credentials
- File content from commits

**Safe Data to Include:**
- Repository names (local identifiers only)
- Commit hashes (public identifiers)
- Timestamps
- Operation outcomes (success/failure)
- Error types (sanitized messages)
- Git command results (stdout/stderr, sanitized)

## Implementation Approach

### Phase 1: Enhance Logger Utility (If Needed)

**Current State Assessment:**
- Review `src/utils/logger.ts` for existing debug logging capabilities
- Verify error sanitization functions handle git remote URLs
- Confirm timestamp formatting meets requirements

**Potential Enhancements:**
- Add structured logging method if not present: `logDebugStructured(component, operation, data)`
- Enhance sanitization to strip credentials from git remote URLs
- Add log entry formatting for pull operations

**Decision:** Only add functionality if truly missing from existing implementation

### Phase 2: Add Logging to FastForwardDetectionService

**Location:** `src/services/FastForwardDetectionService.ts`

**Log Points:**
1. **Detection Start:**
   ```typescript
   this.logger.debug(`[FastForwardDetection] Starting check for ${repoId}`);
   ```

2. **Working Directory Status:**
   ```typescript
   this.logger.debug(`[FastForwardDetection] Working directory clean: ${isClean}`);
   ```

3. **Branch Divergence Check:**
   ```typescript
   this.logger.debug(`[FastForwardDetection] Local ahead: ${ahead}, behind: ${behind}`);
   ```

4. **Detection Result:**
   ```typescript
   this.logger.debug(`[FastForwardDetection] Result for ${repoId}: canFastForward=${result.canFastForward}, reason=${result.reason || 'safe'}`);
   ```

**Data Structure:**
```typescript
{
  repositoryId: string,
  timestamp: string,
  operation: 'fast-forward-detection',
  result: {
    canFastForward: boolean,
    reason?: 'divergent-branches' | 'uncommitted-changes' | 'concurrent-operation',
    ahead: number,
    behind: number
  }
}
```

### Phase 3: Add Logging to AutoPullService

**Location:** `src/services/AutoPullService.ts`

**Log Points:**
1. **Pull Attempt Start:**
   ```typescript
   this.logger.debug(`[AutoPull] Attempting pull for ${repoId} (attempt ${retryCount + 1}/3)`);
   this.logger.debug(`[AutoPull] Current commit: ${commitBefore}`);
   ```

2. **Pull Command Execution:**
   ```typescript
   this.logger.debug(`[AutoPull] Executing: git pull --ff-only in ${repoPath}`);
   ```

3. **Pull Success:**
   ```typescript
   this.logger.debug(`[AutoPull] Pull successful for ${repoId}`);
   this.logger.debug(`[AutoPull] Previous commit: ${commitBefore}`);
   this.logger.debug(`[AutoPull] New commit: ${commitAfter}`);
   this.logger.debug(`[AutoPull] Commits pulled: ${commitsPulled}`);
   ```

4. **Pull Failure:**
   ```typescript
   this.logger.debug(`[AutoPull] Pull failed for ${repoId}: ${sanitizedError}`);
   this.logger.debug(`[AutoPull] Retry count: ${retryCount}/3`);
   ```

5. **Pull Skipped:**
   ```typescript
   this.logger.debug(`[AutoPull] Pull skipped for ${repoId}: ${skipReason}`);
   ```

**Data Structure:**
```typescript
{
  repositoryId: string,
  timestamp: string,
  operation: 'pull-attempt' | 'pull-success' | 'pull-failure' | 'pull-skipped',
  commitBefore?: string,
  commitAfter?: string,
  commitsPulled?: number,
  retryCount?: number,
  error?: string, // sanitized
  skipReason?: string,
  duration?: number // milliseconds
}
```

### Phase 4: Implement Sensitive Data Sanitization

**Goal:** Ensure no credentials leak into logs

**Implementation in Logger Utility:**
```typescript
function sanitizeGitOutput(output: string): string {
  // Remove credentials from URLs
  output = output.replace(
    /(https?:\/\/)([^:@]+):([^@]+)@/g,
    '$1[CREDENTIALS]@'
  );
  
  // Remove SSH key data if present
  output = output.replace(
    /-----BEGIN [A-Z ]+ KEY-----[\s\S]*?-----END [A-Z ]+ KEY-----/g,
    '[SSH_KEY_REDACTED]'
  );
  
  // Remove any tokens in error messages
  output = output.replace(
    /token[=:]\s*[^\s]+/gi,
    'token=[REDACTED]'
  );
  
  return output;
}
```

**Apply to:**
- All git command stdout/stderr before logging
- Error messages before logging
- Any user-provided configuration values in logs

### Phase 5: Add Log Context Helpers

**Purpose:** Simplify logging with repository context

**Helper Methods in AutoPullService:**
```typescript
private logPullStart(repoId: string, commitHash: string, retryCount: number): void {
  if (!this.settings.debugMode) return;
  
  this.logger.debug(
    `[AutoPull] Starting pull for ${repoId}`,
    { commitBefore: commitHash, attempt: retryCount + 1 }
  );
}

private logPullSuccess(repoId: string, before: string, after: string, count: number): void {
  if (!this.settings.debugMode) return;
  
  this.logger.debug(
    `[AutoPull] Pull successful for ${repoId}`,
    { commitBefore: before, commitAfter: after, commitsPulled: count }
  );
}

private logPullFailure(repoId: string, error: Error, retryCount: number): void {
  if (!this.settings.debugMode) return;
  
  const sanitizedError = this.sanitizeError(error.message);
  this.logger.debug(
    `[AutoPull] Pull failed for ${repoId}`,
    { error: sanitizedError, attempt: retryCount + 1 }
  );
}
```

## Implementation Steps

### Step 1: Review Existing Logger
**Task:** Audit `src/utils/logger.ts` for capabilities
- [ ] Verify debug mode functionality works as expected
- [ ] Check if structured logging exists
- [ ] Review error sanitization implementation
- [ ] Confirm timestamp formatting

**Outcome:** List of any enhancements needed

### Step 2: Enhance Logger (If Required)
**Task:** Add any missing functionality to logger utility
- [ ] Add `sanitizeGitOutput()` function if not present
- [ ] Add structured logging method if needed
- [ ] Add helper for including commit hash context
- [ ] Test sanitization with real-world git URLs

**Files:** `src/utils/logger.ts`

### Step 3: Implement FastForwardDetectionService Logging
**Task:** Add comprehensive logging to detection logic
- [ ] Log detection start with repository context
- [ ] Log working directory status check
- [ ] Log branch comparison results (ahead/behind)
- [ ] Log final detection decision with reason
- [ ] Ensure all logs respect debug mode setting

**Files:** `src/services/FastForwardDetectionService.ts`

### Step 4: Implement AutoPullService Logging
**Task:** Add comprehensive logging to pull operations
- [ ] Add logging helper methods to service class
- [ ] Log pull attempt start with commit hash
- [ ] Log git command execution
- [ ] Log pull success with before/after commits
- [ ] Log pull failure with sanitized errors
- [ ] Log pull skip with reason
- [ ] Log retry attempts with count
- [ ] Ensure sensitive data never logged

**Files:** `src/services/AutoPullService.ts`

### Step 5: Test Logging Output
**Task:** Validate logs provide useful debugging information
- [ ] Enable debug mode in plugin settings
- [ ] Trigger successful pull operation
- [ ] Verify all expected log entries appear
- [ ] Trigger failed pull (disconnect network)
- [ ] Verify error logs are sanitized
- [ ] Trigger skip scenario (uncommitted changes)
- [ ] Verify skip reason logged correctly
- [ ] Test with repository using HTTPS auth
- [ ] Confirm no credentials appear in logs

### Step 6: Document Logging Behavior
**Task:** Update documentation for debugging
- [ ] Document which operations generate logs
- [ ] Explain how to enable debug mode
- [ ] Provide examples of log output
- [ ] Document log format and fields
- [ ] Add troubleshooting guide using logs

**Files:** `docs/troubleshooting.md`, possibly `README.md`

## Log Format Examples

### Successful Pull Operation
```
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Starting check for vault-notes
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Working directory clean: true
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Local ahead: 0, behind: 3
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Result for vault-notes: canFastForward=true
[2025-12-16 07:30:15] [DEBUG] [AutoPull] Starting pull for vault-notes (attempt 1/3)
[2025-12-16 07:30:15] [DEBUG] [AutoPull] Current commit: a1b2c3d4e5f6
[2025-12-16 07:30:15] [DEBUG] [AutoPull] Executing: git pull --ff-only
[2025-12-16 07:30:17] [DEBUG] [AutoPull] Pull successful for vault-notes
[2025-12-16 07:30:17] [DEBUG] [AutoPull] Previous commit: a1b2c3d4e5f6
[2025-12-16 07:30:17] [DEBUG] [AutoPull] New commit: f6e5d4c3b2a1
[2025-12-16 07:30:17] [DEBUG] [AutoPull] Commits pulled: 3
```

### Failed Pull with Retry
```
[2025-12-16 07:35:20] [DEBUG] [FastForwardDetection] Starting check for vault-notes
[2025-12-16 07:35:20] [DEBUG] [FastForwardDetection] Result for vault-notes: canFastForward=true
[2025-12-16 07:35:20] [DEBUG] [AutoPull] Starting pull for vault-notes (attempt 1/3)
[2025-12-16 07:35:20] [DEBUG] [AutoPull] Current commit: a1b2c3d4e5f6
[2025-12-16 07:35:22] [DEBUG] [AutoPull] Pull failed for vault-notes: Network timeout
[2025-12-16 07:35:32] [DEBUG] [AutoPull] Starting pull for vault-notes (attempt 2/3)
[2025-12-16 07:35:34] [DEBUG] [AutoPull] Pull successful for vault-notes
[2025-12-16 07:35:34] [DEBUG] [AutoPull] Commits pulled: 3
```

### Skipped Pull
```
[2025-12-16 07:40:10] [DEBUG] [FastForwardDetection] Starting check for vault-notes
[2025-12-16 07:40:10] [DEBUG] [FastForwardDetection] Working directory clean: false
[2025-12-16 07:40:10] [DEBUG] [FastForwardDetection] Result for vault-notes: canFastForward=false, reason=uncommitted-changes
[2025-12-16 07:40:10] [DEBUG] [AutoPull] Pull skipped for vault-notes: uncommitted-changes
```

### Credential Sanitization Example
```
// BEFORE SANITIZATION (NEVER LOGGED):
// fatal: could not read Username for 'https://user:ghp_abc123xyz@github.com': terminal prompts disabled

// AFTER SANITIZATION (ACTUALLY LOGGED):
[2025-12-16 07:45:00] [DEBUG] [AutoPull] Pull failed for vault-notes: fatal: could not read Username for 'https://[CREDENTIALS]@github.com': terminal prompts disabled
```

## Testing Strategy

### Unit Tests
**File:** `test/services/AutoPullService.test.ts`

**Test Cases:**
1. **Logging Enabled:**
   - Verify logs generated when debug mode enabled
   - Verify logs NOT generated when debug mode disabled

2. **Sensitive Data Sanitization:**
   - Test sanitization of HTTPS URLs with credentials
   - Test sanitization of error messages with tokens
   - Verify commit hashes NOT sanitized (they're safe)

3. **Log Content Validation:**
   - Verify commit hashes included in success logs
   - Verify retry count included in failure logs
   - Verify skip reason included when applicable

### Integration Tests
**File:** `test/integration/auto-pull.test.ts`

**Test Scenarios:**
1. Enable debug mode and trigger full pull workflow
2. Capture console output
3. Verify expected log entries present
4. Verify log sequence matches operation order
5. Verify no sensitive data in any logs

### Manual Testing Checklist
**File:** `specs/2-auto-pull/fr4/manual-testing-checklist.md` (to be created)

**Steps:**
1. Enable debug mode in settings
2. Open developer console (Ctrl+Shift+I)
3. Trigger automatic pull with remote changes
4. Verify logs appear with all required fields
5. Trigger failed pull (disconnect network)
6. Verify error logged with sanitized message
7. Review all logs for sensitive data
8. Disable debug mode
9. Trigger pull operation
10. Verify NO logs appear

## Quality Standards

### Log Message Guidelines
- Use consistent component prefixes: `[FastForwardDetection]`, `[AutoPull]`
- Include repository identifier in every message
- Use present tense for operations: "Starting pull", "Pull successful"
- Keep messages concise but informative
- Include structured data objects for complex information

### Performance Considerations
- Logging should NOT impact pull operation performance
- Log level checks (`if (debugMode)`) before expensive string operations
- Avoid logging large data structures or file contents
- Keep individual log messages under 500 characters

### Security Requirements
- ALL git command output MUST be sanitized before logging
- NO credentials or tokens in any log message
- Review all error message logging for sensitive data
- Test sanitization with real-world credential formats

## Risks and Mitigations

### Risk: Sensitive Data Leakage
**Impact:** Critical - could expose user credentials
**Likelihood:** Medium - git errors often contain URLs with credentials
**Mitigation:**
- Comprehensive sanitization function covering all credential formats
- Mandatory code review focusing on sanitization
- Integration tests specifically for sensitive data
- Documentation warning developers about logging security

### Risk: Log Spam
**Impact:** Low - clutters console, makes debugging harder
**Likelihood:** Medium - many log points in pull workflow
**Mitigation:**
- Only log when debug mode explicitly enabled
- Keep messages concise and informative
- Use structured data to reduce message verbosity
- Provide clear documentation on enabling/disabling

### Risk: Performance Impact
**Impact:** Low - slower pull operations
**Likelihood:** Low - logging is fast operation
**Mitigation:**
- Check debug mode before expensive string formatting
- Avoid logging large data (file contents, diffs)
- Performance test with logging enabled
- Monitor for any measurable impact

## Dependencies

- Existing logger utility (`src/utils/logger.ts`)
- Debug mode setting from FR-2 (1-multi-git-core)
- AutoPullService implementation (FR-2)
- FastForwardDetectionService implementation (FR-1)

## Validation Criteria

### Functional Validation
- [ ] All FR-4 acceptance criteria met
- [ ] Logs generated for all pull operation states
- [ ] Logs include all required data fields
- [ ] Logs only appear when debug mode enabled
- [ ] Sensitive data never appears in logs

### Code Quality Validation
- [ ] Logging code follows existing patterns
- [ ] No code duplication in logging calls
- [ ] Helper methods reduce boilerplate
- [ ] Comments explain sanitization logic
- [ ] Unit tests cover logging behavior

### Documentation Validation
- [ ] Troubleshooting guide includes logging examples
- [ ] Log format documented with field descriptions
- [ ] Instructions for enabling debug mode clear
- [ ] Examples show real-world debugging scenarios

## Next Steps

1. **Review this plan** with constitutional principles
2. **Create tasks breakdown** using `tasks` workflow (optional, if needed)
3. **Begin implementation** following step-by-step guide
4. **Test thoroughly** with manual testing checklist
5. **Document** in troubleshooting guide
6. **Commit** with reference to FR-4

## Notes

### Assumptions
- Existing logger utility is sufficient (may need minor enhancements)
- Debug mode setting works correctly from FR-2
- Console output is acceptable log destination (no file logging required)
- Developers will enable debug mode when troubleshooting

### Out of Scope
- Persistent log files (logging to disk)
- Log rotation or log management
- Log aggregation or analytics
- User-facing log viewer UI
- Real-time log streaming to external services

### Future Enhancements
- Could add log export functionality
- Could add log filtering by repository or operation type
- Could add performance metrics in logs (operation duration)
- Could integrate with external logging services for production monitoring
