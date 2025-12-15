# Task Breakdown: FR-4 Pull Operation Logging

**Created:** 2025-12-16  
**Implementation Plan:** [plan.md](./plan.md)  
**Specification:** [../spec.md](../spec.md#fr-4-pull-operation-logging)  
**Status:** Planning

## Task Summary

**Total Tasks:** 18  
**Phases:** 5 (Setup → Foundation → Core → Quality → Documentation)  
**Estimated Complexity:** Low-Medium  
**Parallel Execution Opportunities:** 2 task groups

## Constitutional Compliance

- ✅ **Specification-First:** All tasks trace to FR-4 acceptance criteria
- ✅ **Iterative Simplicity:** Extends existing logger, no new infrastructure
- ✅ **Documentation as Context:** Logs provide debugging context for AI assistance

## Phase 0: Setup & Infrastructure Review

### ENV-001: Audit Existing Logger Utility
**Description:** Review current logger implementation to identify needed enhancements
**Files:** `src/utils/logger.ts`
**Dependencies:** None
**Acceptance Criteria:**
- [x] Debug mode functionality verified working
- [x] Current sanitization capabilities documented
- [x] Structured logging support assessed
- [x] List of required enhancements identified

**Commands:**
```bash
# Review logger implementation
cat src/utils/logger.ts

# Check debug mode usage in existing services
grep -r "debug\(" src/services/
```

### ENV-002: Review Debug Mode Settings
**Description:** Verify debug mode setting from FR-2 (1-multi-git-core) is accessible
**Files:** `src/settings/data.ts`, `src/settings/SettingTab.ts`
**Dependencies:** ENV-001
**Acceptance Criteria:**
- [x] Debug mode setting exists in plugin settings
- [x] Setting accessible from services via plugin instance
- [x] Setting changes take effect without plugin reload
- [x] Default debug mode state confirmed (off)

## Phase 1: Foundation - Logger Enhancements

### LOG-001: Implement Sensitive Data Sanitization
**Description:** Add comprehensive credential sanitization to prevent data leakage
**Files:** `src/utils/logger.ts`
**Dependencies:** ENV-002
**Acceptance Criteria:**
- [x] Sanitization function removes HTTPS credentials from URLs
- [x] Sanitization removes SSH key data from output
- [x] Sanitization removes tokens from error messages
- [x] Function handles null/undefined input gracefully
- [x] Sanitization preserves useful debugging information
- [x] Performance impact negligible (< 1ms per call)

**Implementation:**
```typescript
function sanitizeGitOutput(output: string): string {
  if (!output) return output;
  
  // Remove credentials from URLs
  output = output.replace(
    /(https?:\/\/)([^:@]+):([^@]+)@/g,
    '$1[CREDENTIALS]@'
  );
  
  // Remove SSH key data
  output = output.replace(
    /-----BEGIN [A-Z ]+ KEY-----[\s\S]*?-----END [A-Z ]+ KEY-----/g,
    '[SSH_KEY_REDACTED]'
  );
  
  // Remove tokens
  output = output.replace(
    /token[=:]\s*[^\s]+/gi,
    'token=[REDACTED]'
  );
  
  return output;
}
```

### LOG-002 [P]: Add Unit Tests for Sanitization
**Description:** Create comprehensive tests for sensitive data sanitization
**Files:** `test/utils/logger.test.ts`
**Dependencies:** LOG-001
**Acceptance Criteria:**
- [x] Test sanitization of HTTPS URLs with embedded credentials
- [x] Test sanitization of SSH key data
- [x] Test sanitization of various token formats
- [x] Test that commit hashes are NOT sanitized
- [x] Test edge cases (empty strings, null, undefined)
- [x] All tests pass with 100% coverage of sanitization function

**Test Cases:**
- Input: `https://user:pass@github.com/repo.git`
- Output: `https://[CREDENTIALS]@github.com/repo.git`
- Input: `token=ghp_abc123xyz`
- Output: `token=[REDACTED]`
- Input: `commit hash: a1b2c3d4e5f6` (should remain unchanged)

### LOG-003 [P]: Add Structured Logging Helper (If Needed)
**Description:** Add structured logging method for complex data if not present
**Files:** `src/utils/logger.ts`
**Dependencies:** LOG-001
**Acceptance Criteria:**
- [x] Method accepts component, operation, and data object (already exists as Logger.debug())
- [x] Output format is consistent and readable
- [x] Respects debug mode setting
- [x] Handles nested objects correctly
- [x] Performance acceptable for production use

**Implementation (if needed):**
```typescript
debug(component: string, message: string, data?: Record<string, any>): void {
  if (!this.debugMode) return;
  
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  console.debug(`[${timestamp}] [DEBUG] [${component}] ${message}${dataStr}`);
}
```

## Phase 2: Core Implementation - Service Logging

### FEAT-001: Add FastForwardDetectionService Logging
**Description:** Implement comprehensive logging for fast-forward detection operations
**Files:** `src/services/FastForwardDetectionService.ts`
**Dependencies:** LOG-003
**Acceptance Criteria:**
- [x] Log detection start with repository context
- [x] Log working directory status check result
- [x] Log branch comparison (ahead/behind commits)
- [x] Log final detection decision with reason
- [x] All logs include repository identifier
- [x] All logs respect debug mode setting
- [x] Log messages follow format guidelines

**Log Points:**
1. Detection start: `[FastForwardDetection] Starting check for ${repoId}`
2. Working directory: `[FastForwardDetection] Working directory clean: ${isClean}`
3. Branch status: `[FastForwardDetection] Local ahead: ${ahead}, behind: ${behind}`
4. Result: `[FastForwardDetection] Result: canFastForward=${result}, reason=${reason}`

### FEAT-002: Add AutoPullService Helper Methods
**Description:** Create logging helper methods to reduce boilerplate in pull operations
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** LOG-003
**Acceptance Criteria:**
- [x] Helper method for pull start logging
- [x] Helper method for pull success logging
- [x] Helper method for pull failure logging
- [x] Helper method for pull skip logging
- [x] All helpers check debug mode before logging
- [x] All helpers sanitize error messages
- [x] Helpers use consistent message format

**Helper Methods:**
```typescript
private logPullStart(repoId: string, commitHash: string, retryCount: number): void
private logPullSuccess(repoId: string, before: string, after: string, count: number): void
private logPullFailure(repoId: string, error: Error, retryCount: number): void
private logPullSkip(repoId: string, reason: string): void
```

### FEAT-003: Implement Pull Attempt Logging
**Description:** Add logging for pull operation start and git command execution
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** FEAT-002
**Acceptance Criteria:**
- [x] Log pull attempt start with retry count
- [x] Log current commit hash before pull
- [x] Log git command being executed
- [x] Log repository path being operated on
- [x] Include attempt number (1/3, 2/3, 3/3)
- [x] All sensitive data sanitized

**Example Output:**
```
[AutoPull] Starting pull for vault-notes (attempt 1/3)
[AutoPull] Current commit: a1b2c3d4e5f6
[AutoPull] Executing: git pull --ff-only in /path/to/repo
```

### FEAT-004: Implement Pull Success Logging
**Description:** Add comprehensive logging for successful pull operations
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** FEAT-003
**Acceptance Criteria:**
- [x] Log pull success confirmation
- [x] Log commit hash before pull
- [x] Log commit hash after pull
- [x] Log number of commits pulled
- [x] Log operation duration (optional)
- [x] Include all data in structured format

**Example Output:**
```
[AutoPull] Pull successful for vault-notes
[AutoPull] Previous commit: a1b2c3d4e5f6
[AutoPull] New commit: f6e5d4c3b2a1
[AutoPull] Commits pulled: 3
```

### FEAT-005: Implement Pull Failure Logging
**Description:** Add comprehensive logging for failed pull operations with retry tracking
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** FEAT-003
**Acceptance Criteria:**
- [x] Log pull failure with sanitized error message
- [x] Log retry count and max retries
- [x] Log whether retry will be attempted
- [x] Sanitize all error messages before logging
- [x] Handle different error types appropriately
- [x] Never expose sensitive data in error logs

**Example Output:**
```
[AutoPull] Pull failed for vault-notes: Network timeout
[AutoPull] Retry count: 1/3, will retry in 10s
```

### FEAT-006: Implement Pull Skip Logging
**Description:** Add logging for skipped pull operations with clear reasons
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** FEAT-002
**Acceptance Criteria:**
- [x] Log when pull is skipped
- [x] Log skip reason (uncommitted-changes, divergent-branches, etc.)
- [x] Include repository identifier
- [x] Use consistent message format
- [x] Skip reasons match specification states

**Example Output:**
```
[AutoPull] Pull skipped for vault-notes: uncommitted-changes
```

## Phase 3: Quality & Testing

### TEST-001: Unit Test FastForwardDetectionService Logging
**Description:** Validate logging behavior in fast-forward detection
**Files:** `test/services/FastForwardDetectionService.test.ts`
**Dependencies:** FEAT-001
**Acceptance Criteria:**
- [x] Test logs generated when debug mode enabled
- [x] Test logs NOT generated when debug mode disabled
- [x] Test log content includes expected fields
- [x] Test logs appear in correct sequence
- [x] Mock console.debug to capture output
- [x] All tests pass

**Test Cases:**
1. Debug mode on → logs appear
2. Debug mode off → no logs
3. Log content validation for all scenarios

### TEST-002: Unit Test AutoPullService Logging
**Description:** Validate logging behavior in pull operations
**Files:** `test/services/AutoPullService.test.ts`
**Dependencies:** FEAT-006
**Acceptance Criteria:**
- [x] Test pull start logging with retry count
- [x] Test pull success logging with commit hashes
- [x] Test pull failure logging with sanitization
- [x] Test pull skip logging with reasons
- [x] Test debug mode toggle affects logging
- [x] Test error message sanitization works
- [x] All tests pass with >90% coverage

### TEST-003: Integration Test - Complete Pull Workflow Logging
**Description:** Validate end-to-end logging through full pull operation
**Files:** `test/integration/auto-pull.test.ts`
**Dependencies:** TEST-002
**Acceptance Criteria:**
- [x] Enable debug mode in test setup
- [x] Capture all console.debug output
- [x] Verify expected log entries present
- [x] Verify log sequence matches operation flow
- [x] Test both success and failure scenarios
- [x] Verify no sensitive data in any logs

**Scenarios:**
1. Successful fast-forward pull
2. Failed pull with retry
3. Skipped pull (uncommitted changes)

### TEST-004: Security Test - Sensitive Data Sanitization
**Description:** Validate that sensitive data never appears in logs
**Files:** `test/utils/logger.test.ts`, `test/services/AutoPullService.test.ts`
**Dependencies:** TEST-003
**Acceptance Criteria:**
- [x] Test with HTTPS URLs containing credentials
- [x] Test with error messages containing tokens
- [x] Test with SSH URLs and key data
- [x] Verify commit hashes remain unsanitized
- [x] Test various credential formats
- [x] All sensitive data properly redacted
- [x] Security test suite passes 100%

**Critical Test Cases:**
- `https://user:ghp_token@github.com/repo.git` → `https://[CREDENTIALS]@github.com/repo.git`
- Error with token → Token redacted
- SSH key in output → Key redacted
- Commit hashes → Unchanged

### MAN-001: Manual Testing - Enable Debug Mode
**Description:** Manually verify logging behavior in real plugin environment
**Files:** Create `specs/2-auto-pull/fr4/manual-testing-checklist.md`
**Dependencies:** TEST-004
**Acceptance Criteria:**
- [x] Testing checklist document created
- [x] Steps for enabling debug mode documented
- [x] Steps for triggering various scenarios documented
- [x] Steps for verifying log output documented
- [x] Security verification steps included

**Checklist Contents:**
1. Enable debug mode in settings
2. Open developer console
3. Trigger successful pull
4. Verify logs appear with all fields
5. Trigger failed pull (network disconnect)
6. Verify error sanitization
7. Trigger skip scenario
8. Review all logs for sensitive data
9. Disable debug mode and verify no logs

### MAN-002: Manual Testing - Execute Checklist
**Description:** Execute manual testing checklist and document results
**Files:** Update `specs/2-auto-pull/fr4/manual-testing-checklist.md`
**Dependencies:** MAN-001
**Acceptance Criteria:**
- [ ] All checklist items executed
- [ ] Results documented in checklist
- [ ] No issues found OR issues documented
- [ ] Screenshots captured for key scenarios
- [ ] No sensitive data found in any logs
- [ ] Manual testing complete

## Phase 4: Documentation

### DOC-001: Create Troubleshooting Guide Section
**Description:** Add comprehensive logging documentation to troubleshooting guide
**Files:** `docs/troubleshooting.md`
**Dependencies:** MAN-002
**Acceptance Criteria:**
- [ ] Document how to enable debug mode
- [ ] Provide log format examples for each operation type
- [ ] Explain what each log field means
- [ ] Show example troubleshooting scenarios using logs
- [ ] Include section on log security (no sensitive data)
- [ ] Link to manual testing checklist

**Content Sections:**
1. Enabling Debug Logging
2. Log Format Reference
3. Example Log Outputs
4. Troubleshooting with Logs
5. Security and Privacy

### DOC-002 [P]: Update README (If Needed)
**Description:** Add mention of debug logging feature to README
**Files:** `README.md`
**Dependencies:** DOC-001
**Acceptance Criteria:**
- [ ] Brief mention of debug mode in features or troubleshooting section
- [ ] Link to detailed troubleshooting guide
- [ ] Update keeps README concise and focused

### VAL-001: Final Validation Against FR-4 Requirements
**Description:** Validate implementation against all FR-4 acceptance criteria
**Files:** Review all implementation files
**Dependencies:** DOC-002
**Acceptance Criteria:**
- [ ] ✅ Debug logs record fast-forward detection results
- [ ] ✅ Debug logs record pull attempts with timestamps
- [ ] ✅ Debug logs record pull success/failure with details
- [ ] ✅ Debug logs include commit hashes before and after pull
- [ ] ✅ Debug logs include number of commits pulled
- [ ] ✅ Logs accessible when debug mode enabled in settings
- [ ] ✅ Logs do not contain sensitive information (passwords, tokens)
- [ ] All FR-4 acceptance criteria confirmed met
- [ ] No regressions in existing functionality
- [ ] Ready for commit

## Log Format Reference

### Successful Pull Operation
```
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Starting check for vault-notes
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Working directory clean: true
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Local ahead: 0, behind: 3
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Result: canFastForward=true
[2025-12-16 07:30:15] [DEBUG] [AutoPull] Starting pull for vault-notes (attempt 1/3)
[2025-12-16 07:30:15] [DEBUG] [AutoPull] Current commit: a1b2c3d4e5f6
[2025-12-16 07:30:17] [DEBUG] [AutoPull] Pull successful for vault-notes
[2025-12-16 07:30:17] [DEBUG] [AutoPull] Previous commit: a1b2c3d4e5f6
[2025-12-16 07:30:17] [DEBUG] [AutoPull] New commit: f6e5d4c3b2a1
[2025-12-16 07:30:17] [DEBUG] [AutoPull] Commits pulled: 3
```

### Failed Pull with Retry
```
[2025-12-16 07:35:20] [DEBUG] [AutoPull] Starting pull for vault-notes (attempt 1/3)
[2025-12-16 07:35:22] [DEBUG] [AutoPull] Pull failed for vault-notes: Network timeout
[2025-12-16 07:35:32] [DEBUG] [AutoPull] Starting pull for vault-notes (attempt 2/3)
[2025-12-16 07:35:34] [DEBUG] [AutoPull] Pull successful for vault-notes
```

### Skipped Pull
```
[2025-12-16 07:40:10] [DEBUG] [FastForwardDetection] Result: canFastForward=false, reason=uncommitted-changes
[2025-12-16 07:40:10] [DEBUG] [AutoPull] Pull skipped for vault-notes: uncommitted-changes
```

## Quality Standards

### Log Message Guidelines
- Use component prefixes: `[FastForwardDetection]`, `[AutoPull]`
- Include repository identifier in every message
- Present tense for operations: "Starting pull", "Pull successful"
- Concise but informative (< 500 characters)
- Structured data for complex information

### Security Requirements
- **MANDATORY:** All git output sanitized before logging
- **MANDATORY:** No credentials or tokens in logs
- **MANDATORY:** Review all error messages for sensitive data
- **MANDATORY:** Test sanitization with real-world formats

### Performance Guidelines
- Check debug mode before expensive operations
- Avoid logging large data structures
- Keep logging overhead < 5% of operation time
- No blocking operations in logging code

## Notes

### Key Decisions
- Extend existing logger rather than create new system
- Use console.debug (no file logging for now)
- Sanitization is mandatory for all git output
- Debug mode must be explicitly enabled

### Out of Scope
- Persistent log files (disk storage)
- Log rotation or management
- User-facing log viewer UI
- Real-time log streaming
- Log aggregation or analytics

### Future Enhancements
- Log export functionality
- Log filtering by repository
- Performance metrics in logs
- Integration with external logging services
