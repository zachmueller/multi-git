# Task Breakdown: Repository Status Display (FR-4)

**Created:** 2025-12-14
**Implementation Plan:** [plan.md](plan.md)
**Specification:** [../spec.md](../spec.md)
**Status:** Planning

## Task Summary

**Total Tasks:** 42
**Phases:** 6 (Setup → Foundation → Core → Integration → Quality → Polish)
**Estimated Complexity:** Medium-High
**Parallel Execution Opportunities:** 12 task groups

## Phase 0: Setup & Environment

### ENV-001: Project Structure Setup
**Description:** Create directory structure for status panel components
**Files:** `src/ui/StatusPanelView.ts`, `test/ui/StatusPanelView.test.ts`
**Dependencies:** None
**Acceptance Criteria:**
- [x] `src/ui/` directory contains StatusPanelView.ts file
- [x] `test/ui/` directory contains test file
- [x] Files have basic structure (import statements, class skeleton)
- [x] TypeScript compilation succeeds

**Commands:**
```bash
# Create UI component file
touch src/ui/StatusPanelView.ts

# Create test directory and file
mkdir -p test/ui
touch test/ui/StatusPanelView.test.ts

# Verify compilation
npm run build
```

## Phase 1: Foundation & Architecture

### ARCH-001: StatusPanelView Class Structure ✅
**Description:** Create basic ItemView class extending Obsidian's ItemView
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** ENV-001
**Acceptance Criteria:**
- [x] Class extends ItemView from obsidian API
- [x] Constructor accepts Plugin instance and service dependencies
- [x] getViewType() returns unique identifier 'multi-git-status'
- [x] getDisplayText() returns 'Multi-Git Status'
- [x] getIcon() returns 'git-branch' icon identifier
- [x] Basic imports and type definitions complete
- [x] Class compiles without TypeScript errors

### ARCH-002: View Lifecycle Methods ✅
**Description:** Implement onOpen() and onClose() lifecycle methods
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** ARCH-001
**Acceptance Criteria:**
- [x] onOpen() initializes container element structure
- [x] onOpen() creates header with title and refresh button
- [x] onOpen() starts status polling
- [x] onClose() stops polling and cleans up timers
- [x] onClose() clears cached status data
- [x] Lifecycle methods handle async operations properly
- [x] No memory leaks on view close

### ARCH-003: Plugin Registration ✅
**Description:** Register status panel view type and ribbon icon in main plugin
**Files:** `src/main.ts`
**Dependencies:** ARCH-002
**Acceptance Criteria:**
- [x] View type registered in onload() using registerView()
- [x] Ribbon icon added with activateStatusPanel() handler
- [x] Icon appears in left ribbon by default
- [x] Clicking ribbon icon toggles panel visibility
- [x] Panel opens in right sidebar by default
- [x] Panel state persists across Obsidian restarts
- [x] View unregisters properly in onunload()

### ARCH-004 [P]: Status Panel State Class ✅
**Description:** Create state management for cached repository statuses
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** ARCH-001
**Acceptance Criteria:**
- [x] StatusPanelState interface defined with Map<string, RepositoryStatus>
- [x] isRefreshing boolean tracked
- [x] lastRefreshTime timestamp tracked
- [x] Methods to get/set/clear cache implemented
- [x] State initialized in constructor
- [x] State cleared in onClose()
- [x] TypeScript types properly defined

## Phase 2: Core Feature Implementation

### DATA-001: RepositoryStatus Interface Extension
**Description:** Extend RepositoryStatus interface with remote tracking fields
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** ARCH-004
**Acceptance Criteria:**
- [ ] unpushedCommits optional field added (number)
- [ ] remoteChanges optional field added (number)
- [ ] fetchStatus optional field added ('success' | 'error' | 'pending')
- [ ] lastFetchTime optional field added (number timestamp)
- [ ] lastFetchError optional field added (string)
- [ ] Interface changes don't break existing code
- [ ] TypeScript compilation succeeds

