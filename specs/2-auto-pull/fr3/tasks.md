# Task Breakdown: FR-3 Manual Intervention Notification

**Created:** 2025-12-15
**Implementation Plan:** [specs/2-auto-pull/fr3/plan.md](plan.md)
**Specification:** [specs/2-auto-pull/spec.md](../spec.md)
**Status:** Planning

## Task Summary

**Total Tasks:** 28 tasks
**Phases:** 6 (Setup → Foundation → Core → Integration → Quality → Polish)
**Estimated Complexity:** Medium
**Parallel Execution Opportunities:** 8 task groups

## Phase 0: Setup & Prerequisites

### ENV-001: Validate FR-2 Dependencies ✅
**Description:** Verify FR-2 (Auto-pull) implementation is complete and provides required infrastructure
**Files:** `src/services/AutoPullService.ts`, `src/ui/StatusPanelView.ts`, `src/settings/data.ts`
**Dependencies:** None
**Acceptance Criteria:**
- [x] AutoPullService has PullOperationState and PullSkipReason enums
- [x] AutoPullService has notifyManualInterventionRequired() method
- [x] StatusPanelView has renderPullHistory() method
- [x] Settings include autoPullNotificationVerbosity
- [x] All FR-2 tests passing

**Commands:**
```bash
# Verify AutoPullService exports
grep -n "export enum PullSkipReason" src/services/AutoPullService.ts

# Verify settings schema
grep -n "autoPullNotificationVerbosity" src/settings/data.ts

# Run FR-2 tests
npm test -- test/services/AutoPullService.test.ts
```

### ENV-002: Review Existing Modal Patterns ✅
**Description:** Analyze existing modal implementations for reuse patterns
**Files:** `src/ui/CriticalErrorModal.ts`, `src/ui/MergeConflictModal.ts`, `src/ui/AuthFailureModal.ts`
**Dependencies:** ENV-001
**Acceptance Criteria:**
- [x] CriticalErrorModal base class understood
- [x] Non-dismissible modal pattern identified
- [x] Terminal launch pattern from MergeConflictModal extracted
- [x] Action button patterns documented

**Commands:**
```bash
# Review modal inheritance
grep -n "extends CriticalErrorModal" src/ui/*.ts

# Review terminal launch
grep -n "openRepositoryInExplorer" src/ui/MergeConflictModal.ts
```

## Phase 1: Foundation & Utilities

### UTIL-001: Create Terminal Launch Utility ✅
**Description:** Extract and centralize terminal launching logic for cross-platform support
**Files:** `src/utils/terminal.ts` (new file)
**Dependencies:** ENV-002
**Acceptance Criteria:**
- [x] openRepositoryInTerminal() function created
- [x] Cross-platform support (macOS, Windows, Linux)
- [x] Error handling for missing terminal applications
- [x] Returns Promise<boolean> indicating success
- [x] Logging on success and failure

**Implementation Notes:**
- Reuse pattern from MergeConflictModal.openRepositoryInExplorer()
- Use Electron shell API: shell.openPath() or shell.openExternal()
- Platform detection: process.platform
- Test on macOS (primary development platform)

### UTIL-002 [P]: Add Terminal Utility Tests ✅
**Description:** Comprehensive unit tests for terminal launching utility
**Files:** `test/utils/terminal.test.ts` (new file)
**Dependencies:** UTIL-001
**Acceptance Criteria:**
- [x] Test successful terminal launch
- [x] Test error handling for missing terminal
- [x] Mock Electron shell API
- [x] Test platform detection logic
- [x] Coverage above 90%

## Phase 2: Core Modal Implementation

### MODAL-001: Create ManualInterventionModal Component
**Description:** Build modal for critical manual intervention scenarios
**Files:** `src/ui/ManualInterventionModal.ts` (new file)
**Dependencies:** UTIL-001
**Acceptance Criteria:**
- [ ] Extends CriticalErrorModal for non-dismissible behavior
- [ ] Accepts PullOperationState in constructor
- [ ] Renders different content based on skipReason
- [ ] Shows repository name and current branch
- [ ] Includes "Open Terminal" button
- [ ] Includes "I'll Handle This" acknowledgment button
- [ ] Uses clear, non-technical language

**Content Variations by Skip Reason:**
- DIVERGED_BRANCHES: Explain merge/rebase needed, show commit counts
- UNCOMMITTED_CHANGES: Instruct to commit or stash
- AUTH_ERROR: Direct to terminal for credential setup
- CONCURRENT_OPERATION: Explain operation conflict
- LOCK_ERROR: Similar to concurrent operation

