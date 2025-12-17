# Manual Testing Checklist: FR-2 Notification System

**Feature:** Automated Remote Fetch - Notification System (Phase 4)
**Created:** 2025-01-12
**Status:** Ready for Testing

## Overview

This checklist validates the notification system for remote changes and fetch errors. Notifications should appear correctly in Obsidian, be dismissible, and respect user settings.

## Prerequisites

- [x] Multi-Git plugin built and loaded in Obsidian (`npm run dev`)
- [x] At least 2 test repositories configured
- [x] Test repositories have remote changes available (simulate by committing in remote)
- [x] Network connectivity available
- [x] **[FR-7]** Custom PATH entries configured if testing with credential helpers (e.g., AWS CodeCommit)
- [x] **[FR-7]** Verify `~/.cargo/bin` or other credential helper paths are in Custom PATH settings

## Test Scenarios

### 1. Remote Change Notifications

#### Test 1.1: Basic Remote Change Notification
**Steps:**
1. Configure a repository with remote changes available
2. Trigger manual fetch for that repository
3. Observe notification appearance

**Expected Results:**
- [x] Notification appears with format: "📥 Repository 'name' has N new commit(s) available"
- [x] Notification is visible in top-right of Obsidian window
- [x] Notification shows correct repository name
- [x] Notification shows correct commit count
- [x] Notification is dismissible by clicking X or waiting

**Notes:**


#### Test 1.2: Singular vs Plural Commit Text
**Steps:**
1. Create scenario with exactly 1 new commit
2. Trigger fetch
3. Observe notification text

**Expected Results:**
- [x] Notification uses "1 new commit" (singular, not "commits")

**Steps:**
1. Create scenario with 3+ new commits
2. Trigger fetch
3. Observe notification text

**Expected Results:**
- [x] Notification uses "N new commits" (plural)

**Notes:**


#### Test 1.3: Multiple Repository Notifications
**Steps:**
1. Configure 3 repositories, each with remote changes
2. Trigger "Fetch All Now" operation
3. Observe notifications

**Expected Results:**
- [x] Separate notification appears for each repository with changes
- [x] Each notification clearly identifies which repository
- [x] Notifications are stacked/queued appropriately
- [x] All notifications are dismissible individually

**Notes:**


#### Test 1.4: Notification Cooldown (Duplicate Prevention)
**Steps:**
1. Trigger fetch for repository with remote changes
2. Observe notification
3. Immediately trigger fetch again for same repository
4. Observe behavior

**Expected Results:**
- [x] First fetch shows notification
- [x] Second fetch does NOT show duplicate notification (within 60 second cooldown)
- [x] Wait 61 seconds and trigger fetch again
- [x] Third fetch shows notification again (cooldown expired)

**Notes:**


### 2. Error Notifications

#### Test 2.1: Network Error Notification
**Steps:**
1. Disconnect network or configure repository with unreachable remote
2. Trigger manual fetch
3. Observe notification

**Expected Results:**
- [x] Error notification appears with format: "⚠️ Failed to fetch repository 'name': error"
- [ ] Error message is clear and understandable
- [x] Notification has warning icon (⚠️)
- [x] Notification is dismissible
- [x] Notification duration is longer than success notifications

**Notes:**

- The error message is quite verbose (fills up beyond the height of my entire screen). This seems to be because the failure is showing the full error trace
- For now, I'm fine with this behavior. We can later revisit if it becomes annoying. No action needed.

#### Test 2.2: Multiple Error Notifications
**Steps:**
1. Configure 2 repositories with network errors
2. Trigger fetch for both
3. Observe notifications

**Expected Results:**
- [x] Separate error notification for each repository
- [x] Each notification clearly identifies which repository failed
- [x] Error messages are repository-specific

**Notes:**


#### Test 2.3: Error Cooldown (Spam Prevention)
**Steps:**
1. Configure repository to fail fetch (e.g., network error)
2. Trigger fetch twice in rapid succession
3. Observe notification behavior

**Expected Results:**
- [x] First error shows notification
- [x] Second error does NOT show duplicate notification (cooldown prevents spam)
- [x] Wait 61 seconds and trigger fetch again
- [x] Third error shows notification again (cooldown expired)

**Notes:**


### 3. Settings Integration

#### Test 3.1: Notifications Enabled (Default)
**Steps:**
1. Verify "Notify on Remote Changes" setting is enabled (default)
2. Trigger fetch with remote changes
3. Observe behavior

**Expected Results:**
- [x] Notification appears for remote changes
- [x] Notification appears for errors

**Notes:**


