# Implementation Plan: Automated Remote Fetch (FR-2)

**Created:** 2025-01-12
**Specification:** [spec.md](./spec.md)
**Status:** Planning
**Feature:** Multi-Git Core for Obsidian
**Requirement:** FR-2: Automated Remote Fetch

## Technical Context

### Architecture Decisions

#### Background Task Scheduling
- **Approach:** setInterval-based periodic execution with cleanup
  - **Rationale:** Simple, reliable, supported natively in JavaScript/Node.js environment
  - **Alternatives Considered:**
    - Web Workers: Not available in Obsidian plugin context
    - node-cron: Additional dependency, overkill for simple interval-based scheduling
    - Obsidian's workspace events: Not appropriate for time-based scheduling
  - **Trade-offs:** Pro: Simple, reliable, no dependencies. Con: Basic scheduling only (no cron expressions), runs in main thread but async operations prevent blocking

#### Git Fetch Strategy
- **Command:** `git fetch --all --tags --prune` for comprehensive remote sync
  - **Rationale:** Fetches all remotes, includes tags, prunes deleted remote branches
  - **Alternatives Considered:**
    - `git fetch origin`: Only fetches default remote, misses other remotes
    - `git remote update`: Similar but less standard
  - **Trade-offs:** Pro: Comprehensive, handles multi-remote repos. Con: Slightly slower with multiple remotes

#### Remote Change Detection
- **Method:** Compare local and remote branch refs using `git rev-list --count`
  - **Rationale:** Accurate commit count difference between local and remote branches
  - **Alternatives Considered:**
    - `git status`: Checks working directory, not what we need
    - `git log`: Would work but harder to parse
    - Simple ref comparison: Doesn't show how many commits behind
  - **Trade-offs:** Pro: Precise, shows commit count. Con: One command per tracked branch

#### Notification Strategy
- **Approach:** Per-repository Obsidian Notice only when actionable changes detected
  - **Rationale:** Spec explicitly requires notifications only for remote changes requiring action
  - **Alternatives Considered:**
    - Global notification for all repos: Too noisy, doesn't identify which repo
    - Status panel only: User might not have panel open
    - Both notification + panel update: Best of both worlds
  - **Trade-offs:** Pro: Clear, actionable, non-intrusive. Con: Multiple repos with changes = multiple notices

### Technology Stack Rationale

#### Why setInterval for Scheduling?
- **Requirement:** Must run automatically at configurable intervals without user intervention
- **Benefit:** Built-in, reliable, proper cleanup on plugin unload prevents memory leaks
- **Constraint:** Runs in main thread but async git operations prevent UI blocking

#### Why git fetch --all?
- **Requirement:** Must handle repositories with multiple remotes (common in fork workflows)
- **Benefit:** Comprehensive fetch covers all scenarios; --prune keeps refs clean
- **Constraint:** Slightly slower but thoroughness is priority over speed for background task

#### Why Per-Repository Notification?
- **Requirement:** Spec explicitly states "notification clearly identifies which repository"
- **Benefit:** Users know exactly where to look; can dismiss irrelevant repos
- **Constraint:** Multiple repos with changes = multiple notices (acceptable per spec)

### Integration Points

#### FR-1 Integration (Repository Configuration)
- **Dependencies:** Requires RepositoryConfigService from FR-1 for repository list
- **Data Extension:** Extends RepositoryConfig with fetch-related timestamps and status
- **Service Layer:** Builds on GitCommandService for git command execution

#### Obsidian Platform Integration
- **Interval Management:** Use plugin lifecycle for proper cleanup
- **Notice API:** Obsidian's Notice class for non-intrusive notifications
- **Settings Integration:** Add fetch interval configuration to settings tab

#### Status Display Preparation (FR-4)
- **Data Model:** Fetch results stored in way that FR-4 can display
- **Event System:** Prepare for status panel updates when implemented
- **Decoupling:** FR-2 stores status; FR-4 will read and display it

### Security Considerations

#### Background Operation Safety
- **Non-destructive:** Fetch is read-only operation, cannot damage repository
- **Error Isolation:** Failure in one repo doesn't affect others
- **Resource Limits:** Configurable intervals prevent excessive system load

