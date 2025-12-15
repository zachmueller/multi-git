# Task Breakdown: FR-2 - Automatic Fast-Forward Pull

**Created:** 2025-12-15
**Implementation Plan:** [plan.md](./plan.md)
**Specification:** [specs/2-auto-pull/spec.md](../spec.md)
**Status:** Planning
**Branch:** 2-auto-pull

## Task Summary

**Total Tasks:** 34
**Phases:** 6 (Setup → Foundation → Core → Integration → Quality → Documentation)
**Estimated Complexity:** Medium-High
**Parallel Execution Opportunities:** 8 task groups
**Prerequisites:** FR-1 (Fast-Forward Detection) must be complete and tested

## Constitutional Alignment

- [x] Specification-First Development: Tasks derived from approved FR-2 specification
- [x] Iterative Simplicity: Building on existing service patterns, minimal new complexity
- [x] Documentation as Context: Comprehensive inline documentation and test coverage

## Phase 0: Prerequisites Validation

### PRE-001: Validate FR-1 Completion
**Description:** Verify FR-1 (Fast-Forward Detection) is complete and tested before beginning FR-2
**Files:** `src/services/FastForwardDetectionService.ts`, `test/services/FastForwardDetectionService.test.ts`
**Dependencies:** None
**Acceptance Criteria:**
- [x] FastForwardDetectionService exists and compiles
- [x] FastForwardDetectionService unit tests pass
- [x] FastForwardDetectionService integration tests pass
- [x] Service correctly identifies fast-forward vs diverged scenarios
- [x] Service performance meets requirements (< 500ms)

**Validation Commands:**
```bash
# Verify service exists
ls -la src/services/FastForwardDetectionService.ts

# Run FR-1 tests
npm test -- FastForwardDetectionService

# Check integration tests
npm test -- integration
```

## Phase 1: Foundation & Service Structure

### FOUND-001: Create AutoPullService Foundation
**Description:** Implement core service structure with dependencies and configuration checking
**Files:** `src/services/AutoPullService.ts` (create new)
**Dependencies:** PRE-001
**Acceptance Criteria:**
- [x] Service class created with proper TypeScript structure
- [x] Constructor accepts all required service dependencies:
  - FastForwardDetectionService
  - GitCommandService
  - NotificationService
  - RepositoryConfigService
  - MultiGitSettings
- [x] `isAutoPullEnabled()` method implemented
- [x] Method checks global autoPullEnabled setting
- [x] Method checks per-repository autoPullPerRepository override
- [x] Service compiles without TypeScript errors

**Implementation Notes:**
```typescript
class AutoPullService {
  constructor(
    private fastForwardDetectionService: FastForwardDetectionService,
    private gitCommandService: GitCommandService,
    private notificationService: NotificationService,
    private repositoryConfigService: RepositoryConfigService,
    private settings: MultiGitSettings,
    private logger: Logger
  ) {}
  
  isAutoPullEnabled(repositoryId: string): boolean {
    // Check global setting first
    // Then check per-repository override
  }
}
```

### FOUND-002: Define Data Model Types
**Description:** Create comprehensive type definitions for pull operations and state management
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** FOUND-001
**Acceptance Criteria:**
- [x] PullOperationState interface defined with all required fields
- [x] PullErrorCode enum defined with all error types
- [x] PullSkipReason enum defined with all skip scenarios
- [x] PullHistoryEntry interface defined for status panel display
- [x] All types properly exported
- [x] JSDoc comments added for each type
- [x] Types align with specification requirements