### MODAL-002: Add Modal Rendering Logic
**Description:** Implement renderHeader() and content rendering methods
**Files:** `src/ui/ManualInterventionModal.ts`
**Dependencies:** MODAL-001
**Acceptance Criteria:**
- [ ] renderHeader() shows appropriate icon and title
- [ ] renderContent() varies by skipReason
- [ ] renderActionButtons() includes terminal and acknowledgment
- [ ] All text is user-friendly and actionable
- [ ] Proper CSS classes applied for styling

### MODAL-003: Implement Terminal Launch Action
**Description:** Wire up "Open Terminal" button to terminal utility
**Files:** `src/ui/ManualInterventionModal.ts`
**Dependencies:** MODAL-002, UTIL-001
**Acceptance Criteria:**
- [ ] Button click calls openRepositoryInTerminal()
- [ ] Shows success notice on successful launch
- [ ] Shows error notice on launch failure
- [ ] Logs action for debugging
- [ ] Button disabled while operation in progress

### MODAL-004 [P]: Create Modal Unit Tests
**Description:** Comprehensive tests for ManualInterventionModal
**Files:** `test/ui/ManualInterventionModal.test.ts` (new file)
**Dependencies:** MODAL-003
**Acceptance Criteria:**
- [ ] Test modal renders for each skipReason
- [ ] Test terminal launch button functionality
- [ ] Test acknowledgment button closes modal
- [ ] Test content varies correctly by skipReason
- [ ] Mock terminal utility
- [ ] Verify non-dismissible behavior
- [ ] Coverage above 90%

## Phase 3: Service Layer Integration

### SVC-001: Enhance NotificationService for Modals
**Description:** Add modal launching capability to NotificationService
**Files:** `src/services/NotificationService.ts`
**Dependencies:** MODAL-003
**Acceptance Criteria:**
- [ ] showManualInterventionNotification(state: PullOperationState) method added
- [ ] Determines modal vs notice based on skipReason
- [ ] Launches ManualInterventionModal for critical scenarios
- [ ] Shows Notice for less critical scenarios
- [ ] Respects verbosity settings (except critical errors)
- [ ] Logs notification decisions

**Modal Triggers (Critical):**
- DIVERGED_BRANCHES (always show modal)
- AUTH_ERROR (always show modal)
- CONCURRENT_OPERATION (always show modal)

**Notice Triggers (Less Critical):**
- UNCOMMITTED_CHANGES (notice with guidance)
- DISABLED_GLOBAL / DISABLED_REPO (no notification - expected)
- LOCK_ERROR (notice with retry guidance)

### SVC-002: Update AutoPullService Notification Logic
**Description:** Enhance notifyManualInterventionRequired() to use NotificationService
**Files:** `src/services/AutoPullService.ts`
**Dependencies:** SVC-001
**Acceptance Criteria:**
- [ ] notifyManualInterventionRequired() calls NotificationService
- [ ] Passes full PullOperationState (not just strings)
- [ ] Removed direct Notice creation (delegated to NotificationService)
- [ ] shouldShowModal() helper method added
- [ ] getNotificationMessage() helper method added
- [ ] Silent mode respected except for critical errors

### SVC-003 [P]: Add NotificationService Tests
**Description:** Unit tests for enhanced notification logic
**Files:** `test/services/NotificationService.test.ts`
**Dependencies:** SVC-002
**Acceptance Criteria:**
- [ ] Test showManualInterventionNotification() for each skipReason
- [ ] Test modal launched for critical scenarios
- [ ] Test notice shown for non-critical scenarios
- [ ] Test verbosity settings respected
- [ ] Test critical scenarios ignore silent mode
- [ ] Mock ManualInterventionModal
- [ ] Coverage above 90%

### SVC-004 [P]: Update AutoPullService Tests
**Description:** Update existing tests for new notification behavior
**Files:** `test/services/AutoPullService.test.ts`
**Dependencies:** SVC-002
**Acceptance Criteria:**
- [ ] Test notifyManualInterventionRequired() delegates to NotificationService
- [ ] Test shouldShowModal() logic for each skipReason
- [ ] Test getNotificationMessage() content
- [ ] Mock NotificationService properly
- [ ] All existing tests still pass
- [ ] Coverage maintained above 90%

## Phase 4: UI Status Panel Enhancement

### UI-001: Add Status Panel Icon Rendering
**Description:** Enhanced visual indicators for different manual intervention scenarios
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** SVC-002
**Acceptance Criteria:**
- [ ] Warning icon (⚠️) for DIVERGED_BRANCHES (yellow/orange)
- [ ] Info icon (ℹ️) for DISABLED states and updates available
- [ ] Lock icon (🔒) for CONCURRENT_OPERATION
- [ ] Key icon (🔑) for AUTH_ERROR
- [ ] Icons have proper CSS classes and colors
- [ ] Tooltips explain the status

