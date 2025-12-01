# Task Breakdown: Automated Remote Fetch (FR-2)

**Created:** 2025-01-12
**Implementation Plan:** [plan.md](./plan.md)
**Specification:** [../spec.md](../spec.md)
**Status:** In Progress - Phase 1 Complete

## Task Summary

**Total Tasks:** 38
**Phases:** 6 (Git Operations → Scheduler → Status Updates → Notifications → UI → Integration)
**Estimated Complexity:** Medium-High
**Parallel Execution Opportunities:** 8 task groups

## Phase 0: Research & Architecture (Optional)

### RESEARCH-001: Plugin Lifecycle Best Practices
**Description:** Research Obsidian plugin lifecycle management for interval cleanup
**Files:** Research notes, documentation
**Dependencies:** None
**Acceptance Criteria:**
- [ ] Document proper plugin load/unload hooks
- [ ] Identify memory leak prevention patterns for setInterval
- [ ] Document hot reload behavior with intervals
- [ ] Create lifecycle pattern for FR-2 scheduler

**Commands:**
```bash
# Review Obsidian API documentation
# Review existing plugins with background tasks
# Document findings in plan.md or separate research.md
```

**Note:** This is optional research that can inform implementation but is not blocking.

## Phase 1: Git Fetch Operations (Foundation)

### FETCH-001: Extend GitCommandService with fetch operation ✅
**Description:** Implement git fetch functionality using `git fetch --all --tags --prune`
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** FR-1 GitCommandService implementation
**Acceptance Criteria:**
- [x] `fetchRepository()` method executes `git fetch --all --tags --prune`
- [x] Timeout handling implemented (30 second default)
- [x] Git command output captured for error detection
- [x] Returns boolean success indicator
- [x] Async operation does not block UI

**Commands:**
```bash
# Test git fetch command manually
cd /path/to/test/repo && git fetch --all --tags --prune

# Run unit tests
npm test -- GitCommandService
```

### FETCH-002: Implement current branch detection ✅
**Description:** Add method to get current branch name using `git rev-parse`
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** FETCH-001
**Acceptance Criteria:**
- [x] `getCurrentBranch()` method returns current branch name
- [x] Uses `git rev-parse --abbrev-ref HEAD`
- [x] Returns null for detached HEAD state
- [x] Handles errors gracefully
- [x] Unit tests cover normal and edge cases

### FETCH-003: Implement tracking branch detection ✅
**Description:** Add method to get remote tracking branch for a local branch
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** FETCH-002
**Acceptance Criteria:**
- [x] `getTrackingBranch()` method returns remote tracking branch
- [x] Uses `git rev-parse --abbrev-ref @{u}`
- [x] Returns null when no tracking branch configured
- [x] Handles branch parameter correctly
- [x] Unit tests cover all scenarios

### FETCH-004: Implement commit comparison logic ✅
**Description:** Add method to count commits between local and remote branches
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** FETCH-003
**Acceptance Criteria:**
- [x] `compareWithRemote()` method counts commits ahead/behind
- [x] Uses `git rev-list --count` for accuracy
- [x] Returns object with `ahead` and `behind` numbers
- [x] Handles force-push scenarios correctly
- [x] Unit tests validate commit counting accuracy

### FETCH-005 [P]: Implement remote change detection ✅
**Description:** Combine branch detection and comparison into unified change detection
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** FETCH-004
**Acceptance Criteria:**
- [x] `checkRemoteChanges()` method returns RemoteChangeStatus
- [x] Combines getCurrentBranch, getTrackingBranch, and compareWithRemote
- [x] Returns hasChanges flag indicating actionable remote changes
- [x] Handles edge cases (detached HEAD, no tracking branch)
- [x] Unit tests cover all branch scenarios

**Parallel Note:** Can be implemented alongside FETCH-006 once FETCH-004 is complete.

