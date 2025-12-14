# Manual Testing Checklist: FR-3 Hotkey-Driven Push Operations

**Feature:** Hotkey-Driven Push Operations
**Created:** 2025-12-14
**Status:** Ready for Testing

## Overview

This checklist validates the commit and push workflow triggered by hotkey. The workflow should correctly detect uncommitted changes, provide smart commit message suggestions, and successfully commit and push changes to remote repositories.

## Prerequisites

- [x] Multi-Git plugin built and loaded in Obsidian (`npm run dev`)
- [x] At least 3 test repositories configured and enabled
- [x] Test repositories have write access to remotes
- [x] Git credentials configured (SSH keys or HTTPS tokens)
- [x] **[FR-7]** Custom PATH entries configured if using credential helpers
- [x] Hotkey configured for `multi-git:commit-push` command (e.g., Cmd/Ctrl+Shift+P)

## Test Scenarios

### 1. Repository Detection and Picker Modal

#### Test 1.1: No Uncommitted Changes
**Steps:**
1. Ensure all test repositories have no uncommitted changes
2. Trigger the commit+push hotkey
3. Observe behavior

**Expected Results:**
- [x] Notice appears: "No uncommitted changes in any repository"
- [x] No modal opens
- [x] No git operations executed
- [x] Plugin remains responsive

**Notes:**


#### Test 1.2: Single Repository with Changes
**Steps:**
1. Make changes to exactly one repository (e.g., modify a file)
2. Trigger the commit+push hotkey
3. Observe behavior

**Expected Results:**
- [x] Repository picker modal does NOT appear (skips picker for single repo)
- [x] Commit message modal opens directly
- [x] Modal shows correct repository name and branch
- [x] Modal shows changed files list

**Notes:**

- Some notes captured elsewhere for improvements to the UI

#### Test 1.3: Multiple Repositories with Changes
**Steps:**
1. Make changes to 3 repositories
2. Trigger the commit+push hotkey
3. Observe picker modal

**Expected Results:**
- [x] Repository picker modal opens
- [x] All 3 repositories with changes are listed
- [x] Each item shows: repository name, current branch, change count
- [x] List is readable and well-formatted
- [x] No repositories without changes appear in list

**Notes:**

- After later updates, much improved

#### Test 1.4: Picker Modal Keyboard Navigation
**Steps:**
1. Open picker modal with multiple repositories
2. Use arrow keys to navigate
3. Press Enter to select
4. Open picker again and press Escape

**Expected Results:**
- [x] Down arrow moves selection down
- [x] Up arrow moves selection up
- [x] First item selected by default
- [x] Selected item is visually highlighted
- [x] Enter key confirms selection and opens commit modal
- [x] Escape key closes picker without action

**Notes:**

- The picker modal does not seem to show any visible selection. As noted elsewhere, I recommend switching this to Obsidian's built-in Suggester prompt mechanism.

#### Test 1.5: Picker Modal Mouse Selection
**Steps:**
1. Open picker modal with multiple repositories
2. Hover over items
3. Click to select

**Expected Results:**
- [x] Hover state is visible
- [x] Click selects repository and opens commit modal
- [x] Clicking outside modal closes it (cancel)

**Notes:**


### 2. Commit Message Modal

#### Test 2.1: Basic Commit Message Modal
**Steps:**
1. Select repository with uncommitted changes
2. Observe commit message modal

**Expected Results:**
- [x] Modal displays repository name and branch at top
- [x] Changed files list is visible
- [x] Textarea contains auto-generated message: "Auto-commit {timestamp}"
- [x] Timestamp is in ISO 8601 format with local timezone
- [x] "Commit & Push" button is enabled
- [x] "Cancel" button is present

**Notes:**

- Design updated to use simple timestamp-based messages for MVP simplicity

#### Test 2.2: Auto-Commit Message Format
**Steps:**
1. Modify any files in a repository
2. Trigger workflow
3. Examine auto-generated message in commit modal