#### Network Operations
- **Timeout Handling:** Set reasonable timeouts for git fetch (30 seconds default)
- **Offline Gracefully:** Detect network failures, don't spam errors
- **Respect System State:** Pause during system sleep/hibernate (future enhancement)

## Constitution Check

### Principle Compliance Review

#### Principle 1: Specification-First Development
- **Requirement:** All features must begin with clear specification before implementation
- **Plan Alignment:** This plan implements FR-2 from approved specification in spec.md
- **Validation:** Spec section FR-2 defines all acceptance criteria for automated fetching

#### Principle 2: Iterative Simplicity
- **Requirement:** Start with minimal viable implementation
- **Plan Alignment:**
  - Simple setInterval-based scheduling (not complex cron system)
  - Basic notification on remote changes (not fancy UI)
  - Single fetch strategy (not complex merge/pull operations)
  - No advanced features like adaptive intervals, bandwidth throttling
- **Validation:** Only implements features explicitly required by FR-2 acceptance criteria

#### Principle 3: Documentation as Context
- **Requirement:** Code and decisions documented for future work and AI assistance
- **Plan Alignment:**
  - Complete technical decision documentation with alternatives
  - API contracts documented for future integrations (FR-4)
  - Data model extensions clearly specified
  - Integration points with FR-1 explicitly stated
- **Validation:** Plan provides comprehensive context for implementation and future work

### Quality Gates
- [x] All constitutional MUST requirements addressed
- [x] Non-negotiable principles not violated
- [x] Quality standards and practices followed
- [x] Compliance requirements satisfied

**Gate Evaluation:** PASS

## Phase 0: Research & Architecture

### Technology Research Tasks

#### 1. Obsidian Plugin Lifecycle Best Practices
- **Question:** How to properly manage intervals in plugin lifecycle?
- **Research Areas:**
  - Plugin load/unload hooks for cleanup
  - Memory leak prevention patterns
  - Hot reload behavior with intervals
- **Success Criteria:** Clear pattern for interval cleanup that prevents leaks
- **Deadline:** Before Phase 1 implementation

