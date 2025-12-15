# Specification: Automated Git Pull with Fast-Forward

**Status:** Draft  
**Version:** 0.1.0  
**Created:** 2025-12-15  
**Last Updated:** 2025-12-15  
**Author:** Zach Mueller  
**Branch:** 2-auto-pull

## Constitutional Alignment

**Relevant Principles:**
- [x] Specification-First Development - This spec defines requirements before implementation
- [x] Iterative Simplicity - Scope focused on safe, minimal fast-forward-only approach
- [x] Documentation as Context - Provides clear context for implementation and future enhancements

## Clarifications

### Session 2025-12-15
- Q: During automatic pull, if git prompts for credentials (expired SSH key, HTTPS password, etc.), how should the plugin respond? → A: Fail gracefully - abort pull, notify user to authenticate manually via terminal
- Q: When multiple repositories have remote changes simultaneously, should pulls execute sequentially or concurrently? → A: Fully sequential - one repository completes before next begins. Use Obsidian SuggestModal selector (like RepositoryPickerModal) for any UI requiring repository selection.
- Q: When an automatic pull fails due to transient issues (network timeout, temporary lock), should the plugin retry automatically? → A: Retry with exponential backoff (3 attempts maximum)
- Q: When a repository is in "Remote updates available" state (auto-pull disabled or safety check failed), how should the status panel indicate this? → A: "Updates Available" with info icon and "Pull" action button
- Q: Where should users access the pull history/activity log for troubleshooting? → A: Status panel expandable section showing last 10 operations

## Overview

### Purpose
Enable automatic integration of remote changes into local working directories when those changes can be applied safely via fast-forward merge. This feature eliminates the manual step of running `git pull` after being notified of remote changes, while maintaining safety by only applying changes when there's no risk of conflicts or data loss.

Currently, the plugin fetches remote changes and notifies users, but users must manually open a terminal and run `git pull` or `git merge` to actually update their local files. This creates friction in the workflow and leaves the synchronization incomplete.

### Success Criteria
- [ ] Users' local files are automatically updated when remote has commits that can be fast-forwarded
- [ ] Zero data loss - plugin never attempts pulls that could cause conflicts or lose local work
- [ ] Users are clearly informed when automatic pull succeeds vs. when manual intervention is required
- [ ] 95% of remote changes in collaborative workflows are integrated automatically without user action
- [ ] Average time from fetch detection to local file update is under 3 seconds

## User Stories

### Primary User Story
As an Obsidian user managing multiple git repositories, I want remote changes to be automatically integrated into my local files when it's safe to do so, so that I don't have to manually run git pull commands and my vault stays synchronized with minimal effort.

### Supporting Stories
- As a solo user working across multiple devices, I want changes I made on my laptop to automatically appear on my desktop when I open Obsidian, so that I always have the latest version of my notes without manual synchronization
- As a collaborative vault user, I want my teammates' pushed changes to automatically integrate into my vault, so that I can immediately see and build upon their work
- As a safety-conscious user, I want to be clearly notified when automatic pull isn't possible, so that I can make informed decisions about how to proceed with complex merge scenarios

## Functional Requirements

### FR-1: Fast-Forward Detection
- **Description:** The plugin must accurately determine whether a pull operation would result in a fast-forward merge before attempting any pull operation
- **Priority:** Critical
- **Acceptance Criteria:**
  - [ ] Plugin checks git status to determine if local branch has diverged from remote
  - [ ] Detection identifies scenarios where local has no commits ahead of remote
  - [ ] Detection works correctly for all branch configurations (main, feature branches, etc.)
  - [ ] Detection completes within 500ms for typical repositories
  - [ ] False positives (incorrectly identifying as fast-forward) never occur
  - [ ] False negatives (missing valid fast-forward opportunities) occur in less than 1% of cases