**Expected Results:**
- [x] Message format: "Auto-commit {timestamp}"
- [ ] Timestamp is in ISO 8601 format (e.g., "2025-12-14T21:30:00+13:00")
- [ ] Timestamp reflects current local time
- [ ] Format is consistent across multiple uses

**Notes:**


#### Test 2.3: Auto-Commit Message Uniqueness
**Steps:**
1. Trigger workflow multiple times within same minute
2. Observe generated messages

**Expected Results:**
- [x] Each message has unique timestamp (seconds precision)
- [x] No duplicate commit messages
- [x] Timestamps are sequential

**Notes:**


#### Test 2.6: File List Display
**Steps:**
1. Modify 8 files
2. Observe file list in commit modal

**Expected Results:**
- [x] All 8 files are listed (under 10 files threshold)
- [x] Each file shows status indicator (M/A/D)
- [ ] List is scrollable if needed

**Steps:**
1. Modify 15 files
2. Observe file list in commit modal

**Expected Results:**
- [ ] First 10 files are listed
- [ ] Message "and 5 more..." appears at bottom
- [ ] List doesn't overflow modal

**Notes:**


#### Test 2.7: Edit Commit Message
**Steps:**
1. Open commit message modal
2. Clear suggested message
3. Type custom message
4. Submit

**Expected Results:**
- [ ] Textarea is editable
- [ ] Custom message is used for commit
- [ ] No validation errors for reasonable messages

**Notes:**


#### Test 2.8: Empty Commit Message Validation
**Steps:**
1. Open commit message modal
2. Clear textarea completely (empty string)
3. Attempt to submit

**Expected Results:**
- [x] Submit button is disabled OR
- [x] Error message appears: "Commit message cannot be empty"
- [x] Commit operation does not execute
- [x] Modal remains open

**Notes:**


#### Test 2.9: Enter Key Creates Newline
**Steps:**
1. Open commit message modal
2. Type first line
3. Press Enter
4. Type second line
5. Observe behavior

**Expected Results:**
- [x] Enter key creates newline in textarea (does NOT submit)
- [x] Shift+Enter also creates newline
- [x] Multiline messages can be created easily
- [x] No accidental submission from Enter key

**Notes:**


#### Test 2.10: Multi-Line Commit Messages
**Steps:**
1. Open commit message modal
2. Create multi-line commit message:
   - Line 1: "Fix: Update user authentication"
   - Line 2: (blank line)
   - Line 3: "- Updated login flow"
   - Line 4: "- Added password reset"
3. Submit commit
4. Verify commit in git log

**Expected Results:**
- [x] Multi-line message is accepted
- [x] Commit succeeds with all lines preserved
- [x] Git log shows commit with full multi-line message
- [x] Message formatting is preserved (blank lines, bullets, etc.)
- [x] No errors about "dangerous patterns" or newline characters

**Notes:**

- It is _preserved_ in that the formatting characters stay in, though depending on where it's rendered it either stays as plaintext or gets rendered like normal Markdown into formatted content.

#### Test 2.11: Cmd/Ctrl+Enter to Submit
**Steps:**
1. Open commit message modal
2. Edit message
3. Press Cmd+Enter (macOS) or Ctrl+Enter (Windows/Linux)

**Expected Results:**
- [x] Cmd+Enter/Ctrl+Enter triggers commit operation
- [x] Same behavior as clicking "Commit & Push" button
- [x] Commit operation begins
- [x] Loading state appears

**Notes:**


#### Test 2.12: Cancel Commit Modal
**Steps:**
1. Open commit message modal
2. Click Cancel button
3. Open again and press Escape key

**Expected Results:**
- [x] Cancel button closes modal without committing
- [x] Escape key closes modal without committing
- [x] No git operations executed
- [x] Changes remain uncommitted

**Notes:**


### 3. Commit and Push Operations

#### Test 3.1: Successful Commit and Push
**Steps:**
1. Make changes to a repository
2. Complete commit message modal
3. Submit commit

**Expected Results:**
- [x] Loading state appears (button disabled, spinner visible)
- [x] Success Notice appears: "Successfully committed and pushed changes to [repo-name]"
- [x] Modal closes automatically
- [x] Changes are committed locally (verify with `git log`)
- [x] Changes are pushed to remote (verify on remote platform)
- [x] Working directory is clean after operation