**Type Definitions:**
```typescript
interface PullOperationState {
  repositoryId: string;
  repositoryName: string;
  repositoryPath: string;
  startTime: Date;
  endTime: Date | null;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  pullType: 'fast-forward-only';
  commitsBefore: string;
  commitsAfter: string | null;
  commitsPulled: number;
  errorMessage: string | null;
  errorCode: PullErrorCode | null;
  skipReason: PullSkipReason | null;
  retryCount: number;
  lastRetryTime: Date | null;
  nextRetryTime: Date | null;
}

enum PullErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  LOCK_ERROR = 'LOCK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

enum PullSkipReason {
  DISABLED_GLOBAL = 'DISABLED_GLOBAL',
  DISABLED_REPO = 'DISABLED_REPO',
  UNCOMMITTED_CHANGES = 'UNCOMMITTED_CHANGES',
  NOT_FAST_FORWARD = 'NOT_FAST_FORWARD',
  DIVERGED_BRANCHES = 'DIVERGED_BRANCHES',
  NO_TRACKING_BRANCH = 'NO_TRACKING_BRANCH',
  DETACHED_HEAD = 'DETACHED_HEAD',
  CONCURRENT_OPERATION = 'CONCURRENT_OPERATION'
}
```

### FOUND-003: Implement Safety Check Layer
**Description:** Implement comprehensive safety validation before pull operations
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** FOUND-002
**Acceptance Criteria:**
- [x] `performSafetyChecks()` method implemented
- [x] Returns object with safe boolean and optional skipReason
- [x] Checks working directory clean (no uncommitted changes)
- [x] Checks for concurrent git operations
- [x] Checks repository not locked
- [x] All check failures return appropriate PullSkipReason
- [x] All decisions logged with debug information
- [x] Method executes in < 500ms

**Safety Check Layers:**
```typescript
private async performSafetyChecks(
  repoPath: string,
  repositoryId: string
): Promise<{ safe: boolean; skipReason?: PullSkipReason }> {
  // Check working directory clean
  // Check no concurrent operations
  // Check repository not locked
  // Return aggregated result
}
```

### FOUND-004: Implement Working Directory Validation
**Description:** Validate working directory is clean before pull operations
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** FOUND-003
**Acceptance Criteria:**
- [x] `isWorkingDirectoryClean()` method implemented
- [x] Uses GitCommandService.getRepositoryStatus() or equivalent
- [x] Returns true only if no uncommitted changes
- [x] Handles all git status scenarios (modified, added, deleted, untracked)
- [x] Method executes in < 100ms for typical repositories
- [x] Error handling for git status command failures
- [x] Comprehensive logging of working directory state

## Phase 2: Core Pull Implementation

### CORE-001: Implement Pull Execution Logic
**Description:** Core git pull operation with proper error handling and verification
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** FOUND-004
**Acceptance Criteria:**
- [ ] `executePull()` private method implemented
- [ ] Captures commit hash before pull operation
- [ ] Executes `git pull --ff-only` using GitCommandService
- [ ] Captures commit hash after pull operation
- [ ] Calculates number of commits pulled
- [ ] Returns success boolean, commitsAfter hash, error code and message
- [ ] Categorizes errors into PullErrorCode types
- [ ] 5-second timeout enforced (per specification)
- [ ] Atomic operation guarantee maintained
- [ ] Performance timing logged

**Pull Execution Flow:**
```typescript
private async executePull(repoPath: string): Promise<{
  success: boolean;
  commitsAfter: string | null;
  errorCode?: PullErrorCode;
  errorMessage?: string;
}> {
  // Get commit hash before
  // Execute git pull --ff-only with timeout
  // Get commit hash after if successful
  // Calculate commits pulled
  // Categorize errors
  // Return comprehensive result
}
```

### CORE-002: Implement Retry Logic with Exponential Backoff
**Description:** Graceful recovery from transient failures with intelligent retry
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** CORE-001
**Acceptance Criteria:**
- [ ] `calculateRetryDelay()` method implemented
- [ ] Returns delays: 0ms (immediate), 10000ms, 30000ms based on retryCount
- [ ] `scheduleRetry()` method implemented
- [ ] Updates PullOperationState with retry information
- [ ] Increments retryCount (maximum 3)
- [ ] Sets nextRetryTime based on exponential backoff
- [ ] Sets lastRetryTime to current time
- [ ] Differentiates retryable vs non-retryable errors
- [ ] AUTH_ERROR never triggers retry (fail fast)
- [ ] NETWORK_ERROR and LOCK_ERROR trigger retry
- [ ] Guards against infinite retry loops
- [ ] Comprehensive retry logging

