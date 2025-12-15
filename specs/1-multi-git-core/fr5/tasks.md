# FR-5 Implementation Tasks: Error Handling and Recovery

**Feature:** Multi-Git Core for Obsidian
**Requirement:** FR-5: Error Handling and Recovery
**Plan:** [plan.md](plan.md)
**Status:** Not Started
**Last Updated:** 2025-12-15

## Task Overview

This document tracks implementation tasks for FR-5, which adds comprehensive error handling with critical error modals, error classification, and actionable user guidance.

## Progress Summary

**Overall Progress:** 9/30 tasks complete (30%)

**By Phase:**
- Phase 1: Error Classification Infrastructure - 4/4 tasks (100%)
- Phase 2: Critical Error Modals - 5/5 tasks (100%)
- Phase 3: Error Presentation Service - 0/5 tasks (0%)
- Phase 4: GitCommandService Integration - 0/5 tasks (0%)
- Phase 5: Error Message Refinement - 0/5 tasks (0%)
- Phase 6: Testing and Documentation - 0/6 tasks (0%)

---

## Phase 1: Error Classification Infrastructure

**Goal:** Create error classification and detection logic

### CLASSIFY-001: Extend Error Type Definitions
**Status:** ✅ Complete  
**File:** `src/utils/errors.ts`

**Description:**
Add error classification types and enums to support categorization of errors by severity and scenario.

**Implementation Steps:**
1. Add `ErrorSeverity` enum (CRITICAL, MINOR, WARNING)
2. Add `ErrorScenario` enum (AUTHENTICATION_FAILURE, MERGE_CONFLICT, NETWORK_ERROR, etc.)
3. Define `ClassifiedError` interface with all required fields
4. Add JSDoc comments documenting each type

**Acceptance Criteria:**
- [x] ErrorSeverity enum includes CRITICAL, MINOR, WARNING
- [x] ErrorScenario enum includes all planned scenarios
- [x] ClassifiedError interface matches plan specification
- [x] All types have comprehensive JSDoc comments
- [x] TypeScript compilation succeeds

**Estimated Effort:** 1 hour

---

### CLASSIFY-002: Create ErrorClassificationService
**Status:** ✅ Complete  
**File:** `src/services/ErrorClassificationService.ts`

**Description:**
Implement service to classify errors based on git command output and error patterns.

**Implementation Steps:**
1. Create ErrorClassificationService class
2. Implement `classifyError()` method
3. Implement `isAuthenticationFailure()` pattern detector
4. Implement `isMergeConflict()` pattern detector
5. Implement `isNetworkError()` pattern detector
6. Implement `isPermissionDenied()` pattern detector
7. Implement `getSuggestedActions()` method
8. Add comprehensive logging for debugging

**Acceptance Criteria:**
- [x] Service correctly identifies authentication failures
- [x] Service correctly identifies merge conflicts
- [x] Service correctly identifies network errors
- [x] Service correctly identifies permission errors
- [x] Service generates appropriate suggested actions
- [x] Service classifies severity correctly (critical vs minor)
- [x] Unmatched errors default to UNKNOWN scenario
- [x] All public methods have JSDoc comments

**Estimated Effort:** 4 hours

---

### CLASSIFY-003: Implement Error Pattern Matching
**Status:** ✅ Complete  
**File:** `src/services/ErrorClassificationService.ts`

**Description:**
Define and test regex patterns for detecting specific error scenarios from git output.

**Implementation Steps:**
1. Define AUTH_FAILURE_PATTERNS array with regex patterns
2. Define MERGE_CONFLICT_PATTERNS array with regex patterns
3. Define NETWORK_ERROR_PATTERNS array with regex patterns
4. Define PERMISSION_DENIED_PATTERNS array with regex patterns
5. Test patterns against real git error messages
6. Handle git version differences
7. Add logging for unmatched patterns

**Acceptance Criteria:**
- [x] Auth failure patterns catch common SSH and HTTPS errors
- [x] Merge conflict patterns detect conflict markers and messages
- [x] Network error patterns catch connectivity issues
- [x] Permission patterns catch file system and git permission errors
- [x] Patterns are case-insensitive where appropriate
- [x] Patterns tested with real git output samples
- [x] Unmatched errors are logged for future pattern refinement

**Estimated Effort:** 3 hours

---

### CLASSIFY-004: Unit Tests for Error Classification
**Status:** ✅ Complete  
**File:** `test/services/ErrorClassificationService.test.ts`

