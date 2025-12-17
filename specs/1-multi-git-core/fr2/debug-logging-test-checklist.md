# Debug Logging Manual Testing Checklist

**Feature:** FR-6 Debug Logging  
**Date Created:** 2025-01-12  
**Status:** Ready for Testing

## Prerequisites

- [ ] Multi-Git plugin installed and working
- [ ] At least one repository configured
- [ ] Access to Obsidian Developer Console (Cmd+Option+I / Ctrl+Shift+I)
- [ ] Text editor for editing data.json

## Test Environment Setup

### Setup 1: Enable Debug Logging
- [ ] Close Obsidian completely
- [ ] Navigate to vault's plugin data directory
- [ ] Open `data.json` in text editor
- [ ] Add `"debugLogging": true` to settings
- [ ] Save file
- [ ] Restart Obsidian
- [ ] Open Developer Console
- [ ] Verify no errors in console

## Test Scenarios

### TC-1: Plugin Lifecycle Logging

**Objective:** Verify debug logs appear during plugin load/unload

**Steps:**
1. [ ] With debug logging enabled, restart Obsidian
2. [ ] Open Developer Console
3. [ ] Look for plugin loading logs

**Expected Results:**
- [ ] See log: `[Multi-Git Debug] [...] [Plugin] Multi-Git plugin loading`
- [ ] Log includes ISO timestamp
- [ ] Log includes component name (Plugin)

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-2: Fetch Scheduler Startup Logging

**Objective:** Verify scheduler logs when starting automated fetch

**Steps:**
1. [ ] Have 2-3 enabled repositories configured
2. [ ] Restart Obsidian with debug logging enabled
3. [ ] Check console for scheduler logs

**Expected Results:**
- [ ] See log: `[FetchScheduler] Starting automated fetch for X enabled repositories`
- [ ] See log: `[FetchScheduler] Scheduling repository ... with interval ...ms`
- [ ] One scheduling log per enabled repository
- [ ] See log: `[FetchScheduler] All repositories scheduled successfully`

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-3: Git Command Execution Logging

**Objective:** Verify git commands are logged with sanitization

**Steps:**
1. [ ] Trigger manual fetch on a repository
2. [ ] Watch console for git command logs

**Expected Results:**
- [ ] See log: `[GitCommand] Executing git command in /path/to/repo: git fetch --all --tags --prune`
- [ ] Repository path is shown
- [ ] Git command is shown
- [ ] See success log: `[GitCommand] Git command succeeded in ...ms`
- [ ] Timing information included
- [ ] No credentials visible in logs

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-4: Fetch Operation Timing

**Objective:** Verify timing logs for fetch operations

**Steps:**
1. [ ] Trigger manual fetch on repository
2. [ ] Observe timing logs in console

**Expected Results:**
- [ ] See log: `[GitCommand] Starting fetch for repository: /path/to/repo`
- [ ] See log: `[GitCommand] Fetch operation completed in ...ms (repo-name)`
- [ ] Duration is reasonable (typically 500-5000ms)
- [ ] See log: `[FetchScheduler] Complete fetch operation completed in ...ms`

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-5: Remote Change Detection Logging

**Objective:** Verify logs for remote change detection

**Steps:**
1. [ ] Have repository with remote changes available
2. [ ] Trigger fetch operation
3. [ ] Check logs for change detection

**Expected Results:**
- [ ] See log: `[GitCommand] Checking remote changes for repository: /path/to/repo`
- [ ] See log: `[GitCommand] Remote change detection complete for ...`
- [ ] Log includes JSON object with status details
- [ ] If changes detected: `[FetchScheduler] Remote changes detected for ...: X commits behind`

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-6: Repository Configuration Logging

**Objective:** Verify configuration changes are logged

**Steps:**
1. [ ] Add new repository via settings UI
2. [ ] Check console for config logs

**Expected Results:**
- [ ] See log: `[RepositoryConfig] Added new repository: ... (/path/to/repo)`
- [ ] See log: `[RepositoryConfig] Repository configuration persisted for ...`
- [ ] Repository name and path included

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-7: Status Update Logging

**Objective:** Verify status updates are logged

**Steps:**
1. [ ] Perform fetch operation
2. [ ] Watch for status update logs

**Expected Results:**
- [ ] See log: `[RepositoryConfig] Updated fetch status for ...: success`
- [ ] See log: `[RepositoryConfig] Recorded fetch result for ...: success, remoteChanges: false`
- [ ] Status and remote changes flag shown

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-8: Notification Logging

**Objective:** Verify notification triggers are logged

**Steps:**
1. [ ] Have repository with remote changes
2. [ ] Ensure notifications enabled in settings
3. [ ] Trigger fetch to detect changes
4. [ ] Check logs for notification events

**Expected Results:**
- [ ] See log: `[Notification] Showing remote changes notification for ...: X commits`
- [ ] Commit count included
- [ ] Repository name shown

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-9: Notification Suppression Logging

**Objective:** Verify notification suppression is logged

**Steps:**
1. [ ] Disable notifications in settings
2. [ ] Trigger fetch with remote changes
3. [ ] Check for suppression logs

**Expected Results:**
- [ ] See log: `[Notification] Notification suppressed (disabled in settings): remote changes for ...`
- [ ] No actual notification shown
- [ ] Clear reason for suppression

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-10: Error Logging

**Objective:** Verify errors are logged with details

**Steps:**
1. [ ] Trigger fetch on repository with network issue
2. [ ] Observe error logs