**Retry Logic:**
```typescript
private calculateRetryDelay(retryCount: number): number {
  // 0 -> 0ms (immediate)
  // 1 -> 10000ms (10 seconds)
  // 2 -> 30000ms (30 seconds)
  // 3+ -> not called (max retries exhausted)
}

private async scheduleRetry(operation: PullOperationState): Promise<void> {
  // Check retry count < 3
  // Calculate delay
  // Schedule retry execution
  // Update operation state
}
```

### CORE-003 [P]: Implement Pull History Management
**Description:** Track and store pull operation history for debugging and display
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** FOUND-002
**Acceptance Criteria:**
- [ ] In-memory storage using Map<repositoryId, PullHistoryEntry[]>
- [ ] `addToHistory()` private method implemented
- [ ] `getPullHistory()` public method implemented
- [ ] History limited to last 10 entries per repository (FIFO queue)
- [ ] Oldest entries removed when exceeding 10
- [ ] Entries include timestamp, result, commits pulled, errors
- [ ] Empty history handled gracefully
- [ ] Memory usage bounded (no unbounded growth)
- [ ] History survives multiple pull operations
- [ ] Thread-safe for concurrent access

**History Management:**
```typescript
private pullHistory = new Map<string, PullHistoryEntry[]>();

private addToHistory(repositoryId: string, entry: PullHistoryEntry): void {
  // Get existing history or create new array
  // Add new entry
  // Keep only last 10 entries
  // Update map
}

getPullHistory(repositoryId: string): PullHistoryEntry[] {
  // Return history array or empty array
  // Most recent first
}
```

### CORE-004: Implement Main Pull Orchestration
**Description:** Complete attemptAutoPull() workflow with all safety layers and error handling
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** CORE-001, CORE-002, CORE-003, FOUND-003
**Acceptance Criteria:**
- [ ] `attemptAutoPull()` public method implemented
- [ ] Layer 1: Checks global and per-repository auto-pull enabled
- [ ] Layer 2: Performs all safety checks (working directory, concurrent ops)
- [ ] Layer 3: Executes fast-forward detection via FR-1
- [ ] Layer 4: Executes pull if all checks pass
- [ ] Creates PullOperationState with initial 'pending' status
- [ ] Handles all status outcomes (success, failed, skipped)
- [ ] Updates status to success/failed/skipped based on result
- [ ] Records operation in pull history
- [ ] Implements retry loop for failed operations
- [ ] Triggers appropriate notifications for each outcome
- [ ] Returns comprehensive PullOperationState
- [ ] All decision points logged
- [ ] Method completes within 5 seconds (excluding retries)

**Orchestration Flow:**
```typescript
async attemptAutoPull(repositoryId: string): Promise<PullOperationState> {
  // Create initial operation state
  // Layer 1: Check auto-pull enabled
  // Layer 2: Perform safety checks
  // Layer 3: Check fast-forward detection
  // Layer 4: Execute pull
  // Handle retry logic if needed
  // Update history
  // Send notifications
  // Return operation state
}
```

### CORE-005 [P]: Implement Notification Methods
**Description:** Clear user feedback for all pull operation outcomes
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** FOUND-002
**Acceptance Criteria:**
- [ ] `notifyPullSuccess()` private method implemented
- [ ] Success notifications are subtle (transient)
- [ ] Includes repository name and commit count
- [ ] Example: "Pulled 3 commits for Vault Repository"
- [ ] `notifyPullFailed()` private method implemented
- [ ] Failure notifications are prominent (persistent)
- [ ] Includes clear error message and guidance
- [ ] `notifyManualInterventionRequired()` private method implemented
- [ ] Manual intervention notifications explain why and what to do
- [ ] Respects notification verbosity settings (all/failures-only/silent)
- [ ] Uses appropriate NotificationService methods
- [ ] Messages use clear, non-technical language
- [ ] No notifications when verbosity is 'silent'

**Notification Methods:**
```typescript
private notifyPullSuccess(repositoryName: string, commitsPulled: number): void {
  // Check verbosity setting
  // Send subtle notification with commit count
}

private notifyPullFailed(repositoryName: string, errorMessage: string): void {
  // Check verbosity setting
  // Send prominent notification with error and guidance
}

private notifyManualInterventionRequired(repositoryName: string, reason: string): void {
  // Always send (regardless of verbosity for manual intervention)
  // Explain why auto-pull not possible
  // Provide actionable next steps
}
```