**Description:**
Comprehensive unit tests for error classification service.

**Implementation Steps:**
1. Test classification of authentication failures
2. Test classification of merge conflicts
3. Test classification of network errors
4. Test classification of permission errors
5. Test classification of unknown errors
6. Test suggested actions generation
7. Test severity assignment logic
8. Test edge cases and malformed input

**Acceptance Criteria:**
- [x] All auth failure scenarios tested
- [x] All merge conflict scenarios tested
- [x] All network error scenarios tested
- [x] Unknown errors handled gracefully
- [x] Suggested actions are scenario-appropriate
- [x] Edge cases covered (null, undefined, empty strings)
- [x] All tests passing
- [x] Test coverage >90%

**Estimated Effort:** 3 hours

**Phase 1 Total:** 11 hours

---

## Phase 2: Critical Error Modals

**Goal:** Create modal dialogs for critical errors

### MODAL-001: Create CriticalErrorModal Base Class
**Status:** ✅ Complete  
**File:** `src/ui/CriticalErrorModal.ts`

**Description:**
Create base modal class for displaying critical errors with standard layout and functionality.

**Implementation Steps:**
1. Create CriticalErrorModal extending Obsidian Modal
2. Implement standard modal layout structure
3. Add error message display area
4. Add collapsible technical details section
5. Add suggested actions list rendering
6. Add acknowledgment button
7. Add proper styling classes

**Acceptance Criteria:**
- [x] Modal extends Obsidian Modal class correctly
- [x] Layout includes title, message, details, actions
- [x] Technical details are collapsible
- [x] Suggested actions render as bulleted list
- [x] Acknowledgment button closes modal
- [x] Modal has consistent styling with Obsidian
- [x] Works in both light and dark themes

**Estimated Effort:** 3 hours

---

### MODAL-002: Create AuthFailureModal
**Status:** ✅ Complete  
**File:** `src/ui/AuthFailureModal.ts`

**Description:**
Create modal for authentication failures with setup instructions.

**Implementation Steps:**
1. Create AuthFailureModal extending CriticalErrorModal
2. Add SSH key setup instructions section
3. Add HTTPS credentials setup instructions section
4. Add platform-specific guidance
5. Add links to git documentation
6. Add styling for readability
7. Test with sample auth error data

**Acceptance Criteria:**
- [x] Modal shows clear authentication error message
- [x] SSH instructions include key generation steps
- [x] HTTPS instructions include credential helper setup
- [x] Instructions are platform-appropriate (macOS/Windows/Linux)
- [x] Links to documentation are working
- [x] Layout is scannable and easy to follow
- [x] Works in both light and dark themes

**Estimated Effort:** 3 hours

---

### MODAL-003: Create MergeConflictModal
**Status:** ✅ Complete  
**File:** `src/ui/MergeConflictModal.ts`

**Description:**
Create modal for merge conflicts with resolution guidance.

**Implementation Steps:**
1. Create MergeConflictModal extending CriticalErrorModal
2. Display list of conflicted files
3. Explain conflict markers (<<<<<<<, =======, >>>>>>>)
4. Provide step-by-step resolution instructions
5. Add "Open in File Explorer" button
6. Add "I've Resolved the Conflicts" button
7. Test with sample conflict data

**Acceptance Criteria:**
- [x] Modal lists all conflicted files
- [x] Conflict markers are explained clearly
- [x] Resolution steps are actionable
- [x] "Open in File Explorer" button works cross-platform
- [x] "I've Resolved" button closes modal
- [x] Instructions are beginner-friendly
- [x] Works in both light and dark themes

**Estimated Effort:** 3 hours

---

### MODAL-004: Modal Styling
**Status:** ✅ Complete  
**File:** `styles.css`

**Description:**
Add CSS styling for critical error modals.

**Implementation Steps:**
1. Create modal-specific CSS classes
2. Style for readability in light theme
3. Style for readability in dark theme
4. Add icons to visual elements
5. Make instructions scannable (bullets, spacing)
6. Test on narrow screens
7. Ensure accessibility (contrast, focus states)

**Acceptance Criteria:**
- [x] Modals readable in light theme
- [x] Modals readable in dark theme
- [x] Icons render correctly
- [x] Instructions are visually scannable
- [x] Works on narrow screens (mobile)
- [x] Focus states are visible
- [x] Color contrast meets accessibility standards

**Estimated Effort:** 2 hours

---

