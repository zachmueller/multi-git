# Manual Testing Checklist: FR-3 Manual Intervention Notification

**Feature:** Manual Intervention Notifications
**Specification:** [specs/2-auto-pull/spec.md](../spec.md)
**Implementation Plan:** [plan.md](plan.md)
**Date:** 2025-12-15
**Tester:** _____________
**Platform:** macOS / Windows / Linux _(circle one)_

## Test Environment Setup

### Prerequisites
- [ ] Multi-Git plugin installed and enabled in Obsidian
- [ ] At least 2 test repositories configured
- [ ] Git installed and accessible from command line
- [ ] Test vault opened in Obsidian

### Test Repositories Setup
Create test scenarios:
1. **Repo A (Diverged):** Local and remote have diverged
2. **Repo B (Uncommitted):** Has uncommitted changes
3. **Repo C (Clean):** No issues, auto-pull should work
4. **Repo D (Disabled):** Auto-pull disabled in settings

## Test Scenarios

### Scenario 1: Diverged Branches (Critical)

**Setup:**
```bash
# In test repository
git commit --allow-empty -m "Local commit"
git fetch origin
# Simulate remote having different commits (or push from different clone)
```

**Test Steps:**
1. [ ] Trigger fetch (wait for auto-fetch or use manual fetch command)
2. [ ] Verify modal appears (ManualInterventionModal)
3. [ ] Check modal content:
   - [ ] Title: "Manual Merge Required"
   - [ ] Repository name displayed
   - [ ] Current branch displayed
   - [ ] Explanation mentions "diverged" or "conflicts"
   - [ ] Shows commit counts (ahead/behind)
4. [ ] Test "Open Terminal" button:
   - [ ] Click button
   - [ ] Verify terminal opens at repository location
   - [ ] Verify success notice appears
5. [ ] Test modal behavior:
   - [ ] Try to close modal (should not close)
   - [ ] Click "I'll Handle This" button
   - [ ] Verify modal closes
6. [ ] Check status panel:
   - [ ] Warning icon (⚠️) displayed in orange/yellow
   - [ ] Text shows "Manual merge required"
   - [ ] Tooltip provides additional context

**Expected Results:**
- ✅ Modal appears immediately (non-dismissible)
- ✅ Content is clear and actionable
- ✅ Terminal launches successfully
- ✅ Status panel shows warning indicator
- ✅ Modal only closes via "I'll Handle This" button

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 2: Uncommitted Changes (Non-Critical)

**Setup:**
```bash
# In test repository
echo "test content" >> test-file.txt
# Don't commit the change
```

**Test Steps:**
1. [ ] Trigger fetch
2. [ ] Verify notice appears (NOT modal)
3. [ ] Check notice content:
   - [ ] Mentions "uncommitted changes"
   - [ ] Repository name included
   - [ ] Guidance to commit or stash
4. [ ] Notice duration:
   - [ ] Notice visible for at least 8-10 seconds
   - [ ] Can be dismissed by user
5. [ ] Check status panel:
   - [ ] Info icon (ℹ️) or appropriate indicator
   - [ ] Text shows reason for skip

**Expected Results:**
- ✅ Notice appears (not modal)
- ✅ Notice is dismissible
- ✅ Content provides clear guidance
- ✅ Status panel updated appropriately

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 3: Auto-Pull Disabled (No Notification)

**Setup:**
1. [ ] Open settings
2. [ ] Disable auto-pull globally or for specific repository

**Test Steps:**
1. [ ] Trigger fetch
2. [ ] Verify NO notification appears
3. [ ] Check status panel:
   - [ ] Shows "Updates Available" or similar
   - [ ] "Pull" button visible and enabled
4. [ ] Click "Pull" button:
   - [ ] Verify pull executes
   - [ ] Verify status updates

**Expected Results:**
- ✅ No modal or notice for disabled auto-pull
- ✅ Status panel shows updates available
- ✅ Pull button works correctly

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 4: Authentication Failure (Critical)

**Setup:**
```bash
# Modify remote URL to force auth failure
git remote set-url origin https://invalid-auth@github.com/test/repo.git
```

**Test Steps:**
1. [ ] Trigger fetch
2. [ ] Verify modal appears
3. [ ] Check modal content:
   - [ ] Title indicates authentication issue
   - [ ] Key icon (🔑) displayed
   - [ ] Explains credential problem
   - [ ] Suggests terminal action
4. [ ] Test "Open Terminal" button
5. [ ] Check status panel:
   - [ ] Key icon displayed
   - [ ] Text: "Authentication needed"

**Expected Results:**
- ✅ Modal appears for auth failures
- ✅ Content guides user to fix credentials
- ✅ Terminal button provides access
- ✅ Status panel shows auth indicator

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 5: Concurrent Operation / Lock Error (Non-Critical)

**Setup:**
```bash
# Create lock file to simulate concurrent operation
touch .git/index.lock
```

**Test Steps:**
1. [ ] Trigger fetch
2. [ ] Verify notice appears (or modal depending on severity)
3. [ ] Check content:
   - [ ] Explains repository is busy
   - [ ] Lock icon (🔒) shown
   - [ ] Suggests waiting or checking for other processes
4. [ ] Check status panel:
   - [ ] Lock icon displayed
   - [ ] Text: "Repository busy"

**Expected Results:**
- ✅ Notice or modal appears
- ✅ Content explains the situation
- ✅ Status panel reflects lock state

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 6: Notification Verbosity Settings

#### Test 6a: All Operations
**Setup:** Set verbosity to "All operations"