### FETCH-006 [P]: Define FetchError class and error codes ✅
**Description:** Create error handling classes for git fetch failures
**Files:** `src/utils/errors.ts`
**Dependencies:** FETCH-004
**Acceptance Criteria:**
- [x] FetchError class extends base Error
- [x] Includes repoPath, code, and originalError fields
- [x] FetchErrorCode enum defines NETWORK_ERROR, AUTH_ERROR, TIMEOUT, REPO_ERROR, UNKNOWN
- [x] Error messages are clear and actionable
- [x] Unit tests validate error construction

**Parallel Note:** Can be implemented alongside FETCH-005 since it's independent error handling.

### FETCH-007: Implement git command error categorization ✅
**Description:** Add logic to parse git output and categorize failures into error codes
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** FETCH-005, FETCH-006
**Acceptance Criteria:**
- [x] Parse git stderr output to identify error types
- [x] Map git errors to FetchErrorCode categories
- [x] Throw FetchError with appropriate code
- [x] Handle timeout errors specifically
- [x] Unit tests cover all error scenarios (network, auth, timeout, unknown)

### FETCH-008: Unit tests for git fetch operations ✅
**Description:** Comprehensive test suite for all git fetch functionality
**Files:** `test/services/GitCommandService.test.ts`
**Dependencies:** FETCH-007
**Acceptance Criteria:**
- [x] Test successful fetch operation
- [x] Test change detection accuracy (ahead, behind, both, neither)
- [x] Test error scenarios (network failure, auth failure, timeout)
- [x] Test edge cases (no tracking branch, detached HEAD, force push)
- [x] Test all public methods in GitCommandService
- [x] All tests passing with good coverage

## Phase 2: Fetch Scheduler Service

### SCHED-001: Create FetchSchedulerService class structure ✅
**Description:** Create service class with interval and operation tracking
**Files:** `src/services/FetchSchedulerService.ts`
**Dependencies:** FETCH-008
**Acceptance Criteria:**
- [x] FetchSchedulerService class created
- [x] Private maps for intervals and active operations initialized
- [x] Constructor accepts RepositoryConfigService and GitCommandService
- [x] Basic structure follows service layer patterns from FR-1
- [x] TypeScript interfaces defined for FetchResult and BranchStatus

### SCHED-002: Implement repository scheduling logic ✅
**Description:** Add methods to schedule/unschedule fetch for individual repositories
**Files:** `src/services/FetchSchedulerService.ts`
**Dependencies:** SCHED-001
**Acceptance Criteria:**
- [x] `scheduleRepository()` creates setInterval for repository
- [x] Interval handle stored in map with repository ID as key
- [x] `unscheduleRepository()` clears interval and removes from map
- [x] Proper cleanup prevents memory leaks
- [x] Handles scheduling for already-scheduled repositories (replace interval)

### SCHED-003: Implement fetch execution with status tracking ✅
**Description:** Execute fetch operation and track status during execution
**Files:** `src/services/FetchSchedulerService.ts`
**Dependencies:** SCHED-002
**Acceptance Criteria:**
- [x] Fetch execution marked as 'fetching' in active operations map
- [x] Prevent concurrent fetches for same repository
- [x] Execute GitCommandService.fetchRepository()
- [x] Execute GitCommandService.checkRemoteChanges() after fetch
- [x] Remove from active operations map when complete
- [x] Return structured FetchResult object

### SCHED-004: Implement immediate fetch operations ✅
**Description:** Add methods for manual immediate fetch (single repo and all repos)
**Files:** `src/services/FetchSchedulerService.ts`
**Dependencies:** SCHED-003
**Acceptance Criteria:**
- [x] `fetchRepositoryNow()` executes immediate fetch for one repository
- [x] Skips if fetch already in progress for that repository
- [x] Returns detailed FetchResult with all status information
- [x] `fetchAllNow()` executes sequential fetch for all enabled repos
- [x] Collects and returns array of all FetchResults
- [x] Updates timestamps and status for each repository

### SCHED-005: Implement lifecycle management ✅
**Description:** Add plugin lifecycle integration (load/unload)
**Files:** `src/services/FetchSchedulerService.ts`
**Dependencies:** SCHED-004
**Acceptance Criteria:**
- [x] `startAll()` method schedules all enabled repositories on plugin load
- [x] Uses repository configurations to set individual intervals
- [x] `stopAll()` method clears all intervals on plugin unload
- [x] Proper cleanup prevents memory leaks
- [x] Handles plugin hot reload gracefully