### CORE-006: Implement Manual Pull Support
**Description:** Support manual pull trigger from status panel UI
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** CORE-004
**Acceptance Criteria:**
- [ ] `manualPull()` public method implemented
- [ ] Bypasses auto-pull enabled check (manual always allowed)
- [ ] Performs same safety checks as automatic pull
- [ ] Uses same pull execution logic
- [ ] Does NOT use retry logic (provides immediate feedback)
- [ ] Returns detailed PullOperationState for UI display
- [ ] Triggers appropriate notifications
- [ ] Logs distinguish manual vs automatic pulls
- [ ] Works even when auto-pull globally disabled

**Manual Pull:**
```typescript
async manualPull(repositoryId: string): Promise<PullOperationState> {
  // Similar to attemptAutoPull but:
  // - Skip enabled check
  // - No retry logic
  // - Immediate result
  // - Clear logging of manual trigger
}
```

## Phase 3: Integration & UI

### INT-001: Integrate with FetchSchedulerService
**Description:** Trigger auto-pull after successful fetch detects remote changes
**Files:** `src/services/FetchSchedulerService.ts`
**Dependencies:** CORE-004
**Acceptance Criteria:**
- [ ] AutoPullService added as constructor dependency
- [ ] After successful fetch with remote changes detected:
  - Call `autoPullService.attemptAutoPull(repositoryId)`
- [ ] Sequential processing enforced (await pull completion before next repo)
- [ ] Pull result handled and repository state updated
- [ ] Pull failures don't break fetch scheduler loop
- [ ] Error handling for pull operation failures
- [ ] Workflow logged end-to-end (fetch → detection → pull)
- [ ] Integration tested with multiple repositories

**Integration Point:**
```typescript
// In FetchSchedulerService after successful fetch:
if (remoteStatus.hasChanges) {
  try {
    const pullResult = await this.autoPullService.attemptAutoPull(repositoryId);
    // Update repository state based on result
    // Continue to next repository
  } catch (error) {
    // Log error, continue with next repository
  }
}
```

### INT-002: Add Settings Data Model
**Description:** Add auto-pull configuration fields to settings data structure
**Files:** `src/settings/data.ts`
**Dependencies:** None (parallel with service development)
**Acceptance Criteria:**
- [x] `autoPullEnabled` boolean field added to MultiGitSettings
- [x] Default value is `true` (auto-pull enabled by default)
- [x] `autoPullPerRepository` Record<string, boolean> added
- [x] Default per-repository setting matches global default
- [x] `autoPullNotificationVerbosity` field added
- [x] Type is 'all' | 'failures-only' | 'silent'
- [x] Default value is 'all'
- [x] Settings interface updated in TypeScript
- [x] Migration logic for existing settings (defaults provided)

**Settings Schema:**
```typescript
interface MultiGitSettings {
  // ... existing fields ...
  
  autoPullEnabled: boolean;  // Default: true
  autoPullPerRepository: Record<string, boolean>;
  autoPullNotificationVerbosity: 'all' | 'failures-only' | 'silent';  // Default: 'all'
}
```

### INT-003: Implement Settings UI
**Description:** User interface for configuring auto-pull behavior
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** INT-002
**Acceptance Criteria:**
- [ ] Global auto-pull enable/disable toggle added
- [ ] Clear label: "Enable automatic pull"
- [ ] Help text explains safe fast-forward-only behavior
- [ ] Per-repository auto-pull controls added
- [ ] Each configured repository has individual toggle
- [ ] Notification verbosity dropdown added
- [ ] Options: "All operations", "Failures only", "Silent"
- [ ] Settings validate on change
- [ ] Settings persist correctly
- [ ] Changes take effect immediately (no reload required)
- [ ] Safety warnings included where appropriate
- [ ] UI follows Obsidian settings patterns

