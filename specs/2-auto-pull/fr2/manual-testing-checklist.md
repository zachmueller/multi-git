# Manual Testing Checklist: FR-2 Automatic Fast-Forward Pull

**Feature:** Automatic Fast-Forward Pull
**Specification:** [specs/2-auto-pull/spec.md](../spec.md)
**Implementation Plan:** [plan.md](plan.md)
**Date:** 2025-12-15
**Tester:** _____________
**Platform:** macOS / Windows / Linux _(circle one)_

## Test Environment Setup

### Prerequisites
- [ ] Multi-Git plugin installed and enabled in Obsidian
- [ ] FR-1 (Fast-Forward Detection) implemented and tested
- [ ] At least 4 test repositories configured
- [ ] Git installed and accessible from command line (git 2.20.0+)
- [ ] Test vault opened in Obsidian
- [ ] Debug logging enabled in plugin settings
- [ ] Auto-pull enabled in settings (default state)

### Test Repositories Setup
Create test scenarios:
1. **Repo A (Clean Fast-Forward):** Local behind remote, clean working directory
2. **Repo B (Uncommitted Changes):** Local behind remote, has uncommitted changes
3. **Repo C (Diverged):** Local and remote diverged
4. **Repo D (Up to Date):** Local and remote synchronized
5. **Repo E (Disabled):** Auto-pull disabled for this repository

## Test Scenarios

### Scenario 1: Successful Automatic Pull (Critical)

**Setup:**
```bash
# In test repository
git fetch origin
git reset --hard origin/main~3  # Put local 3 commits behind
# Ensure working directory is clean
git status --porcelain  # Should be empty
```

**Test Steps:**
1. [ ] Trigger fetch operation (manual or wait for auto-fetch)
2. [ ] Verify auto-pull executes automatically
3. [ ] Check debug logs:
   - [ ] Fast-forward detection: 'can-fast-forward'
   - [ ] Safety checks: all passed
   - [ ] Pull command: `git pull --ff-only` executed
   - [ ] Commits before and after captured
   - [ ] Commits pulled count: 3
4. [ ] Verify local files updated:
   - [ ] Files on disk match remote state
   - [ ] Git log shows remote commits now local
5. [ ] Verify notification (if verbosity allows):
   - [ ] Success notification appears
   - [ ] Shows repository name
   - [ ] Shows commit count ("Pulled 3 commits")
   - [ ] Notification is subtle (not intrusive)
6. [ ] Check status panel:
   - [ ] Shows updated status (up to date)
   - [ ] Pull history updated with success entry
7. [ ] Verify performance:
   - [ ] Total operation < 5 seconds (check logs)

**Expected Results:**
- ✅ Auto-pull executes automatically after fetch
- ✅ Local files updated to match remote
- ✅ Success notification shown (if verbosity allows)
- ✅ Pull history recorded
- ✅ Operation completes < 5 seconds

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 2: Auto-Pull with Uncommitted Changes (Safety Check)

**Setup:**
```bash
# In test repository with remote changes available
echo "uncommitted content" >> test-file.txt
# Don't commit - leave as uncommitted change
```

**Test Steps:**
1. [ ] Trigger fetch operation
2. [ ] Verify auto-pull is SKIPPED
3. [ ] Check debug logs:
   - [ ] Safety check failed: uncommitted changes
   - [ ] Skip reason: 'UNCOMMITTED_CHANGES'
   - [ ] Pull NOT executed
4. [ ] Verify notification:
   - [ ] Info notice appears (not modal)
   - [ ] Explains uncommitted changes prevent auto-pull
   - [ ] Suggests committing or stashing changes
   - [ ] Notice is dismissible
5. [ ] Check status panel:
   - [ ] Shows "Updates Available" with info icon
   - [ ] "Pull" button visible and enabled
6. [ ] Verify local files unchanged:
   - [ ] Uncommitted changes still present
   - [ ] No remote commits pulled

**Expected Results:**
- ✅ Auto-pull skipped (safety check prevents execution)
- ✅ Working directory unchanged
- ✅ Clear notification explains why
- ✅ Manual pull option available in status panel
- ✅ No data loss

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 3: Manual Pull via Status Panel Button

