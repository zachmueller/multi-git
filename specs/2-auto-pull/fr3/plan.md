# Implementation Plan: FR-3 Manual Intervention Notification

**Created:** 2025-12-15  
**Specification:** [specs/2-auto-pull/spec.md](../spec.md)  
**Status:** Planning  
**Branch:** 2-auto-pull

## Constitutional Check

### Principle Compliance Review

**Principle 1: Specification-First Development**
- ✅ Plan derived from approved FR-3 specification
- ✅ All requirements traced to spec acceptance criteria
- ✅ Implementation will not begin until plan approved

**Principle 2: Iterative Simplicity**  
- ✅ Minimal viable implementation focusing on core notification needs
- ✅ Reuses existing modal patterns (MergeConflictModal, CriticalErrorModal)
- ✅ No premature optimization or feature creep
- ✅ Builds on existing AutoPullService infrastructure from FR-2

**Principle 3: Documentation as Context**
- ✅ Plan provides clear implementation guidance
- ✅ JSDoc and inline comments planned for all new code
- ✅ User-facing documentation updates included
- ✅ Integration points clearly documented

**Gate Evaluation:** ✅ PASS - All constitutional requirements satisfied

## Technical Context

### Architecture Decisions

**Frontend Framework:** Obsidian API + TypeScript  
- **Rationale:** Plugin development environment, consistent with existing codebase
- **Alternatives Considered:** None - constrained by Obsidian plugin architecture
- **Trade-offs:** Limited to Obsidian's API capabilities, but provides native integration

**Notification Strategy:** Modal + Notice + Status Panel Indicator  
- **Rationale:** Multi-layered approach ensures users don't miss critical issues
- **Alternatives Considered:** Notice-only approach (rejected - too easy to dismiss)
- **Trade-offs:** More intrusive but ensures user awareness for critical scenarios

**Modal Pattern:** Extend CriticalErrorModal  
- **Rationale:** Existing pattern provides non-dismissible base with good UX
- **Alternatives Considered:** Create entirely new modal (rejected - unnecessary duplication)
- **Trade-offs:** Inherits some generic error presentation, but saves development time

### Technology Stack Rationale

**No new dependencies required** - All functionality achievable with existing infrastructure:
- Obsidian API for modals and notifications
- Electron shell API for terminal launching (already used in MergeConflictModal)
- Existing service layer (AutoPullService, NotificationService)
- Existing UI components (StatusPanelView, modal base classes)

### Integration Points

**AutoPullService Integration:**
- Service already has skip scenarios and error categorization
- Add notification triggering logic when pull skipped or failed
- Map PullSkipReason to appropriate notification type

**StatusPanelView Integration:**
- Already has visual indicators and action buttons from FR-2
- Enhance status indicators to distinguish between skip scenarios
- Add appropriate icons (warning for diverged, info for disabled/updates-available)

**NotificationService Integration:**
- Extend to handle manual intervention notifications
- Add modal launching capability for critical scenarios
- Coordinate with verbosity settings (some notifications always shown)

**MergeConflictModal Pattern:**
- Reuse terminal launching logic
- Adapt conflict-specific content to general manual intervention guidance
- Maintain consistent UX patterns

### Security and Compliance

**No security concerns:**
- No sensitive data in notifications
- Terminal launching uses existing Electron shell API (already security-reviewed)
- Repository paths already validated in RepositoryConfigService

## Implementation Steps

### Step 1: Create ManualInterventionModal Component
**File:** `src/ui/ManualInterventionModal.ts`

**Purpose:** Modal for critical scenarios requiring manual resolution

**Implementation Details:**
- Extend `CriticalErrorModal` for non-dismissible behavior
- Accept `PullOperationState` to determine notification content
- Render different content based on skip reason:
  - Diverged branches: Explain merge/rebase needed, show commit counts
  - Uncommitted changes: Instruct to commit or stash
  - Authentication failure: Direct to terminal for credential setup
  - Lock error: Explain concurrent operation conflict
- Include "Open Terminal" button using Electron shell API
- Include "I'll Handle This" acknowledgment button
- Use clear, non-technical language
- Show repository name and current branch
- Provide actionable next steps specific to scenario

**Dependencies:** CriticalErrorModal, Electron shell API, PullOperationState

### Step 2: Enhance AutoPullService Notification Logic
**File:** `src/services/AutoPullService.ts`

**Purpose:** Trigger appropriate notifications based on pull outcome