### INT-004: Update StatusPanelView - Pull History Display
**Description:** Display pull operation history in expandable status panel section
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** CORE-003
**Acceptance Criteria:**
- [ ] AutoPullService added as dependency
- [ ] Expandable "Pull History" section added per repository
- [ ] Section shows last 10 pull operations
- [ ] Each entry displays:
  - Timestamp (relative: "5 minutes ago")
  - Result icon (✓ success, ✗ failed, ⊘ skipped)
  - Commits pulled (if successful)
  - Error message (if failed)
  - Skip reason (if skipped)
- [ ] Entries ordered most recent first
- [ ] Empty history shows "No pull operations yet"
- [ ] Section collapses/expands smoothly
- [ ] Styling consistent with Obsidian UI
- [ ] Updates in real-time after pull operations

### INT-005 [P]: Update StatusPanelView - Action Buttons
**Description:** Add pull action buttons for manual trigger and status indicators
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** CORE-006, INT-001
**Acceptance Criteria:**
- [ ] "Pull" action button added when updates available
- [ ] Button appears when auto-pull disabled or skipped
- [ ] Button triggers `autoPullService.manualPull(repositoryId)`
- [ ] Loading state shown during manual pull operation
- [ ] Result displayed after manual pull completes
- [ ] "Updates Available" indicator with info icon (ℹ️)
- [ ] Shows when auto-pull disabled or safety check prevented pull
- [ ] "Manual merge required" indicator with warning icon (⚠️)
- [ ] Shows when branches diverged (not fast-forward)
- [ ] Status updates immediately after pull operations
- [ ] Error states clearly displayed

### INT-006 [P]: Update StatusPanelView - Real-time Updates
**Description:** Ensure status panel reflects current pull operation state
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** INT-004, INT-005
**Acceptance Criteria:**
- [ ] Panel updates after successful pull (shows new commit count)
- [ ] Panel updates after failed pull (shows error state)
- [ ] Panel updates after skipped pull (shows manual intervention needed)
- [ ] Loading indicators during pull operations
- [ ] Updates don't cause UI flicker or layout shift
- [ ] Event listeners properly registered for state changes
- [ ] Proper cleanup on panel destroy
- [ ] Performance acceptable (updates within 100ms)

## Phase 4: Quality & Testing

### TEST-001: Unit Tests - Service Foundation
**Description:** Test safety checks, configuration, and foundational methods
**Files:** `test/services/AutoPullService.test.ts` (create new)
**Dependencies:** CORE-006
**Acceptance Criteria:**
- [ ] Test file created with proper Jest setup
- [ ] All service dependencies properly mocked
- [ ] Test: `isAutoPullEnabled()` respects global setting
- [ ] Test: `isAutoPullEnabled()` respects per-repository override
- [ ] Test: `performSafetyChecks()` detects uncommitted changes
- [ ] Test: `performSafetyChecks()` detects concurrent operations
- [ ] Test: `performSafetyChecks()` detects repository locks
- [ ] Test: `isWorkingDirectoryClean()` correctly identifies dirty state
- [ ] Test: `isWorkingDirectoryClean()` correctly identifies clean state
- [ ] All edge cases covered
- [ ] Code coverage > 90% for tested methods
- [ ] Tests execute in < 2 seconds

### TEST-002: Unit Tests - Pull Execution
**Description:** Test core pull logic and error handling
**Files:** `test/services/AutoPullService.test.ts`
**Dependencies:** TEST-001
**Acceptance Criteria:**
- [ ] Test: `executePull()` successful fast-forward pull
- [ ] Test: `executePull()` captures before/after commit hashes
- [ ] Test: `executePull()` calculates commits pulled correctly
- [ ] Test: `executePull()` handles network errors
- [ ] Test: `executePull()` handles authentication errors
- [ ] Test: `executePull()` handles lock errors
- [ ] Test: `executePull()` handles timeout errors
- [ ] Test: `executePull()` categorizes errors correctly
- [ ] Test: 5-second timeout enforced
- [ ] Mock time properly for timeout testing
- [ ] Code coverage > 95% for executePull