**Setup:** Use repository from Scenario 2 (uncommitted changes, updates available)

**Test Steps:**
1. [ ] Navigate to status panel
2. [ ] Locate "Pull" button for repository with updates
3. [ ] Click "Pull" button
4. [ ] Verify:
   - [ ] Pull attempt still blocked by safety checks
   - [ ] Error message shown: "Cannot pull - uncommitted changes"
   - [ ] Working directory still protected
5. [ ] Commit the changes:
   ```bash
   git add .
   git commit -m "Test commit"
   ```
6. [ ] Click "Pull" button again
7. [ ] Verify:
   - [ ] Manual pull executes successfully
   - [ ] Files updated to match remote
   - [ ] Status panel updates to "Up to date"
   - [ ] Pull history shows manual pull entry

**Expected Results:**
- ✅ Manual pull respects safety checks
- ✅ After committing, manual pull succeeds
- ✅ Pull history distinguishes manual vs automatic
- ✅ Status panel updates correctly

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 4: Diverged Branches (No Auto-Pull)

**Setup:**
```bash
# In test repository
git fetch origin
git commit --allow-empty -m "Local diverged commit"
# Ensure remote also has different commits
```

**Test Steps:**
1. [ ] Trigger fetch operation
2. [ ] Verify auto-pull is SKIPPED
3. [ ] Check debug logs:
   - [ ] Fast-forward detection: 'diverged'
   - [ ] Skip reason: 'DIVERGED_BRANCHES'
   - [ ] Pull NOT executed
4. [ ] Verify notification triggers manual intervention modal (from FR-3)
5. [ ] Check status panel:
   - [ ] Warning icon displayed
   - [ ] Text: "Manual merge required"
6. [ ] Verify no automatic pull attempted

**Expected Results:**
- ✅ Auto-pull skipped for diverged branches
- ✅ Manual intervention notification triggered
- ✅ No data loss or unwanted merges
- ✅ Status panel shows warning

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 5: Auto-Pull Disabled (Configuration)

**Test 5a: Global Disable**
**Test Steps:**
1. [ ] Open plugin settings
2. [ ] Disable "Enable automatic pull" globally
3. [ ] Trigger fetch with remote changes available
4. [ ] Verify:
   - [ ] Auto-pull NOT executed
   - [ ] Status panel shows "Updates Available"
   - [ ] "Pull" button visible
   - [ ] No notification about pull

**Test 5b: Per-Repository Disable**
**Test Steps:**
1. [ ] Enable auto-pull globally
2. [ ] Disable auto-pull for specific repository
3. [ ] Trigger fetch with remote changes for that repository
4. [ ] Verify:
   - [ ] Auto-pull NOT executed for disabled repository
   - [ ] Auto-pull still works for other repositories
   - [ ] Status panel shows "Updates Available" for disabled repo

**Expected Results:**
- ✅ Global disable prevents all auto-pulls
- ✅ Per-repository disable is respected
- ✅ Manual pull option always available
- ✅ Other repositories unaffected

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 6: Retry Logic with Network Failure

**Setup:** Simulate network failure (disconnect network or use invalid remote)

**Test Steps:**
1. [ ] Configure repository with remote changes available
2. [ ] Disconnect network or set invalid remote temporarily
3. [ ] Trigger fetch (which may fail or succeed before disconnect)
4. [ ] If fetch succeeds, trigger auto-pull
5. [ ] Verify retry logic:
   - [ ] Attempt 1 (immediate): Fails
   - [ ] Attempt 2 (10s delay): Scheduled
   - [ ] Wait 10 seconds
   - [ ] Attempt 2: Executes and fails
   - [ ] Attempt 3 (30s delay): Scheduled
   - [ ] Wait 30 seconds
   - [ ] Attempt 3: Executes and fails
   - [ ] Final failure notification shown