**Notes:**


#### Test 3.2: Commit and Push with Staged Changes
**Steps:**
1. Manually stage some files with `git add`
2. Leave other files unstaged
3. Trigger commit+push workflow

**Expected Results:**
- [x] All changes (staged and unstaged) are included in commit
- [x] Operation uses `git add -A` to stage everything
- [x] Commit includes all modified files
- [x] Push succeeds

**Notes:**


#### Test 3.3: Nothing to Commit Scenario
**Steps:**
1. Manually commit all changes (`git commit -am "test"`)
2. Without pushing, trigger commit+push workflow
3. Observe behavior

**Expected Results:**
- [x] Repository is not shown in picker (no uncommitted changes)
- [ ] OR: If workflow proceeds, error is handled gracefully
- [x] Clear error message if commit fails: "Nothing to commit"

**Notes:**


#### Test 3.4: Push with No Upstream Branch
**Steps:**
1. Create new local branch without upstream
2. Make changes
3. Trigger commit+push workflow

**Expected Results:**
- [ ] Commit succeeds locally
- [ ] Push fails with clear error message
- [ ] Error message suggests setting upstream: "No upstream branch configured"
- [ ] User can manually run `git push -u origin <branch>` and retry

**Notes:**

- Testing via new `test-branch`

### 4. Error Handling

#### Test 4.1: Authentication Failure
**Steps:**
1. Temporarily break git credentials (invalidate SSH key or token)
2. Make changes
3. Trigger commit+push workflow
4. Submit commit

**Expected Results:**
- [ ] Commit succeeds locally
- [ ] Push fails with authentication error
- [ ] Error displayed in modal (modal stays open)
- [ ] Error message mentions authentication: "Authentication failed" or similar
- [ ] User can cancel or fix credentials and retry
- [ ] Changes remain committed locally

**Notes:**


#### Test 4.2: Network Error During Push
**Steps:**
1. Disconnect network
2. Make changes
3. Trigger commit+push workflow
4. Submit commit

**Expected Results:**
- [ ] Commit succeeds locally
- [ ] Push fails with network error
- [ ] Error message is clear: "Network error" or "Could not reach remote"
- [ ] Modal stays open for retry
- [ ] Changes remain committed locally
- [ ] User can reconnect and retry

**Notes:**


#### Test 4.3: Pre-commit Hook Failure
**Steps:**
1. Add pre-commit hook that fails (e.g., `.git/hooks/pre-commit` exits with code 1)
2. Make changes
3. Trigger commit+push workflow
4. Submit commit

**Expected Results:**
- [ ] Commit fails
- [ ] Hook output is displayed in error message
- [ ] Modal stays open
- [ ] User can see why hook failed
- [ ] Changes remain uncommitted
- [ ] User can fix issues and retry

**Notes:**


#### Test 4.4: Pre-push Hook Failure
**Steps:**
1. Add pre-push hook that fails
2. Make changes
3. Trigger commit+push workflow
4. Submit commit

**Expected Results:**
- [ ] Commit succeeds
- [ ] Push fails due to hook
- [ ] Hook output is displayed in error message
- [ ] Modal stays open
- [ ] Changes are committed locally but not pushed
- [ ] User can fix issues and manually push

**Notes:**


#### Test 4.5: Push Timeout
**Steps:**
1. Configure repository with very slow remote (or simulate)
2. Trigger commit+push workflow
3. Wait for timeout

**Expected Results:**
- [ ] Push operation times out after configured duration (default 60s)
- [ ] Error message mentions timeout
- [ ] Message confirms changes are committed locally
- [ ] User can manually push later

**Notes:**


#### Test 4.6: Error Recovery and Retry
**Steps:**
1. Trigger error scenario (e.g., network failure)
2. Observe error in modal
3. Fix issue
4. Keep modal open and retry via workflow again

**Expected Results:**
- [ ] Error displayed in modal with clear message
- [ ] Modal allows dismissal to return to normal state
- [ ] User can trigger workflow again to retry
- [ ] Second attempt succeeds if issue resolved

