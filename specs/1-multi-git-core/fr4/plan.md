# Implementation Plan: Repository Status Display (FR-4)

**Created:** 2025-12-14
**Specification:** [../spec.md](../spec.md)
**Status:** Planning
**Feature:** Multi-Git Core for Obsidian
**Requirement:** FR-4: Repository Status Display
**Tasks:** TBD (will create tasks.md after plan approval)

## Technical Context

### Architecture Decisions

#### Core Technology Stack
- **UI Framework:** Obsidian ItemView for sidebar panels
  - **Rationale:** ItemView is the standard way to create sidebar panels in Obsidian, integrates seamlessly with ribbon and workspace
  - **Alternatives Considered:**
    - Modal dialog: Not appropriate for persistent status display
    - Custom floating panel: Would require extensive custom positioning logic
  - **Trade-offs:** Pro: Native integration, automatic state persistence, standard UX. Con: Limited to sidebar placement

- **Status Updates:** Event-driven architecture with interval-based refresh
  - **Rationale:** Combines reactive updates (when operations complete) with polling (for external changes)
  - **Alternatives Considered:**
    - Pure polling: Would miss immediate feedback on user actions
    - Pure event-driven: Would miss external git operations
    - File system watchers: Too resource-intensive, platform-specific issues
  - **Trade-offs:** Pro: Balance of responsiveness and resource usage. Con: 30s polling adds minimal overhead

- **State Management:** In-memory cache with periodic git status checks
  - **Rationale:** Minimizes git command execution, provides instant UI updates
  - **Alternatives Considered:**
    - Always query git: Too slow, blocks UI
    - Only cache: Would miss external changes
  - **Trade-offs:** Pro: Fast UI, efficient resource usage. Con: Requires cache invalidation logic

#### UI Technology
- **Rendering:** Direct DOM manipulation with Obsidian's setIcon API
  - **Rationale:** Obsidian plugins use direct DOM, no virtual DOM framework
  - **Alternatives Considered:** None - this is the Obsidian way
  - **Trade-offs:** Pro: No dependencies, fast, standard. Con: More verbose than frameworks

- **Styling:** CSS with Obsidian theme variables
  - **Rationale:** Ensures consistency with Obsidian theme and automatic light/dark mode
  - **Alternatives Considered:** Custom theme-independent styles would clash with user themes
  - **Trade-offs:** Pro: Theme-aware, accessible. Con: Must use Obsidian's color palette

### Technology Stack Rationale

#### Why ItemView for Status Panel?
- **Requirement:** Persistent sidebar panel that users can toggle
- **Benefit:** Built-in workspace integration, state management, standard UX patterns
- **Constraint:** Must follow Obsidian's view lifecycle (onOpen, onClose)

#### Why Polling + Events for Updates?
- **Requirement:** Updates within 30 seconds, but also immediate feedback
- **Benefit:** Catches both user operations and external git changes
- **Constraint:** Must balance responsiveness with resource usage

#### Why In-Memory Status Cache?
- **Requirement:** Fast UI updates, no blocking on git operations
- **Benefit:** Instant panel rendering, reduces git command overhead
- **Constraint:** Requires careful cache invalidation to stay accurate

### Integration Points

#### Obsidian Workspace Integration
- **Ribbon icon:** Register view in workspace, add toggle icon to left/right ribbon
- **View lifecycle:** Implement onOpen() and onClose() for proper cleanup
- **State persistence:** Workspace handles view open/close state automatically

#### Existing Services Integration
- **GitCommandService:** Use existing getRepositoryStatus() for status checks
- **RepositoryConfigService:** Access configured repositories
- **FetchSchedulerService:** Hook into fetch completion events for status updates
- **NotificationService:** Show status-related notifications when appropriate

#### Status Update Triggers
- **User actions:** After commit/push operations complete
- **Fetch completion:** After automated or manual fetch operations
- **Manual refresh:** User-triggered refresh button in panel
- **Periodic poll:** Every 30 seconds for external changes

### Security Considerations
- **Git operations:** Use existing sanitized GitCommandService methods
- **No credentials:** Status display only reads data, no authentication needed
- **Path validation:** All paths already validated by RepositoryConfigService

## Constitution Check

### Principle Compliance Review