### FR-2: Automatic Fast-Forward Pull
- **Description:** When remote changes can be fast-forwarded, the plugin must automatically execute the pull operation without user intervention
- **Priority:** Critical
- **Acceptance Criteria:**
  - [ ] Pull operation executes automatically immediately after successful fetch detects remote changes
  - [ ] Pull only executes if fast-forward detection confirms safety
  - [ ] Local working directory files are updated to match remote state after pull
  - [ ] Pull operation does not interrupt active user editing or other git operations
  - [ ] Pull completes within 5 seconds for repositories up to 1000 files
  - [ ] User receives notification confirming successful pull with commit count
  - [ ] Failed pulls retry automatically with exponential backoff (3 attempts: immediate, 10s, 30s delays)
  - [ ] After 3 failed attempts, user notified with clear error message and guidance
  - [ ] Git commands use enhanced PATH from FR-7 to find credential helpers (git-remote-codecommit, etc.)

### FR-3: Manual Intervention Notification
- **Description:** When remote changes cannot be safely fast-forwarded, users must be clearly notified and provided with guidance for manual resolution
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Notification clearly states that manual merge/rebase is required
  - [ ] Notification identifies which repository requires manual intervention
  - [ ] Notification explains why automatic pull wasn't possible (divergent branches)
  - [ ] Notification provides actionable next steps (open terminal, resolve manually)
  - [ ] Optional action button to open terminal at repository location
  - [ ] Notification does not auto-dismiss (requires user acknowledgment)
  - [ ] Status panel shows "Manual merge required" indicator with warning icon for divergent branches
  - [ ] Status panel shows "Updates Available" with info icon and "Pull" action button when auto-pull disabled or safety checks prevent automatic pull

### FR-4: Pull Operation Logging
- **Description:** All automatic pull operations must be logged for debugging and audit purposes
- **Priority:** Medium
- **Acceptance Criteria:**
  - [ ] Debug logs record fast-forward detection results
  - [ ] Debug logs record pull attempts with timestamps
  - [ ] Debug logs record pull success/failure with details
  - [ ] Debug logs include commit hashes before and after pull
  - [ ] Debug logs include number of commits pulled
  - [ ] Logs accessible when debug mode enabled in plugin settings
  - [ ] Logs do not contain sensitive information (passwords, tokens)

### FR-5: User Control and Configuration
- **Description:** Users must have granular control over automatic pull behavior through plugin settings
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Global setting to enable/disable automatic pull (default: enabled)
  - [ ] Per-repository setting to enable/disable automatic pull
  - [ ] Setting to control notification verbosity (all pulls, failures only, silent)
  - [ ] Settings changes take effect immediately without plugin reload
  - [ ] Default behavior is safe (automatic pull enabled but only for fast-forward)
  - [ ] Clear documentation of settings with warnings about safety implications

## Non-Functional Requirements

### NFR-1: Safety and Data Integrity
- **Description:** Automatic pull operations must never result in data loss or corruption
- **Priority:** Critical
- **Acceptance Criteria:**
  - [ ] No automatic operations performed when local has uncommitted changes
  - [ ] No automatic operations performed when local has unpushed commits (divergent branches)
  - [ ] No automatic operations performed during active git operations
  - [ ] File system locks respected during pull operations
  - [ ] Atomic operations - pull either fully succeeds or fully rolls back
  - [ ] Zero reported cases of data loss or corruption in testing

### NFR-2: Performance
- **Description:** Automatic pull operations must not impact Obsidian responsiveness
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Fast-forward detection completes in under 500ms
  - [ ] Pull operations execute in background without blocking UI
  - [ ] Pull operations execute sequentially (one repository at a time) to prevent resource contention
  - [ ] No noticeable lag when editing files during background pulls
  - [ ] Memory usage increase less than 10MB during pull operations
  - [ ] Performance acceptable for repositories up to 10,000 files
  - [ ] Sequential processing of multiple repositories completes within reasonable time (under 30 seconds for 5 repositories)

### NFR-3: Reliability
- **Description:** Automatic pull feature must operate reliably across diverse git configurations
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Works with SSH authentication (when credentials already cached)
  - [ ] Works with HTTPS authentication (when credentials already cached)
  - [ ] Works with credential helpers requiring custom PATH (e.g., git-remote-codecommit via FR-7)
  - [ ] If git prompts for credentials, abort pull and notify user to authenticate manually
  - [ ] Works with various git versions (2.20.0+)
  - [ ] Handles network interruptions gracefully
  - [ ] Handles repository locked scenarios (concurrent access)
  - [ ] 99% success rate for valid fast-forward scenarios in testing
  - [ ] Comprehensive error recovery for all failure modes