6. [ ] Check debug logs:
   - [ ] All 3 retry attempts logged
   - [ ] Retry delays correct (0s, 10s, 30s)
   - [ ] Error categorized as network error
   - [ ] Total attempts: 3
7. [ ] Verify notification after exhaustion:
   - [ ] Prominent error notification
   - [ ] Explains retry exhausted
   - [ ] Suggests checking network/credentials

**Expected Results:**
- ✅ Retry logic executes with exponential backoff
- ✅ Maximum 3 attempts enforced
- ✅ Delays: immediate, 10s, 30s
- ✅ Clear error notification after exhaustion
- ✅ No infinite retry loops

**Actual Results:**
- Attempt 1 time: _____
- Attempt 2 time: _____ (should be ~10s after attempt 1)
- Attempt 3 time: _____ (should be ~30s after attempt 2)
- Final notification: _____

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 7: Authentication Error (No Retry)

**Setup:**
```bash
# Modify remote to force auth failure
git remote set-url origin https://invalid-token@github.com/invalid/repo.git
```

**Test Steps:**
1. [ ] Trigger fetch (may fail at fetch stage)
2. [ ] If pull is attempted, verify:
   - [ ] Pull fails with auth error
   - [ ] Error categorized as AUTH_ERROR
   - [ ] NO retry attempts (auth errors not retryable)
   - [ ] Immediate failure notification
3. [ ] Check debug logs:
   - [ ] Error code: AUTH_ERROR
   - [ ] Retry count: 0 (no retries for auth errors)
4. [ ] Verify notification:
   - [ ] Prominent error notification
   - [ ] Explains authentication issue
   - [ ] Suggests fixing credentials manually
   - [ ] May trigger AuthFailureModal (from FR-3)

**Expected Results:**
- ✅ Auth errors fail immediately (no retry)
- ✅ Clear error categorization
- ✅ Helpful notification guiding user
- ✅ No wasted retry attempts

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 8: Pull History Display

**Test Steps:**
1. [ ] Perform 5 different pull operations:
   - 2 successful auto-pulls
   - 1 manual pull
   - 1 failed pull (network)
   - 1 skipped pull (uncommitted changes)
2. [ ] Open status panel
3. [ ] Expand pull history section for repository
4. [ ] Verify history shows:
   - [ ] All 5 operations listed
   - [ ] Most recent operation first (reverse chronological)
   - [ ] Each entry shows:
     - Timestamp
     - Result (success/failed/skipped)
     - Commits pulled (if successful)
     - Error message (if failed)
     - Skip reason (if skipped)
5. [ ] Perform 6 more operations (total 11)
6. [ ] Verify history limited to 10 entries:
   - [ ] Only most recent 10 shown
   - [ ] Oldest entry dropped
   - [ ] FIFO queue behavior

**Expected Results:**
- ✅ Pull history accurately recorded
- ✅ Maximum 10 entries per repository
- ✅ All relevant information captured
- ✅ Clear display format

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 9: Sequential Repository Processing

**Setup:** Configure 4 repositories, all with remote changes available

**Test Steps:**
1. [ ] Trigger fetch for all repositories (or wait for auto-fetch cycle)
2. [ ] Observe pull execution order:
   - [ ] Verify repositories processed ONE AT A TIME
   - [ ] Second repo only starts after first completes
   - [ ] Third repo only starts after second completes
   - [ ] Fourth repo only starts after third completes
3. [ ] Check debug logs:
   - [ ] Start time for each pull
   - [ ] End time for each pull
   - [ ] Verify no overlapping execution
4. [ ] Measure total time:
   - [ ] Should be sum of individual pull times
   - [ ] Not concurrent execution time
5. [ ] Verify no lock conflicts or errors from sequential processing

**Expected Results:**
- ✅ Repositories processed sequentially (not concurrent)
- ✅ No git lock conflicts
- ✅ All repositories eventually pulled
- ✅ Total time = sum of individual times

**Actual Results:**
- Repo 1 pull time: _____
- Repo 2 pull time: _____
- Repo 3 pull time: _____
- Repo 4 pull time: _____
- Total time: _____ (should be ~sum of above)

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 10: Performance Validation

