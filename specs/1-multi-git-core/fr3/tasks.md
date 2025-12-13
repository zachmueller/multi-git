# FR-3 Implementation Tasks

**Feature:** Hotkey-Driven Push Operations  
**Plan:** [plan.md](plan.md)  
**Status:** Planning

## Phase 2: GitCommandService Extensions

### Add getRepositoryStatus() Method
- [x] Create RepositoryStatus interface in data.ts
- [x] Implement getRepositoryStatus() method in GitCommandService
- [x] Parse `git status --porcelain` output
- [x] Categorize files into staged/unstaged/untracked arrays
- [x] Get current branch name using getCurrentBranch()
- [x] Handle edge cases (empty repo, detached HEAD, etc.)
- [ ] Write unit tests for getRepositoryStatus()
- [ ] Write integration tests with real git repo

### Add stageAllChanges() Method
- [x] Implement stageAllChanges() method
- [x] Execute `git add -A` command
- [x] Handle permission errors
- [x] Handle non-git directory errors
- [ ] Write unit tests for stageAllChanges()
- [ ] Test with files containing special characters

### Add createCommit() Method
- [x] Implement createCommit() method
- [x] Validate commit message is not empty
- [x] Execute `git commit -m "message"` command
- [x] Handle "nothing to commit" scenarios
- [x] Handle pre-commit hook failures
- [x] Capture and return hook output on failure
- [ ] Write unit tests for createCommit()
- [ ] Test with various commit message formats

### Add pushToRemote() Method
- [x] Implement pushToRemote() method
- [x] Execute `git push` command
- [x] Respect configurable timeout (default 60s)
- [x] Handle authentication errors
- [x] Handle network errors
- [x] Handle "no upstream branch" errors
- [x] Handle pre-push hook failures
- [ ] Write unit tests for pushToRemote()
- [ ] Test timeout behavior

### Add commitAndPush() Method
- [x] Implement commitAndPush() orchestration method
- [x] Call stageAllChanges()
- [x] Call createCommit()
- [x] Call pushToRemote()
- [x] Stop on first error with clear context
- [ ] Write unit tests for commitAndPush()
- [ ] Test error handling at each step
- [ ] Test end-to-end success scenario

### Add New Error Classes
- [x] Create GitCommitError in errors.ts
- [x] Create GitPushError in errors.ts
- [x] Create GitStatusError in errors.ts
- [x] Add appropriate error codes
- [ ] Write unit tests for new error classes

## Phase 3: Commit Message Generation

### Create CommitMessageService
- [x] Create src/services/CommitMessageService.ts
- [x] Define CommitMessageSuggestion interface
- [x] Implement generateSuggestion() method
- [x] Analyze file changes (new, modified, deleted)
- [x] Apply rule: single file → "Update [filename]"
- [x] Apply rule: 2-3 files → "Update [file1], [file2], [file3]"
- [x] Apply rule: 4+ files → "Update [N] files"
- [x] Apply rule: only additions → "Add [filename]" or "Add [N] files"
- [x] Apply rule: only deletions → "Remove [filename]" or "Remove [N] files"
- [x] Keep summary under 50 characters
- [x] Handle edge case: empty repository (initial commit)
- [x] Handle edge case: renamed files
- [x] Handle edge case: binary files
- [x] Handle edge case: very long file names (truncate)
- [x] Write unit tests for each suggestion rule
- [x] Test with various real-world scenarios

## Phase 4: Repository Picker Modal

### Create RepositoryPickerModal Component
- [ ] Create src/ui/RepositoryPickerModal.ts
- [ ] Extend Obsidian Modal class
- [ ] Define constructor accepting repositories and callback
- [ ] Implement onOpen() method
- [ ] Render repository list container
- [ ] Display repository name, branch, change count per item
- [ ] Handle empty state (no uncommitted changes)
- [ ] Implement click-to-select behavior
- [ ] Implement keyboard navigation (arrow keys)
- [ ] Implement Enter key to confirm selection
- [ ] Implement Escape key to cancel
- [ ] Highlight selected repository
- [ ] Call callback on selection
- [ ] Close modal on selection