### NFR-4: User Experience
- **Description:** Feature must provide clear feedback and maintain user confidence
- **Priority:** Medium
- **Acceptance Criteria:**
  - [ ] Notifications are informative but not overwhelming
  - [ ] Success notifications are subtle and non-intrusive
  - [ ] Failure notifications are prominent and actionable
  - [ ] Status panel uses clear visual indicators: info icon for "Updates Available", warning icon for "Manual merge required", success icon for completed pulls
  - [ ] Status panel provides contextual action buttons: "Pull" button for manual pull, "Open Terminal" for merge conflicts
  - [ ] Status panel includes expandable section showing last 10 pull operations per repository for troubleshooting
  - [ ] Activity log shows timestamp, operation result, commits pulled, and any error messages
  - [ ] All messages use clear, non-technical language

## Scope

### In Scope
- Automatic execution of git pull when fast-forward is possible
- Detection of fast-forward vs. merge/rebase scenarios
- User notifications for pull success and manual intervention requirements
- Per-repository configuration of automatic pull behavior
- Debug logging of all pull operations
- Integration with existing fetch scheduler and status display

### Out of Scope
- Automatic merge operations (requires manual resolution)
- Automatic rebase operations (requires manual resolution)
- Interactive conflict resolution interfaces
- Stashing uncommitted changes before pull
- Pull operations that modify working directory when user has unsaved changes
- Custom merge strategies or git hooks
- Pull from multiple remotes simultaneously
- Submodule updates (deferred to future iteration)

## Design Considerations

### Technical Approach
After successful fetch operation detects remote changes, the plugin will perform a safety check to determine if a fast-forward is possible. If safe, it will execute `git pull --ff-only` which either succeeds with a fast-forward or fails safely without modifying the working directory. The operation runs asynchronously to avoid blocking the UI.

**PATH Environment Handling:** All git commands must be executed through GitCommandService which implements FR-7 (Custom PATH Configuration) from 1-multi-git-core. This ensures git can locate credential helpers like `git-remote-codecommit` that may be installed in user directories (e.g., ~/.cargo/bin). The same enhanced PATH mechanism used for fetch operations in 1-multi-git-core will automatically apply to pull operations.

### Safety Strategy
The plugin uses a conservative "fail-safe" approach:
1. **Never assume safety** - Always verify fast-forward is possible before attempting pull
2. **Atomic operations** - Use `--ff-only` flag to ensure operation either succeeds cleanly or fails without changes
3. **Respect working directory** - Only pull when working directory is clean (no uncommitted changes)
4. **Clear communication** - When automatic pull isn't safe, clearly explain why and what user should do

### Dependencies
- Existing GitCommandService for executing git commands
  - **Critical:** GitCommandService must include FR-7 (Custom PATH Configuration) implementation from 1-multi-git-core spec
  - Enhanced PATH is required to ensure git commands can find credential helpers (e.g., git-remote-codecommit for AWS CodeCommit)
  - Without enhanced PATH, pull operations will fail with errors like: `git: 'remote-codecommit' is not a git command`
- Existing FetchSchedulerService for detecting remote changes
- Existing NotificationService for user feedback
- Existing StatusPanelView for displaying pull status
- Existing RepositoryPickerModal pattern (SuggestModal) for any repository selection UI
- Git 2.20.0+ with support for `--ff-only` flag
- Custom PATH entries configured in settings (defaults: ~/.cargo/bin, ~/.local/bin, /opt/homebrew/bin, /usr/local/bin)

### Risks & Mitigations

- **Risk:** User expects automatic pull but plugin determines manual intervention needed
  - **Mitigation:** Clear notifications explaining why; provide one-click terminal access; status panel indicator

- **Risk:** Pull operation fails mid-operation due to network interruption
  - **Mitigation:** Use `--ff-only` flag which is atomic; comprehensive error handling; retry logic with exponential backoff