### UI-002: Enhance Status Text Rendering
**Description:** Clear status messages based on repository state
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** UI-001
**Acceptance Criteria:**
- [ ] "Manual merge required" for DIVERGED_BRANCHES
- [ ] "Updates Available" for DISABLED states
- [ ] "Authentication needed" for AUTH_ERROR
- [ ] "Repository busy" for CONCURRENT_OPERATION/LOCK_ERROR
- [ ] formatSkipReason() method enhanced
- [ ] Text color matches severity

### UI-003: Add Contextual Action Buttons
**Description:** Action buttons in status panel based on repository state
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** UI-002
**Acceptance Criteria:**
- [ ] "Pull" button for "Updates Available" state
- [ ] "Open Terminal" button for DIVERGED_BRANCHES
- [ ] Button click handlers properly wired
- [ ] Buttons disabled during operations
- [ ] Visual feedback on button click

### UI-004 [P]: Add Status Panel CSS
**Description:** Styling for new icons and status indicators
**Files:** `styles.css`
**Dependencies:** UI-003
**Acceptance Criteria:**
- [ ] Warning icon orange/yellow color
- [ ] Info icon blue color
- [ ] Lock icon gray color
- [ ] Key icon red color
- [ ] Hover states for action buttons
- [ ] Consistent with existing plugin styling

### UI-005 [P]: Add Status Panel Tests
**Description:** Update tests for enhanced status panel rendering
**Files:** `test/ui/StatusPanelView.test.ts`
**Dependencies:** UI-003, UI-004
**Acceptance Criteria:**
- [ ] Test icon rendering for each state
- [ ] Test status text rendering
- [ ] Test action button visibility
- [ ] Test button click handlers
- [ ] Mock AutoPullService properly
- [ ] Coverage above 90%

## Phase 5: Integration & Workflow

### INT-001: FetchScheduler Integration
**Description:** Ensure status panel refreshes after pull attempts
**Files:** `src/services/FetchSchedulerService.ts`
**Dependencies:** SVC-002, UI-003
**Acceptance Criteria:**
- [ ] Status panel refresh after attemptAutoPull()
- [ ] Notification triggered by AutoPullService (not FetchScheduler)
- [ ] No duplicate notifications
- [ ] Log skip/failure for debugging
- [ ] Existing fetch workflow unaffected

### INT-002: Settings Documentation
**Description:** Update settings UI to document notification behavior
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** INT-001
**Acceptance Criteria:**
- [ ] Auto-pull settings help text updated
- [ ] Notification verbosity dropdown help text updated
- [ ] Critical scenarios explanation added
- [ ] Note about non-dismissible modals
- [ ] Examples of each verbosity level

### INT-003 [P]: End-to-End Integration Tests
**Description:** Validate complete notification flow
**Files:** `test/integration/auto-pull.test.ts`
**Dependencies:** INT-001, INT-002
**Acceptance Criteria:**
- [ ] Test diverged branches triggers modal
- [ ] Test uncommitted changes triggers notice
- [ ] Test auth failure triggers modal
- [ ] Test notification verbosity settings
- [ ] Test status panel indicator updates
- [ ] Mock all external dependencies

## Phase 6: Quality & Documentation

### TEST-001: Create Manual Testing Checklist
**Description:** Comprehensive manual testing scenarios
**Files:** `specs/2-auto-pull/fr3/manual-testing-checklist.md` (new file)
**Dependencies:** All INT-* tasks
**Acceptance Criteria:**
- [ ] Diverged branches scenario defined
- [ ] Uncommitted changes scenario defined
- [ ] Auto-pull disabled scenario defined
- [ ] Authentication failure scenario defined
- [ ] Lock error scenario defined
- [ ] Notification verbosity scenarios defined
- [ ] Status panel verification steps defined
- [ ] Expected outcomes documented

### TEST-002: Execute Manual Testing
**Description:** Run through complete manual testing checklist
**Files:** Test results documented in manual-testing-checklist.md
**Dependencies:** TEST-001
**Acceptance Criteria:**
- [ ] All checklist scenarios executed
- [ ] Modal content verified as clear and actionable
- [ ] Terminal launch works on macOS
- [ ] Status panel indicators accurate
- [ ] Notifications respect verbosity settings
- [ ] All issues documented and fixed
- [ ] Re-tested after fixes