**Implementation Details:**
- Extend `notifyManualInterventionRequired()` method:
  - Check notification verbosity settings
  - Always show modal for diverged branches (critical scenario)
  - Show notice for other skip scenarios (unless silent mode)
  - Launch ManualInterventionModal for critical scenarios
  - Send Notice for less critical skip scenarios
- Add helper method `shouldShowModal(skipReason)`:
  - Returns true for: DIVERGED_BRANCHES, AUTH_ERROR, CONCURRENT_OPERATION
  - Returns false for: UNCOMMITTED_CHANGES, DISABLED, UP_TO_DATE, etc.
- Add helper method `getNotificationMessage(state)`:
  - Maps PullOperationState to user-friendly message
  - Includes repository name and specific issue
  - Provides actionable guidance
- Ensure modal doesn't show when verbosity is 'silent' EXCEPT for critical errors

**Dependencies:** ManualInterventionModal, NotificationService, Settings

### Step 3: Enhance StatusPanelView Indicators
**File:** `src/ui/StatusPanelView.ts`

**Purpose:** Visual indicators for different manual intervention scenarios

**Implementation Details:**
- Add icon rendering logic based on repository state:
  - Warning icon (⚠️) for diverged branches (yellow/orange)
  - Info icon (ℹ️) for updates available when auto-pull disabled
  - Lock icon (🔒) for concurrent operation errors
  - Key icon (🔑) for authentication failures
- Add status text based on scenario:
  - "Manual merge required" for diverged branches
  - "Updates Available" for auto-pull disabled or other skip reasons
  - "Authentication needed" for auth failures
  - "Repository busy" for lock errors
- Update `renderRepository()` method to show appropriate indicator
- Ensure "Pull" button appears for "Updates Available" state
- Add tooltip/hover text explaining the status
- Update CSS for new icon colors and styling

**Dependencies:** AutoPullService (for state), existing status panel structure

### Step 4: Update NotificationService
**File:** `src/services/NotificationService.ts`

**Purpose:** Centralized notification logic with modal launching

**Implementation Details:**
- Add `showManualInterventionNotification(state)` method:
  - Accepts PullOperationState
  - Determines whether to show modal or notice
  - Launches ManualInterventionModal for critical scenarios
  - Shows Notice for less critical scenarios
  - Respects verbosity settings (except for critical errors)
- Add helper to create Notice with action button (if applicable):
  - "Open Terminal" action for some skip scenarios
  - Duration: 10 seconds for notices (user has time to read)
- Ensure notices don't auto-dismiss for manual intervention scenarios
- Add logging for notification decisions (debug mode)

**Dependencies:** ManualInterventionModal, Obsidian Notice API

### Step 5: Integration with FetchSchedulerService
**File:** `src/services/FetchSchedulerService.ts`

**Purpose:** Ensure notifications triggered after fetch detects issues

**Implementation Details:**
- Update auto-pull trigger logic:
  - After attemptAutoPull() returns, check result status
  - If status is 'skipped' or 'failed', notification already sent by AutoPullService
  - Ensure StatusPanelView refreshes to show new indicator
  - Log skip/failure for debugging
- No new notification logic needed here (AutoPullService handles it)
- Ensure status panel updates after pull attempt

**Dependencies:** AutoPullService, StatusPanelView

### Step 6: Add Terminal Launch Utility
**File:** `src/utils/terminal.ts` (new file)

**Purpose:** Centralized terminal launching logic

**Implementation Details:**
- Create `openRepositoryInTerminal(repositoryPath)` function:
  - Uses Electron shell API to open terminal at repository location
  - Cross-platform support (macOS Terminal, Windows Command Prompt, Linux gnome-terminal)
  - Handles errors gracefully (log and show notice if fails)
  - Returns Promise<boolean> indicating success
- Add platform detection logic
- Add error handling for missing terminal applications
- Export for use in ManualInterventionModal and other components

**Dependencies:** Electron shell API, Logger

### Step 7: Update Settings UI
**File:** `src/settings/SettingTab.ts`

**Purpose:** Document notification behavior in settings

**Implementation Details:**
- Update auto-pull settings section help text:
  - Explain when notifications are shown regardless of verbosity
  - Clarify that critical scenarios (diverged branches) always show modal
  - Explain different notification types (modal vs notice)
- Update notification verbosity dropdown help text:
  - 'All operations' - shows success and failures
  - 'Failures only' - shows only failures and critical issues
  - 'Silent' - shows only critical issues that require immediate action
- Add note about non-dismissible modals for critical scenarios

**Dependencies:** None (UI only)

### Step 8: Create Unit Tests
**File:** `test/ui/ManualInterventionModal.test.ts`