### GIT-001: Unpushed Commit Count Method
**Description:** Implement getUnpushedCommitCount() in GitCommandService
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** DATA-001
**Acceptance Criteria:**
- [ ] Method executes `git rev-list @{u}..HEAD --count`
- [ ] Parses output to integer
- [ ] Returns 0 if no upstream branch exists
- [ ] Handles detached HEAD state gracefully
- [ ] Returns 0 on errors (logs debug info if enabled)
- [ ] Method has JSDoc documentation
- [ ] TypeScript types properly defined

### GIT-002: Remote Change Count Method
**Description:** Implement getRemoteChangeCount() in GitCommandService
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** DATA-001
**Acceptance Criteria:**
- [ ] Method executes `git rev-list HEAD..@{u} --count`
- [ ] Parses output to integer
- [ ] Returns 0 if no upstream branch exists
- [ ] Handles detached HEAD state gracefully
- [ ] Returns 0 on errors (logs debug info if enabled)
- [ ] Method has JSDoc documentation
- [ ] TypeScript types properly defined

### GIT-003: Extended Status Method
**Description:** Create getExtendedRepositoryStatus() method combining all status info
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** GIT-001, GIT-002
**Acceptance Criteria:**
- [ ] Calls existing getRepositoryStatus() for base data
- [ ] Calls getUnpushedCommitCount() for unpushedCommits
- [ ] Calls getRemoteChangeCount() for remoteChanges
- [ ] Adds fetchStatus from settings/cache if available
- [ ] Adds lastFetchTime from settings/cache if available
- [ ] Returns complete RepositoryStatus with all fields
- [ ] Handles partial failures gracefully
- [ ] Method has JSDoc documentation

### TEST-001 [P]: GitCommandService Unit Tests
**Description:** Create unit tests for new git command methods
**Files:** `test/services/GitCommandService.test.ts`
**Dependencies:** GIT-003
**Acceptance Criteria:**
- [ ] Tests for getUnpushedCommitCount() with various scenarios
- [ ] Tests for getRemoteChangeCount() with various scenarios
- [ ] Tests for getExtendedRepositoryStatus()
- [ ] Tests handle no upstream branch case
- [ ] Tests handle detached HEAD case
- [ ] Tests handle git command failures
- [ ] All tests passing
- [ ] Code coverage above 80% for new methods

## Phase 3: Integration & Data Flow

### UI-001: Basic Panel Structure
**Description:** Create empty state, loading state, and container elements
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** ARCH-002
**Acceptance Criteria:**
- [ ] Empty state message shown when no repositories configured
- [ ] Loading spinner shown during refresh operations
- [ ] Repository list container created with proper structure
- [ ] Header with title and refresh button rendered
- [ ] Last refresh time display added to header
- [ ] Elements use Obsidian CSS classes for consistency
- [ ] Layout responsive to sidebar width

### REFRESH-001: refreshAll() Implementation
**Description:** Implement method to refresh all repository statuses
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** GIT-003, UI-001
**Acceptance Criteria:**
- [ ] Sets isRefreshing = true and shows loading UI
- [ ] Gets all enabled repositories from RepositoryConfigService
- [ ] Calls getExtendedRepositoryStatus() for each repository
- [ ] Updates cache with results
- [ ] Handles partial failures (some repos succeed, some fail)
- [ ] Sets isRefreshing = false when complete
- [ ] Updates lastRefreshTime timestamp
- [ ] Triggers renderStatuses() to update UI

### REFRESH-002 [P]: refreshRepository() Implementation
**Description:** Implement method to refresh single repository status
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** GIT-003, UI-001
**Acceptance Criteria:**
- [ ] Sets repository to loading state in UI
- [ ] Calls getExtendedRepositoryStatus() for specified repository
- [ ] Updates cache for that repository only
- [ ] Updates UI for that repository item only
- [ ] Handles errors without affecting other repositories
- [ ] Provides visual feedback on completion
- [ ] Method has JSDoc documentation