**Test 10a: Single Repository**
**Test Steps:**
1. [ ] Repository with 5 commits to pull
2. [ ] Clean working directory
3. [ ] Trigger auto-pull
4. [ ] Measure total time from detection to completion
5. [ ] Verify < 5 seconds

**Test 10b: Multiple Small Repositories**
**Test Steps:**
1. [ ] 5 repositories, each with 2-3 commits to pull
2. [ ] All clean working directories
3. [ ] Trigger auto-pull for all
4. [ ] Measure total time for sequential processing
5. [ ] Verify reasonable time (< 30 seconds for 5 repos)

**Test 10c: Large Repository**
**Test Steps:**
1. [ ] Repository with 1000+ files
2. [ ] 10 commits to pull
3. [ ] Trigger auto-pull
4. [ ] Measure time
5. [ ] Verify < 5 seconds (or note if exceeds)

**Performance Results:**
- Single repo (5 commits): _____ seconds (must be < 5s)
- 5 repos sequential: _____ seconds
- Large repo (1000+ files): _____ seconds

**Expected:** Single pull < 5s, sequential acceptable

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 11: Notification Verbosity Settings

**Test 11a: All Operations**
**Setup:** Set verbosity to "All operations"

**Test Steps:**
1. [ ] Successful auto-pull → verify notification shown
2. [ ] Failed auto-pull → verify notification shown
3. [ ] Skipped auto-pull → verify notification shown

**Test 11b: Failures Only**
**Setup:** Set verbosity to "Failures only"

**Test Steps:**
1. [ ] Successful auto-pull → verify NO notification
2. [ ] Failed auto-pull → verify notification shown
3. [ ] Skipped auto-pull (non-critical) → verify NO notification
4. [ ] Diverged branches (critical) → verify modal shown

**Test 11c: Silent**
**Setup:** Set verbosity to "Silent"

**Test Steps:**
1. [ ] Successful auto-pull → verify NO notification
2. [ ] Failed auto-pull (non-critical) → verify NO notification
3. [ ] Diverged branches (critical) → verify modal STILL shown

**Expected Results:**
- ✅ All operations: Shows all notifications
- ✅ Failures only: Shows only failures
- ✅ Silent: Suppresses non-critical, but critical modals always shown

**Actual Results (11a-11c):**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 12: Working Directory Protection

**Test Steps:**
1. [ ] Open file in Obsidian editor
2. [ ] Make changes but don't save
3. [ ] Trigger auto-pull with remote changes available
4. [ ] Verify:
   - [ ] Working directory check passes (file not yet saved to disk)
   - [ ] OR working directory check detects unsaved changes
   - [ ] Behavior is consistent and safe
5. [ ] Save file (now uncommitted)
6. [ ] Trigger auto-pull again
7. [ ] Verify:
   - [ ] Working directory check fails (uncommitted changes)
   - [ ] Auto-pull skipped
   - [ ] File changes preserved

**Expected Results:**
- ✅ Unsaved editor changes handled safely
- ✅ Uncommitted changes always block auto-pull
- ✅ No data loss scenarios

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 13: Git Lock File Handling

**Setup:**
```bash
# Create lock file to simulate concurrent operation
touch .git/index.lock
```

**Test Steps:**
1. [ ] Trigger auto-pull
2. [ ] Verify:
   - [ ] Pull fails with lock error
   - [ ] Error categorized as LOCK_ERROR
   - [ ] Retry logic triggered
   - [ ] Retries with exponential backoff
3. [ ] After first retry, remove lock file:
   ```bash
   rm .git/index.lock
   ```
4. [ ] Verify:
   - [ ] Next retry succeeds
   - [ ] Pull completes successfully
   - [ ] Pull history shows initial failure then success

**Expected Results:**
- ✅ Lock errors detected and categorized
- ✅ Retry logic recovers when lock released
- ✅ Graceful handling of temporary locks

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 14: Edge Cases

