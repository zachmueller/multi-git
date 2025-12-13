# Manual Testing Checklist: FR-2 Notification System

**Feature:** Automated Remote Fetch - Notification System (Phase 4)
**Created:** 2025-01-12
**Status:** Ready for Testing

## Overview

This checklist validates the notification system for remote changes and fetch errors. Notifications should appear correctly in Obsidian, be dismissible, and respect user settings.

## Prerequisites

- [ ] Multi-Git plugin built and loaded in Obsidian (`npm run dev`)
- [ ] At least 2 test repositories configured
- [ ] Test repositories have remote changes available (simulate by committing in remote)
- [ ] Network connectivity available
- [ ] **[FR-7]** Custom PATH entries configured if testing with credential helpers (e.g., AWS CodeCommit)
- [ ] **[FR-7]** Verify `~/.cargo/bin` or other credential helper paths are in Custom PATH settings

## Test Scenarios

### 1. Remote Change Notifications

#### Test 1.1: Basic Remote Change Notification
**Steps:**
1. Configure a repository with remote changes available
2. Trigger manual fetch for that repository
3. Observe notification appearance

**Expected Results:**
- [ ] Notification appears with format: "📥 Repository 'name' has N new commit(s) available"
- [ ] Notification is visible in top-right of Obsidian window
- [ ] Notification shows correct repository name
- [ ] Notification shows correct commit count
- [ ] Notification is dismissible by clicking X or waiting

**Notes:**


#### Test 1.2: Singular vs Plural Commit Text
**Steps:**
1. Create scenario with exactly 1 new commit
2. Trigger fetch
3. Observe notification text

**Expected Results:**
- [ ] Notification uses "1 new commit" (singular, not "commits")

**Steps:**
1. Create scenario with 3+ new commits
2. Trigger fetch
3. Observe notification text

**Expected Results:**
- [ ] Notification uses "N new commits" (plural)

**Notes:**


#### Test 1.3: Multiple Repository Notifications
**Steps:**
1. Configure 3 repositories, each with remote changes
2. Trigger "Fetch All Now" operation
3. Observe notifications

**Expected Results:**
- [ ] Separate notification appears for each repository with changes
- [ ] Each notification clearly identifies which repository
- [ ] Notifications are stacked/queued appropriately
- [ ] All notifications are dismissible individually

**Notes:**


#### Test 1.4: Notification Cooldown (Duplicate Prevention)
**Steps:**
1. Trigger fetch for repository with remote changes
2. Observe notification
3. Immediately trigger fetch again for same repository
4. Observe behavior

**Expected Results:**
- [ ] First fetch shows notification
- [ ] Second fetch does NOT show duplicate notification (within 60 second cooldown)
- [ ] Wait 61 seconds and trigger fetch again
- [ ] Third fetch shows notification again (cooldown expired)

**Notes:**


### 2. Error Notifications

#### Test 2.1: Network Error Notification
**Steps:**
1. Disconnect network or configure repository with unreachable remote
2. Trigger manual fetch
3. Observe notification

**Expected Results:**
- [ ] Error notification appears with format: "⚠️ Failed to fetch repository 'name': error"
- [ ] Error message is clear and understandable
- [ ] Notification has warning icon (⚠️)
- [ ] Notification is dismissible
- [ ] Notification duration is longer than success notifications

**Notes:**


#### Test 2.2: Multiple Error Notifications
**Steps:**
1. Configure 2 repositories with network errors
2. Trigger fetch for both
3. Observe notifications

**Expected Results:**
- [ ] Separate error notification for each repository
- [ ] Each notification clearly identifies which repository failed
- [ ] Error messages are repository-specific

**Notes:**


#### Test 2.3: Error Cooldown (Spam Prevention)
**Steps:**
1. Configure repository to fail fetch (e.g., network error)
2. Trigger fetch twice in rapid succession
3. Observe notification behavior

**Expected Results:**
- [ ] First error shows notification
- [ ] Second error does NOT show duplicate notification (cooldown prevents spam)
- [ ] Wait 61 seconds and trigger fetch again
- [ ] Third error shows notification again (cooldown expired)