**Notes:**


### 5. Multi-Repository Scenarios

#### Test 5.1: Commit Different Repositories Sequentially
**Steps:**
1. Make changes to 3 repositories
2. Trigger workflow and commit first repo
3. Immediately trigger workflow again
4. Commit second repo
5. Trigger again and commit third repo

**Expected Results:**
- [ ] Each invocation shows remaining repos with changes
- [ ] Picker list updates after each commit
- [ ] Each repository commits and pushes successfully
- [ ] Final invocation shows "No uncommitted changes"

**Notes:**


#### Test 5.2: Different Branches in Different Repos
**Steps:**
1. Configure repos on different branches (main, develop, feature)
2. Make changes to each
3. Trigger workflow

**Expected Results:**
- [ ] Picker shows correct branch for each repository
- [ ] Commit modal shows correct branch for selected repo
- [ ] Push goes to correct branch's remote

**Notes:**


### 6. UI and UX Testing

#### Test 6.1: Modal Styling - Light Mode
**Steps:**
1. Switch Obsidian to light theme
2. Open repository picker modal
3. Open commit message modal
4. Evaluate appearance

**Expected Results:**
- [ ] Text is readable (good contrast)
- [ ] Selection highlighting is visible
- [ ] Buttons are styled appropriately
- [ ] Modal background is appropriate
- [ ] No visual glitches

**Notes:**


#### Test 6.2: Modal Styling - Dark Mode
**Steps:**
1. Switch Obsidian to dark theme
2. Open repository picker modal
3. Open commit message modal
4. Evaluate appearance

**Expected Results:**
- [ ] Text is readable (good contrast)
- [ ] Selection highlighting is visible
- [ ] Buttons are styled appropriately
- [ ] Modal background is appropriate
- [ ] No visual glitches

**Notes:**


#### Test 6.3: Loading State Visual Feedback
**Steps:**
1. Trigger commit+push workflow
2. Submit commit
3. Observe loading state

**Expected Results:**
- [ ] Submit button shows loading indicator (spinner or text change)
- [ ] Submit button is disabled during operation
- [ ] Cancel button behavior is appropriate (disabled or hidden during submit)
- [ ] Loading state is visible and clear

**Notes:**


#### Test 6.4: Modal Positioning and Sizing
**Steps:**
1. Open modals on different screen sizes
2. Resize Obsidian window
3. Observe modal behavior

**Expected Results:**
- [ ] Modals are centered in viewport
- [ ] Modals are appropriately sized (not too large or small)
- [ ] Content is fully visible (no cutoff)
- [ ] Modals are responsive to window size changes

**Notes:**


#### Test 6.5: Focus Management
**Steps:**
1. Open commit message modal
2. Observe initial focus
3. Tab through elements
4. Submit and observe

**Expected Results:**
- [ ] Textarea has focus when modal opens
- [ ] Tab key moves focus appropriately
- [ ] Enter key in textarea submits form
- [ ] Focus returns to appropriate location after modal closes

**Notes:**


### 7. Edge Cases

#### Test 7.1: Very Long Repository Names
**Steps:**
1. Configure repository with very long name (60+ characters)
2. Make changes
3. Trigger workflow

**Expected Results:**
- [ ] Repository name displays without breaking layout
- [ ] Text wraps or truncates appropriately
- [ ] Picker remains usable
- [ ] Commit modal displays name correctly

**Notes:**


#### Test 7.2: Very Long Filenames
**Steps:**
1. Create file with very long name (100+ characters)
2. Modify it
3. Trigger workflow

**Expected Results:**
- [ ] File list handles long names gracefully
- [ ] Layout doesn't break
- [ ] Commit message suggestion may abbreviate filename
- [ ] Modal remains functional

**Notes:**


#### Test 7.3: Special Characters in Filenames
**Steps:**
1. Create files with spaces, dashes, underscores, unicode characters
2. Modify them
3. Trigger workflow

**Expected Results:**
- [ ] Files display correctly in list
- [ ] Commit message suggestion handles special chars
- [ ] Commit and push succeed
- [ ] No encoding issues