### RENDER-001: renderStatuses() Method
**Description:** Implement main rendering method for repository list
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** REFRESH-001
**Acceptance Criteria:**
- [ ] Clears repository list container
- [ ] Shows loading state if isRefreshing is true
- [ ] Shows empty state if no repositories configured
- [ ] Iterates cached statuses and renders each
- [ ] Updates last refresh time display
- [ ] Handles missing or null status data gracefully
- [ ] Re-renders efficiently without flickering

### RENDER-002: renderRepositoryStatus() Method
**Description:** Implement rendering for individual repository status items
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** RENDER-001
**Acceptance Criteria:**
- [ ] Creates repository item container with appropriate classes
- [ ] Renders repository name as header
- [ ] Renders current branch info (or "detached HEAD")
- [ ] Renders uncommitted changes indicator if hasUncommittedChanges
- [ ] Renders unpushed commits count if > 0
- [ ] Renders remote changes count if > 0
- [ ] Renders last commit message (truncated if long)
- [ ] Renders error state if fetchStatus === 'error'
- [ ] Applies appropriate CSS classes based on status

### STYLE-001: Status Panel CSS
**Description:** Add CSS styles for status panel and repository items
**Files:** `styles.css`
**Dependencies:** RENDER-002
**Acceptance Criteria:**
- [ ] Status panel container styled appropriately
- [ ] Repository items have clear visual separation
- [ ] Status indicators use appropriate Obsidian theme colors
- [ ] Uncommitted changes indicator uses warning color
- [ ] Error state uses error color
- [ ] Icons positioned and sized correctly
- [ ] Text truncation works for long names/messages
- [ ] Styles work in both light and dark themes
- [ ] Layout responsive to narrow sidebar widths

### ICON-001 [P]: Status Icons Implementation
**Description:** Add icons for various status indicators using Obsidian's icon system
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** RENDER-002
**Acceptance Criteria:**
- [ ] Uncommitted changes shown with 'circle-dot' or similar icon
- [ ] Unpushed commits shown with 'arrow-up' or 'upload' icon
- [ ] Remote changes shown with 'arrow-down' or 'download' icon
- [ ] Error state shown with 'alert-circle' or 'x-circle' icon
- [ ] Icons use Obsidian's setIcon() API
- [ ] Icons have proper ARIA labels for accessibility
- [ ] Icon colors match Obsidian theme variables

## Phase 4: Status Updates & Polling

### POLL-001: startPolling() Implementation
**Description:** Implement automatic status polling with 30-second interval
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** REFRESH-001
**Acceptance Criteria:**
- [ ] Creates setInterval with 30-second interval
- [ ] Calls refreshAll() on each interval
- [ ] Stores interval ID for cleanup
- [ ] Only polls when panel is open
- [ ] Skips poll if manual refresh in progress
- [ ] Skips poll if no repositories configured
- [ ] Logs polling activity in debug mode

### POLL-002: stopPolling() Implementation
**Description:** Implement polling cleanup to stop timers
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** POLL-001
**Acceptance Criteria:**
- [ ] Clears interval using stored ID
- [ ] Sets interval ID to null
- [ ] Called automatically in onClose()
- [ ] Prevents memory leaks
- [ ] Logs stop event in debug mode

### BTN-001: Manual Refresh Button
**Description:** Wire up manual refresh button functionality
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** REFRESH-001, UI-001
**Acceptance Criteria:**
- [ ] Refresh button click handler registered
- [ ] Calls refreshAll() on click
- [ ] Button disabled while refresh in progress
- [ ] Loading indicator shown during refresh
- [ ] Button re-enabled after refresh completes
- [ ] Button has proper ARIA labels
- [ ] Keyboard accessible (Enter/Space)