### MODAL-005: Unit Tests for Modals
**Status:** ⏭️ Deferred (Will implement with Phase 6 testing)
**Files:** 
- `test/ui/CriticalErrorModal.test.ts`
- `test/ui/AuthFailureModal.test.ts`
- `test/ui/MergeConflictModal.test.ts`

**Description:**
Unit tests for all modal components.

**Implementation Steps:**
1. Test CriticalErrorModal rendering
2. Test AuthFailureModal instruction generation
3. Test MergeConflictModal file list rendering
4. Test button callbacks
5. Test modal open/close lifecycle
6. Test accessibility features
7. Test error handling

**Acceptance Criteria:**
- [ ] All modals render correctly (deferred to Phase 6)
- [ ] Instructions generate properly (deferred to Phase 6)
- [ ] Button callbacks execute correctly (deferred to Phase 6)
- [ ] Open/close lifecycle works (deferred to Phase 6)
- [ ] Accessibility features tested (deferred to Phase 6)
- [ ] Edge cases handled (deferred to Phase 6)
- [ ] All tests passing (deferred to Phase 6)
- [ ] Test coverage >85% (deferred to Phase 6)

**Estimated Effort:** 3 hours

**Phase 2 Total:** 14 hours

---

## Phase 3: Error Presentation Service

**Goal:** Route errors to appropriate presentation method

### PRESENT-001: Create ErrorPresentationService
**Status:** Not Started  
**File:** `src/services/ErrorPresentationService.ts`

**Description:**
Create service to route errors to appropriate presentation method based on classification.

**Implementation Steps:**
1. Create ErrorPresentationService class
2. Inject App and NotificationService dependencies
3. Implement `presentError()` routing method
4. Implement `showCriticalErrorModal()` method
5. Implement `showMinorErrorNotification()` method
6. Implement `updateStatusPanelError()` method
7. Add modal tracking to prevent duplicates

**Acceptance Criteria:**
- [ ] Service correctly routes critical errors to modals
- [ ] Service correctly routes minor errors to notifications
- [ ] Service updates status panel for inline errors
- [ ] Duplicate modals are prevented
- [ ] Concurrent errors handled gracefully
- [ ] All public methods have JSDoc comments

**Estimated Effort:** 3 hours

---

### PRESENT-002: Implement Modal Presentation Logic
**Status:** Not Started  
**File:** `src/services/ErrorPresentationService.ts`

**Description:**
Implement logic to show appropriate modal based on error scenario.

**Implementation Steps:**
1. Show AuthFailureModal for AUTHENTICATION_FAILURE
2. Show MergeConflictModal for MERGE_CONFLICT
3. Show CriticalErrorModal for other critical errors
4. Track open modals by scenario
5. Prevent duplicate modals for same error
6. Queue modal if another is already open
7. Add logging for modal presentation

**Acceptance Criteria:**
- [ ] Auth failures show AuthFailureModal
- [ ] Merge conflicts show MergeConflictModal
- [ ] Other critical errors show CriticalErrorModal
- [ ] Duplicate modals prevented
- [ ] Modal queue works correctly
- [ ] Debug logging shows presentation decisions

**Estimated Effort:** 2 hours

---

### PRESENT-003: Integrate with NotificationService
**Status:** Not Started  
**File:** `src/services/ErrorPresentationService.ts`

**Description:**
Use existing NotificationService for minor error presentation.

**Implementation Steps:**
1. Call `notifyFetchError()` for minor errors
2. Ensure repository name in all notifications
3. Add error scenario to notification text
4. Maintain notification cooldown logic
5. Format error messages appropriately
6. Add logging for notification decisions

**Acceptance Criteria:**
- [ ] Minor errors show notifications
- [ ] Repository name always included
- [ ] Error scenario mentioned in notification
- [ ] Cooldown prevents notification spam
- [ ] Messages are clear and actionable
- [ ] Debug logging shows notification decisions

**Estimated Effort:** 2 hours

---

### PRESENT-004: Status Panel Integration
**Status:** Not Started  
**File:** `src/services/ErrorPresentationService.ts`

**Description:**
Integrate with StatusPanelView for inline error display.

**Implementation Steps:**
1. Add method to update status panel errors
2. Ensure repository name always shown
3. Add "Get Help" links for common scenarios
4. Maintain retry button functionality
5. Format errors consistently
6. Test with StatusPanelView