**Notes:**


#### Test 7.4: Large Number of Changed Files
**Steps:**
1. Modify 50+ files in a repository
2. Trigger workflow
3. Submit commit

**Expected Results:**
- [ ] File list shows first 10 with "and 40 more..."
- [ ] Commit message suggests "Update 50 files"
- [ ] Commit operation completes successfully
- [ ] Push operation completes (may take longer)
- [ ] UI remains responsive

**Notes:**


#### Test 7.5: Binary Files
**Steps:**
1. Add or modify binary files (images, PDFs, etc.)
2. Trigger workflow
3. Observe behavior

**Expected Results:**
- [ ] Binary files appear in changed files list
- [ ] Commit message suggestion handles binary files appropriately
- [ ] Commit and push succeed

**Notes:**


#### Test 7.6: Renamed Files
**Steps:**
1. Rename a file using git (`git mv oldname newname`)
2. Trigger workflow
3. Observe behavior

**Expected Results:**
- [ ] Renamed file is detected correctly
- [ ] File appears as renamed in git status
- [ ] Commit message suggestion is appropriate
- [ ] Commit and push succeed

**Notes:**


### 8. Integration Testing

#### Test 8.1: Command Palette Integration
**Steps:**
1. Open Obsidian command palette (Cmd/Ctrl+P)
2. Search for "commit and push"
3. Execute command from palette

**Expected Results:**
- [ ] Command appears in palette: "Commit and push changes"
- [ ] Executing from palette works same as hotkey
- [ ] Workflow completes successfully

**Notes:**


#### Test 8.2: Hotkey Configuration
**Steps:**
1. Open Obsidian settings > Hotkeys
2. Search for "multi-git"
3. Find and configure hotkey for commit+push command

**Expected Results:**
- [ ] Command appears in hotkey settings
- [ ] Command name is clear: "Multi-Git: Commit and push changes"
- [ ] Hotkey can be assigned/changed
- [ ] Assigned hotkey triggers command correctly

**Notes:**


#### Test 8.3: Interaction with Other Git Operations
**Steps:**
1. Trigger commit+push workflow
2. While commit modal is open, manually run git commands in terminal
3. Complete commit via modal

**Expected Results:**
- [ ] Manual git operations don't interfere with plugin
- [ ] Plugin detects current state correctly
- [ ] No race conditions or conflicts

**Notes:**


### 9. Performance Testing

#### Test 9.1: Status Check Performance
**Steps:**
1. Configure 10+ repositories
2. Make changes to several
3. Trigger workflow
4. Measure time from hotkey to picker appearing

**Expected Results:**
- [ ] Status check completes in <2 seconds for 10 repos
- [ ] UI remains responsive during check
- [ ] No noticeable lag

**Notes:**


#### Test 9.2: Large Repository Performance
**Steps:**
1. Use repository with 1000+ files
2. Modify several files
3. Trigger commit+push workflow
4. Submit commit

**Expected Results:**
- [ ] Status check completes in reasonable time (<5s)
- [ ] File list renders efficiently
- [ ] Commit operation completes successfully
- [ ] Push operation completes successfully
- [ ] No UI freezing

**Notes:**


## Summary

### Test Results
- **Total Tests:** 52
- **Passed:** ___
- **Failed:** ___
- **Notes:** ___

### Critical Issues Found
List any critical issues that block basic functionality:

1. 
2. 
3. 

### Non-Critical Issues Found
List minor issues or improvements:

1. 
2. 
3. 

### Sign-Off

**Tester:** _______________
**Date:** _______________
**Status:** ⬜ Approved / ⬜ Requires Changes

**Notes:**


---

## Post-Testing Actions

After completing manual testing:

1. **Document Issues:** Create GitHub issues for any bugs found
2. **Update Documentation:** Ensure README and docs reflect actual behavior
3. **Performance Optimization:** Address any performance issues identified
4. **UX Improvements:** Consider any UX enhancements based on testing feedback
5. **Mark FR-3 Complete:** Update spec.md to mark FR-3 as implemented