### TEST-003: Unit Tests - Retry Logic
**Description:** Test retry mechanism with exponential backoff
**Files:** `test/services/AutoPullService.test.ts`
**Dependencies:** TEST-002
**Acceptance Criteria:**
- [ ] Test: `calculateRetryDelay()` returns correct delays (0ms, 10000ms, 30000ms)
- [ ] Test: Retry count increments correctly (0 → 1 → 2 → 3)
- [ ] Test: Maximum 3 retries enforced
- [ ] Test: AUTH_ERROR does not trigger retry
- [ ] Test: NETWORK_ERROR triggers retry
- [ ] Test: LOCK_ERROR triggers retry
- [ ] Test: Retry state properly tracked in PullOperationState
- [ ] Test: `nextRetryTime` calculated correctly
- [ ] Test: No infinite retry loops possible
- [ ] Mock time/delays for faster test execution
- [ ] Tests complete in < 5 seconds

### TEST-004: Unit Tests - Orchestration & History
**Description:** Test main pull workflow and history management
**Files:** `test/services/AutoPullService.test.ts`
**Dependencies:** TEST-003
**Acceptance Criteria:**
- [ ] Test: `attemptAutoPull()` successful pull workflow
- [ ] Test: `attemptAutoPull()` skips when auto-pull disabled globally
- [ ] Test: `attemptAutoPull()` skips when auto-pull disabled per-repo
- [ ] Test: `attemptAutoPull()` skips with uncommitted changes
- [ ] Test: `attemptAutoPull()` skips when not fast-forward
- [ ] Test: `attemptAutoPull()` skips with diverged branches
- [ ] Test: `attemptAutoPull()` retries on network failure
- [ ] Test: Pull history limited to 10 entries
- [ ] Test: Pull history FIFO (oldest removed first)
- [ ] Test: `getPullHistory()` returns correct entries
- [ ] Test: History survives multiple operations
- [ ] All four safety layers validated
- [ ] Code coverage > 95% for orchestration

### TEST-005: Unit Tests - Manual Pull & Notifications
**Description:** Test manual pull trigger and notification logic
**Files:** `test/services/AutoPullService.test.ts`
**Dependencies:** TEST-004
**Acceptance Criteria:**
- [ ] Test: `manualPull()` works when auto-pull disabled
- [ ] Test: `manualPull()` performs safety checks
- [ ] Test: `manualPull()` does not use retry logic
- [ ] Test: `manualPull()` returns immediate result
- [ ] Test: `notifyPullSuccess()` respects verbosity settings
- [ ] Test: `notifyPullFailed()` respects verbosity settings
- [ ] Test: `notifyManualInterventionRequired()` always sends
- [ ] Test: Silent verbosity suppresses all notifications
- [ ] Test: Failures-only verbosity only shows failures
- [ ] Test: All verbosity shows all operations
- [ ] Overall test suite code coverage > 95%
- [ ] All tests pass consistently

### TEST-006: Integration Tests - Real Repository Operations
**Description:** Validate auto-pull against real git repositories
**Files:** `test/integration/auto-pull.test.ts` (create new)
**Dependencies:** TEST-005
**Acceptance Criteria:**
- [ ] Test setup creates real test git repositories
- [ ] Test: Successful fast-forward pull updates local files
- [ ] Test: Pull with uncommitted changes skips correctly
- [ ] Test: Pull with diverged branches skips correctly
- [ ] Test: Pull verifies before/after commit hashes match
- [ ] Test: Pull correctly counts commits pulled
- [ ] Test: Network error simulation triggers retry
- [ ] Test: Retry logic with real delays validated
- [ ] Test: Sequential processing multiple repositories
- [ ] Test: Local files actually updated after pull
- [ ] Test: Working directory unchanged after failed pull
- [ ] Test: Performance < 5 seconds per pull operation
- [ ] Test cleanup removes test repositories
- [ ] Tests pass on CI/CD environments