**Notes:**


### 3. Settings Integration

#### Test 3.1: Notifications Enabled (Default)
**Steps:**
1. Verify "Notify on Remote Changes" setting is enabled (default)
2. Trigger fetch with remote changes
3. Observe behavior

**Expected Results:**
- [ ] Notification appears for remote changes
- [ ] Notification appears for errors

**Notes:**


#### Test 3.2: Notifications Disabled
**Steps:**
1. Disable "Notify on Remote Changes" setting
2. Trigger fetch with remote changes
3. Trigger fetch with error
4. Observe behavior

**Expected Results:**
- [ ] NO notification appears for remote changes
- [ ] NO notification appears for errors
- [ ] Fetch operations still execute normally
- [ ] Status updates still occur (verified in settings UI)

**Notes:**


#### Test 3.3: Settings Toggle While Running
**Steps:**
1. Enable notifications and trigger fetch with changes (notification appears)
2. Disable notifications in settings
3. Trigger another fetch with changes
4. Re-enable notifications
5. Trigger another fetch with changes

**Expected Results:**
- [ ] First fetch shows notification (enabled)
- [ ] Second fetch does NOT show notification (disabled)
- [ ] Third fetch shows notification again (re-enabled)

**Notes:**


### 4. Notification Appearance and UX

#### Test 4.1: Visual Design
**Steps:**
1. Trigger various notifications
2. Examine visual appearance

**Expected Results:**
- [ ] Notifications follow Obsidian's visual design language
- [ ] Text is clear and readable
- [ ] Icons are appropriate (📥 for changes, ⚠️ for errors)
- [ ] Notifications don't obstruct important UI elements
- [ ] Duration is appropriate (8s for changes, 10s for errors)

**Notes:**


#### Test 4.2: Dismissibility
**Steps:**
1. Show notification
2. Click X button to dismiss
3. Show another notification
4. Wait for auto-dismiss

**Expected Results:**
- [ ] Clicking X dismisses notification immediately
- [ ] Notification auto-dismisses after duration expires
- [ ] Dismissal is smooth and doesn't cause UI flicker

**Notes:**


#### Test 4.3: Message Clarity
**Steps:**
1. Show various notifications with different scenarios
2. Evaluate message clarity

**Expected Results:**
- [ ] Repository name is clearly visible
- [ ] Commit count is clearly stated
- [ ] Error messages are understandable
- [ ] No technical jargon that confuses users
- [ ] Messages are concise (not too long)

**Notes:**


### 5. Edge Cases

#### Test 5.1: Very Long Repository Names
**Steps:**
1. Configure repository with very long name (50+ characters)
2. Trigger notification

**Expected Results:**
- [ ] Notification handles long names gracefully (wraps or truncates)
- [ ] Message remains readable
- [ ] UI doesn't break

**Notes:**


#### Test 5.2: Special Characters in Repository Name
**Steps:**
1. Configure repository with special characters in name (e.g., "My-Repo_v2.0")
2. Trigger notification

**Expected Results:**
- [ ] Special characters display correctly
- [ ] No encoding issues
- [ ] Message formatting intact

**Notes:**


#### Test 5.3: Many Notifications Simultaneously
**Steps:**
1. Configure 5+ repositories all with remote changes
2. Trigger "Fetch All Now"
3. Observe notification behavior

**Expected Results:**
- [ ] All notifications appear (may queue)
- [ ] Notifications don't overlap confusingly
- [ ] System remains responsive
- [ ] All notifications are dismissible

**Notes:**


#### Test 5.4: Rapid Repository Updates
**Steps:**
1. Simulate rapid fetch operations across different repos
2. Observe notification flow

**Expected Results:**
- [ ] Notifications appear in reasonable order
- [ ] No notification is lost
- [ ] Cooldown correctly tracks per repository
- [ ] No notification spam

**Notes:**


### 6. Integration with Fetch Operations

#### Test 6.1: Successful Fetch with Changes
**Steps:**
1. Trigger fetch for repository with remote changes
2. Observe complete flow

