# Manual Testing Checklist: FR-1 Fast-Forward Detection

**Feature:** Fast-Forward Detection
**Specification:** [specs/2-auto-pull/spec.md](../spec.md)
**Implementation Plan:** [plan.md](plan.md)
**Date:** 2025-12-15
**Tester:** _____________
**Platform:** macOS / Windows / Linux _(circle one)_

## Test Environment Setup

### Prerequisites
- [ ] Multi-Git plugin installed and enabled in Obsidian
- [ ] At least 3 test repositories configured
- [ ] Git installed and accessible from command line (git 2.20.0+)
- [ ] Test vault opened in Obsidian
- [ ] Debug logging enabled in plugin settings

### Test Repositories Setup
Create test scenarios:
1. **Repo A (Can Fast-Forward):** Local is behind remote, no local commits
2. **Repo B (Diverged):** Local and remote both have unique commits
3. **Repo C (Up to Date):** Local and remote at same commit
4. **Repo D (Local Ahead):** Local has commits not on remote
5. **Repo E (No Upstream):** Branch has no tracking branch configured

## Test Scenarios

### Scenario 1: Can Fast-Forward Detection (Critical)

**Setup:**
```bash
# In test repository
git fetch origin
# Ensure local is behind remote (if not, reset local back)
git reset --hard origin/main~3
git fetch origin
```

**Test Steps:**
1. [ ] Trigger fetch operation (manual or wait for auto-fetch)
2. [ ] Check debug logs for detection result
3. [ ] Verify detection indicates:
   - [ ] Status: 'can-fast-forward'
   - [ ] Commits ahead: 0
   - [ ] Commits behind: > 0 (should be 3)
   - [ ] Local branch name correct
   - [ ] Remote branch name correct
4. [ ] Verify detection completes within 500ms (check logs)
5. [ ] Repeat test 5 times:
   - [ ] Always returns 'can-fast-forward'
   - [ ] Never returns different status
   - [ ] Commit counts always accurate

**Expected Results:**
- ✅ Status: 'can-fast-forward'
- ✅ Commits ahead: 0
- ✅ Commits behind: 3 (or expected count)
- ✅ Detection time < 500ms
- ✅ 100% consistent results across multiple runs

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 2: Diverged Branches Detection (Critical)

**Setup:**
```bash
# In test repository
git fetch origin
# Create local commit
git commit --allow-empty -m "Local commit"
# Ensure remote also has different commit (or simulate)
```

**Test Steps:**
1. [ ] Trigger fetch operation
2. [ ] Check debug logs for detection result
3. [ ] Verify detection indicates:
   - [ ] Status: 'diverged'
   - [ ] Commits ahead: > 0
   - [ ] Commits behind: > 0
   - [ ] Both counts accurate
4. [ ] Verify detection completes within 500ms
5. [ ] **Critical:** Verify status is NEVER 'can-fast-forward'

**Expected Results:**
- ✅ Status: 'diverged' (NEVER 'can-fast-forward')
- ✅ Commits ahead: > 0 (accurate count)
- ✅ Commits behind: > 0 (accurate count)
- ✅ Detection time < 500ms
- ✅ Zero false positives (no incorrect 'can-fast-forward')

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 3: Up to Date Detection

**Setup:**
```bash
# In test repository
git fetch origin
git reset --hard origin/main  # Ensure exactly at remote
git fetch origin
```

**Test Steps:**
1. [ ] Trigger fetch operation
2. [ ] Check debug logs for detection result
3. [ ] Verify detection indicates:
   - [ ] Status: 'up-to-date'
   - [ ] Commits ahead: 0
   - [ ] Commits behind: 0
4. [ ] Verify detection completes within 500ms

**Expected Results:**
- ✅ Status: 'up-to-date'
- ✅ Commits ahead: 0
- ✅ Commits behind: 0
- ✅ Detection time < 500ms

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 4: Local Ahead Detection

**Setup:**
```bash
# In test repository
git fetch origin
git reset --hard origin/main  # Start at remote
git commit --allow-empty -m "Local commit 1"
git commit --allow-empty -m "Local commit 2"
git fetch origin
```

**Test Steps:**
1. [ ] Trigger fetch operation
2. [ ] Check debug logs for detection result
3. [ ] Verify detection indicates:
   - [ ] Status: 'local-ahead'
   - [ ] Commits ahead: 2
   - [ ] Commits behind: 0
4. [ ] Verify detection completes within 500ms

**Expected Results:**
- ✅ Status: 'local-ahead'
- ✅ Commits ahead: 2 (accurate)
- ✅ Commits behind: 0
- ✅ Detection time < 500ms

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 5: No Upstream Branch (Error Handling)

**Setup:**
```bash
# In test repository
git checkout -b new-branch-no-upstream
# Don't set upstream
```

**Test Steps:**
1. [ ] Trigger fetch operation
2. [ ] Check debug logs for detection result
3. [ ] Verify detection indicates:
   - [ ] Status: 'error'
   - [ ] Error code: 'no-upstream' or similar
   - [ ] Error message is clear
4. [ ] Verify no crash or undefined behavior
5. [ ] **Critical:** Verify status is NEVER 'can-fast-forward'

**Expected Results:**
- ✅ Status: 'error'
- ✅ Error code indicates no upstream
- ✅ Error message is informative
- ✅ No crash or exception
- ✅ Fails safe (never claims can fast-forward)

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 6: Detached HEAD State (Error Handling)

**Setup:**
```bash
# In test repository
git checkout --detach HEAD
```