### SCHED-006: Unit tests for scheduler service ✅
**Description:** Comprehensive test suite for FetchSchedulerService
**Files:** `test/services/FetchSchedulerService.test.ts`
**Dependencies:** SCHED-005
**Acceptance Criteria:**
- [x] Test interval scheduling and cleanup using jest.useFakeTimers()
- [x] Test concurrent fetch prevention
- [x] Test immediate fetch operations
- [x] Test batch fetch operations (fetchAllNow)
- [x] Test lifecycle management (startAll, stopAll)
- [x] Test error handling in fetch operations
- [x] All tests passing with good coverage (29/29 tests passing)

**Commands:**
```bash
# Run scheduler tests with fake timers
npm test -- FetchSchedulerService
```

## Phase 3: Repository Status Updates

### STATUS-001: Extend RepositoryConfig interface ✅
**Description:** Add fetch-related fields to RepositoryConfig data model
**Files:** `src/settings/data.ts`
**Dependencies:** SCHED-006
**Acceptance Criteria:**
- [x] Add `fetchInterval: number` field (default: 300000ms)
- [x] Add `lastFetchTime?: number` field
- [x] Add `lastFetchStatus: 'idle' | 'fetching' | 'success' | 'error'` field
- [x] Add `lastFetchError?: string` field
- [x] Add `remoteChanges: boolean` field (default: false)
- [x] Add `remoteCommitCount?: number` field
- [x] Update type definitions and defaults

### STATUS-002: Extend MultiGitSettings interface ✅
**Description:** Add global fetch settings to plugin settings
**Files:** `src/settings/data.ts`
**Dependencies:** STATUS-001
**Acceptance Criteria:**
- [x] Add `globalFetchInterval: number` field (default: 300000ms)
- [x] Add `fetchOnStartup: boolean` field (default: true)
- [x] Add `notifyOnRemoteChanges: boolean` field (default: true)
- [x] Add `lastGlobalFetch?: number` field
- [x] Update settings schema and defaults

### STATUS-003: Implement repository status update methods ✅
**Description:** Add methods to RepositoryConfigService for updating fetch status
**Files:** `src/services/RepositoryConfigService.ts`
**Dependencies:** STATUS-002
**Acceptance Criteria:**
- [x] `updateFetchStatus()` method updates status fields
- [x] `setRemoteChanges()` method updates remote change flags
- [x] `recordFetchResult()` method processes FetchResult and updates config
- [x] Triggers settings save after updates
- [x] Validates status transitions correctly
- [x] Preserves other repository config fields

### STATUS-004 [P]: Implement settings migration ✅
**Description:** Handle migration from configs without fetch fields
**Files:** `src/settings/data.ts`, `src/services/RepositoryConfigService.ts`, `src/main.ts`
**Dependencies:** STATUS-003
**Acceptance Criteria:**
- [x] Detect when fetch fields are missing from loaded configs
- [x] Add default values for new fields during load
- [x] Maintain backward compatibility
- [x] Save migrated settings automatically
- [x] Migration is idempotent (safe to run multiple times)

**Parallel Note:** Can be developed alongside STATUS-005 as both are config-related utilities.

### STATUS-005 [P]: Implement status retrieval methods ✅
**Description:** Add getter methods for querying fetch status
**Files:** `src/services/RepositoryConfigService.ts`
**Dependencies:** STATUS-003
**Acceptance Criteria:**
- [x] `getRepositoryStatus()` returns enriched status for one repo
- [x] `getAllRepositoryStatuses()` returns status for all repos
- [x] `getRepositoriesWithRemoteChanges()` filters repos with changes
- [x] Methods return complete status information
- [x] Efficient query patterns (no unnecessary data transformation)

**Parallel Note:** Can be developed alongside STATUS-004 as both are config utilities.