**Expected Results:**
- [ ] Fetch executes successfully
- [ ] Remote changes detected correctly
- [ ] Notification appears
- [ ] Repository status updates in settings
- [ ] No errors in console

**Notes:**


#### Test 6.2: Successful Fetch without Changes
**Steps:**
1. Trigger fetch for repository with no remote changes
2. Observe behavior

**Expected Results:**
- [ ] Fetch executes successfully
- [ ] No notification appears (correct - no changes)
- [ ] Repository status shows success
- [ ] No false positives

**Notes:**


#### Test 6.3: Failed Fetch with Error Notification
**Steps:**
1. Configure fetch to fail (network error, auth error)
2. Trigger fetch
3. Observe complete flow

**Expected Results:**
- [ ] Fetch fails as expected
- [ ] Error notification appears
- [ ] Error message is clear
- [ ] Repository status shows error in settings
- [ ] Error is logged to console

**Notes:**


## Summary

### Test Results
- **Total Tests:** 23
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
**Status:** ☐ Approved  ☐ Issues Found  ☐ Blocked

**Notes:**

---

## FR-7 Custom PATH Configuration - Next Steps

**Implementation Status:** Core functionality complete (Phases 1-4)
**Remaining Work:**

### Immediate Testing Priorities
1. **Verify AWS CodeCommit Repository Works**
   - Test fetch with 'zm' repository that previously failed
   - Confirm `git-remote-codecommit` is found via custom PATH
   - Enable debug logging (`debugLogging: true` in data.json) to see enhanced PATH in console
   - Verify no "git: 'remote-codecommit' is not a git command" error

2. **Test Settings UI**
   - Open plugin settings and locate "Custom PATH entries" setting
   - Verify default paths are displayed: `~/.cargo/bin`, `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin`
   - Modify PATH entries and verify they save correctly
   - Test that changes take effect immediately (no reload required)

3. **Verify No Regressions**
   - Test existing repositories (non-CodeCommit) still work
   - Verify fetch operations complete successfully
   - Check that standard git operations are not impacted

### After Testing - Remaining Implementation Tasks

#### Phase 5: Add Tests (Not Yet Started)
- [ ] Add unit tests for `buildEnhancedPath()` method
  - Test tilde expansion
  - Test path validation (absolute paths, no shell metacharacters)
  - Test duplicate removal
  - Test platform-specific path separators
- [ ] Add integration tests for GitCommandService with custom PATH
- [ ] Update existing tests that instantiate GitCommandService (now requires settings parameter)

#### Phase 6: Documentation (Not Yet Started)
- [ ] Update `docs/configuration.md` with Custom PATH Configuration section
- [ ] Add troubleshooting guide for credential helper issues
- [ ] Document common scenarios (AWS CodeCommit, GitHub CLI, etc.)
- [ ] Update `README.md` to mention PATH configuration capability

#### Phase 7: Finalization (Not Yet Started)
- [ ] Review all code changes for quality
- [ ] Run full test suite
- [ ] Perform final manual testing
- [ ] Update `CHANGELOG.md` with new feature
- [ ] Mark FR-7 spec as "Implemented"
- [ ] Create final commit with all remaining changes

### Key Files Modified in FR-7 Implementation
- `src/settings/data.ts` - Added `customPathEntries` field to settings model
- `src/services/GitCommandService.ts` - Added PATH enhancement logic
- `src/services/RepositoryConfigService.ts` - Updated to accept GitCommandService instance
- `src/main.ts` - Updated dependency injection
- `src/settings/SettingTab.ts` - Added Custom PATH entries UI
- `specs/1-multi-git-core/fr7/tasks.md` - Implementation task tracking

### Testing Notes
If the AWS CodeCommit repository ('zm') now works correctly:
- ✅ FR-7 implementation is successful
- Proceed with remaining phases (tests, documentation, finalization)

If issues remain:
- Check debug logs to verify PATH is being enhanced correctly
- Verify `git-remote-codecommit` is actually installed in one of the configured paths
- Check that credential helper is properly configured in git config
- Review GitCommandService implementation for any issues