**Test Steps:**
1. [ ] Trigger successful auto-pull
2. [ ] Verify success notification appears
3. [ ] Trigger failed auto-pull (diverged branches)
4. [ ] Verify modal appears

**Expected:** Both success and failure notifications shown

#### Test 6b: Failures Only
**Setup:** Set verbosity to "Failures only"

**Test Steps:**
1. [ ] Trigger successful auto-pull
2. [ ] Verify NO notification appears
3. [ ] Trigger failed auto-pull (diverged branches)
4. [ ] Verify modal appears

**Expected:** Only failure modal shown, no success notification

#### Test 6c: Silent Mode
**Setup:** Set verbosity to "Silent"

**Test Steps:**
1. [ ] Trigger successful auto-pull
2. [ ] Verify NO notification
3. [ ] Trigger non-critical failure (uncommitted changes)
4. [ ] Verify NO notification
5. [ ] Trigger critical failure (diverged branches)
6. [ ] Verify modal STILL appears

**Expected:** Silent mode suppresses non-critical, but critical modals always show

**Actual Results (6a-6c):**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 7: Status Panel Indicators

**Test Steps:**
1. [ ] Create multiple repositories with different states:
   - Repo 1: Diverged branches
   - Repo 2: Up to date
   - Repo 3: Updates available (auto-pull disabled)
   - Repo 4: Uncommitted changes
2. [ ] Check status panel for each:
   - [ ] Diverged: Warning icon ⚠️ (orange/yellow)
   - [ ] Up to date: Checkmark or neutral
   - [ ] Updates available: Info icon ℹ️ (blue) + Pull button
   - [ ] Uncommitted: Info icon or neutral
3. [ ] Hover over icons:
   - [ ] Verify tooltips explain status
4. [ ] Test action buttons:
   - [ ] Pull button for updates available
   - [ ] Open terminal for diverged

**Expected Results:**
- ✅ Icons match repository states accurately
- ✅ Colors convey severity appropriately
- ✅ Tooltips provide helpful context
- ✅ Action buttons work correctly

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 8: Multi-Repository Failures

**Setup:** Configure 3+ repositories to fail with different issues

**Test Steps:**
1. [ ] Trigger fetch for all repositories
2. [ ] Verify modal handling:
   - [ ] Single modal appears (not stacked)
   - [ ] Modal shows primary issue
   - [ ] Other issues visible in status panel
3. [ ] Acknowledge first modal
4. [ ] Verify next modal appears (if multiple critical issues)
5. [ ] Check status panel:
   - [ ] All repository states reflected
   - [ ] Icons accurate for each

**Expected Results:**
- ✅ Modals don't stack uncontrollably
- ✅ All issues eventually surfaced
- ✅ Status panel shows all states

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 9: Terminal Launch Cross-Platform

**Platform-Specific Tests:**

#### macOS:
- [ ] Terminal.app launches at repository location
- [ ] Verified with `pwd` in opened terminal

#### Windows:
- [ ] Command Prompt or PowerShell opens at repository
- [ ] Verified with `cd` command

#### Linux:
- [ ] Default terminal (gnome-terminal, konsole, etc.) opens
- [ ] Verified terminal shows correct path

**Expected Results:**
- ✅ Terminal opens successfully
- ✅ Working directory set to repository path
- ✅ User can immediately execute git commands

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 10: Edge Cases

#### Test 10a: Very Long Repository Paths
**Setup:** Repository with path > 100 characters

**Test Steps:**
- [ ] Trigger notification
- [ ] Verify path displayed correctly (truncated if needed)
- [ ] Verify terminal still launches

#### Test 10b: Special Characters in Path
**Setup:** Repository path with spaces, unicode, etc.

**Test Steps:**
- [ ] Trigger notification
- [ ] Verify path displayed correctly
- [ ] Verify terminal launches

#### Test 10c: Rapid Consecutive Failures
**Setup:** Multiple repositories failing in quick succession

**Test Steps:**
- [ ] Trigger multiple failures within seconds
- [ ] Verify modal queueing or aggregation
- [ ] Verify no UI freezing or crashes

**Actual Results (10a-10c):**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

## Acceptance Criteria Validation

From FR-3 Specification:

- [ ] **FR-3.1:** Notification states manual merge required ✓
- [ ] **FR-3.2:** Notification identifies repository name ✓
- [ ] **FR-3.3:** Notification explains why auto-pull failed ✓
- [ ] **FR-3.4:** Notification provides actionable next steps ✓
- [ ] **FR-3.5:** Optional terminal button works ✓
- [ ] **FR-3.6:** Modal is non-dismissible for critical scenarios ✓
- [ ] **FR-3.7:** Status panel shows "Manual merge required" indicator ✓
- [ ] **FR-3.8:** Status panel shows "Updates Available" with Pull button ✓

**All Criteria Met:** YES / NO _(circle one)_

---

## Summary

**Total Scenarios Tested:** _____ / 10
**Scenarios Passed:** _____
**Scenarios Failed:** _____
**Critical Issues Found:** _____
**Minor Issues Found:** _____

### Critical Issues
1. _____________________________________________________________________________
2. _____________________________________________________________________________

### Minor Issues
1. _____________________________________________________________________________
2. _____________________________________________________________________________

### Recommendations
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

**Overall Assessment:** PASS / FAIL _(circle one)_

**Tester Signature:** _______________ **Date:** _______________

---

## Notes for Developers

- Test on primary platform (macOS) first
- Document any platform-specific issues
- Verify all text is clear and non-technical
- Ensure color coding is accessible (not relying solely on color)
- Test with screen reader for accessibility (if possible)
- Consider adding automated UI tests for critical scenarios