### EVENT-001: Fetch Completion Integration
**Description:** Hook status panel updates into fetch completion events
**Files:** `src/main.ts`, `src/ui/StatusPanelView.ts`
**Dependencies:** REFRESH-002
**Acceptance Criteria:**
- [ ] FetchSchedulerService completion triggers status update
- [ ] Only refreshes affected repository, not all
- [ ] Updates happen automatically without user action
- [ ] Event handler doesn't block fetch completion
- [ ] Error handling prevents event handler crashes
- [ ] Integration works when panel is open or closed

### EVENT-002 [P]: Commit/Push Completion Integration
**Description:** Hook status panel updates into commit/push operations
**Files:** `src/main.ts`, `src/ui/StatusPanelView.ts`
**Dependencies:** REFRESH-002
**Acceptance Criteria:**
- [ ] Successful commit triggers status update for that repository
- [ ] Successful push triggers status update for that repository
- [ ] Updates clear uncommitted changes indicator
- [ ] Updates unpushed commits count
- [ ] Event handler doesn't block commit/push flow
- [ ] Works whether panel is open or closed

### API-001: notifyRepositoryChanged() Method
**Description:** Create plugin method to notify panel of repository changes
**Files:** `src/main.ts`
**Dependencies:** REFRESH-002
**Acceptance Criteria:**
- [ ] Method accepts optional repository ID parameter
- [ ] If ID provided, refreshes that repository only
- [ ] If no ID, refreshes all repositories
- [ ] Checks if panel view exists before calling
- [ ] Handles case where panel is not open
- [ ] Method has JSDoc documentation
- [ ] Used by fetch, commit, and push operations

## Phase 5: Polish & Optimization

### OPT-001: Debounce Rapid Refreshes
**Description:** Prevent overlapping refresh operations
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** REFRESH-001
**Acceptance Criteria:**
- [ ] Tracks if refresh is in progress
- [ ] Ignores new refresh requests if one is running
- [ ] Queues at most one pending refresh
- [ ] Executes queued refresh after current completes
- [ ] Prevents UI thrashing from rapid updates
- [ ] Debug logging shows debounced requests

### OPT-002: Async/Await Optimization
**Description:** Ensure proper async handling to avoid blocking
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** REFRESH-001, REFRESH-002
**Acceptance Criteria:**
- [ ] All git operations use async/await properly
- [ ] No synchronous blocking in UI rendering
- [ ] Error handling uses try/catch blocks
- [ ] Promise rejections handled gracefully
- [ ] Loading states shown during async operations
- [ ] UI remains responsive during operations

### ERROR-001: Error State Rendering
**Description:** Implement clear error display in repository items
**Files:** `src/ui/StatusPanelView.ts`
**Dependencies:** RENDER-002
**Acceptance Criteria:**
- [ ] Error icon shown for repositories with fetchStatus === 'error'
- [ ] Error message displayed (not raw git output)
- [ ] Hover tooltip shows more detail if available
- [ ] Retry button available for failed repositories
- [ ] Error state visually distinct from normal state
- [ ] Errors don't prevent other repositories from displaying
- [ ] Clear error messages guide user to resolution

### A11Y-001 [P]: Accessibility Implementation
**Description:** Add accessibility features to status panel
**Files:** `src/ui/StatusPanelView.ts`, `styles.css`
**Dependencies:** RENDER-002, STYLE-001
**Acceptance Criteria:**
- [ ] All interactive elements have ARIA labels
- [ ] Status indicators have aria-label attributes
- [ ] Keyboard navigation works for all controls
- [ ] Focus states visible and clear
- [ ] Screen reader announces status changes
- [ ] Color is not the only indicator (icons + text)
- [ ] Contrast ratios meet WCAG AA standards

### THEME-001 [P]: Theme Testing
**Description:** Verify styles work in light and dark themes
**Files:** `styles.css`
**Dependencies:** STYLE-001
**Acceptance Criteria:**
- [ ] All colors use Obsidian CSS variables
- [ ] Panel readable in light mode
- [ ] Panel readable in dark mode
- [ ] Status indicators visible in both themes
- [ ] Error states clear in both themes
- [ ] Icons render correctly in both themes
- [ ] No hardcoded colors that clash with themes