#### 2. Git Fetch Error Scenarios
- **Question:** What are common git fetch failure modes and how to detect them?
- **Research Areas:**
  - Network timeout handling
  - Authentication failures during fetch
  - Merge conflict detection (shouldn't happen with fetch but verify)
  - Corrupt repository scenarios
- **Success Criteria:** Comprehensive error categorization with appropriate handling
- **Deadline:** Before Phase 2 implementation

#### 3. Obsidian Notice API Best Practices
- **Question:** How to create non-intrusive notifications that users can act on?
- **Research Areas:**
  - Notice duration and dismissal patterns
  - Grouping multiple notices
  - Notice with action buttons (if supported)
- **Success Criteria:** Notice pattern that aligns with Obsidian UX standards
- **Deadline:** Before Phase 3 implementation

### Architecture Investigation

#### Background Task Performance
- **Investigation:** Impact of periodic git fetch on system resources
- **Test Scenarios:**
  - 10 repositories with 5-minute intervals
  - Large repositories (1GB+) fetch performance
  - Multiple concurrent fetches vs sequential
- **Success Criteria:** Negligible impact on Obsidian responsiveness

#### Remote Change Detection Accuracy
- **Investigation:** Reliability of rev-list based change detection
- **Test Scenarios:**
  - Standard ahead/behind scenarios
  - Force push scenarios (remote rewritten)
  - New branch scenarios
  - Deleted branch scenarios
- **Success Criteria:** 100% accuracy in detecting actionable changes

### Research Deliverables
- `specs/1-multi-git-core/research-fr2.md` - Consolidated findings on lifecycle, error handling, notification patterns

## Phase 1: Design & Contracts

### Data Model Design

#### Extended Repository Configuration

```typescript
interface RepositoryConfig {
  // Existing fields from FR-1
  id: string;
  path: string;
  name: string;
  enabled: boolean;
  createdAt: number;
  lastValidated?: number;
  
  // New FR-2 fields
  fetchInterval: number;  // Milliseconds, default: 300000 (5 minutes)
  lastFetchTime?: number;  // Unix timestamp, undefined until first fetch
  lastFetchStatus: 'idle' | 'fetching' | 'success' | 'error';
  lastFetchError?: string;  // Error message if last fetch failed
  remoteChanges: boolean;  // True if remote has commits not in local
  remoteCommitCount?: number;  // Number of commits behind, if applicable
}
```

#### Fetch Result Data

```typescript
interface FetchResult {
  repositoryId: string;
  timestamp: number;
  success: boolean;
  error?: string;
  remoteChanges: boolean;  // True if remote has new commits
  commitsBehind?: number;  // Number of commits behind remote
  branchInfo?: BranchStatus[];  // Detailed branch information
}

interface BranchStatus {
  name: string;  // Local branch name
  remoteBranch: string;  // Tracking remote branch
  behind: number;  // Commits behind remote
  ahead: number;  // Commits ahead of remote (for completeness)
}
```

#### Settings Extension

```typescript
interface MultiGitSettings {
  // Existing from FR-1
  repositories: RepositoryConfig[];
  version: string;
  
  // New FR-2 fields
  globalFetchInterval: number;  // Default interval for new repos (ms)
  fetchOnStartup: boolean;  // Whether to fetch immediately on plugin load
  notifyOnRemoteChanges: boolean;  // Master toggle for notifications
  lastGlobalFetch?: number;  // Timestamp of last "fetch all" operation
}
```

**Validation Rules:**
1. **Fetch Interval:**
   - Must be positive integer
   - Minimum: 60000ms (1 minute) to prevent excessive load
   - Maximum: 3600000ms (1 hour) reasonable upper bound
   - Default: 300000ms (5 minutes) per spec

2. **Status Transitions:**
   - `idle` → `fetching` when fetch starts
   - `fetching` → `success` on successful fetch
   - `fetching` → `error` on failed fetch
   - Any state → `idle` when interval timer resets

3. **Remote Changes:**
   - Set to `true` only when commits exist on remote not in local
   - Reset to `false` when user views/pulls changes (FR-4 responsibility)
   - Persisted across plugin reloads

**State Management:**
```
[Plugin Load] → Check Enabled Repos → [Schedule Fetch]
[Schedule Fetch] → Wait Interval → [Execute Fetch] → [Update Status] → [Schedule Fetch]
[Execute Fetch] → [Detect Changes] → [Notify if Needed] → [Store Results]
[Plugin Unload] → [Cancel All Intervals] → [Cleanup]
```

### API Contract Generation

#### Fetch Scheduler Service

```typescript
/**
 * Service for scheduling and managing automated fetch operations
 */
class FetchSchedulerService {
  private intervals: Map<string, NodeJS.Timeout>;
  private activeOperations: Map<string, Promise<FetchResult>>;
  
  /**
   * Start automated fetching for all enabled repositories
   * Called on plugin load
   */
  startAll(): void;
  
  /**
   * Stop all automated fetching
   * Called on plugin unload for cleanup
   */
  stopAll(): void;
  
  /**
   * Schedule fetch for specific repository
   * @param repoId - Repository identifier
   * @param interval - Fetch interval in milliseconds
   */
  scheduleRepository(repoId: string, interval: number): void;
  
  /**
   * Unschedule fetch for specific repository
   * Called when repository is disabled or removed
   * @param repoId - Repository identifier
   */
  unscheduleRepository(repoId: string): void;
  
  /**
   * Manually trigger immediate fetch for specific repository
   * Used for manual refresh button
   * @param repoId - Repository identifier
   * @returns Fetch result with status and remote changes
   */
  async fetchRepositoryNow(repoId: string): Promise<FetchResult>;
  
  /**
   * Manually trigger immediate fetch for all enabled repositories
   * @returns Array of fetch results
   */
  async fetchAllNow(): Promise<FetchResult[]>;
  
  /**
   * Check if fetch operation is currently in progress for repository
   * @param repoId - Repository identifier
   * @returns true if fetch is running
   */
  isFetching(repoId: string): boolean;
}
```

#### Git Fetch Service (extends GitCommandService)

```typescript
/**
 * Git operations for fetching and change detection
 * Extends GitCommandService from FR-1
 */
class GitCommandService {
  // Existing from FR-1
  async isGitRepository(path: string): Promise<boolean>;
  async getRepositoryRoot(path: string): Promise<string>;
  
  // New for FR-2
  /**
   * Execute git fetch for repository
   * @param repoPath - Absolute path to repository
   * @param timeout - Timeout in milliseconds (default: 30000)
   * @returns true if fetch succeeded
   * @throws FetchError with details if fetch fails
   */
  async fetchRepository(repoPath: string, timeout?: number): Promise<boolean>;
  
  /**
   * Check if remote has changes not in local branch
   * @param repoPath - Absolute path to repository
   * @param branch - Branch name (defaults to current branch)
   * @returns Remote change status
   */
  async checkRemoteChanges(
    repoPath: string,
    branch?: string
  ): Promise<RemoteChangeStatus>;
  
  /**
   * Get current branch name
   * @param repoPath - Absolute path to repository
   * @returns Branch name or null if detached HEAD
   */
  async getCurrentBranch(repoPath: string): Promise<string | null>;
  
  /**
   * Get remote tracking branch for local branch
   * @param repoPath - Absolute path to repository
   * @param branch - Local branch name
   * @returns Remote tracking branch (e.g., "origin/main") or null
   */
  async getTrackingBranch(
    repoPath: string,
    branch: string
  ): Promise<string | null>;
  
  /**
   * Count commits between local and remote branch
   * @param repoPath - Absolute path to repository
   * @param localBranch - Local branch name
   * @param remoteBranch - Remote branch name
   * @returns Object with ahead/behind counts
   */
  async compareWithRemote(
    repoPath: string,
    localBranch: string,
    remoteBranch: string
  ): Promise<{ ahead: number; behind: number }>;
}

interface RemoteChangeStatus {
  hasChanges: boolean;
  commitsBehind: number;
  commitsAhead: number;
  trackingBranch: string | null;
  currentBranch: string | null;
}
```

#### Notification Service

```typescript
/**
 * Service for managing user notifications
 */
class NotificationService {
  /**
   * Notify user about remote changes in repository
   * Only called when remote has actionable changes
   * @param repoName - Display name of repository
   * @param commitCount - Number of commits behind
   */
  notifyRemoteChanges(repoName: string, commitCount: number): void;
  
  /**
   * Notify about fetch error (non-critical)
   * Shows dismissible notice
   * @param repoName - Display name of repository
   * @param error - Error message
   */
  notifyFetchError(repoName: string, error: string): void;
  
  /**
   * Check if notifications are globally enabled
   * @returns true if user has enabled notifications in settings
   */
  areNotificationsEnabled(): boolean;
}
```

#### Error Handling

```typescript
/**
 * Thrown when git fetch operation fails
 */
class FetchError extends Error {
  constructor(
    message: string,
    public repoPath: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Error codes for fetch failures
 */
enum FetchErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',  // Cannot reach remote
  AUTH_ERROR = 'AUTH_ERROR',  // Authentication failed
  TIMEOUT = 'TIMEOUT',  // Operation timed out
  REPO_ERROR = 'REPO_ERROR',  // Repository in invalid state
  UNKNOWN = 'UNKNOWN'  // Unexpected error
}
```

**Error Response Patterns:**
- **Network errors:** Log silently, retry on next interval (don't spam user)
- **Auth errors:** Single notification per session, clear actionable message
- **Timeout errors:** Log warning, retry on next interval with longer timeout
- **Unknown errors:** Log for debugging, show generic error notice

### Development Environment Setup

#### Additional Dependencies
No new dependencies required beyond FR-1 setup. Uses:
- Node.js built-in: `child_process`, `timers`
- Obsidian API: `Notice` class
- Existing services from FR-1

#### Testing Setup Extensions

**Mock Requirements:**
```typescript
// Mock interval functions for testing
jest.useFakeTimers();

// Mock git command responses
mockGitFetch = jest.fn().mockResolvedValue(true);
mockCheckRemoteChanges = jest.fn().mockResolvedValue({
  hasChanges: false,
  commitsBehind: 0,
  commitsAhead: 0
});
```

**Test Scenarios:**
1. Interval scheduling and cleanup
2. Fetch execution and error handling
3. Remote change detection accuracy
4. Notification triggering logic
5. Concurrent fetch handling

See `quickstart.md` for complete testing setup.

## Implementation Readiness Validation

### Technical Completeness Check
- [x] All technology choices made and documented (setInterval, git fetch --all)
- [x] Data model covers all functional requirements (extended RepositoryConfig)
- [x] API contracts support all user scenarios (scheduler, fetch, notification services)
- [x] Security requirements addressed (non-destructive operations, error isolation)
- [x] Performance considerations documented (async operations, configurable intervals)
- [x] Integration points defined (FR-1 services, Obsidian Notice API)
- [x] Development environment specified (Jest with fake timers)

### Quality Validation
- [x] Architecture supports scalability (per-repo intervals, concurrent fetch handling)
- [x] Error handling is comprehensive (network, auth, timeout scenarios)
- [x] Data model supports all business rules (status tracking, change detection)
- [x] API design follows established patterns (async/await, service layer)
- [x] Documentation covers all major decisions

### Constitution Alignment Re-check
- [x] Specification-first maintained (plan based on FR-2 spec)
- [x] Iterative simplicity preserved (basic interval scheduling, no over-engineering)
- [x] Documentation as context fulfilled (comprehensive technical decisions)
- [x] Quality gates still passing
- [x] No violations introduced

**Final Validation:** ✅ PASS - Ready for task breakdown

## Implementation Phases

### Phase 1: Git Fetch Operations (Foundation)

**Goal:** Implement core git fetch and change detection functionality

**Dependencies:** Requires GitCommandService from FR-1

**Tasks:**
1. **Extend GitCommandService with fetch operations**
   - Implement `fetchRepository()` using `git fetch --all --tags --prune`
   - Add timeout handling (30 second default)
   - Parse git output for error detection
   - Return boolean success indicator

2. **Implement change detection**
   - Implement `getCurrentBranch()` using `git rev-parse --abbrev-ref HEAD`
   - Implement `getTrackingBranch()` using `git rev-parse --abbrev-ref @{u}`
   - Implement `compareWithRemote()` using `git rev-list --count`
   - Calculate commits behind and ahead

3. **Implement checkRemoteChanges()**
   - Combine branch detection and comparison
   - Return structured RemoteChangeStatus
   - Handle edge cases (detached HEAD, no tracking branch)

4. **Error handling**
   - Define FetchError class with error codes
   - Categorize git command failures
   - Map git output to error codes

5. **Unit tests**
   - Test successful fetch operation
   - Test change detection accuracy
   - Test error scenarios (network, auth, timeout)
   - Test edge cases (no tracking branch, force push)

**Acceptance:**
- Git fetch executes successfully
- Remote changes detected accurately
- Errors categorized and reported clearly
- All tests passing

### Phase 2: Fetch Scheduler Service

**Goal:** Implement automated scheduling and execution of fetch operations

**Dependencies:** Requires Phase 1 git operations

**Tasks:**
1. **Create FetchSchedulerService class**
   - Initialize with empty interval and operation maps
   - Implement interval management (add, remove, clear all)
   - Track active operations to prevent concurrent fetches

2. **Implement scheduling logic**
   - `scheduleRepository()`: Create setInterval for repository
   - Store interval handle in map for cleanup
   - Execute fetch on interval trigger
   - Update repository status after fetch

3. **Implement immediate fetch**
   - `fetchRepositoryNow()`: Execute fetch immediately
   - Skip if fetch already in progress
   - Return detailed FetchResult
   - Update status and timestamps

4. **Implement batch operations**
   - `fetchAllNow()`: Fetch all enabled repositories
   - Execute sequentially to avoid system overload
   - Collect and return all results
   - Update global fetch timestamp

5. **Lifecycle management**
   - `startAll()`: Schedule all enabled repos on plugin load
   - `stopAll()`: Clear all intervals on plugin unload
   - Proper cleanup prevents memory leaks

6. **Unit tests**
   - Test interval scheduling and cleanup
   - Test concurrent fetch prevention
   - Test batch fetch operations
   - Test lifecycle management

**Acceptance:**
- Repositories fetch at configured intervals
- Manual fetches execute immediately
- No memory leaks from intervals
- Concurrent fetches prevented
- All tests passing

### Phase 3: Repository Status Updates

**Goal:** Update repository configuration with fetch results

**Dependencies:** Requires Phase 2 scheduler and FR-1 RepositoryConfigService

**Tasks:**
1. **Extend RepositoryConfig data model**
   - Add fetch-related fields to interface
   - Update default values in settings initialization
   - Implement migration for existing configs

2. **Extend RepositoryConfigService**
   - Add methods to update fetch status
   - Implement `updateFetchStatus()` method
   - Implement `setRemoteChanges()` method
   - Trigger settings save on updates

3. **Integrate scheduler with config updates**
   - Update status to 'fetching' when fetch starts
   - Update status to 'success'/'error' on completion
   - Store fetch timestamp and error message
   - Update remote changes flag and commit count

4. **Implement status retrieval**
   - Add getter methods for fetch status
   - Return enriched repository data
   - Support filtering by status

5. **Unit tests**
   - Test status update logic
   - Test data persistence
   - Test status retrieval methods

**Acceptance:**
- Fetch status persisted correctly
- Remote changes tracked accurately
- Status updates trigger saves
- All tests passing

### Phase 4: Notification System

**Goal:** Implement user notifications for remote changes and errors

**Dependencies:** Requires Phase 3 status updates

**Tasks:**
1. **Create NotificationService**
   - Wrap Obsidian Notice API
   - Check global notification settings
   - Track shown notifications to prevent duplicates

2. **Implement notification methods**
   - `notifyRemoteChanges()`: Show remote change notice
   - Include repository name and commit count
   - Make notice dismissible
   - Clear concise messaging

3. **Implement error notifications**
   - `notifyFetchError()`: Show fetch error notice
   - Distinguish critical vs minor errors
   - Provide actionable guidance
   - Don't spam on repeated failures

4. **Integrate with fetch operations**
   - Trigger notification after fetch completes
   - Only notify if `hasChanges` is true
   - Only notify if notifications enabled
   - One notification per repository with changes

5. **Add settings UI for notifications**
   - Add toggle for global notification enable/disable
   - Add to settings tab in appropriate section
   - Default: enabled (per spec requirement)

6. **Manual testing**
   - Test notification appearance and dismissal
   - Test multiple simultaneous notifications
   - Test notification suppression when disabled
   - Verify message clarity

**Acceptance:**
- Notifications appear for remote changes only
- Notifications are clear and dismissible
- Settings toggle works correctly
- No notification spam
- Follows Obsidian UI patterns

### Phase 5: Settings UI Integration

**Goal:** Add fetch configuration to settings interface

**Dependencies:** Requires Phase 2 scheduler for manual fetch trigger

**Tasks:**
1. **Extend MultiGitSettingTab**
   - Add global fetch interval setting
   - Add fetch-on-startup toggle
   - Add notification toggle
   - Add manual "Fetch All Now" button

2. **Add per-repository fetch settings**
   - Add interval configuration per repository
   - Display last fetch time for each repo
   - Show fetch status indicator
   - Add manual fetch button per repo

3. **Implement validation**
   - Validate interval ranges (1 min to 1 hour)
   - Show validation errors inline
   - Prevent invalid values

4. **Connect to scheduler**
   - Update intervals when settings change
   - Reschedule repositories on interval change
   - Trigger manual fetch on button click
   - Show loading state during fetch

5. **Polish and UX**
   - Clear labels and descriptions
   - Show last fetch time in friendly format ("2 minutes ago")
   - Visual indicators for status (success/error/fetching)
   - Follow Obsidian design patterns

**Acceptance:**
- Fetch interval configurable globally and per-repo
- Manual fetch triggers work
- Settings persist correctly
- UI is intuitive and clear
- Follows Obsidian patterns

### Phase 6: Integration and Testing

**Goal:** Complete end-to-end testing and polish

**Dependencies:** All previous phases complete

**Tasks:**
1. **Integration testing**
   - Test complete fetch workflow from plugin load to notification
   - Test with multiple repositories
   - Test interval changes during operation
   - Test plugin reload scenarios

2. **Error scenario testing**
   - Test network disconnection during fetch
   - Test authentication failures
   - Test repository in invalid state
   - Verify graceful error handling

3. **Performance testing**
   - Test with 10+ repositories
   - Measure fetch operation overhead
   - Verify no UI blocking
   - Check memory usage over time

4. **Cross-platform testing**
   - Test on macOS
   - Test on Windows
   - Test on Linux
   - Verify git command compatibility

5. **Edge case testing**
   - Test with repository behind firewall
   - Test with very slow network
   - Test with large repositories (1GB+)
   - Test with no network connection

6. **Documentation updates**
   - Document fetch configuration
   - Add troubleshooting for fetch failures
   - Document notification behavior
   - Update README with FR-2 features

**Acceptance:**
- All FR-2 acceptance criteria met
- Works across all platforms
- Edge cases handled gracefully
- Performance meets requirements
- Documentation complete

## Risk Assessment

### Technical Risks

#### High Risk: Network Reliability
- **Impact:** Background fetches fail frequently, notifications spam user
- **Likelihood:** Medium (depends on user's network)
- **Mitigation:**
  - Implement exponential backoff for repeated failures
  - Don't notify on every network failure
  - Allow user to disable notifications
  - Log failures for debugging
- **Contingency:** Add "offline mode" setting to pause fetching

#### High Risk: Git Credential Issues
- **Impact:** Fetch fails with authentication errors, notifications confuse user
- **Likelihood:** Medium (common with HTTPS, SSH key issues)
- **Mitigation:**
  - Detect auth errors specifically
  - Show clear one-time notification with setup instructions
  - Don't retry auth failures repeatedly
  - Link to git credential documentation
- **Contingency:** Disable auto-fetch for repositories with persistent auth failures

#### Medium Risk: Performance with Many Repositories
- **Impact:** Fetching 10+ repositories causes UI lag or system load
- **Likelihood:** Low (fetch is async, sequential execution)
- **Mitigation:**
  - Execute fetches sequentially not concurrently
  - Add configurable delay between fetches
  - Monitor plugin performance in testing
  - Set reasonable upper limit on repository count
- **Contingency:** Add "stagger fetch" option to spread load over interval

#### Medium Risk: Incorrect Change Detection
- **Impact:** False positives/negatives on remote changes
- **Likelihood:** Low (well-tested git commands)
- **Mitigation:**
  - Thoroughly test rev-list logic
  - Handle all branch scenarios (detached HEAD, no tracking)
  - Validate with real repositories
  - Add debug logging for investigation
- **Contingency:** Provide manual refresh to re-check status

#### Low Risk: Interval Drift
- **Impact:** Fetches don't happen exactly at configured interval
- **Likelihood:** Low (setInterval is reliable)
- **Mitigation:**
  - Accept minor drift as acceptable (not critical timing)
  - Reschedule after each fetch to prevent accumulation
  - Log actual fetch times for monitoring
- **Contingency:** Use more precise scheduling if needed (unlikely)

### Dependencies and Assumptions

#### External Dependencies
- **Git CLI:** Must support `fetch --all --tags --prune`, `rev-list --count`
- **Network:** Must be available for remote fetch operations
- **Remote Access:** User must have proper credentials configured

#### Technical Assumptions
- Repositories have at least one remote configured
- Remote repositories are accessible (not behind firewall requiring VPN)
- Git credentials are configured at system level (SSH keys, credential manager)
- Network latency is reasonable (< 10 seconds for typical fetch)

#### Business Assumptions
- Users want automatic fetch (spec requirement)
- 5 minute default interval is acceptable
- Per-repository notifications are preferred over global summary
- Users understand what "remote changes" means
- Background fetching is acceptable even if it uses network bandwidth

## Next Phase Preparation

### Task Breakdown Readiness
- [x] Clear technology choices (setInterval, git fetch --all, Obsidian Notice)
- [x] Complete data model (extended RepositoryConfig, FetchResult)
- [x] Comprehensive API specifications (scheduler, git operations, notifications)
- [x] Development environment ready (Jest with fake timers)
- [x] Quality standards defined (error handling, performance requirements)
- [x] Integration with FR-1 clearly defined

### Implementation Prerequisites

#### From FR-1
- [x] RepositoryConfigService operational
- [x] GitCommandService base implementation
- [x] Settings persistence working
- [x] Repository data model established

#### Technical Architecture
- [x] Background task pattern defined
- [x] Service layer architecture extends from FR-1
- [x] Data model extensions specified
- [x] API contracts documented

#### Quality Assurance
- [x] Testing approach (Jest with fake timers)
- [x] Error handling patterns established
- [x] Performance requirements defined
- [x] Cross-platform testing plan

#### Documentation
- [x] Technical decisions documented with rationale
- [x] Integration points with FR-1 specified
- [x] API contracts complete
- [x] User-facing documentation planned

### Ready for Implementation
✅ All prerequisites met. Ready to break down into specific implementation tasks.

---

**Next Steps:**
1. Conduct Phase 0 research on lifecycle best practices and error scenarios
2. Break down phases into specific tasks