#### Principle 1: Specification-First Development
- **Requirement:** All features must begin with clear specification before implementation
- **Plan Alignment:** This plan implements FR-4 from approved specification
- **Validation:** Spec exists at `../spec.md` with complete acceptance criteria for FR-4

#### Principle 2: Iterative Simplicity
- **Requirement:** Start with minimal viable implementation
- **Plan Alignment:**
  - Focuses solely on FR-4 (status display)
  - Minimal UI: sidebar panel with list view, refresh button
  - Uses existing services for all git operations
  - No advanced features like interactive branching or history viewing
- **Validation:** Implementation includes only features explicitly required by FR-4 acceptance criteria

#### Principle 3: Documentation as Context
- **Requirement:** Code and decisions documented for future work and AI assistance
- **Plan Alignment:**
  - This plan documents all technical decisions with rationale
  - Code will include TSDoc comments for all public interfaces
  - UI components documented with usage examples
  - Architecture decisions recorded with alternatives considered
- **Validation:** Plan follows template with complete decision documentation

### Quality Gates
- [x] All constitutional MUST requirements addressed
- [x] Non-negotiable principles not violated
- [x] Quality standards and practices followed
- [x] Compliance requirements satisfied

**Gate Evaluation:** PASS

## Phase 0: Research & Architecture

### Technology Research Tasks

No additional research required for FR-4. All technology decisions are informed by existing implementation:

1. **Obsidian ItemView:** Well-documented at https://docs.obsidian.md/Plugins/User+interface/Views
   - Used for custom sidebar views
   - Clear lifecycle methods
   - Examples in community plugins

2. **Ribbon Icons:** Standard Obsidian API
   - `addRibbonIcon()` method
   - Icon registry for built-in icons
   - Custom SVG icons if needed

3. **Status Polling:** Standard setInterval pattern
   - Already used in FetchSchedulerService
   - Clear cleanup pattern established

### Architecture Investigation

No complex architecture decisions needed for FR-4. This extends existing patterns:
- ItemView for panel UI (Obsidian standard)
- Service integration for data access (established pattern)
- Event-driven + polling for updates (hybrid approach, proven effective)
- CSS styling with theme variables (existing pattern)

### Research Deliverables

✅ No research.md needed - all decisions are clear from existing architecture and Obsidian patterns.

## Phase 1: Design & Contracts

### Data Model Design

#### Entity: Repository Status (Already Exists)

```typescript
// Existing from GitCommandService - no changes needed
interface RepositoryStatus {
  id: string;
  name: string;
  path: string;
  branch: string | null;
  hasUncommittedChanges: boolean;
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
  lastCommitMessage: string | null;
  // New properties for FR-4:
  unpushedCommits?: number;      // Count of commits ahead of remote
  remoteChanges?: number;         // Count of commits behind remote
  fetchStatus?: 'success' | 'error' | 'pending';
  lastFetchTime?: number;         // Unix timestamp
  lastFetchError?: string;        // Error message if fetch failed
}
```

#### Entity: Status Panel State

```typescript
interface StatusPanelState {
  // Cached status for each repository
  statuses: Map<string, RepositoryStatus>;
  
  // UI state
  isRefreshing: boolean;
  lastRefreshTime: number;
  
  // Filtering/sorting (future enhancement, not in FR-4)
  // filter?: 'all' | 'changes' | 'errors';
  // sortBy?: 'name' | 'status' | 'lastCommit';
}
```

**Entity Relationships:**
- StatusPanel → RepositoryStatus: One-to-Many (panel displays multiple statuses)
- RepositoryStatus extends existing interface from GitCommandService

**State Transitions:**
```
[Panel Closed] → Open → [Panel Open, Empty]
[Panel Open, Empty] → Load → [Panel Open, Loading]
[Panel Open, Loading] → Refresh Complete → [Panel Open, Loaded]
[Panel Open, Loaded] → Refresh → [Panel Open, Loading]
[Panel Open, *] → Close → [Panel Closed]
```

**Update Rules:**
- Status updates on: manual refresh, fetch completion, commit/push completion
- Polling every 30 seconds when panel is open
- Stop polling when panel is closed (resource conservation)
- Cache invalidation on any git operation completion

### API Contract Generation