### STATUS-006: Unit tests for status management ✅
**Description:** Test suite for status update and retrieval functionality
**Files:** `test/services/RepositoryConfigService.test.ts`
**Dependencies:** STATUS-004, STATUS-005
**Acceptance Criteria:**
- [x] Test status update methods
- [x] Test FetchResult processing and storage
- [x] Test status retrieval and filtering
- [x] Test settings migration logic
- [x] Test persistence of status changes
- [x] All tests passing with good coverage (50/50 tests passing)

### STATUS-007: Integration test for scheduler + status updates
**Description:** End-to-end test of fetch execution updating repository status
**Files:** `test/integration/fetch-scheduler.test.ts`
**Dependencies:** STATUS-006
**Acceptance Criteria:**
- [ ] Test complete flow: schedule → fetch → status update → persist
- [ ] Verify status transitions during fetch lifecycle
- [ ] Test error scenarios update status correctly
- [ ] Test remote changes detection updates flags correctly
- [ ] Integration test passes reliably

## Phase 4: Notification System

### NOTIFY-001: Create NotificationService class
**Description:** Create service for managing Obsidian Notice-based notifications
**Files:** `src/services/NotificationService.ts`
**Dependencies:** STATUS-007
**Acceptance Criteria:**
- [ ] NotificationService class created
- [ ] Constructor accepts plugin instance for Notice access
- [ ] Track shown notifications to prevent duplicates
- [ ] Check global notification settings before showing
- [ ] Basic structure follows service layer patterns

### NOTIFY-002: Implement remote change notification
**Description:** Add method to show notification for remote changes
**Files:** `src/services/NotificationService.ts`
**Dependencies:** NOTIFY-001
**Acceptance Criteria:**
- [ ] `notifyRemoteChanges()` shows Obsidian Notice
- [ ] Message includes repository name and commit count
- [ ] Notice is dismissible by user
- [ ] Message is clear and concise
- [ ] Follows Obsidian UI patterns

**Example Message:** "📥 Repository 'my-vault' has 3 new commits available"

### NOTIFY-003 [P]: Implement error notification
**Description:** Add method to show fetch error notifications
**Files:** `src/services/NotificationService.ts`
**Dependencies:** NOTIFY-001
**Acceptance Criteria:**
- [ ] `notifyFetchError()` shows error notice
- [ ] Distinguishes critical vs minor errors
- [ ] Provides actionable guidance where possible
- [ ] Doesn't spam on repeated failures (track last shown time)
- [ ] Clear repository identification

**Parallel Note:** Can be implemented alongside NOTIFY-002 as both are notification methods.

### NOTIFY-004: Integrate notifications with scheduler
**Description:** Connect NotificationService to FetchSchedulerService
**Files:** `src/services/FetchSchedulerService.ts`
**Dependencies:** NOTIFY-002, NOTIFY-003
**Acceptance Criteria:**
- [ ] FetchSchedulerService accepts NotificationService in constructor
- [ ] Trigger notification after fetch completion
- [ ] Only notify if `remoteChanges` is true
- [ ] Only notify if `notifyOnRemoteChanges` setting enabled
- [ ] One notification per repository with changes
- [ ] Error notifications shown for fetch failures

### NOTIFY-005: Unit tests for notification service
**Description:** Test suite for NotificationService functionality
**Files:** `test/services/NotificationService.test.ts`
**Dependencies:** NOTIFY-004
**Acceptance Criteria:**
- [ ] Test notification creation with correct messages
- [ ] Test notification suppression when disabled in settings
- [ ] Test duplicate prevention logic
- [ ] Test error notification logic
- [ ] Mock Obsidian Notice API appropriately
- [ ] All tests passing

### NOTIFY-006: Manual testing of notifications
**Description:** Manually verify notification appearance and behavior in Obsidian
**Files:** Manual test checklist
**Dependencies:** NOTIFY-005
**Acceptance Criteria:**
- [ ] Notifications appear correctly in Obsidian UI
- [ ] Multiple notifications are distinguishable
- [ ] Notifications are dismissible
- [ ] Message clarity validated with real scenarios
- [ ] No notification spam occurs
- [ ] Settings toggle works as expected

