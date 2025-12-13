# Implementation Plan: FR-3 Hotkey-Driven Push Operations

**Created:** 2025-12-14
**Specification:** [specs/1-multi-git-core/spec.md](../spec.md#fr-3-hotkey-driven-push-operations)
**Status:** Complete

## Technical Context

### Architecture Decisions

**UI Framework:** Obsidian Modal API
- **Decision:** Use Obsidian's built-in Modal class for dialogs
- **Rationale:** Consistent with Obsidian's design patterns, no additional dependencies, familiar to users
- **Alternatives Considered:** Custom HTML/CSS dialogs (unnecessary complexity)
- **Trade-offs:** Limited to Obsidian's modal capabilities, but sufficient for requirements

**Command Registration:** Obsidian Command API
- **Decision:** Register commands using Obsidian's addCommand() API with hotkey support
- **Rationale:** Native hotkey binding, appears in command palette, standard Obsidian UX
- **Alternatives Considered:** Custom keyboard event listeners (poor integration)
- **Trade-offs:** Dependent on Obsidian API, but this is expected for plugins

**Git Operations:** Extend GitCommandService
- **Decision:** Add commit, push, and status check methods to existing GitCommandService
- **Rationale:** Centralized git command execution, consistent error handling, already tested
- **Alternatives Considered:** New separate service (unnecessary duplication)
- **Trade-offs:** GitCommandService grows larger, but maintains single responsibility

**State Detection:** Real-time git status checks
- **Decision:** Check working tree status on-demand when hotkey triggered
- **Rationale:** Most accurate representation, avoids stale cached state
- **Alternatives Considered:** Background polling (adds complexity), cached state (may be stale)
- **Trade-offs:** Small delay when opening picker (<500ms), but ensures accuracy

**Commit Message Generation:** Smart defaults with user override
- **Decision:** Generate suggested commit message from changed files, allow full editing
- **Rationale:** Balances convenience with flexibility, reduces typing while maintaining control
- **Alternatives Considered:** Templates only (less convenient), auto-generate only (less flexible)
- **Trade-offs:** Suggestion algorithm may not always be ideal, but users can always edit

### Technology Stack Rationale

**TypeScript:** Already in use, type safety for UI state management

**Obsidian Modal API:** 
- **Decision:** Standard approach for plugin dialogs
- **Rationale:** Native look and feel, keyboard navigation, focus management handled
- **Trade-offs:** Limited customization, but sufficient for requirements

**Async/Await Pattern:**
- **Decision:** Continue using async/await for all git operations
- **Rationale:** Non-blocking UI, consistent with existing codebase
- **Trade-offs:** Must handle promise rejections carefully in UI context

### Integration Points

**Existing Services:**
- GitCommandService: Add commit, push, getStatus methods
- RepositoryConfigService: Query enabled repos with changes
- NotificationService: Display success/error feedback (if exists, or use Obsidian Notice)

**Obsidian APIs:**
- Command API: Register hotkey commands
- Modal API: Repository picker and commit dialog
- Notice API: User feedback notifications
- Setting Tab API: Hotkey configuration

**Security Considerations:**
- Validate repository paths before operations
- Sanitize commit messages (no shell injection)
- Confirm destructive operations (push is permanent)
- Respect git hooks (allow pre-commit/pre-push to run)

## Constitution Check

### Principle Compliance Review

**Principle 1: Specification-First Development**
- **Requirement:** All features must begin with clear specification before implementation
- **Plan Alignment:** This plan follows approved FR-3 specification with all requirements documented
- **Validation:** Spec exists at specs/1-multi-git-core/spec.md with complete FR-3 section

**Principle 2: Iterative Simplicity**
- **Requirement:** Start with minimal viable implementation
- **Plan Alignment:** Implementation covers core requirements only:
  - Single hotkey for commit+push workflow
  - Basic repository picker (no advanced filtering yet)
  - Simple commit message suggestions (no templates yet)
  - Essential error handling (no retry mechanisms yet)
- **Validation:** Out-of-scope items documented (batch operations, advanced templates, etc.)

**Principle 3: Documentation as Context**
- **Requirement:** Document code and decisions for future context
- **Plan Alignment:** 
  - This plan documents all architectural decisions with rationale
  - Code will include JSDoc comments for public APIs
  - Manual testing checklist will be created
  - User-facing documentation updates planned
- **Validation:** Documentation deliverables included in Phase 7

### Quality Gates

- [x] All constitutional MUST requirements addressed
- [x] Non-negotiable principles not violated
- [x] Quality standards and practices followed (testing, error handling)
- [x] Compliance requirements satisfied

**Gate Evaluation:** PASS ✓

## Phase 0: Research & Architecture

### Research Complete

All technical decisions can be made from existing codebase knowledge:
- ✅ Obsidian Modal API already used in existing codebase (AddRepositoryModal)
- ✅ Obsidian Command API documented and straightforward
- ✅ Git commit/push commands are standard and well-known
- ✅ Error handling patterns established in FR-2 implementation

**No additional research required.** Proceeding directly to design phase.

### Architecture Validation

**Existing Patterns to Follow:**
- Modal dialogs: Follow AddRepositoryModal pattern from FR-1
- Error handling: Use established error classes and Notice API
- Service methods: Follow async/await pattern from GitCommandService
- Testing: Follow existing Jest test patterns

**Integration Points Confirmed:**
- GitCommandService can be extended with new methods
- RepositoryConfigService already provides repo queries
- Main plugin can register commands in onload()
- Settings tab can be extended for hotkey configuration

## Phase 1: Design & Contracts

### Data Model Design

#### Entity: CommitOperation
Represents a commit+push operation in progress:

```typescript
interface CommitOperation {
    repositoryId: string;
    repositoryPath: string;
    repositoryName: string;
    commitMessage: string;
    status: 'preparing' | 'committing' | 'pushing' | 'success' | 'failed';
    error?: string;
}
```

**State Transitions:**
```
preparing → committing → pushing → success
         ↓              ↓          ↓
         └──────────────┴────────→ failed
```

#### Entity: RepositoryStatus
Extended status information for picker dialog:

```typescript
interface RepositoryStatus {
    repositoryId: string;
    repositoryName: string;
    repositoryPath: string;
    currentBranch: string;
    hasUncommittedChanges: boolean;
    changedFiles: string[];
    stagedFiles: string[];
    unstagedFiles: string[];
}
```

**Business Rules:**
- Only repositories with `hasUncommittedChanges === true` appear in picker
- Only enabled repositories are checked
- Repository must be valid git repo at time of operation

#### Entity: CommitMessageSuggestion
Algorithm for generating suggested commit messages:

```typescript
interface CommitMessageSuggestion {
    summary: string;        // First line (50 char max)
    details?: string[];     // Additional lines if needed
}
```

**Generation Rules:**
1. If single file changed: "Update [filename]"
2. If 2-3 files changed: "Update [file1], [file2], [file3]"
3. If 4+ files changed: "Update [N] files"
4. If only new files: "Add [filename]" or "Add [N] files"
5. If only deletions: "Remove [filename]" or "Remove [N] files"
6. Mixed operations: "Update [N] files"

### API Contracts

#### GitCommandService Extensions

**New Methods:**

```typescript
class GitCommandService {
    /**
     * Get detailed repository status including changed files
     */
    async getRepositoryStatus(path: string): Promise<RepositoryStatus>
    
    /**
     * Stage all changes in repository
     */
    async stageAllChanges(path: string): Promise<void>
    
    /**
     * Create commit with message
     */
    async createCommit(path: string, message: string): Promise<void>
    
    /**
     * Push commits to remote
     */
    async pushToRemote(
        path: string, 
        timeout?: number
    ): Promise<void>
    
    /**
     * Combined operation: stage all, commit, push
     */
    async commitAndPush(
        path: string,
        message: string,
        timeout?: number
    ): Promise<void>
}
```

**Error Types:**
- `GitCommitError`: Commit operation failed (extends RepositoryError)
- `GitPushError`: Push operation failed (extends RepositoryError)
- `GitStatusError`: Status check failed (extends RepositoryError)

**Git Commands Mapping:**
- `getRepositoryStatus`: `git status --porcelain` + `git branch --show-current`
- `stageAllChanges`: `git add -A`
- `createCommit`: `git commit -m "message"`
- `pushToRemote`: `git push` (respects default push behavior)
- `commitAndPush`: Sequential execution of above commands

#### UI Component Contracts

**RepositoryPickerModal:**
```typescript
class RepositoryPickerModal extends Modal {
    constructor(
        app: App,
        repositories: RepositoryStatus[],
        onSelect: (repo: RepositoryStatus) => void
    )
    
    onOpen(): void
    onClose(): void
}
```

**Behavior:**
- Display list of repositories with uncommitted changes
- Show repository name, branch, and change count
- Arrow key navigation, Enter to select
- Escape to cancel
- Display "No uncommitted changes" if list empty

**CommitMessageModal:**
```typescript
class CommitMessageModal extends Modal {
    constructor(
        app: App,
        repository: RepositoryStatus,
        suggestedMessage: string,
        onConfirm: (message: string) => Promise<void>
    )
    
    onOpen(): void
    onClose(): void
    private async handleSubmit(): Promise<void>
}
```

**Behavior:**
- Display repository name and branch
- Show list of changed files (max 10, then "and N more...")
- Text area pre-filled with suggested message
- Submit button (disabled while processing)
- Cancel button
- Enter in textarea = submit (Shift+Enter = newline)
- Display loading state during commit+push
- Display success/error feedback

### Command Registration Contract

**Command ID:** `multi-git:commit-push`

**Command Configuration:**
```typescript
{
    id: 'multi-git:commit-push',
    name: 'Commit and push changes',
    callback: async () => {
        // 1. Find repos with uncommitted changes
        // 2. Show picker modal
        // 3. On selection, generate commit message
        // 4. Show commit modal
        // 5. On confirmation, execute commit+push
        // 6. Show success/error notification
    }
}
```

**Default Hotkey:** None (user must configure)

### Development Environment Setup

**Prerequisites:**
- Existing Obsidian plugin development environment
- Node.js, npm, git already configured
- Test vault with multiple git repositories

**No additional setup required** - all infrastructure exists from FR-1, FR-2, FR-7.

### Agent Context Updates

**New Technologies/Patterns:**
- Obsidian Modal API usage patterns
- Multi-step modal workflows (picker → commit)
- Real-time git status checking
- Commit message generation heuristics

## Implementation Phases

### Phase 2: GitCommandService Extensions

**Tasks:**
1. Add `getRepositoryStatus()` method
   - Parse `git status --porcelain` output
   - Categorize files (staged, unstaged, untracked)
   - Get current branch name
   - Return RepositoryStatus object

2. Add `stageAllChanges()` method
   - Execute `git add -A`
   - Handle errors (permissions, etc.)

3. Add `createCommit()` method
   - Execute `git commit -m "message"`
   - Validate commit message not empty
   - Handle errors (nothing to commit, pre-commit hook failures)

4. Add `pushToRemote()` method
   - Execute `git push`
   - Respect configured timeout (default 60s)
   - Handle errors (auth, network, no upstream, etc.)

5. Add `commitAndPush()` method
   - Orchestrate: stage → commit → push
   - Stop on first error
   - Provide clear error context

**Testing:**
- Unit tests for each method (mocked git commands)
- Integration tests with real git repositories
- Error scenario tests
- Timeout tests

**Deliverable:** Extended GitCommandService with 5 new methods, 30+ tests

### Phase 3: Commit Message Generation

**Tasks:**
1. Create `CommitMessageService` class
   - `generateSuggestion(status: RepositoryStatus): CommitMessageSuggestion`
   - Implement file change analysis
   - Apply suggestion rules
   - Keep suggestions concise (<50 char summary)

2. Handle edge cases:
   - Empty repository (initial commit)
   - Binary files
   - Renamed files
   - Very long file names

**Testing:**
- Unit tests for various file change scenarios
- Test suggestion quality with real repos
- Edge case handling

**Deliverable:** CommitMessageService with suggestion algorithm, 15+ tests

### Phase 4: Repository Picker Modal

**Tasks:**
1. Create `RepositoryPickerModal` class extending `Modal`
   - Render list of repositories with changes
   - Display: name, branch, change count
   - Implement keyboard navigation
   - Handle empty state

2. Add styling in `styles.css`
   - Repository list styling
   - Selected item highlighting
   - Empty state message

3. Handle user interactions:
   - Click to select
   - Arrow keys to navigate
   - Enter to confirm
   - Escape to cancel

**Testing:**
- Manual testing in Obsidian (modal behavior)
- Unit tests for data formatting
- Accessibility testing (keyboard navigation)

**Deliverable:** RepositoryPickerModal component, CSS styling

### Phase 5: Commit Message Modal

**Tasks:**
1. Create `CommitMessageModal` class extending `Modal`
   - Display repository info (name, branch)
   - Show changed files list (max 10)
   - Render text area with suggested message
   - Add submit/cancel buttons
   - Implement loading state

2. Add styling in `styles.css`
   - Modal layout
   - File list styling
   - Button states (normal, loading, disabled)
   - Text area styling

3. Handle user interactions:
   - Edit commit message
   - Submit (Enter or button)
   - Cancel (Escape or button)
   - Prevent double submission
   - Show progress indicator

4. Handle operation result:
   - Success: Show success Notice, close modal
   - Error: Show error in modal, allow retry or cancel

**Testing:**
- Manual testing in Obsidian
- Unit tests for message validation
- Error handling tests

**Deliverable:** CommitMessageModal component, CSS styling

### Phase 6: Command Registration & Orchestration

**Tasks:**
1. Register command in `main.ts` onload():
   - Add `multi-git:commit-push` command
   - Implement callback orchestration
   - Handle errors at each step

2. Implement workflow:
   ```
   User triggers hotkey
   ↓
   Query enabled repos → getRepositoryStatus() for each
   ↓
   Filter repos with uncommitted changes
   ↓
   If none: Show "No uncommitted changes" Notice, exit
   ↓
   If one: Skip picker, go directly to commit modal
   ↓
   If multiple: Show RepositoryPickerModal
   ↓
   User selects repository
   ↓
   Generate commit message suggestion
   ↓
   Show CommitMessageModal with suggestion
   ↓
   User edits and confirms message
   ↓
   Execute commitAndPush()
   ↓
   Show success/error notification
   ```

3. Error handling:
   - GitCommandService errors → user-friendly messages
   - Network errors → suggest checking connection
   - Auth errors → suggest credential setup
   - Pre-commit hook failures → show hook output

4. Add settings UI:
   - Note about configuring hotkey in Obsidian settings
   - Optional: Push timeout configuration

**Testing:**
- End-to-end workflow testing
- Error scenario testing
- Multi-repository testing
- Hotkey registration testing

**Deliverable:** Complete command implementation, integrated workflow

### Phase 7: Documentation & Finalization

**Tasks:**
1. Create manual testing checklist
   - Test workflow with 0, 1, multiple repos
   - Test commit message suggestions
   - Test error scenarios
   - Test keyboard navigation

2. Update user documentation:
   - Update README.md with FR-3 features
   - Document hotkey configuration steps
   - Add troubleshooting section for push errors

3. Update architecture documentation:
   - Document new services and components
   - Update data flow diagrams
   - Document modal interaction patterns

4. Code quality:
   - Add JSDoc comments to all public APIs
   - Ensure consistent error messages
   - Review code for TypeScript best practices
   - Run linter and fix issues

**Testing:**
- Complete manual testing checklist
- Cross-platform testing (macOS, Windows, Linux)
- Performance testing (large repos, many files)

**Deliverable:** Complete documentation, manual testing checklist, validated implementation

## Implementation Readiness Validation

### Technical Completeness Check

- [x] All technology choices made and documented
- [x] Data model covers all functional requirements
- [x] API contracts support all user scenarios
- [x] Security requirements addressed (path validation, message sanitization)
- [x] Performance considerations documented (async operations, timeout handling)
- [x] Integration points defined (services, Obsidian APIs)
- [x] Development environment specified (no additional setup needed)

### Quality Validation

- [x] Architecture supports scalability requirements (handles multiple repos)
- [x] Security model addresses threats (no command injection, path validation)
- [x] Data model supports all business rules (status tracking, state transitions)
- [x] API design follows established patterns (consistent with FR-1, FR-2)
- [x] Documentation covers all major decisions
- [x] Error handling strategy defined and comprehensive

### Constitution Alignment Re-check

- [x] Principle 1 (Specification-First): Implementation based on approved spec
- [x] Principle 2 (Iterative Simplicity): Minimal viable implementation, no over-engineering
- [x] Principle 3 (Documentation as Context): Complete documentation plan included
- [x] All quality gates passing
- [x] No constitutional violations introduced

**Final Validation:** PASS ✓

## Risk Assessment

### Technical Risks

**High Risk:**
1. **Git push failures due to authentication**
   - **Impact:** Users cannot complete push operation, see error modal
   - **Likelihood:** Medium (various auth methods: SSH, HTTPS, tokens)
   - **Mitigation:** 
     - Clear error messages identifying auth issue
     - Link to credential setup documentation
     - Recommend using credential helpers (FR-7 helps here)
   - **Contingency:** Fall back to "changes committed locally" message, user can push manually

**Medium Risk:**
1. **Pre-commit/pre-push hooks failing**
   - **Impact:** Commit or push fails, user sees hook error output
   - **Likelihood:** Medium (many projects use hooks)
   - **Mitigation:**
     - Display hook output in error modal
     - Explain that hooks can be bypassed if needed
   - **Contingency:** Allow user to fix issues and retry via hotkey

2. **Network unavailable during push**
   - **Impact:** Push fails, changes committed locally but not pushed
   - **Likelihood:** Low-Medium (intermittent connectivity)
   - **Mitigation:**
     - Timeout with clear error message
     - Inform user changes are committed locally
     - Suggest retrying when online
   - **Contingency:** User can push manually or retry with hotkey

**Low Risk:**
1. **Large commit with many files causing timeout**
   - **Impact:** Push operation times out
   - **Likelihood:** Low (most commits are small)
   - **Mitigation:**
     - Configurable timeout (default 60s)
     - Show progress indication
   - **Contingency:** Increase timeout in settings if needed

2. **Modal UI issues or focus problems**
   - **Impact:** Poor UX, keyboard navigation not working
   - **Likelihood:** Low (Obsidian Modal API is mature)
   - **Mitigation:**
     - Thorough manual testing
     - Follow Obsidian modal best practices
   - **Contingency:** Fix issues based on user feedback

### Dependencies and Assumptions

**External Dependencies:**
- Git installed and accessible (already required by plugin)
- Obsidian API stability (Plugin API version 1.0.0+)
- Repository auth configured at system level

**Technical Assumptions:**
- Users understand basic git workflow (commit, push concepts)
- Default git push behavior is acceptable (typically pushes current branch)
- Users have write permissions to remote repositories
- Network connectivity generally available

**Business Assumptions:**
- Single hotkey for commit+push is sufficient (no separate commit-only hotkey needed yet)
- Suggested commit messages are helpful but not critical (users can always edit)
- Repository picker is acceptable for multi-repo selection (no batch operations needed yet)
- Modal dialogs are acceptable UX (no status bar or inline UI needed yet)

## Next Phase Preparation

### Task Breakdown Readiness

- [x] Clear technology choices and architecture
- [x] Complete data model and API specifications
- [x] Development environment and tooling defined
- [x] Quality standards and testing approach specified
- [x] Integration requirements and dependencies clear
- [x] Phases broken down into implementable tasks

### Implementation Prerequisites

- [x] FR-1 complete (RepositoryConfigService available)
- [x] FR-2 complete (GitCommandService foundation available)
- [x] FR-7 complete (PATH configuration for credential helpers)
- [x] All research completed (no outstanding questions)
- [x] Technical architecture validated
- [x] Development environment ready (existing setup sufficient)
- [x] Quality assurance approach defined

### Success Criteria

Implementation will be considered complete when:
1. ✅ Hotkey triggers commit+push workflow
2. ✅ Repository picker shows only repos with uncommitted changes
3. ✅ Commit message modal displays with smart suggestions
4. ✅ Commit and push operations execute successfully
5. ✅ Error handling works for all common failure scenarios
6. ✅ All acceptance criteria from FR-3 spec satisfied
7. ✅ 90%+ test coverage for new code
8. ✅ Manual testing checklist completed
9. ✅ Documentation updated

**Estimated Implementation Time:** 3-4 development sessions
**Estimated Lines of Code:** ~800-1000 (services, modals, tests, documentation)

## Approval

- [x] Plan aligns with approved specification (FR-3)
- [x] Steps are clear and actionable (7 phases defined)
- [x] Testing approach is defined (unit, integration, manual)
- [x] Constitutional principles followed
- [x] Ready for implementation

---

**Next Steps:** 
1. Review and approve this plan
2. Run `tasks` workflow to generate detailed task checklist
3. Begin Phase 2: GitCommandService Extensions
4. Iterate through phases with test-driven development
5. Complete manual testing and validation
6. Update main spec with completion status