- **Risk:** Git prompts for credentials during automatic pull
  - **Mitigation:** Detect credential prompt scenarios; abort pull gracefully; notify user with clear message to authenticate via terminal; disable auto-pull for that repository until credentials cached

- **Risk:** User has unsaved file open in Obsidian when files are updated by pull
  - **Mitigation:** Obsidian handles external file changes gracefully; pull only when working directory clean; test extensively with real-world editing scenarios

- **Risk:** Performance impact with many repositories or large repositories
  - **Mitigation:** Execute pulls sequentially in background; configurable per-repository enable/disable; performance testing with realistic workloads; optimize git command execution

- **Risk:** User confusion about when automatic vs. manual pull is used
  - **Mitigation:** Clear documentation; visible settings; informative notifications; activity log for troubleshooting

## User Scenarios

### Scenario 1: Simple Fast-Forward (Primary Flow)
1. User opens Obsidian with multi-git plugin configured
2. Plugin performs scheduled fetch and detects 3 commits on remote
3. Plugin checks git status - local branch has no divergent commits
4. Plugin determines fast-forward is safe
5. Plugin executes `git pull --ff-only` automatically
6. Local files update with remote changes
7. User receives subtle notification: "Pulled 3 commits for Vault Repository"
8. User continues working with latest changes

**Expected Outcome:** Seamless synchronization without user action

### Scenario 2: Divergent Branches Requiring Manual Merge
1. User has made local commits and pushed them
2. Collaborator pushes different commits to same branch on remote
3. Plugin performs fetch and detects remote commits
4. Plugin checks git status - local branch has diverged (both ahead and behind remote)
5. Plugin determines automatic pull is not safe
6. User receives persistent notification: "Vault Repository: Manual merge required - local and remote branches have diverged"
7. Notification includes "Open Terminal" button
8. Status panel shows "Manual merge required" with yellow warning indicator
9. User clicks "Open Terminal" and resolves merge manually
10. After manual merge, status panel returns to normal state

**Expected Outcome:** User is clearly informed and guided to resolution, no data loss

### Scenario 3: Uncommitted Local Changes
1. User is actively editing files with unsaved changes
2. Plugin detects remote commits during scheduled fetch
3. Plugin checks working directory - detects uncommitted changes
4. Plugin does NOT attempt automatic pull (safety check fails)
5. User receives notification: "Vault Repository: Remote updates available - commit or stash your changes first"
6. Status panel shows "Remote updates available" with info indicator
7. User commits their work
8. On next fetch cycle (or manual refresh), plugin pulls remote changes automatically

**Expected Outcome:** Local work protected, user guided to safe workflow

### Scenario 4: Network Failure During Pull
1. Plugin initiates automatic pull after detecting remote changes
2. Network connection drops mid-operation
3. Git operation times out and fails
4. Plugin detects failure and logs error
5. Working directory remains unchanged (atomic operation)
6. User receives notification: "Vault Repository: Pull failed due to network error - will retry automatically"
7. Plugin attempts retry with exponential backoff
8. Next fetch cycle, if network recovered, pull succeeds

**Expected Outcome:** Graceful degradation, automatic recovery, no data loss

### Scenario 5: Multiple Repositories with Mixed States
1. User has 4 repositories configured
2. Repo A: Remote changes, fast-forward possible → automatic pull succeeds
3. Repo B: Remote changes, divergent branches → manual merge notification  
4. Repo C: No remote changes → no action
5. Repo D: Pull fails due to authentication error → error notification
6. User receives single notification summarizing state of all repositories
7. Status panel shows individual state for each repository

**Expected Outcome:** Clear overview of all repository states, appropriate actions taken

## Success Criteria

### Measurable Outcomes
- [ ] 95% of remote changes in test scenarios are automatically integrated without user action
- [ ] Zero data loss events in comprehensive testing (100+ test scenarios)
- [ ] Fast-forward detection accuracy above 99% (false positives = 0%, false negatives < 1%)
- [ ] Average pull operation completes in under 3 seconds
- [ ] User satisfaction score above 4.5/5 in beta testing (when added to existing plugin)
- [ ] Less than 5% of users disable automatic pull feature after trying it
- [ ] Plugin maintains responsiveness - no perceived lag during pull operations