#### Status Panel View API

```typescript
/**
 * ItemView for displaying repository status in sidebar
 */
export class StatusPanelView extends ItemView {
  /**
   * Get unique view type identifier
   */
  getViewType(): string;
  
  /**
   * Get display text for view
   */
  getDisplayText(): string;
  
  /**
   * Get icon identifier for view
   */
  getIcon(): string;
  
  /**
   * Called when view is opened
   */
  async onOpen(): Promise<void>;
  
  /**
   * Called when view is closed
   */
  async onClose(): Promise<void>;
  
  /**
   * Refresh all repository statuses
   */
  async refreshAll(): Promise<void>;
  
  /**
   * Refresh single repository status
   * @param repoId - Repository identifier
   */
  async refreshRepository(repoId: string): Promise<void>;
  
  /**
   * Update UI with current status data
   */
  private renderStatuses(): void;
  
  /**
   * Render a single repository status item
   * @param status - Repository status data
   * @param container - Parent element
   */
  private renderRepositoryStatus(
    status: RepositoryStatus,
    container: HTMLElement
  ): void;
  
  /**
   * Start periodic status polling
   */
  private startPolling(): void;
  
  /**
   * Stop periodic status polling
   */
  private stopPolling(): void;
}
```

#### GitCommandService Extensions

```typescript
/**
 * Extensions to existing GitCommandService for FR-4
 */
class GitCommandService {
  /**
   * Get count of commits ahead of remote
   * @param path - Repository path
   * @param branch - Branch name (defaults to current)
   * @returns Number of unpushed commits
   */
  async getUnpushedCommitCount(
    path: string,
    branch?: string
  ): Promise<number>;
  
  /**
   * Get count of commits behind remote
   * @param path - Repository path
   * @param branch - Branch name (defaults to current)
   * @returns Number of commits remote is ahead
   */
  async getRemoteChangeCount(
    path: string,
    branch?: string
  ): Promise<number>;
  
  /**
   * Get extended repository status including remote tracking
   * @param path - Repository path
   * @param id - Repository ID
   * @param name - Repository name
   * @returns Full status including remote tracking info
   */
  async getExtendedRepositoryStatus(
    path: string,
    id: string,
    name: string
  ): Promise<RepositoryStatus>;
}
```

#### Plugin Integration API

```typescript
/**
 * Plugin methods for status panel integration
 */
class MultiGitPlugin extends Plugin {
  statusPanelView: StatusPanelView | null;
  
  /**
   * Register status panel view type and ribbon icon
   */
  private registerStatusPanel(): void;
  
  /**
   * Activate status panel view (open in sidebar)
   */
  async activateStatusPanel(): Promise<void>;
  
  /**
   * Deactivate status panel view (close)
   */
  async deactivateStatusPanel(): Promise<void>;
  
  /**
   * Notify status panel of repository changes
   * @param repoId - Repository that changed (optional, refresh all if not provided)
   */
  notifyRepositoryChanged(repoId?: string): void;
}
```

#### Error Handling

```typescript
/**
 * Errors specific to status panel operations
 */
class StatusPanelError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'StatusPanelError';
  }
}

/**
 * Thrown when view registration fails
 */
class ViewRegistrationError extends StatusPanelError {
  constructor(message: string) {
    super(message, 'VIEW_REGISTRATION_ERROR');
  }
}

/**
 * Thrown when status refresh fails
 */
class StatusRefreshError extends StatusPanelError {
  constructor(
    message: string,
    public repositoryId?: string
  ) {
    super(message, 'STATUS_REFRESH_ERROR');
  }
}
```

**Error Response Patterns:**
- Status refresh errors: Log to console (if debug mode), show inline error state in UI
- View registration errors: Show Notice modal, disable status panel feature
- Individual repository errors: Show error state in repository item, don't block other repositories

### Development Environment Setup

#### Prerequisites
- Already established in FR-1, FR-2, FR-3
- No new dependencies required

#### Project Structure Extensions
```
multi-git/
├── src/
│   ├── ui/
│   │   └── StatusPanelView.ts    # NEW: Status panel implementation
│   ├── services/
│   │   └── GitCommandService.ts  # EXTEND: Add remote tracking methods
│   └── main.ts                   # EXTEND: Register status panel
├── styles.css                    # EXTEND: Add status panel styles
└── test/
    └── ui/
        └── StatusPanelView.test.ts  # NEW: Status panel tests
```