### CMD-001: Keyboard Shortcuts
**Description:** Register keyboard commands for status panel
**Files:** `src/main.ts`
**Dependencies:** BTN-001, ARCH-003
**Acceptance Criteria:**
- [ ] "Refresh status" command registered
- [ ] "Toggle status panel" command registered
- [ ] Commands have default hotkeys (user can customize)
- [ ] Commands work from any Obsidian context
- [ ] Commands provide feedback on execution
- [ ] Commands documented in README

## Phase 6: Testing & Documentation

### TEST-002: View Lifecycle Tests
**Description:** Create unit tests for StatusPanelView lifecycle
**Files:** `test/ui/StatusPanelView.test.ts`
**Dependencies:** ARCH-002, POLL-002
**Acceptance Criteria:**
- [ ] Test onOpen() initializes properly
- [ ] Test onClose() cleans up resources
- [ ] Test polling starts on open
- [ ] Test polling stops on close
- [ ] Test no memory leaks on close
- [ ] Mock dependencies properly
- [ ] All tests passing

### TEST-003: Rendering Tests
**Description:** Create unit tests for status rendering methods
**Files:** `test/ui/StatusPanelView.test.ts`
**Dependencies:** RENDER-001, RENDER-002
**Acceptance Criteria:**
- [ ] Test renderStatuses() with empty data
- [ ] Test renderStatuses() with multiple repositories
- [ ] Test renderRepositoryStatus() with various status states
- [ ] Test error state rendering
- [ ] Test loading state rendering
- [ ] Mock DOM elements properly
- [ ] All tests passing

### TEST-004: Integration Tests
**Description:** Create integration tests for status panel with real services
**Files:** `test/integration/status-panel.test.ts`
**Dependencies:** All implementation tasks
**Acceptance Criteria:**
- [ ] Test status panel with real GitCommandService
- [ ] Test refresh operations end-to-end
- [ ] Test event-driven updates
- [ ] Test polling behavior
- [ ] Test with multiple repositories
- [ ] Test error scenarios
- [ ] All tests passing

### MANUAL-001: Manual Testing Checklist
**Description:** Create and execute manual testing checklist
**Files:** `specs/1-multi-git-core/fr4/manual-testing-checklist.md`
**Dependencies:** All implementation tasks
**Acceptance Criteria:**
- [ ] Comprehensive test scenarios documented
- [ ] Test panel open/close behavior
- [ ] Test status display accuracy
- [ ] Test refresh operations
- [ ] Test with various repository states
- [ ] Test error scenarios
- [ ] Test on macOS, Windows, Linux
- [ ] All manual tests pass

### DOC-001: Code Documentation
**Description:** Add comprehensive JSDoc comments to all public methods
**Files:** `src/ui/StatusPanelView.ts`, `src/services/GitCommandService.ts`
**Dependencies:** All implementation tasks
**Acceptance Criteria:**
- [ ] All public methods have JSDoc comments
- [ ] Parameters and return types documented
- [ ] Complex logic has inline comments
- [ ] Error cases documented
- [ ] Examples provided for non-obvious usage
- [ ] TypeScript types fully leverage JSDoc

### DOC-002: User Documentation
**Description:** Update README and documentation with status panel usage
**Files:** `README.md`, `docs/architecture.md`
**Dependencies:** All implementation tasks
**Acceptance Criteria:**
- [ ] README explains how to open status panel
- [ ] Status indicators meaning documented
- [ ] Keyboard shortcuts listed
- [ ] Screenshots included (if applicable)
- [ ] Troubleshooting section updated
- [ ] Architecture docs updated with StatusPanelView
- [ ] Status update flow documented

### QA-001: Code Quality Check
**Description:** Run linting and ensure code style consistency
**Files:** All source files
**Dependencies:** All implementation tasks
**Acceptance Criteria:**
- [ ] ESLint passes with no errors
- [ ] No console.log statements (use logger utility)
- [ ] Consistent code formatting
- [ ] No TypeScript errors or warnings
- [ ] Unused imports removed
- [ ] Code follows existing patterns