**Commands:**
```bash
# Build plugin for manual testing
npm run dev

# Test in Obsidian with multiple repos having remote changes
```

## Phase 5: Settings UI Integration

### UI-001: Add global fetch settings to SettingTab
**Description:** Extend MultiGitSettingTab with fetch configuration options
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** NOTIFY-006
**Acceptance Criteria:**
- [ ] Add global fetch interval setting with validation
- [ ] Add fetch-on-startup toggle
- [ ] Add notification enable/disable toggle
- [ ] Add manual "Fetch All Now" button
- [ ] Display last global fetch time
- [ ] Settings persist correctly

### UI-002: Add per-repository fetch interval configuration
**Description:** Add fetch interval setting to each repository in settings
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** UI-001
**Acceptance Criteria:**
- [ ] Each repository shows fetch interval setting
- [ ] Default to global interval but allow override
- [ ] Validate interval range (1 min to 1 hour)
- [ ] Show validation errors inline
- [ ] Update scheduler when interval changes
- [ ] Setting persists per repository

### UI-003: Display fetch status in repository list
**Description:** Show fetch status indicators for each repository
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** UI-002
**Acceptance Criteria:**
- [ ] Display last fetch time for each repo ("2 minutes ago" format)
- [ ] Show fetch status indicator (success/error/fetching)
- [ ] Show remote changes indicator if applicable
- [ ] Visual distinction between states
- [ ] Updates when status changes

### UI-004: Add manual fetch button per repository
**Description:** Add button to trigger immediate fetch for specific repository
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** UI-003
**Acceptance Criteria:**
- [ ] Manual fetch button added to each repository row
- [ ] Button triggers FetchSchedulerService.fetchRepositoryNow()
- [ ] Show loading state during fetch
- [ ] Update status display after fetch completes
- [ ] Handle errors gracefully with user feedback

### UI-005: Implement interval validation and error display
**Description:** Add client-side validation for fetch interval inputs
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** UI-004
**Acceptance Criteria:**
- [ ] Validate minimum interval (60000ms / 1 minute)
- [ ] Validate maximum interval (3600000ms / 1 hour)
- [ ] Show inline validation errors
- [ ] Prevent saving invalid values
- [ ] Validation errors are clear and actionable

### UI-006: Polish and UX improvements
**Description:** Refine settings UI following Obsidian design patterns
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** UI-005
**Acceptance Criteria:**
- [ ] Clear labels and descriptions for all settings
- [ ] Consistent layout with FR-1 settings
- [ ] Helpful tooltips for complex settings
- [ ] Visual feedback for all user actions
- [ ] Follows Obsidian design system
- [ ] Responsive layout

### UI-007: Manual testing of settings interface
**Description:** Validate settings UI functionality end-to-end
**Files:** Manual test checklist
**Dependencies:** UI-006
**Acceptance Criteria:**
- [ ] All settings controls work correctly
- [ ] Validation prevents invalid values
- [ ] Manual fetch buttons work
- [ ] Status updates visible in real-time
- [ ] Settings persist across restarts
- [ ] UI is intuitive and clear

**Commands:**
```bash
# Build and test in Obsidian
npm run dev

# Test all settings controls
# Test with multiple repositories
# Test validation edge cases
```

## Phase 6: Integration and Testing

### INT-001: End-to-end integration test
**Description:** Test complete fetch workflow from plugin load to notification
**Files:** `test/integration/fetch-workflow.test.ts`
**Dependencies:** UI-007
**Acceptance Criteria:**
- [ ] Test plugin load → schedule → fetch → status update → notification
- [ ] Test with multiple repositories simultaneously
- [ ] Test interval changes during operation
- [ ] Test plugin reload scenarios
- [ ] Test settings persistence across restarts
- [ ] All integration tests passing

### INT-002: Error scenario testing
**Description:** Validate error handling across all failure modes
**Files:** `test/integration/fetch-errors.test.ts`
**Dependencies:** INT-001
**Acceptance Criteria:**
- [ ] Test network disconnection during fetch
- [ ] Test authentication failures
- [ ] Test repository in invalid state
- [ ] Test timeout scenarios
- [ ] Verify graceful degradation
- [ ] Error recovery works correctly