#### Build Configuration
No changes needed - existing esbuild configuration handles new files.

## Implementation Readiness Validation

### Technical Completeness Check
- [x] All technology choices made and documented
- [x] Data model covers all functional requirements
- [x] API contracts support all user scenarios
- [x] Security requirements addressed (read-only operations)
- [x] Performance considerations documented (30s polling, stop when closed)
- [x] Integration points defined (ItemView, services, ribbon)
- [x] Development environment specified

### Quality Validation
- [x] Architecture supports scalability requirements (efficient polling, cached state)
- [x] Security model matches threat analysis (read-only, uses existing services)
- [x] Data model supports all business rules (status display, updates, errors)
- [x] API design follows established patterns (ItemView lifecycle, service integration)
- [x] Documentation covers all major decisions

### Constitution Alignment Re-check
- [x] All principles still satisfied
- [x] No new violations introduced
- [x] Quality gates still passing
- [x] Compliance requirements met

**Final Validation:** ✅ PASS - Ready for task breakdown

## Implementation Phases

### Phase 1: Core Status Panel View

**Goal:** Create basic ItemView with panel structure and lifecycle

**Tasks:**
1. **Create StatusPanelView class**
   - Extend ItemView from Obsidian API
   - Implement getViewType() returning unique identifier
   - Implement getDisplayText() returning "Multi-Git Status"
   - Implement getIcon() returning appropriate icon name

2. **Implement view lifecycle**
   - Implement onOpen() to initialize panel UI
   - Implement onClose() to cleanup (stop polling, clear cache)
   - Create container element structure
   - Add header with title and refresh button

3. **Register view with plugin**
   - Register view type in main.ts onload()
   - Add ribbon icon for panel toggle
   - Implement activateStatusPanel() to show/hide view
   - Handle view state persistence

4. **Basic panel UI structure**
   - Create empty state message
   - Create loading state indicator
   - Create repository list container
   - Add refresh all button

**Acceptance:**
- Panel opens/closes from ribbon icon
- Panel displays in sidebar (left or right)
- Empty state shows when no repositories
- Panel persists state across Obsidian restarts

### Phase 2: GitCommandService Extensions

**Goal:** Add remote tracking information to git operations

**Tasks:**
1. **Implement getUnpushedCommitCount()**
   - Execute `git rev-list @{u}..HEAD --count`
   - Parse output to integer
   - Handle case where no upstream branch exists
   - Return 0 if no upstream

2. **Implement getRemoteChangeCount()**
   - Execute `git rev-list HEAD..@{u} --count`
   - Parse output to integer
   - Handle case where no upstream branch exists
   - Return 0 if no upstream