#### Test 14a: Obsidian File Watching
**Test Steps:**
1. [ ] Open file in Obsidian
2. [ ] Trigger auto-pull that updates that file
3. [ ] Verify:
   - [ ] Obsidian detects external file change
   - [ ] File reloads or prompts user
   - [ ] No corruption or data loss

#### Test 14b: Very Long Repository Path
**Test Steps:**
1. [ ] Repository with path > 200 characters
2. [ ] Trigger auto-pull
3. [ ] Verify handles gracefully

#### Test 14c: Special Characters in Path
**Test Steps:**
1. [ ] Repository path with spaces, unicode, etc.
2. [ ] Trigger auto-pull
3. [ ] Verify git commands execute correctly

#### Test 14d: Empty Pull (No Actual Changes)
**Test Steps:**
1. [ ] Repository reports commits behind but actually up to date
2. [ ] Trigger auto-pull
3. [ ] Verify:
   - [ ] Pull completes successfully
   - [ ] Handles "Already up to date" message
   - [ ] No errors or confusion

**Actual Results (14a-14d):**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

## Acceptance Criteria Validation

From FR-2 Specification:

- [ ] **FR-2.1:** Pull executes automatically after fetch detects changes ✓
- [ ] **FR-2.2:** Pull only executes if fast-forward detection confirms safety ✓
- [ ] **FR-2.3:** Local files updated after successful pull ✓
- [ ] **FR-2.4:** Pull doesn't interrupt active editing ✓
- [ ] **FR-2.5:** Pull completes within 5 seconds ✓
- [ ] **FR-2.6:** Success notification with commit count ✓
- [ ] **FR-2.7:** Failed pulls retry with exponential backoff (3 max) ✓
- [ ] **FR-2.8:** After 3 failures, user notified with clear error ✓

**All Criteria Met:** YES / NO _(circle one)_

---

## Critical Safety Validation

**Data Protection Checks:**

Verify auto-pull NEVER executes when:
- [ ] Working directory has uncommitted changes
- [ ] Branches have diverged (not fast-forward)
- [ ] Repository is locked (concurrent operation)
- [ ] No upstream branch configured
- [ ] Detached HEAD state
- [ ] Invalid repository

**Safety Test Count:** _____ scenarios tested
**Safety Failures:** _____ (MUST BE ZERO)

If any safety check fails, this is a **CRITICAL FAILURE** - implementation must be fixed immediately.

---

## Summary

**Total Scenarios Tested:** _____ / 14
**Scenarios Passed:** _____
**Scenarios Failed:** _____
**Critical Safety Issues:** _____ **(MUST BE ZERO)**
**Performance Issues:** _____

### Critical Issues
1. _____________________________________________________________________________
2. _____________________________________________________________________________

### Performance Issues
- Slowest single pull: _____ seconds (must be < 5s)
- Slowest sequential batch: _____ seconds

### Retry Logic Issues
- Retry delays accurate: YES / NO
- Maximum retries enforced: YES / NO
- Auth errors skip retry: YES / NO

### Recommendations
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

**Overall Assessment:** PASS / FAIL _(circle one)_

**Tester Signature:** _______________ **Date:** _______________

---

## Notes for Developers

### Priority Focus Areas
1. **Data Safety:** Auto-pull must never cause data loss or unwanted merges
2. **Working Directory Protection:** Uncommitted changes must always block pull
3. **Retry Logic:** Must work correctly with proper delays and limits
4. **Performance:** Individual pulls < 5 seconds, sequential processing acceptable
5. **User Feedback:** Clear notifications for all outcomes

### Debug Logging
Ensure debug logs capture:
- Safety check results and reasons
- Pull execution details (command, output)
- Retry attempts with timestamps
- Performance timing
- Error categorization

### Cross-Platform Testing
- Test on all target platforms (macOS, Linux, Windows)
- Verify terminal launches correctly on each platform
- Test with different git authentication methods (SSH, HTTPS)
- Verify file watching works on all platforms

### Integration Testing
- Test interaction with FR-1 (fast-forward detection)
- Test interaction with FR-3 (manual intervention notifications)
- Test integration with status panel updates
- Test settings persistence across Obsidian restarts