**Purpose:** Test modal rendering and behavior

**Implementation Details:**
- Test modal renders correctly for each skip reason
- Test terminal launch button functionality
- Test acknowledgment button closes modal
- Test appropriate content displayed based on PullOperationState
- Mock Electron shell API
- Verify non-dismissible behavior

**Coverage Target:** 90%+

### Step 9: Update Integration Tests
**File:** `test/integration/auto-pull.test.ts`

**Purpose:** Validate notification triggering in real scenarios

**Implementation Details:**
- Add test for diverged branches triggering notification
- Add test for uncommitted changes triggering notice
- Add test for auth failure triggering modal
- Verify notification verbosity settings respected
- Verify status panel indicators update correctly
- Mock notification service to verify calls

### Step 10: Update Documentation
**Files:** `README.md`, `docs/troubleshooting.md`

**Purpose:** User-facing documentation for manual intervention scenarios

**Implementation Details:**
- Update README with manual intervention section:
  - Explain when manual intervention needed
  - Describe notification types (modal vs notice)
  - Show example scenarios and resolutions
  - Explain status panel indicators
- Update troubleshooting guide:
  - Add section on interpreting manual intervention notifications
  - Provide resolution steps for each scenario
  - Include screenshots of status indicators (optional)
  - Add FAQ entries for common questions

### Step 11: Manual Testing Checklist
**File:** `specs/2-auto-pull/fr3/manual-testing-checklist.md`

**Purpose:** Comprehensive manual testing scenarios

**Implementation Details:**
- Create checklist covering:
  - Diverged branches scenario (modal appears, terminal launches)
  - Uncommitted changes scenario (notice appears with guidance)
  - Auto-pull disabled scenario (status panel shows "Updates Available")
  - Authentication failure scenario (modal with terminal action)
  - Lock error scenario (notice with retry guidance)
  - Notification verbosity settings (all, failures-only, silent)
  - Status panel indicator accuracy
  - Multi-repository scenarios (multiple notifications)
- Include expected behavior for each scenario
- Include steps to verify resolution

### Step 12: Execute Manual Testing
**Purpose:** Validate all acceptance criteria met

**Implementation Details:**
- Execute each scenario in manual testing checklist
- Verify modal content is clear and actionable
- Verify terminal launch works on test platform
- Verify status panel indicators are accurate
- Verify notifications respect verbosity settings
- Document any issues found
- Re-test after fixes applied

### Step 13: Update Tasks Checklist
**File:** `specs/2-auto-pull/fr3/tasks.md`

**Purpose:** Track implementation progress

**Implementation Details:**
- Create detailed task breakdown from this plan
- Organize into phases (Foundation, Implementation, Testing, Documentation)
- Mark tasks complete as implementation progresses
- Track acceptance criteria satisfaction

### Step 14: Final Validation
**Purpose:** Ensure all FR-3 requirements met

**Implementation Details:**
- Review all 8 acceptance criteria from spec
- Verify each criterion is satisfied
- Ensure constitutional compliance maintained
- Confirm no regressions in existing functionality
- Get approval before marking FR-3 complete

## Risk Assessment

### Technical Risks

**High Risk: Modal timing conflicts**
- **Risk:** Multiple repositories failing simultaneously could trigger multiple modals
- **Impact:** Poor UX with modal stacking, user confusion
- **Mitigation:** Queue modals, show single modal with multiple repository details
- **Contingency:** Add setting to suppress modals and use notices only

**Medium Risk: Terminal launch failures**
- **Risk:** Terminal application not found or shell API fails
- **Impact:** "Open Terminal" button doesn't work
- **Mitigation:** Graceful error handling, fallback to showing repository path in notice
- **Contingency:** Document manual terminal opening in error message

**Low Risk: Notification fatigue**
- **Risk:** Too many notifications annoying users
- **Impact:** Users disable all notifications or plugin
- **Mitigation:** Respect verbosity settings, only show critical modals when necessary
- **Contingency:** Add more granular notification control in settings

### Mitigation Strategies

**For modal stacking:**
1. Implement modal queue in NotificationService
2. Show single modal with list of affected repositories
3. Allow user to address one at a time or acknowledge all
4. Test with 5+ repositories failing simultaneously

**For terminal launch failures:**
1. Try-catch around shell.openPath()
2. Show repository path in error notice if launch fails
3. Log error details for debugging
4. Provide manual instructions in modal