### INT-003 [P]: Performance testing
**Description:** Validate performance with multiple repositories
**Files:** Performance test results, benchmarks
**Dependencies:** INT-001
**Acceptance Criteria:**
- [ ] Test with 10+ repositories
- [ ] Measure fetch operation overhead
- [ ] Verify no UI blocking occurs
- [ ] Check memory usage over extended period
- [ ] Performance meets NFR-1 requirements
- [ ] Document performance characteristics

**Parallel Note:** Can run alongside INT-004 as both are validation tasks.

### INT-004 [P]: Cross-platform testing
**Description:** Test functionality across all supported platforms
**Files:** Platform test results
**Dependencies:** INT-001
**Acceptance Criteria:**
- [ ] Test on macOS (primary development platform)
- [ ] Test on Windows
- [ ] Test on Linux
- [ ] Verify git command compatibility
- [ ] Path handling works correctly on all platforms
- [ ] Document any platform-specific issues

**Parallel Note:** Can run alongside INT-003 as both are validation tasks.

### INT-005: Edge case testing
**Description:** Validate behavior in edge case scenarios
**Files:** Edge case test results
**Dependencies:** INT-003, INT-004
**Acceptance Criteria:**
- [ ] Test repository behind firewall (expected failure, graceful handling)
- [ ] Test very slow network (timeout handling)
- [ ] Test with no network connection (offline handling)
- [ ] Test with detached HEAD state
- [ ] Test with no tracking branch configured
- [ ] Test with force-pushed remote
- [ ] All edge cases handled gracefully

### INT-006: Specification validation
**Description:** Validate all FR-2 acceptance criteria are met
**Files:** `specs/1-multi-git-core/fr2/validation-report.md`
**Dependencies:** INT-005
**Acceptance Criteria:**
- [ ] All FR-2 functional requirements satisfied
- [ ] All acceptance criteria checked and passing
- [ ] User scenarios tested end-to-end
- [ ] Success criteria from spec.md achieved
- [ ] Validation report documents all results
- [ ] Any deviations from spec documented with rationale

**Commands:**
```bash
# Run full test suite
npm test

# Generate coverage report
npm run test:coverage

# Manual testing of all user scenarios
```

### DOC-001 [P]: Update documentation
**Description:** Document FR-2 features and configuration
**Files:** `README.md`, `docs/configuration.md`, inline code comments
**Dependencies:** INT-006
**Acceptance Criteria:**
- [ ] README updated with FR-2 features
- [ ] Configuration guide includes fetch settings
- [ ] Troubleshooting section for fetch failures
- [ ] Notification behavior documented
- [ ] Code comments updated for new services
- [ ] API documentation complete

**Parallel Note:** Documentation can be written alongside INT-006 validation.

### DOC-002 [P]: Create FR-2 validation report
**Description:** Generate formal validation report showing all requirements met
**Files:** `specs/1-multi-git-core/fr2/validation-report.md`
**Dependencies:** INT-006
**Acceptance Criteria:**
- [ ] Document test results for all acceptance criteria
- [ ] Include performance metrics
- [ ] Document edge case handling
- [ ] Include cross-platform test results
- [ ] Document any known limitations
- [ ] Formal sign-off that FR-2 is complete

**Parallel Note:** Can be written alongside DOC-001 as final deliverables.

## Dependency Map

```
FETCH-001 → FETCH-002 → FETCH-003 → FETCH-004 → FETCH-005 → FETCH-007
                                              ↓
                                         FETCH-006 ↗
                                              ↓
                                         FETCH-008
                                              ↓
                                         SCHED-001 → SCHED-002 → SCHED-003 → SCHED-004 → SCHED-005 → SCHED-006
                                              ↓
                                         STATUS-001 → STATUS-002 → STATUS-003 → STATUS-004 → STATUS-006
                                                                              ↓              ↗
                                                                         STATUS-005 ↗
                                              ↓
                                         STATUS-007
                                              ↓
                                         NOTIFY-001 → NOTIFY-002 → NOTIFY-004 → NOTIFY-005 → NOTIFY-006
                                                    ↓              ↗
                                                   NOTIFY-003 ↗
                                              ↓
                                         UI-001 → UI-002 → UI-003 → UI-004 → UI-005 → UI-006 → UI-007
                                              ↓
                                         INT-001 → INT-002 → INT-003 → INT-005 → INT-006 → DOC-001
                                                           ↓              ↗            ↓
                                                        INT-004 ↗              DOC-002
```