### TEST-003 [P]: Performance Testing
**Description:** Verify notification performance impact
**Files:** Test results documented in validation-report.md
**Dependencies:** TEST-002
**Acceptance Criteria:**
- [ ] Modal launch time under 100ms
- [ ] No UI blocking during notification
- [ ] Status panel refresh under 200ms
- [ ] Multiple notifications handled gracefully
- [ ] Memory usage acceptable

### DOC-001: Update README
**Description:** User-facing documentation for manual intervention
**Files:** `README.md`
**Dependencies:** TEST-002
**Acceptance Criteria:**
- [ ] Manual intervention section added
- [ ] Notification types explained (modal vs notice)
- [ ] Example scenarios with screenshots (optional)
- [ ] Status panel indicators documented
- [ ] Troubleshooting tips included

### DOC-002 [P]: Update Troubleshooting Guide
**Description:** Detailed resolution steps for manual intervention scenarios
**Files:** `docs/troubleshooting.md`
**Dependencies:** TEST-002
**Acceptance Criteria:**
- [ ] Section for interpreting manual intervention notifications
- [ ] Resolution steps for each scenario:
  - Diverged branches (merge vs rebase guidance)
  - Uncommitted changes (commit vs stash guidance)
  - Authentication failures (SSH vs HTTPS setup)
  - Lock errors (wait and retry guidance)
- [ ] Status panel indicator reference
- [ ] FAQ entries for common questions

### DOC-003 [P]: Add JSDoc Comments
**Description:** Comprehensive inline documentation
**Files:** `src/ui/ManualInterventionModal.ts`, `src/utils/terminal.ts`, updated service methods
**Dependencies:** All implementation tasks
**Acceptance Criteria:**
- [ ] All public methods have JSDoc comments
- [ ] Parameters and return types documented
- [ ] Examples provided where helpful
- [ ] Error conditions documented
- [ ] Cross-references to related components

## Phase 7: Validation & Completion

### VAL-001: FR-3 Acceptance Criteria Verification
**Description:** Validate all FR-3 specification requirements met
**Files:** `specs/2-auto-pull/fr3/validation-report.md` (new file)
**Dependencies:** All previous tasks
**Acceptance Criteria:**
- [ ] FR-3.1: Notification states manual merge required ✓
- [ ] FR-3.2: Notification identifies repository ✓
- [ ] FR-3.3: Notification explains why auto-pull failed ✓
- [ ] FR-3.4: Notification provides actionable next steps ✓
- [ ] FR-3.5: Optional terminal button works ✓
- [ ] FR-3.6: Notification non-dismissible (modal only) ✓
- [ ] FR-3.7: Status panel "Manual merge required" indicator ✓
- [ ] FR-3.8: Status panel "Updates Available" with Pull button ✓

### VAL-002: Constitutional Compliance Check
**Description:** Verify implementation aligns with project principles
**Files:** Documented in validation-report.md
**Dependencies:** VAL-001
**Acceptance Criteria:**
- [ ] Specification-first: Implemented per approved FR-3 spec
- [ ] Iterative simplicity: Reused existing patterns
- [ ] Documentation as context: Complete docs and comments
- [ ] No scope creep beyond FR-3 requirements
- [ ] Quality standards maintained

### VAL-003: Regression Testing
**Description:** Ensure no regressions in existing functionality
**Files:** All existing test suites
**Dependencies:** VAL-002
**Acceptance Criteria:**
- [ ] All FR-1 tests passing
- [ ] All FR-2 tests passing
- [ ] All core plugin tests passing
- [ ] No performance degradation
- [ ] No new console errors or warnings

### VAL-004: Git Commit and Branch Cleanup
**Description:** Commit all FR-3 changes with proper message
**Files:** All modified and new files
**Dependencies:** VAL-003
**Acceptance Criteria:**
- [ ] All files staged properly
- [ ] Commit message follows standards
- [ ] Task progress documented in commit
- [ ] Branch ready for review/merge