### Quality Gates
- All functional requirements acceptance criteria met
- All non-functional requirements acceptance criteria met  
- No critical or high-severity bugs in pull logic
- Comprehensive test coverage (unit + integration + manual) above 90%
- Documentation complete and reviewed
- Beta testing phase with at least 10 users across different workflows

## Key Entities

### Pull Operation State
- **Attributes:** 
  - repositoryId: string
  - startTime: timestamp
  - endTime: timestamp (nullable)
  - status: 'pending' | 'success' | 'failed' | 'skipped'
  - pullType: 'fast-forward-only'
  - commitsBefore: string (commit hash)
  - commitsAfter: string (commit hash, nullable)
  - commitsPulled: number
  - errorMessage: string (nullable)
  - skipReason: 'divergent-branches' | 'uncommitted-changes' | 'concurrent-operation' | 'disabled' (nullable)
  - retryCount: number (0-3, tracks retry attempts)
  - lastRetryTime: timestamp (nullable)

- **State Transitions:**
  - pending → success (fast-forward succeeded)
  - pending → pending (retry after failure, retryCount incremented)
  - pending → failed (max retries exhausted or non-retryable error)
  - pending → skipped (safety checks failed, feature disabled)

- **Validation:**
  - repositoryId must match configured repository
  - pullType must always be 'fast-forward-only' for this feature
  - commitsBefore must be valid git hash
  - If status is 'success', commitsPulled must be > 0
  - If status is 'failed', errorMessage must be present
  - If status is 'skipped', skipReason must be present

### Auto-Pull Configuration
- **Attributes:**
  - enabled: boolean (global setting)
  - perRepositorySettings: Map<repositoryId, RepositoryPullConfig>
  - notificationVerbosity: 'all' | 'failures-only' | 'silent'

- **RepositoryPullConfig:**
  - repositoryId: string
  - autoPullEnabled: boolean
  - lastPullTime: timestamp (nullable)
  - lastPullStatus: PullOperationStatus
  - pullHistory: Array<PullOperationState> (last 10 operations, FIFO queue)

## Assumptions

- Users understand basic git concepts (pull, merge, fast-forward)
- Git is properly configured with authentication at system level
- Network connectivity is generally available (plugin handles transient failures)
- Users working on a single branch at a time (not switching branches frequently)
- Obsidian's file watching and reload mechanisms handle external file changes correctly
- Repository working directories are not being modified by external tools during pull
- Most collaborative workflows involve sequential commits rather than parallel development causing frequent divergence
- Default configuration (automatic pull enabled) is appropriate for majority of users
- Five second pull operation time is acceptable for user experience

## Out of Scope (This Iteration)

### Explicitly Excluded
- Automatic merge conflict resolution
- Automatic rebase operations  
- Interactive merge/rebase UI within Obsidian
- Stashing and unstashing of uncommitted changes
- Custom merge strategies
- Git hooks integration (pre-pull, post-pull)
- Selective file pulling (cherry-picking)
- Pull from multiple remotes
- Submodule automatic updates
- Historical pull operation analytics/dashboard
- Undo/rollback of automatic pulls
- Pull operation scheduling (only triggered by fetch detection)

### Future Considerations
- **Phase 2 (Future Spec):** Configurable pull strategies per repository (merge, rebase, fast-forward only)
- **Phase 3 (Future Spec):** Automatic stash before pull with configurable stash pop after
- **Phase 4 (Future Spec):** Pull operation history and analytics dashboard
- **Phase 5 (Future Spec):** Smart conflict detection with guided resolution workflow

## Open Questions

None - proceeding with conservative fast-forward-only approach based on established git best practices.

## Approval

- [ ] Reviewed against constitutional principles
- [ ] Scope is clear and minimal (fast-forward only)
- [ ] Requirements are testable and technology-agnostic
- [ ] Safety considerations thoroughly addressed
- [ ] Ready for implementation planning

---

**Next Steps:** After approval, create implementation plan using `plan` workflow and begin development.