## Critical Path

The longest dependency chain (critical path):
```
FETCH-001 → FETCH-002 → FETCH-003 → FETCH-004 → FETCH-005 → FETCH-007 → FETCH-008 →
SCHED-001 → SCHED-002 → SCHED-003 → SCHED-004 → SCHED-005 → SCHED-006 →
STATUS-001 → STATUS-002 → STATUS-003 → STATUS-006 → STATUS-007 →
NOTIFY-001 → NOTIFY-002 → NOTIFY-004 → NOTIFY-005 → NOTIFY-006 →
UI-001 → UI-002 → UI-003 → UI-004 → UI-005 → UI-006 → UI-007 →
INT-001 → INT-002 → INT-005 → INT-006 → DOC-002
```

**Critical Path Length:** 38 tasks (all tasks are on critical path due to sequential dependencies)

## Parallel Execution Opportunities

Tasks marked with `[P]` can execute in parallel with their siblings:
1. **FETCH-005 + FETCH-006**: Change detection and error classes (2 tasks)
2. **STATUS-004 + STATUS-005**: Migration and status getters (2 tasks)
3. **NOTIFY-002 + NOTIFY-003**: Remote and error notifications (2 tasks)
4. **INT-003 + INT-004**: Performance and platform testing (2 tasks)
5. **DOC-001 + DOC-002**: Documentation and validation report (2 tasks)

**Total Parallel Opportunities:** 5 groups, 10 tasks that can be parallelized

## Implementation Notes

### Recommended Implementation Order
1. **Phase 1 (Foundation):** Complete all FETCH tasks sequentially as they build on each other
2. **Phase 2 (Scheduler):** Complete all SCHED tasks to establish background execution
3. **Phase 3 (Status):** Can parallelize STATUS-004 and STATUS-005 after STATUS-003
4. **Phase 4 (Notifications):** Can parallelize NOTIFY-002 and NOTIFY-003 after NOTIFY-001
5. **Phase 5 (UI):** Complete sequentially as each builds on previous
6. **Phase 6 (Testing):** Can parallelize performance and platform testing, and final docs

### Quality Gates
- After Phase 1: Validate git operations work correctly before building scheduler
- After Phase 2: Validate scheduler works before integrating status updates
- After Phase 4: Validate notifications before building UI
- After Phase 5: Conduct full manual testing before integration phase
- After Phase 6: Formal validation against all FR-2 acceptance criteria

### Testing Strategy
- Unit tests alongside each component (FETCH-008, SCHED-006, STATUS-006, NOTIFY-005)
- Integration test after status updates (STATUS-007)
- Manual testing for UI and notifications (NOTIFY-006, UI-007)
- Full integration testing in Phase 6 (INT-001 through INT-006)

### Constitutional Compliance
- ✅ Specification-First: All tasks implement defined FR-2 requirements
- ✅ Iterative Simplicity: Basic interval scheduling, no over-engineering
- ✅ Documentation as Context: Comprehensive task descriptions and acceptance criteria

## Success Metrics

Upon completion of all tasks:
- [ ] All 38 tasks completed and validated
- [ ] All FR-2 acceptance criteria satisfied
- [ ] All unit and integration tests passing
- [ ] Manual testing completed successfully
- [ ] Performance requirements met (NFR-1)
- [ ] Cross-platform compatibility validated (NFR-2)
- [ ] Documentation complete and accurate
- [ ] Validation report generated and approved

---

**Ready for Implementation:** ✅ Task breakdown complete and ready for systematic execution using `implement` workflow.