**Expected Results:**
- [ ] See log: `[GitCommand] Fetch failed after ...ms for /path/to/repo`
- [ ] Error object included with sanitized details
- [ ] See log: `[FetchScheduler] Fetch operation failed after ...ms for ...`
- [ ] Duration shown even for failures

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-11: Batch Fetch Logging

**Objective:** Verify batch fetch operations are logged

**Steps:**
1. [ ] Have 3+ enabled repositories
2. [ ] Click "Fetch All Now" button
3. [ ] Monitor console during batch fetch

**Expected Results:**
- [ ] See log: `[FetchScheduler] Starting batch fetch for X enabled repositories`
- [ ] Individual fetch logs for each repository
- [ ] See log: `[FetchScheduler] Batch fetch operation completed in ...ms (X/Y successful)`
- [ ] Success count and total count shown

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-12: Settings Migration Logging

**Objective:** Verify settings migration is logged

**Steps:**
1. [ ] Edit data.json to remove `debugLogging` field
2. [ ] Restart Obsidian
3. [ ] Check for migration logs

**Expected Results:**
- [ ] See log: `[RepositoryConfig] Settings migration completed: X/Y repositories migrated`
- [ ] Migration count shown
- [ ] No errors during migration

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-13: Credential Sanitization

**Objective:** Verify sensitive data is never logged

**Steps:**
1. [ ] Create repository with HTTPS URL containing credentials (test only!)
2. [ ] Trigger operations and search logs
3. [ ] Verify no credentials visible

**Expected Results:**
- [ ] No passwords visible in logs
- [ ] No tokens visible in logs
- [ ] URLs with credentials show: `https://***:***@host`
- [ ] SSH URLs show: `ssh://***@host`
- [ ] Bearer tokens masked: `Bearer ***`

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-14: Performance with Debug Logging Disabled

**Objective:** Verify negligible overhead when disabled

**Steps:**
1. [ ] Set `debugLogging: false` in data.json
2. [ ] Restart Obsidian
3. [ ] Perform multiple fetch operations
4. [ ] Check console - should be no debug logs

**Expected Results:**
- [ ] No `[Multi-Git Debug]` logs appear
- [ ] Fetch operations complete normally
- [ ] No performance degradation
- [ ] Plugin functions identically

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-15: Log Format Consistency

**Objective:** Verify all logs follow consistent format

**Steps:**
1. [ ] Enable debug logging
2. [ ] Perform various operations
3. [ ] Review multiple log entries

**Expected Results:**
- [ ] All logs start with `[Multi-Git Debug]`
- [ ] All logs include ISO timestamp: `[2025-01-12T22:30:15.123Z]`
- [ ] All logs include component: `[Component]`
- [ ] Message follows component
- [ ] Format is consistent across all log types

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### TC-16: Disable Debug Logging

**Objective:** Verify logging can be disabled cleanly

**Steps:**
1. [ ] With debug logging enabled, note logs appearing
2. [ ] Close Obsidian
3. [ ] Edit data.json: `"debugLogging": false`
4. [ ] Restart Obsidian
5. [ ] Verify no debug logs

**Expected Results:**
- [ ] No `[Multi-Git Debug]` logs after restart
- [ ] Plugin continues working normally
- [ ] Settings persist correctly
- [ ] No errors from disabling logging

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

## Edge Cases

### EC-1: Missing debugLogging Field

**Scenario:** Configuration file doesn't have `debugLogging` field

**Steps:**
1. [ ] Remove `debugLogging` from data.json
2. [ ] Restart Obsidian
3. [ ] Check behavior

**Expected Results:**
- [ ] Plugin uses default (false)
- [ ] Migration adds field with `false` value
- [ ] No errors occur
- [ ] No debug logs appear

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### EC-2: Invalid debugLogging Value

**Scenario:** debugLogging field has invalid value

**Steps:**
1. [ ] Set `"debugLogging": "invalid"` in data.json
2. [ ] Restart Obsidian
3. [ ] Check handling

**Expected Results:**
- [ ] Plugin handles gracefully
- [ ] Treats as false (default)
- [ ] No crash or errors
- [ ] Logs warning about invalid value (optional)

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

---

### EC-3: Very Long Log Messages

**Scenario:** Operations with very long paths or error messages

**Steps:**
1. [ ] Use repository with very long path (200+ chars)
2. [ ] Trigger operations
3. [ ] Check logs display correctly

**Expected Results:**
- [ ] Long paths logged completely
- [ ] No truncation of important info
- [ ] Console handles long messages
- [ ] Performance remains acceptable

**Test Results:**
- Date Tested: ___________
- Result: [ ] Pass [ ] Fail
- Notes: ___________

## Documentation Verification

### DOC-1: README Documentation

**Check:**
- [ ] Debug logging section exists in README
- [ ] Instructions clear and accurate
- [ ] Example logs shown
- [ ] Security notes included

### DOC-2: Configuration Guide

**Check:**
- [ ] Debug logging documented in docs/configuration.md
- [ ] How to enable/disable explained
- [ ] Log format documented
- [ ] Use cases described

## Summary

**Total Test Cases:** 16 core + 3 edge cases = 19  
**Tests Passed:** _____  
**Tests Failed:** _____  
**Pass Rate:** _____%

**Overall Status:** [ ] Ready for Production [ ] Needs Fixes

**Critical Issues Found:**
- _____________________
- _____________________

**Minor Issues Found:**
- _____________________
- _____________________

**Recommendations:**
- _____________________
- _____________________

**Tester Signature:** _________________  
**Date:** _________________