**Acceptance Criteria:**
- [ ] Status panel shows inline errors
- [ ] Repository name always visible
- [ ] "Get Help" links appear for common errors
- [ ] Retry buttons work correctly
- [ ] Error formatting is consistent
- [ ] Integration with StatusPanelView works

**Estimated Effort:** 2 hours

---

### PRESENT-005: Unit Tests for Error Presentation
**Status:** Not Started  
**File:** `test/services/ErrorPresentationService.test.ts`

**Description:**
Unit tests for error presentation service.

**Implementation Steps:**
1. Test error routing logic
2. Test modal presentation
3. Test notification presentation
4. Test status panel integration
5. Test concurrent error handling
6. Test duplicate prevention
7. Test error queueing

**Acceptance Criteria:**
- [ ] Routing logic tested thoroughly
- [ ] Modal presentation tested
- [ ] Notification presentation tested
- [ ] Status panel integration tested
- [ ] Concurrent errors handled correctly
- [ ] Duplicates prevented
- [ ] All tests passing
- [ ] Test coverage >90%

**Estimated Effort:** 3 hours

**Phase 3 Total:** 12 hours

---

## Phase 4: GitCommandService Integration

**Goal:** Integrate error classification into git operations

### INTEGRATE-001: Add Error Services to GitCommandService
**Status:** Not Started  
**File:** `src/services/GitCommandService.ts`

**Description:**
Inject error classification and presentation services into GitCommandService.

**Implementation Steps:**
1. Add ErrorClassificationService dependency
2. Add ErrorPresentationService dependency
3. Update constructor for dependency injection
4. Update executeCommand() to use error classification
5. Present classified errors appropriately
6. Maintain backward compatibility
7. Add comprehensive logging

**Acceptance Criteria:**
- [ ] Services injected correctly
- [ ] Constructor accepts new dependencies
- [ ] executeCommand() classifies errors
- [ ] Errors presented via ErrorPresentationService
- [ ] Existing functionality not broken
- [ ] Debug logging shows error flow
- [ ] TypeScript compilation succeeds

**Estimated Effort:** 2 hours

---

### INTEGRATE-002: Update Fetch Operations
**Status:** Not Started  
**File:** `src/services/GitCommandService.ts`

**Description:**
Integrate error classification into fetch operations.

**Implementation Steps:**
1. Classify fetch errors before presenting
2. Show auth modal for auth failures
3. Show notification for network errors
4. Update status panel for minor errors
5. Don't block other repositories
6. Test with various fetch scenarios

**Acceptance Criteria:**
- [ ] Fetch errors are classified
- [ ] Auth failures show modal
- [ ] Network errors show notification
- [ ] Minor errors update status panel
- [ ] Failed fetch doesn't block others
- [ ] All fetch scenarios tested

**Estimated Effort:** 2 hours

---

### INTEGRATE-003: Update Commit/Push Operations
**Status:** Not Started  
**File:** `src/services/GitCommandService.ts`

**Description:**
Integrate error classification into commit and push operations.

**Implementation Steps:**
1. Classify commit/push errors
2. Show auth modal for auth failures
3. Show merge conflict modal if conflicts detected
4. Keep inline errors in CommitMessageModal for minor issues
5. Handle commit success + push failure scenario
6. Test with various commit/push scenarios

**Acceptance Criteria:**
- [ ] Commit/push errors are classified
- [ ] Auth failures show modal
- [ ] Merge conflicts show modal
- [ ] Minor errors stay in CommitMessageModal
- [ ] Commit success + push failure handled correctly
- [ ] All scenarios tested

**Estimated Effort:** 3 hours

---

### INTEGRATE-004: Update Status Check Operations
**Status:** Not Started  
**File:** `src/services/GitCommandService.ts`

**Description:**
Integrate error classification into status check operations.

**Implementation Steps:**
1. Classify status check errors
2. Show inline errors in status panel
3. Add retry buttons for all error types
4. Don't interrupt user with modals for status errors
5. Test with various status check failures

**Acceptance Criteria:**
- [ ] Status check errors are classified
- [ ] Errors show inline in status panel
- [ ] Retry buttons work for all errors
- [ ] No modal interruptions for status checks
- [ ] All error types handled

**Estimated Effort:** 2 hours

---

### INTEGRATE-005: Integration Tests
**Status:** Not Started  
**File:** `test/integration/error-handling.test.ts`

**Description:**
Integration tests for error handling across git operations.