### Add Modal Styling
- [ ] Add .multi-git-picker-modal class to styles.css
- [ ] Style repository list container
- [ ] Style individual repository items
- [ ] Add hover state styling
- [ ] Add selected state styling
- [ ] Style repository info (name, branch, count)
- [ ] Style empty state message
- [ ] Test styling in light mode
- [ ] Test styling in dark mode

### Manual Testing
- [ ] Test with 0 repositories (should not open)
- [ ] Test with 1 repository (should skip picker)
- [ ] Test with 2+ repositories
- [ ] Test keyboard navigation
- [ ] Test mouse selection
- [ ] Test Escape to cancel
- [ ] Test modal positioning and sizing

## Phase 5: Commit Message Modal

### Create CommitMessageModal Component
- [ ] Create src/ui/CommitMessageModal.ts
- [ ] Extend Obsidian Modal class
- [ ] Define constructor accepting repo, suggestion, and callback
- [ ] Implement onOpen() method
- [ ] Display repository name and branch
- [ ] Display list of changed files (max 10)
- [ ] Show "and N more..." if >10 files
- [ ] Render textarea for commit message
- [ ] Pre-fill textarea with suggested message
- [ ] Add "Commit & Push" button
- [ ] Add "Cancel" button
- [ ] Disable submit button during processing
- [ ] Show loading state during operation
- [ ] Implement handleSubmit() method
- [ ] Validate message is not empty
- [ ] Call commitAndPush callback
- [ ] Handle success: show Notice, close modal
- [ ] Handle error: display error in modal, allow retry
- [ ] Implement onClose() cleanup

### Add Modal Styling
- [ ] Add .multi-git-commit-modal class to styles.css
- [ ] Style modal header (repo name, branch)
- [ ] Style file list container
- [ ] Style individual file items
- [ ] Style commit message textarea
- [ ] Style button container
- [ ] Style submit button (normal, hover, disabled, loading)
- [ ] Style cancel button
- [ ] Add loading spinner styles
- [ ] Style error message display
- [ ] Test styling in light mode
- [ ] Test styling in dark mode

### Handle User Interactions
- [ ] Enter in textarea = submit (prevent default)
- [ ] Shift+Enter in textarea = newline
- [ ] Click submit button = submit
- [ ] Click cancel button = close modal
- [ ] Escape key = close modal (when not processing)
- [ ] Prevent double submission
- [ ] Maintain focus on textarea after error

### Manual Testing
- [ ] Test with various commit messages
- [ ] Test with empty commit message (should prevent submit)
- [ ] Test Enter key to submit
- [ ] Test Shift+Enter for multiline
- [ ] Test cancel button
- [ ] Test Escape key
- [ ] Test loading state during operation
- [ ] Test success notification
- [ ] Test error display and retry

## Phase 6: Command Registration & Orchestration

### Register Command
- [ ] Add command registration to main.ts onload()
- [ ] Use command ID: 'multi-git:commit-push'
- [ ] Set command name: 'Commit and push changes'
- [ ] Implement command callback

### Implement Workflow Orchestration
- [ ] Get all enabled repositories from RepositoryConfigService
- [ ] Call getRepositoryStatus() for each repository
- [ ] Filter repositories with uncommitted changes
- [ ] Handle case: no repositories with changes (show Notice, exit)
- [ ] Handle case: single repository (skip picker, go to commit)
- [ ] Handle case: multiple repositories (show picker)
- [ ] Instantiate RepositoryPickerModal with filtered repos
- [ ] Handle picker selection
- [ ] Instantiate CommitMessageService
- [ ] Generate commit message suggestion
- [ ] Instantiate CommitMessageModal with suggestion
- [ ] Handle commit modal confirmation
- [ ] Execute commitAndPush() operation
- [ ] Show success Notice on completion
- [ ] Handle errors at each step

### Error Handling
- [ ] Map GitCommandService errors to user messages
- [ ] Handle network errors: "Check your connection"
- [ ] Handle auth errors: "Configure git credentials"
- [ ] Handle pre-commit failures: show hook output
- [ ] Handle pre-push failures: show hook output
- [ ] Handle timeout: "Operation timed out, changes committed locally"
- [ ] Log all errors for debugging (when debug mode enabled)
- [ ] Display repository name in error messages