**Test Steps:**
1. [ ] Trigger fetch operation
2. [ ] Check debug logs for detection result
3. [ ] Verify detection indicates:
   - [ ] Status: 'error'
   - [ ] Error code: 'detached-head' or similar
   - [ ] Error message is clear
4. [ ] Verify no crash
5. [ ] **Critical:** Verify status is NEVER 'can-fast-forward'

**Expected Results:**
- ✅ Status: 'error'
- ✅ Error code indicates detached HEAD
- ✅ No crash
- ✅ Fails safe (never claims can fast-forward)

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 7: Invalid Repository Path (Error Handling)

**Setup:** Configure repository with non-existent path

**Test Steps:**
1. [ ] Trigger detection on invalid path
2. [ ] Check debug logs for detection result
3. [ ] Verify:
   - [ ] Status: 'error'
   - [ ] Error message indicates invalid repository
   - [ ] No crash or undefined behavior
4. [ ] **Critical:** Verify status is NEVER 'can-fast-forward'

**Expected Results:**
- ✅ Status: 'error'
- ✅ Handles gracefully (no crash)
- ✅ Fails safe

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 8: Performance Validation

**Setup:** Use repositories of various sizes

**Test Steps:**
1. [ ] Test with small repository (< 100 commits):
   - [ ] Record detection time from logs
   - [ ] Verify < 500ms
2. [ ] Test with medium repository (1,000 commits):
   - [ ] Record detection time
   - [ ] Verify < 500ms
3. [ ] Test with large repository (10,000 commits):
   - [ ] Record detection time
   - [ ] Verify < 500ms (or note if exceeds)

**Performance Results:**
- Small repo: _____ ms
- Medium repo: _____ ms
- Large repo: _____ ms

**Expected:** All < 500ms

**Actual Results:**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 9: Consistency and Reliability

**Test Steps:**
1. [ ] Choose a repository in 'can-fast-forward' state
2. [ ] Run detection 20 times consecutively
3. [ ] Record results for each run
4. [ ] Verify:
   - [ ] All 20 runs return same status
   - [ ] All 20 runs return same commit counts
   - [ ] No intermittent errors
   - [ ] No false positives (incorrect 'can-fast-forward')

**Expected Results:**
- ✅ 100% consistency across 20 runs
- ✅ Zero false positives
- ✅ Zero intermittent errors

**Actual Results:**
Run 1-10: _________________________________________________________________
Run 11-20: ________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

### Scenario 10: Edge Cases

#### Test 10a: Very Large Commit Gap
**Setup:** Local is 100+ commits behind remote

**Test Steps:**
- [ ] Verify detection still accurate
- [ ] Verify commit count is correct (100+)
- [ ] Verify performance still < 500ms

#### Test 10b: Multiple Remote Branches
**Setup:** Repository with multiple tracked branches

**Test Steps:**
- [ ] Verify detection uses correct upstream branch
- [ ] Switch branches and re-test
- [ ] Verify accuracy on each branch

#### Test 10c: Concurrent Fetch Operations
**Setup:** Trigger multiple fetches rapidly

**Test Steps:**
- [ ] Trigger detection during active fetch
- [ ] Verify graceful handling (error or wait)
- [ ] No crashes or corrupt state

**Actual Results (10a-10c):**
_____________________________________________________________________________

**Issues Found:**
_____________________________________________________________________________

---

## Acceptance Criteria Validation

From FR-1 Specification:

- [ ] **FR-1.1:** Plugin checks git status to determine if local has diverged ✓
- [ ] **FR-1.2:** Detection identifies when local has no commits ahead ✓
- [ ] **FR-1.3:** Detection works for all branch configurations ✓
- [ ] **FR-1.4:** Detection completes within 500ms ✓
- [ ] **FR-1.5:** False positives NEVER occur (0% tolerance) ✓
- [ ] **FR-1.6:** False negatives < 1% ✓

**All Criteria Met:** YES / NO _(circle one)_

---

## Critical Safety Validation

**ZERO TOLERANCE for False Positives:**

Test the following scenarios and confirm detection NEVER returns 'can-fast-forward':
- [ ] Diverged branches (both ahead and behind)
- [ ] No upstream branch configured
- [ ] Detached HEAD state
- [ ] Invalid repository
- [ ] Corrupted git repository (if testable)

**False Positive Count:** _____ (MUST BE ZERO)

If any false positives found, this is a **CRITICAL FAILURE** - implementation must be fixed before proceeding to FR-2.

---

## Summary

**Total Scenarios Tested:** _____ / 10
**Scenarios Passed:** _____
**Scenarios Failed:** _____
**False Positives Found:** _____ **(MUST BE ZERO)**
**False Negatives Found:** _____

### Critical Issues
1. _____________________________________________________________________________
2. _____________________________________________________________________________

### Performance Issues
- Slowest detection time: _____ ms (must be < 500ms)
- Repository size at slowest: _____________

### Recommendations
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

**Overall Assessment:** PASS / FAIL _(circle one)_

**Tester Signature:** _______________ **Date:** _______________

---

## Notes for Developers

### Priority Focus Areas
1. **Zero False Positives:** This is non-negotiable - even one false positive is a critical failure
2. **Performance:** All detections must complete < 500ms
3. **Consistency:** Results must be 100% consistent across multiple runs
4. **Error Handling:** All error cases must fail safe (never claim can fast-forward)

### Debug Logging
Ensure debug logs capture:
- Detection status and reasoning
- Commit counts (ahead/behind)
- Branch names
- Execution time
- Any errors or edge cases encountered

### Cross-Platform Testing
- Test on all target platforms (macOS, Linux, Windows)
- Git versions 2.20.0+ must all work correctly
- Different git configurations (SSH, HTTPS, etc.)