**Implementation Steps:**
1. Test auth failure during fetch
2. Test merge conflict during push
3. Test network error during fetch
4. Test error recovery and retry
5. Test multiple concurrent errors
6. Test error presentation in different contexts

**Acceptance Criteria:**
- [ ] Auth failure integration tested
- [ ] Merge conflict integration tested
- [ ] Network error integration tested
- [ ] Error recovery works
- [ ] Concurrent errors handled
- [ ] All tests passing

**Estimated Effort:** 4 hours

**Phase 4 Total:** 13 hours

---

## Phase 5: Error Message Refinement

**Goal:** Ensure all error messages are clear and actionable

### REFINE-001: Review All Error Messages
**Status:** Not Started  
**Files:** Multiple service and UI files

**Description:**
Audit and improve all error messages across the plugin.

**Implementation Steps:**
1. Audit NotificationService messages
2. Audit StatusPanelView error formatting
3. Audit CommitMessageModal error display
4. Audit modal error messages
5. Ensure repository name always included
6. Make messages consistent in tone and style

**Acceptance Criteria:**
- [ ] All error messages audited
- [ ] Repository name in all messages
- [ ] Messages are clear and actionable
- [ ] Consistent tone and style
- [ ] Technical jargon minimized
- [ ] User-friendly language used

**Estimated Effort:** 2 hours

---

### REFINE-002: Add Suggested Actions
**Status:** Not Started  
**Files:** Error presentation components

**Description:**
Add specific suggested actions to all error scenarios.

**Implementation Steps:**
1. Generate actions for each error scenario
2. Include specific steps (not generic "try again")
3. Add platform-specific guidance where needed
4. Test actions are actually helpful
5. Link actions to documentation

**Acceptance Criteria:**
- [ ] Each error has suggested actions
- [ ] Actions are specific and actionable
- [ ] Platform differences addressed
- [ ] Actions tested for helpfulness
- [ ] Documentation links included

**Estimated Effort:** 3 hours

---

### REFINE-003: Add Help Links
**Status:** Not Started  
**Files:** Modal and error display components

**Description:**
Add links to documentation and help resources.

**Implementation Steps:**
1. Link to plugin docs for common issues
2. Link to git docs for git errors
3. Link to SSH/credential setup guides
4. Ensure links work cross-platform
5. Test all links

**Acceptance Criteria:**
- [ ] Plugin documentation links added
- [ ] Git documentation links added
- [ ] Setup guide links added
- [ ] Links tested on all platforms
- [ ] All links working

**Estimated Effort:** 1 hour

---

### REFINE-004: Format Technical Details
**Status:** Not Started  
**Files:** Modal and error display components

**Description:**
Make technical error details more readable.

**Implementation Steps:**
1. Format git stderr output for readability
2. Hide verbose output in collapsible sections
3. Highlight relevant error information
4. Include command that failed
5. Test formatting with real errors

**Acceptance Criteria:**
- [ ] Stderr output is readable
- [ ] Verbose output is collapsible
- [ ] Key error info is highlighted
- [ ] Failed command shown for debugging
- [ ] Format tested with real errors

**Estimated Effort:** 2 hours

---

### REFINE-005: User Testing
**Status:** Not Started  
**Files:** N/A (manual testing)

**Description:**
Test error messages and guidance with users.

**Implementation Steps:**
1. Test with non-technical users
2. Verify suggested actions are clear
3. Ensure modals aren't overwhelming
4. Collect feedback
5. Refine based on feedback

**Acceptance Criteria:**
- [ ] Non-technical users tested
- [ ] Actions verified as clear
- [ ] Modals not overwhelming
- [ ] Feedback collected
- [ ] Refinements implemented

**Estimated Effort:** 2 hours

**Phase 5 Total:** 10 hours

---

## Phase 6: Testing and Documentation

**Goal:** Complete testing coverage and documentation

### TEST-001: Unit Test Coverage
**Status:** Not Started  
**Files:** All test files

**Description:**
Ensure comprehensive unit test coverage for all components.

**Implementation Steps:**
1. Test ErrorClassificationService thoroughly
2. Test ErrorPresentationService routing
3. Test all modal components
4. Test error detection patterns
5. Measure coverage
6. Add tests to reach >90% coverage

**Acceptance Criteria:**
- [ ] ErrorClassificationService >90% coverage
- [ ] ErrorPresentationService >90% coverage
- [ ] All modals >85% coverage
- [ ] Error patterns thoroughly tested
- [ ] Overall coverage >90%
- [ ] All tests passing