### Add Settings UI (Optional)
- [ ] Add note in settings about hotkey configuration
- [ ] Link to Obsidian's hotkey settings
- [ ] Optional: Add push timeout configuration setting
- [ ] Optional: Save push timeout to settings
- [ ] Optional: Pass timeout to pushToRemote()

### Integration Testing
- [ ] Test end-to-end workflow with single repo
- [ ] Test end-to-end workflow with multiple repos
- [ ] Test workflow when no changes exist
- [ ] Test error scenarios (auth, network, hooks)
- [ ] Test with repos on different branches
- [ ] Test with repos in various states
- [ ] Test hotkey registration and execution
- [ ] Test command appears in command palette

## Phase 7: Documentation & Finalization

### Create Manual Testing Checklist
- [ ] Create manual-testing-checklist.md in fr3 directory
- [ ] Document test: 0 repositories with changes
- [ ] Document test: 1 repository with changes
- [ ] Document test: Multiple repositories with changes
- [ ] Document test: Commit message suggestions accuracy
- [ ] Document test: Empty commit message validation
- [ ] Document test: Successful commit and push
- [ ] Document test: Authentication failure
- [ ] Document test: Network failure
- [ ] Document test: Pre-commit hook failure
- [ ] Document test: Pre-push hook failure
- [ ] Document test: Keyboard navigation in picker
- [ ] Document test: Keyboard navigation in commit modal
- [ ] Document test: Cancel operations
- [ ] Document test: Error recovery and retry

### Update User Documentation
- [ ] Update README.md with FR-3 feature description
- [ ] Document hotkey configuration steps
- [ ] Add screenshots of picker modal
- [ ] Add screenshots of commit modal
- [ ] Document commit message suggestion rules
- [ ] Add troubleshooting section for push errors
- [ ] Document common error messages and solutions
- [ ] Add examples of typical workflows

### Update Architecture Documentation
- [ ] Update docs/architecture.md with new services
- [ ] Document CommitMessageService
- [ ] Document RepositoryPickerModal
- [ ] Document CommitMessageModal
- [ ] Add data flow diagram for commit+push workflow
- [ ] Document modal interaction patterns
- [ ] Update system architecture diagram

### Code Quality
- [ ] Add JSDoc comments to all public methods
- [ ] Add JSDoc comments to all interfaces
- [ ] Review error messages for clarity and consistency
- [ ] Run ESLint and fix all issues
- [ ] Review TypeScript types for accuracy
- [ ] Check for any 'any' types (replace with specific types)
- [ ] Ensure consistent code formatting
- [ ] Remove any console.log statements
- [ ] Remove any commented-out code

### Manual Testing Execution
- [ ] Execute complete manual testing checklist
- [ ] Test on macOS
- [ ] Test on Windows (if available)
- [ ] Test on Linux (if available)
- [ ] Test with SSH authentication
- [ ] Test with HTTPS authentication
- [ ] Test with large repositories (many files)
- [ ] Test with repositories with many commits
- [ ] Performance test: measure time from hotkey to success

### Final Validation
- [ ] Verify all FR-3 acceptance criteria satisfied
- [ ] Verify 90%+ test coverage achieved
- [ ] Verify no TypeScript errors
- [ ] Verify all tests passing
- [ ] Review code against plan for completeness
- [ ] Update plan.md status to "Complete"
- [ ] Update main spec.md FR-3 status

## Summary

- **Total Tasks:** ~120+
- **Estimated Time:** 3-4 development sessions
- **Estimated LOC:** 800-1000
- **Test Coverage Target:** 90%+
- **Phases:** 6 implementation phases + 1 documentation phase

## Progress Tracking

- [ ] Phase 2: GitCommandService Extensions (25/33 tasks - 76% complete, tests pending)
- [x] Phase 3: Commit Message Generation (16/16 tasks - 100% complete)
- [ ] Phase 4: Repository Picker Modal (0/20 tasks)
- [ ] Phase 5: Commit Message Modal (0/30 tasks)
- [ ] Phase 6: Command Registration & Orchestration (0/21 tasks)
- [ ] Phase 7: Documentation & Finalization (0/28 tasks)

**Overall Progress:** 41/148 tasks complete (28%)