### TEST-007 [P]: Integration Tests - FetchScheduler Integration
**Description:** Validate fetch-to-pull workflow end-to-end
**Files:** `test/integration/fetch-pull-workflow.test.ts` (create new)
**Dependencies:** TEST-006, INT-001
**Acceptance Criteria:**
- [ ] Test: Fetch detects changes and triggers auto-pull
- [ ] Test: Sequential processing of multiple repositories
- [ ] Test: Pull failure doesn't break fetch loop
- [ ] Test: Repository state updated after pull
- [ ] Test: Workflow completes within reasonable time
- [ ] Test: Pull history populated from fetch trigger
- [ ] Test: End-to-end workflow with multiple repos and mixed states
- [ ] All integration tests pass
- [ ] Integration test suite runs in < 60 seconds

### TEST-008: Manual Testing Checklist Creation
**Description:** Document comprehensive manual test scenarios
**Files:** `specs/2-auto-pull/fr2/manual-testing-checklist.md` (create new)
**Dependencies:** TEST-007
**Acceptance Criteria:**
- [ ] Checklist file created with structured format
- [ ] Scenario: Successful auto-pull after fetch
- [ ] Scenario: Auto-pull with uncommitted changes
- [ ] Scenario: Auto-pull with diverged branches
- [ ] Scenario: Manual pull via status panel button
- [ ] Scenario: Retry logic with simulated network issues
- [ ] Scenario: Global auto-pull disable/enable
- [ ] Scenario: Per-repository auto-pull override
- [ ] Scenario: Pull history display and updates
- [ ] Scenario: Notification verbosity settings
- [ ] Scenario: Multiple repositories sequential processing
- [ ] Platform-specific tests (macOS, Linux, Windows)
- [ ] Authentication tests (SSH, HTTPS)
- [ ] Edge cases documented (empty repo, no internet, etc.)
- [ ] Each scenario has clear pass/fail criteria

### TEST-009: Manual Testing Execution
**Description:** Execute manual testing checklist and document results
**Files:** `specs/2-auto-pull/fr2/manual-testing-checklist.md` (update with results)
**Dependencies:** TEST-008, INT-006
**Acceptance Criteria:**
- [ ] All scenarios from checklist executed
- [ ] Results documented with pass/fail
- [ ] Edge cases tested and documented
- [ ] Performance validated in real-world usage
- [ ] User experience assessed
- [ ] Platform compatibility confirmed (at least macOS)
- [ ] SSH authentication tested
- [ ] HTTPS authentication tested
- [ ] Issues identified and documented
- [ ] Regressions checked (existing features still work)
- [ ] No data loss in any tested scenario

## Phase 5: Documentation & Polish

### DOC-001: Code Documentation
**Description:** Add comprehensive JSDoc comments and inline documentation
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** CORE-006
**Acceptance Criteria:**
- [ ] JSDoc comments for all public methods
- [ ] JSDoc includes @param descriptions for all parameters
- [ ] JSDoc includes @returns descriptions
- [ ] JSDoc includes usage examples where helpful
- [ ] Complex logic has inline explanatory comments
- [ ] Retry logic documented with backoff schedule
- [ ] Safety check layers documented
- [ ] State transition flows documented
- [ ] Error handling strategies explained
- [ ] Performance considerations noted

### DOC-002 [P]: Update README
**Description:** Document auto-pull feature in user-facing documentation
**Files:** `README.md`
**Dependencies:** None (can be done in parallel)
**Acceptance Criteria:**
- [ ] Auto-pull feature described in features section
- [ ] Clear explanation of fast-forward-only behavior
- [ ] Safety guarantees documented
- [ ] Configuration options explained
- [ ] Usage examples provided
- [ ] Screenshots/GIFs of status panel (if applicable)
- [ ] Troubleshooting section updated
- [ ] Common issues and solutions documented
- [ ] Links to detailed specification

### DOC-003 [P]: Update Troubleshooting Guide
**Description:** Add auto-pull specific troubleshooting information
**Files:** `docs/troubleshooting.md` (create if doesn't exist)
**Dependencies:** TEST-009
**Acceptance Criteria:**
- [ ] "Auto-pull not working" section added
- [ ] "Pull fails repeatedly" section added
- [ ] "Manual merge required" explanation
- [ ] How to disable auto-pull per repository
- [ ] How to view pull history for debugging
- [ ] Common error messages explained
- [ ] Resolution steps for each error type
- [ ] Links to relevant logs and debug mode
- [ ]