**Commands:**
```bash
# Stage all FR-3 files
git add src/ui/ManualInterventionModal.ts
git add src/utils/terminal.ts
git add src/services/AutoPullService.ts
git add src/services/NotificationService.ts
git add src/ui/StatusPanelView.ts
git add src/settings/SettingTab.ts
git add styles.css
git add test/ui/ManualInterventionModal.test.ts
git add test/utils/terminal.test.ts
git add test/services/NotificationService.test.ts
git add test/services/AutoPullService.test.ts
git add test/ui/StatusPanelView.test.ts
git add test/integration/auto-pull.test.ts
git add README.md
git add docs/troubleshooting.md
git add specs/2-auto-pull/fr3/tasks.md
git add specs/2-auto-pull/fr3/manual-testing-checklist.md
git add specs/2-auto-pull/fr3/validation-report.md

# Commit with comprehensive message
git commit -m "[Cline] feat: implement FR-3 manual intervention notifications

- Created ManualInterventionModal for critical scenarios (diverged branches, auth failures)
- Enhanced NotificationService with modal vs notice logic
- Updated AutoPullService to use new notification system
- Enhanced StatusPanelView with contextual icons and action buttons
- Added terminal launch utility for cross-platform support
- Updated settings UI with notification behavior documentation
- Comprehensive test coverage (28/28 tasks complete)
- All acceptance criteria validated

---

Help me draft up implementation tasks for FR-3 of \`specs/2-auto-pull/spec.md\` 
based on the drafted plan in \`specs/2-auto-pull/fr3/plan.md\`."
```

## Task Dependencies Diagram

```
Phase 0: Setup
ENV-001 → ENV-002

Phase 1: Foundation
ENV-002 → UTIL-001 → UTIL-002 [P]

Phase 2: Core Modal
UTIL-001 → MODAL-001 → MODAL-002 → MODAL-003 → MODAL-004 [P]

Phase 3: Service Integration
MODAL-003 → SVC-001 → SVC-002 → SVC-003 [P]
                              └→ SVC-004 [P]

Phase 4: UI Enhancement
SVC-002 → UI-001 → UI-002 → UI-003 → UI-004 [P]
                                   └→ UI-005 [P]

Phase 5: Integration
SVC-002 + UI-003 → INT-001 → INT-002 → INT-003 [P]

Phase 6: Quality
INT-001 + INT-002 → TEST-001 → TEST-002 → TEST-003 [P]
                                         → DOC-001
                                         → DOC-002 [P]
                                         → DOC-003 [P]

Phase 7: Validation
All previous → VAL-001 → VAL-002 → VAL-003 → VAL-004
```

## Implementation Notes

### Critical Path
The critical path for this implementation is:
ENV-001 → ENV-002 → UTIL-001 → MODAL-001 → MODAL-002 → MODAL-003 → SVC-001 → SVC-002 → UI-001 → UI-002 → UI-003 → INT-001 → INT-002 → TEST-001 → TEST-002 → VAL-001 → VAL-002 → VAL-003 → VAL-004

**Estimated Duration:** 2-3 days along critical path

### Parallel Execution Opportunities
Tasks marked [P] can execute in parallel with their siblings:
- UTIL-002 can run parallel to MODAL-001 (both use UTIL-001)
- MODAL-004 can run parallel to SVC-001 (independent testing)
- SVC-003 and SVC-004 are independent test suites
- UI-004 and UI-005 can run parallel with UI-003
- INT-003, TEST-003, DOC-002, DOC-003 can run in parallel

### Risk Mitigation
**Risk: Modal stacking with multiple failing repos**
- Mitigation: Implemented in SVC-001 with queue logic
- Test in INT-003 with multiple repository failure scenario

**Risk: Terminal launch failures**
- Mitigation: Graceful error handling in UTIL-001
- Fallback to showing repository path in notice
- Test error cases in UTIL-002

**Risk: Notification fatigue**
- Mitigation: Verbosity settings respected in SVC-001
- Critical scenarios (diverged) always shown
- Less critical scenarios use transient notices

### Quality Gates
Each phase has validation checkpoints:
- Phase 1: UTIL-002 tests pass
- Phase 2: MODAL-004 tests pass
- Phase 3: SVC-003 + SVC-004 tests pass
- Phase 4: UI-005 tests pass
- Phase 5: INT-003 tests pass
- Phase 6: TEST-002 manual testing complete
- Phase 7: VAL-003 regression tests pass

### Constitutional Alignment
- ✅ **Specification-First**: All tasks derived from approved FR-3 spec
- ✅ **Iterative Simplicity**: Reusing existing modal patterns, minimal new infrastructure
- ✅ **Documentation as Context**: Comprehensive docs in DOC-001, DOC-002, DOC-003

## Progress Tracking

**Current Status:** In Progress (4/28 tasks complete)

**Phase Completion:**
- [x] Phase 0: Setup (2/2) ✅
- [x] Phase 1: Foundation (2/2) ✅
- [ ] Phase 2: Core Modal (0/4)
- [ ] Phase 3: Service Integration (0/4)
- [ ] Phase 4: UI Enhancement (0/5)
- [ ] Phase 5: Integration (0/3)
- [ ] Phase 6: Quality (0/4)
- [ ] Phase 7: Validation (0/4)

**Estimated Completion:** 2-3 days from start