### VAL-001: Acceptance Criteria Validation
**Description:** Verify all FR-4 acceptance criteria are met
**Files:** `specs/1-multi-git-core/fr4/validation-report.md`
**Dependencies:** All implementation tasks, MANUAL-001
**Acceptance Criteria:**
- [ ] Plugin adds ribbon icon that toggles status panel ✓
- [ ] Status panel displays list of all configured repositories ✓
- [ ] Can see which repositories have uncommitted changes ✓
- [ ] Can see which repositories have unpushed commits ✓
- [ ] Can see which repositories have remote changes available ✓
- [ ] Status updates within 30 seconds of changes ✓
- [ ] Can view branch and last commit message per repository ✓
- [ ] Panel supports manual refresh action ✓
- [ ] Validation report documents all findings

## Task Dependencies

### Critical Path
ENV-001 → ARCH-001 → ARCH-002 → ARCH-003 → REFRESH-001 → RENDER-001 → RENDER-002 → POLL-001 → TEST-002 → MANUAL-001 → VAL-001

**Critical Path Duration:** Approximately 20-24 hours of focused development

### Parallel Execution Groups

**Group 1: Foundation (after ARCH-001)**
- ARCH-004 (Status Panel State)
- DATA-001 (Interface Extension)

**Group 2: Git Commands (after DATA-001)**
- GIT-001 (Unpushed Commits)
- GIT-002 (Remote Changes)
→ Both merge into GIT-003

**Group 3: UI Components (after RENDER-002)**
- STYLE-001 (CSS)
- ICON-001 (Icons)
- ERROR-001 (Error Display)

**Group 4: Events (after REFRESH-002)**
- EVENT-001 (Fetch Integration)
- EVENT-002 (Commit/Push Integration)

**Group 5: Polish (after RENDER-002)**
- A11Y-001 (Accessibility)
- THEME-001 (Theme Testing)

**Group 6: Testing (after implementation complete)**
- TEST-002 (Lifecycle Tests)
- TEST-003 (Rendering Tests)
- TEST-004 (Integration Tests)

**Group 7: Documentation (after testing)**
- DOC-001 (Code Documentation)
- DOC-002 (User Documentation)

## Progress Tracking

### Phase Completion Checklist

- [x] **Phase 0: Setup** (1 task)
  - [x] ENV-001

- [x] **Phase 1: Foundation** (4 tasks)
  - [x] ARCH-001, ARCH-002, ARCH-003, ARCH-004

- [ ] **Phase 2: Core Features** (5 tasks)
  - [ ] DATA-001, GIT-001, GIT-002, GIT-003, TEST-001

- [ ] **Phase 3: Integration** (11 tasks)
  - [ ] UI-001, REFRESH-001, REFRESH-002, RENDER-001, RENDER-002
  - [ ] STYLE-001, ICON-001, EVENT-001, EVENT-002, API-001

- [ ] **Phase 4: Status Updates** (3 tasks)
  - [ ] POLL-001, POLL-002, BTN-001

- [ ] **Phase 5: Polish** (8 tasks)
  - [ ] OPT-001, OPT-002, ERROR-001, A11Y-001, THEME-001, CMD-001

- [ ] **Phase 6: Testing & Documentation** (10 tasks)
  - [ ] TEST-002, TEST-003, TEST-004, MANUAL-001
  - [ ] DOC-001, DOC-002, QA-001, VAL-001

### Overall Progress: 5/42 tasks complete (12%)

---

**Next Steps:**
1. Begin with ENV-001 to set up project structure
2. Proceed through Phase 1 to establish foundation
3. Implement core git command extensions in Phase 2
4. Build UI and integration in Phase 3
5. Add polling and polish in Phases 4-5
6. Complete testing and documentation in Phase 6
7. Create validation report confirming all FR-4 acceptance criteria met