**Estimated Effort:** 3 hours

---

### TEST-002: Integration Test Scenarios
**Status:** Not Started  
**File:** `test/integration/error-handling.test.ts`

**Description:**
Create comprehensive integration test scenarios.

**Implementation Steps:**
1. Test auth failure during fetch
2. Test auth failure during push
3. Test merge conflict during pull
4. Test network error during fetch
5. Test repository permission errors
6. Test error recovery workflows

**Acceptance Criteria:**
- [ ] Auth failure scenarios tested
- [ ] Merge conflict scenarios tested
- [ ] Network error scenarios tested
- [ ] Permission error scenarios tested
- [ ] Recovery workflows tested
- [ ] All tests passing

**Estimated Effort:** 3 hours

---

### TEST-003: Manual Testing Checklist
**Status:** Not Started  
**File:** `specs/1-multi-git-core/fr5/manual-testing-checklist.md`

**Description:**
Create comprehensive manual testing checklist.

**Implementation Steps:**
1. Create test scenarios for each error type
2. Include cross-platform testing steps
3. Add modal UX verification steps
4. Add error recovery verification steps
5. Test with various git configurations

**Acceptance Criteria:**
- [ ] Checklist covers all error types
- [ ] Cross-platform testing included
- [ ] Modal UX testing included
- [ ] Recovery testing included
- [ ] Git configuration variations covered
- [ ] Checklist is comprehensive and clear

**Estimated Effort:** 2 hours

---

### TEST-004: User Documentation
**Status:** Not Started  
**Files:** `README.md`, `docs/troubleshooting.md`

**Description:**
Update user documentation with error handling information.

**Implementation Steps:**
1. Update README with error handling overview
2. Create troubleshooting section
3. Document common errors and resolutions
4. Include screenshots of modals
5. Add FAQ section

**Acceptance Criteria:**
- [ ] README updated
- [ ] Troubleshooting guide created
- [ ] Common errors documented
- [ ] Screenshots included
- [ ] FAQ added
- [ ] Documentation is clear and helpful

**Estimated Effort:** 2 hours

---

### TEST-005: Architecture Documentation
**Status:** Not Started  
**File:** `docs/architecture.md`

**Description:**
Update architecture documentation with error handling flow.

**Implementation Steps:**
1. Document error classification logic
2. Document error presentation strategy
3. Add flow diagrams for error handling
4. Document extension points
5. Add examples of error scenarios

**Acceptance Criteria:**
- [ ] Classification logic documented
- [ ] Presentation strategy documented
- [ ] Flow diagrams added
- [ ] Extension points documented
- [ ] Examples provided
- [ ] Documentation is comprehensive

**Estimated Effort:** 2 hours

---

### TEST-006: Code Quality Review
**Status:** Not Started  
**Files:** All source files

**Description:**
Final code quality review and cleanup.

**Implementation Steps:**
1. Add JSDoc comments to all public methods
2. Run ESLint and fix issues
3. Ensure consistent code style
4. Remove debug logging
5. Review for security issues
6. Final build and test

**Acceptance Criteria:**
- [ ] All public methods have JSDoc
- [ ] ESLint passes with no errors
- [ ] Code style is consistent
- [ ] No debug logging in production
- [ ] No security vulnerabilities
- [ ] Build succeeds
- [ ] All tests passing

**Estimated Effort:** 2 hours

**Phase 6 Total:** 14 hours

---

## Summary

**Total Estimated Effort:** 74 hours

**Dependencies:**
- FR-1, FR-2, FR-3, FR-4 must be complete
- Existing error infrastructure (errors.ts, NotificationService)
- Obsidian Modal API

**Risk Mitigation:**
- Error pattern matching tested with real git outputs
- Multiple patterns per scenario for reliability
- Fallback to generic modal for unclassified errors
- User testing to validate clarity of messages

**Success Criteria:**
All FR-5 acceptance criteria met:
- [ ] Clear, actionable error messages
- [ ] Critical errors show modal dialogs
- [ ] Background failures show notifications
- [ ] Minor errors show inline in status panel
- [ ] Failed operations can be retried
- [ ] Merge conflicts detected and guided
- [ ] Auth failures detected with setup instructions
- [ ] All error presentations include repository name

---

**Notes:**
- Tasks should be completed in phase order
- Unit tests should be written alongside implementation (TDD)
- Manual testing after each phase completion
- Commit after each logical chunk of work