3. **Extend getRepositoryStatus()**
   - Call getUnpushedCommitCount() for unpushedCommits field
   - Call getRemoteChangeCount() for remoteChanges field
   - Add fetchStatus, lastFetchTime fields (from settings/cache)
   - Handle errors gracefully (don't fail entire status on remote errors)

4. **Unit tests**
   - Test unpushed commit count detection
   - Test remote change count detection
   - Test handling of detached HEAD
   - Test handling of no upstream branch
   - Test error scenarios

**Acceptance:**
- Can detect commits ahead of remote
- Can detect commits behind remote
- Handles repositories without remotes gracefully
- All tests passing

### Phase 3: Status Data Management

**Goal:** Implement status caching and update logic

**Tasks:**
1. **Create StatusPanelState class**
   - Maintain Map<string, RepositoryStatus> for cached statuses
   - Track isRefreshing boolean
   - Track lastRefreshTime timestamp
   - Provide methods to get/set/clear cache

2. **Implement refreshAll() method**
   - Set isRefreshing = true, update UI
   - Get all enabled repositories
   - Call getExtendedRepositoryStatus() for each
   - Update cache with results
   - Handle partial failures (some repos succeed, some fail)
   - Set isRefreshing = false, update UI
   - Update lastRefreshTime

3. **Implement refreshRepository() method**
   - Set repository to loading state in UI
   - Call getExtendedRepositoryStatus() for single repo
   - Update cache for that repository
   - Update UI for that repository item
   - Handle errors without affecting other repositories

4. **Status update triggers**
   - Hook into FetchSchedulerService completion events
   - Hook into commit/push completion in main.ts
   - Create notifyRepositoryChanged() method in plugin
   - Wire up event handlers

**Acceptance:**
- Status cache maintains latest data
- Refresh updates all repositories
- Individual refresh works per repository
- Events trigger appropriate refreshes
- Partial failures handled gracefully

### Phase 4: Status Display UI

**Goal:** Render repository status information in panel

**Tasks:**
1. **Implement renderStatuses() method**
   - Clear repository list container
   - Show loading state if isRefreshing
   - Show empty state if no repositories
   - Iterate cached statuses, call renderRepositoryStatus() for each
   - Update last refresh time display

2. **Implement renderRepositoryStatus() method**
   - Create repository item container with classes
   - Add repository name as header
   - Add branch info (or "detached HEAD")
   - Add status indicators:
     - Uncommitted changes indicator (if hasUncommittedChanges)
     - Unpushed commits count (if > 0)
     - Remote changes count (if > 0)
   - Add last commit message (truncated if long)
   - Add error state if fetchStatus === 'error'
   - Style appropriately based on status

3. **Add icons and visual indicators**
   - Use Obsidian's setIcon() for status icons
   - Uncommitted changes: yellow dot or icon
   - Unpushed commits: up arrow with count
   - Remote changes: down arrow with count
   - Error state: red icon with hover tooltip

4. **Responsive layout**
   - Handle narrow sidebar widths
   - Truncate long repository names with ellipsis
   - Wrap status indicators to next line if needed
   - Ensure readable on mobile

**Acceptance:**
- All repository statuses displayed
- Status indicators visible and clear
- Icons render correctly
- Layout works in narrow sidebars
- Text doesn't overflow

### Phase 5: Status Polling and Updates

**Goal:** Implement automatic status updates

**Tasks:**
1. **Implement startPolling() method**
   - Create setInterval with 30-second interval
   - Call refreshAll() on each interval
   - Store interval ID for cleanup
   - Only poll when panel is open

2. **Implement stopPolling() method**
   - Clear interval using stored ID
   - Set interval ID to null
   - Call in onClose()

3. **Wire up manual refresh**
   - Add refresh button click handler
   - Call refreshAll() on click
   - Disable button while refreshing
   - Show loading indicator

4. **Optimize polling behavior**
   - Don't poll if no repositories configured
   - Skip poll if manual refresh in progress
   - Log polling activity in debug mode

**Acceptance:**
- Status updates every 30 seconds
- Polling stops when panel closed
- Manual refresh works correctly
- No overlapping refresh operations
- Debug logs show polling activity

### Phase 6: Integration and Polish

**Goal:** Complete integration with existing features and polish UX

**Tasks:**
1. **Hook into fetch events**
   - Listen for fetch completion in FetchSchedulerService
   - Update affected repository status
   - Show notification if panel is closed but changes detected

2. **Hook into commit/push events**
   - Update status after successful commit/push
   - Clear uncommitted changes indicator
   - Update unpushed commits count

3. **Add keyboard shortcuts**
   - Register "Refresh status" command
   - Register "Toggle status panel" command
   - Document shortcuts in README

4. **Error handling polish**
   - Clear error messages on successful refresh
   - Add retry button for failed repositories
   - Show helpful error messages (not raw git output)

5. **Performance optimization**
   - Debounce rapid refresh calls
   - Cancel in-flight refreshes if new one starts
   - Use async/await properly to avoid blocking

6. **Visual polish**
   - Add hover states to repository items
   - Add smooth transitions for state changes
   - Ensure accessibility (ARIA labels, keyboard nav)
   - Test in light and dark modes

**Acceptance:**
- Integrates seamlessly with existing features
- Keyboard shortcuts work
- Error handling is robust
- Performance is smooth
- UI is polished and accessible

### Phase 7: Testing and Documentation

**Goal:** Complete testing and documentation

**Tasks:**
1. **Unit tests**
   - Test StatusPanelView lifecycle methods
   - Test renderStatuses() with various data
   - Test error handling
   - Test polling start/stop

2. **Integration tests**
   - Test with real repositories
   - Test status updates after git operations
   - Test panel open/close state persistence
   - Test with multiple repositories

3. **Manual testing checklist**
   - Create comprehensive manual test scenarios
   - Test on macOS, Windows, Linux
   - Test various repository states
   - Test error scenarios

4. **User documentation**
   - Update README with status panel usage
   - Document status indicators meaning
   - Add troubleshooting section
   - Include screenshots

5. **Architecture documentation**
   - Update docs/architecture.md with StatusPanelView
   - Document status update flow
   - Add extension points for future enhancements

6. **Code quality**
   - Add JSDoc comments to all public methods
   - Run ESLint and fix any issues
   - Ensure consistent code style
   - Remove any debug logging

**Acceptance:**
- All unit tests passing
- Integration tests passing
- Manual testing checklist complete
- Documentation complete and accurate
- Code passes all quality checks

## Risk Assessment

### Technical Risks

#### Medium Risk: Performance with Many Repositories
- **Impact:** UI could become slow with 20+ repositories
- **Likelihood:** Medium (some users may have many repos)
- **Mitigation:**
  - Implement virtual scrolling if needed (future enhancement)
  - Optimize git commands to run in parallel
  - Cache status data aggressively
  - Make polling interval configurable
- **Contingency:** Add filtering to show only active repositories

#### Medium Risk: Git Command Overhead
- **Impact:** Many git status commands could slow down system
- **Likelihood:** Medium (30s polling + event-driven updates)
- **Mitigation:**
  - Use efficient git commands (git status --porcelain)
  - Run commands in parallel where possible
  - Cache results and only refresh on changes
  - Stop polling when panel closed
- **Contingency:** Increase polling interval, add "pause updates" option

#### Low Risk: Status Display Inaccuracy
- **Impact:** UI shows stale data after external git operations
- **Likelihood:** Low (30s refresh catches most changes)
- **Mitigation:**
  - 30-second polling provides regular updates
  - Manual refresh always available
  - Clear timestamp showing last refresh time
- **Contingency:** Add file system watcher (future enhancement)

#### Low Risk: Cross-Platform Rendering Issues
- **Impact:** Panel might not render correctly on all platforms
- **Likelihood:** Low (Obsidian ItemView is cross-platform)
- **Mitigation:**
  - Use Obsidian's standard UI components
  - Test on all platforms
  - Use Obsidian theme variables for colors
- **Contingency:** Platform-specific CSS if needed

### Dependencies and Assumptions

#### External Dependencies
- **Obsidian ItemView API:** Stable API, unlikely to change
- **Git CLI:** Already dependency for entire plugin
- **Existing Services:** GitCommandService, RepositoryConfigService

#### Technical Assumptions
- ItemView API supports required features
- Git commands return expected output format
- 30-second polling is acceptable for users
- Sidebar width is sufficient for status display

#### Business Assumptions
- Users want persistent status visibility
- Users understand git concepts (branch, commit, push)
- Status indicators are intuitive
- Manual refresh is acceptable fallback

## Next Phase Preparation

### Task Breakdown Readiness
- [x] Clear technology choices and architecture
- [x] Complete data model and API specifications
- [x] Development environment and tooling defined
- [x] Quality standards and testing approach specified
- [x] Integration requirements and dependencies clear

### Implementation Prerequisites

#### Development Environment
- [x] Already established from FR-1, FR-2, FR-3
- [x] No new dependencies required

#### Technical Architecture
- [x] ItemView structure defined
- [x] Service extensions specified
- [x] UI components documented
- [x] Update mechanisms planned

#### Quality Assurance
- [x] Unit testing approach defined
- [x] Integration testing plan established
- [x] Manual testing strategy outlined
- [x] Performance considerations documented

#### Documentation
- [x] Technical decisions documented
- [x] API contracts specified
- [x] User-facing documentation planned

### Ready for Implementation
✅ All prerequisites met. Ready to break down into specific implementation tasks.

---

**Next Steps:**
1. Break down phases into specific tasks with time estimates (create tasks.md)
2. Begin Phase 1 implementation
3. Use TDD approach: write tests first, then implementation
4. Manual testing in Obsidian after each phase