**For notification fatigue:**
1. Default to 'failures-only' verbosity
2. Make critical scenarios always visible (can't be silenced)
3. Add delay between notices (rate limiting)
4. Group multiple failures into single notification when possible

### Dependencies and Assumptions

**External Dependencies:**
- Electron shell API (already available, used in MergeConflictModal)
- Obsidian Modal and Notice APIs (already available)
- Terminal applications on user's system (macOS: Terminal, Windows: cmd, Linux: varies)

**Technical Assumptions:**
- AutoPullService properly categorizes all skip scenarios (implemented in FR-2)
- StatusPanelView can be refreshed after notification shows
- Modal can access PullOperationState details
- Users understand basic git concepts (merge, rebase, diverged branches)

**Business Assumptions:**
- Diverged branches is the most critical scenario requiring immediate attention
- Users prefer modal for critical issues, notice for less critical
- Terminal access is preferred method for resolving git issues
- 10-second notice duration is sufficient for users to read and act

## Testing Strategy

### Unit Tests

**ManualInterventionModal:**
- Modal renders with correct content for each skip reason
- Terminal launch button triggers shell API call
- Acknowledgment button closes modal
- Modal is non-dismissible (can't close without button)
- Repository name and branch displayed correctly

**NotificationService:**
- showManualInterventionNotification() calls correct notification type
- Verbosity settings respected appropriately
- Critical scenarios always show modal
- Non-critical scenarios respect 'silent' mode
- Notification messages are clear and actionable

**AutoPullService:**
- notifyManualInterventionRequired() triggers notifications
- shouldShowModal() returns correct value for each skip reason
- getNotificationMessage() returns appropriate message
- Notification only sent when pull skipped or failed

### Integration Tests

**Notification Flow:**
- Diverged branches triggers modal after fetch
- Uncommitted changes triggers notice
- Auto-pull disabled shows status panel indicator (no notification)
- Auth failure triggers modal with terminal action
- Lock error triggers notice with retry guidance

**Status Panel Integration:**
- Status panel shows correct indicator after notification
- Indicator persists until issue resolved
- Pull button appears for "Updates Available" state
- Warning icon appears for diverged branches

**Multi-Repository Scenarios:**
- Multiple repositories with different states handled correctly
- Notifications don't stack uncontrollably
- Status panel accurately reflects all repository states

### Manual Testing

**Critical Scenario Testing:**
- Create diverged branches scenario → verify modal appears
- Create uncommitted changes scenario → verify notice appears
- Test terminal launch on actual system
- Verify all acceptance criteria met

**User Experience Testing:**
- Notifications are clear and understandable
- Action buttons work as expected
- Status panel indicators are intuitive
- Verbosity settings work correctly

**Cross-Platform Testing:**
- Test on macOS (primary development platform)
- Test terminal launch works
- Document any platform-specific issues

## Implementation Readiness Validation

### Technical Completeness Check
- [x] Existing modal patterns reviewed (MergeConflictModal, CriticalErrorModal)
- [x] AutoPullService has skip reason categorization (from FR-2)
- [x] StatusPanelView has visual indicator infrastructure (from FR-2)
- [x] Terminal launching pattern exists (in MergeConflictModal)
- [x] Notification service infrastructure exists
- [x] Settings data model supports verbosity control (from FR-2)

### Quality Validation
- [x] Modal approach provides clear user feedback
- [x] Non-dismissible modals ensure critical issues addressed
- [x] Status panel indicators provide persistent visual cues
- [x] Terminal launch provides direct path to resolution
- [x] Notification verbosity respects user preferences

### Constitution Alignment Re-check
- [x] Specification-first: Plan derived from approved FR-3 spec
- [x] Iterative simplicity: Minimal implementation reusing existing patterns
- [x] Documentation as context: Comprehensive plan with clear steps

**All checks pass** - Ready for task breakdown and implementation

## Next Steps

After plan approval:
1. Create `specs/2-auto-pull/fr3/tasks.md` with detailed task breakdown
2. Begin implementation with Step 1 (ManualInterventionModal)
3. Implement steps sequentially with testing at each phase
4. Execute manual testing checklist
5. Update documentation
6. Mark FR-3 complete once all acceptance criteria validated

**Estimated Effort:** 2-3 days
- Day 1: Steps 1-4 (Modal and service integration)
- Day 2: Steps 5-9 (Integration and testing)
- Day 3: Steps 10-14 (Documentation and validation)

**Prerequisites:** FR-2 must be complete (AutoPullService infrastructure required)

**Success Criteria:** All 8 FR-3 acceptance criteria met, no regressions in FR-1 or FR-2