#### Test 3.2: Notifications Disabled
**Steps:**
1. Disable "Notify on Remote Changes" setting
2. Trigger fetch with remote changes
3. Trigger fetch with error
4. Observe behavior

**Expected Results:**
- [x] NO notification appears for remote changes
- [x] NO notification appears for errors
- [x] Fetch operations still execute normally
- [x] Status updates still occur (verified in settings UI)

**Notes:**


#### Test 3.3: Settings Toggle While Running
**Steps:**
1. Enable notifications and trigger fetch with changes (notification appears)
2. Disable notifications in settings
3. Trigger another fetch with changes
4. Re-enable notifications
5. Trigger another fetch with changes

**Expected Results:**
- [x] First fetch shows notification (enabled)
- [x] Second fetch does NOT show notification (disabled)
- [x] Third fetch shows notification again (re-enabled)

**Notes:**


### 4. Notification Appearance and UX

#### Test 4.1: Visual Design
**Steps:**
1. Trigger various notifications
2. Examine visual appearance

**Expected Results:**
- [x] Notifications follow Obsidian's visual design language
- [x] Text is clear and readable
- [x] Icons are appropriate (📥 for changes, ⚠️ for errors)
- [x] Notifications don't obstruct important UI elements
- [x] Duration is appropriate (8s for changes, 10s for errors)

**Notes:**


#### Test 4.2: Dismissibility
**Steps:**
1. Show notification
2. Click X button to dismiss
3. Show another notification
4. Wait for auto-dismiss

**Expected Results:**
- [x] Clicking X dismisses notification immediately
- [x] Notification auto-dismisses after duration expires
- [x] Dismissal is smooth and doesn't cause UI flicker

**Notes:**


#### Test 4.3: Message Clarity
**Steps:**
1. Show various notifications with different scenarios
2. Evaluate message clarity

**Expected Results:**
- [x] Repository name is clearly visible
- [x] Commit count is clearly stated
- [x] Error messages are understandable
- [x] No technical jargon that confuses users
- [x] Messages are concise (not too long)

**Notes:**


### 5. Edge Cases

#### Test 5.1: Very Long Repository Names
**Steps:**
1. Configure repository with very long name (50+ characters)
2. Trigger notification

**Expected Results:**
- [x] Notification handles long names gracefully (wraps or truncates)
- [x] Message remains readable
- [x] UI doesn't break

**Notes:**


#### Test 5.2: Special Characters in Repository Name
**Steps:**
1. Configure repository with special characters in name (e.g., "My-Repo_v2.0")
2. Trigger notification

**Expected Results:**
- [x] Special characters display correctly
- [x] No encoding issues
- [x] Message formatting intact

**Notes:**


#### Test 5.3: Many Notifications Simultaneously
**Steps:**
1. Configure 5+ repositories all with remote changes
2. Trigger "Fetch All Now"
3. Observe notification behavior

**Expected Results:**
- [x] All notifications appear (may queue)
- [x] Notifications don't overlap confusingly
- [x] System remains responsive
- [x] All notifications are dismissible

**Notes:**


#### Test 5.4: Rapid Repository Updates
**Steps:**
1. Simulate rapid fetch operations across different repos
2. Observe notification flow

**Expected Results:**
- [x] Notifications appear in reasonable order
- [x] No notification is lost
- [x] Cooldown correctly tracks per repository
- [x] No notification spam

**Notes:**


### 6. Integration with Fetch Operations

#### Test 6.1: Successful Fetch with Changes
**Steps:**
1. Trigger fetch for repository with remote changes
2. Observe complete flow

**Expected Results:**
- [x] Fetch executes successfully
- [x] Remote changes detected correctly
- [x] Notification appears
- [x] Repository status updates in settings
- [x] No errors in console

**Notes:**


#### Test 6.2: Successful Fetch without Changes
**Steps:**
1. Trigger fetch for repository with no remote changes
2. Observe behavior

**Expected Results:**
- [x] Fetch executes successfully
- [x] No notification appears (correct - no changes)
- [x] Repository status shows success
- [x] No false positives

**Notes:**


#### Test 6.3: Failed Fetch with Error Notification
**Steps:**
1. Configure fetch to fail (network error, auth error)
2. Trigger fetch
3. Observe complete flow

**Expected Results:**
- [x] Fetch fails as expected
- [x] Error notification appears
- [x] Error message is clear
- [x] Repository status shows error in settings
- [x] Error is logged to console

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

**Tester:** zmueller
**Date:** 2025-12-14
**Status:** ✅ Approved

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
