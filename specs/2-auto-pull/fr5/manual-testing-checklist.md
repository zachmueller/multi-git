# FR-5 Manual Testing Checklist

**Feature:** User Control and Configuration
**Status:** Ready for Testing
**Version:** 1.0.0
**Created:** 2025-12-15

## Overview

This checklist validates that FR-5 (User Control and Configuration) meets all acceptance criteria through manual testing. Since FR-5 is already implemented, this testing confirms the implementation behaves as specified.

## Prerequisites

- [ ] Obsidian installed with Multi-Git plugin
- [ ] At least 2 test repositories configured
- [ ] Both repositories have remote changes available (for pull testing)
- [ ] One repository should have uncommitted changes (for safety testing)
- [ ] Debug mode enabled for log verification

## Test Environment Setup

1. **Install Plugin:**
   ```bash
   cd /path/to/obsidian-vault/.obsidian/plugins/
   ln -s /path/to/multi-git multi-git
   ```

2. **Configure Test Repositories:**
   - Repository A: Clean working directory, remote changes available
   - Repository B: Uncommitted changes present
   - Repository C: Diverged branches (local ahead and behind remote)

3. **Enable Debug Logging:**
   - Open Settings → Multi-Git
   - Verify debug logging is enabled (or edit data.json directly)

## Test Scenarios

### Scenario 1: Global Auto-Pull Toggle

**Acceptance Criteria:** AC1 - Global setting to enable/disable automatic pull (default: enabled)

#### Test 1.1: Default State
- [ ] Fresh installation shows auto-pull **enabled** by default
- [ ] Settings → Multi-Git → "Enable Automatic Pull" toggle is **ON**
- [ ] data.json contains `"autoPullEnabled": true`

**Expected:** ✅ Default is enabled

#### Test 1.2: Disable Globally
- [ ] Turn **OFF** "Enable Automatic Pull" toggle
- [ ] Trigger fetch for Repository A (has remote changes)
- [ ] Verify **no automatic pull occurs**
- [ ] Status panel shows "Updates Available" with "Pull" button
- [ ] Debug logs show skip reason: "Auto-pull disabled globally"

**Expected:** ✅ No automatic pulls when disabled

#### Test 1.3: Re-enable Globally
- [ ] Turn **ON** "Enable Automatic Pull" toggle
- [ ] Trigger fetch for Repository A
- [ ] Verify **automatic pull executes**
- [ ] Files updated locally with remote changes
- [ ] Notification shows "Pulled X commits for Repository A"

**Expected:** ✅ Auto-pull resumes immediately

#### Test 1.4: Persistence
- [ ] Set auto-pull to **disabled**
- [ ] Close and reopen Obsidian
- [ ] Check Settings → Multi-Git
- [ ] Verify toggle still **OFF**
- [ ] Check data.json: `"autoPullEnabled": false`

**Expected:** ✅ Setting persists across restarts

**Status:** ☐ Pass / ☐ Fail  
**Notes:**

---

### Scenario 2: Per-Repository Auto-Pull Override

**Acceptance Criteria:** AC2 - Per-repository setting to enable/disable automatic pull

#### Test 2.1: Override When Global Enabled
- [ ] Set global auto-pull: **enabled**
- [ ] In Repository A settings, set "Auto-Pull for this Repository": **disabled**
- [ ] Trigger fetch for Repository A (has remote changes)
- [ ] Verify **no automatic pull for Repository A**
- [ ] Trigger fetch for Repository B
- [ ] Verify **automatic pull occurs for Repository B** (uses global setting)
- [ ] Check data.json: `"autoPullPerRepository": { "repo-a-id": false }`

**Expected:** ✅ Per-repo override takes precedence over global

#### Test 2.2: Override When Global Disabled
- [ ] Set global auto-pull: **disabled**
- [ ] In Repository A settings, set "Auto-Pull for this Repository": **enabled**
- [ ] Trigger fetch for Repository A
- [ ] Verify **automatic pull occurs for Repository A**
- [ ] Trigger fetch for Repository B
- [ ] Verify **no automatic pull for Repository B** (global disabled)

**Expected:** ✅ Per-repo override can enable when global disabled

#### Test 2.3: Remove Override (Fall Back to Global)
- [ ] Set global auto-pull: **enabled**
- [ ] Repository A has override set to **disabled**
- [ ] Toggle Repository A's setting back to **match global** (effectively removing override)
- [ ] Trigger fetch for Repository A
- [ ] Verify **automatic pull occurs** (now using global setting)
- [ ] Check data.json: Repository A's ID **not present** in `autoPullPerRepository` map

**Expected:** ✅ Removing override restores global behavior

#### Test 2.4: Persistence of Per-Repo Settings
- [ ] Set per-repo override for Repository A: **disabled**
- [ ] Close and reopen Obsidian
- [ ] Check Repository A's toggle in settings
- [ ] Verify still shows **disabled**
- [ ] Check data.json: override still present

**Expected:** ✅ Per-repo overrides persist across restarts

**Status:** ☐ Pass / ☐ Fail  
**Notes:**

---

### Scenario 3: Notification Verbosity Control

**Acceptance Criteria:** AC3 - Setting to control notification verbosity

#### Test 3.1: "All Operations" Mode
- [ ] Set notification verbosity: **All operations**
- [ ] Trigger successful pull for Repository A
- [ ] Verify **success notification appears**: "Pulled X commits for Repository A"
- [ ] Trigger failed pull (network disconnected)
- [ ] Verify **failure notification appears**: "Pull failed..."
- [ ] Trigger skipped pull (uncommitted changes)
- [ ] Verify **skip notification appears**: "Remote updates available - commit your changes first"

**Expected:** ✅ All pull operations generate notifications

#### Test 3.2: "Failures Only" Mode
- [ ] Set notification verbosity: **Failures only**
- [ ] Trigger successful pull for Repository A
- [ ] Verify **no success notification** (silent success)
- [ ] Trigger failed pull (network disconnected)
- [ ] Verify **failure notification appears**: "Pull failed..."
- [ ] Trigger manual intervention scenario (diverged branches)
- [ ] Verify **manual intervention modal appears** (critical scenario)

**Expected:** ✅ Only failures and critical scenarios notify

#### Test 3.3: "Silent" Mode
- [ ] Set notification verbosity: **Silent**
- [ ] Trigger successful pull for Repository A
- [ ] Verify **no notification** (completely silent)
- [ ] Trigger failed pull (network issue)
- [ ] Verify **no notification** for non-critical failure
- [ ] Trigger critical scenario (diverged branches)
- [ ] Verify **modal dialog appears** (critical scenarios always show)
- [ ] Trigger authentication failure
- [ ] Verify **modal dialog appears** (critical scenarios cannot be silenced)

**Expected:** ✅ Silent except for critical modal dialogs

#### Test 3.4: Critical Scenarios Always Show Modals
- [ ] Set notification verbosity: **Silent**
- [ ] Create diverged branches scenario (local and remote both ahead)
- [ ] Trigger fetch
- [ ] Verify **ManualInterventionModal appears** with "Manual merge required"
- [ ] Modal requires **acknowledgment** (cannot auto-dismiss)
- [ ] Simulate authentication failure
- [ ] Verify **AuthFailureModal appears** requiring action

**Expected:** ✅ Critical scenarios override silent mode for safety

**Status:** ☐ Pass / ☐ Fail  
**Notes:**

---

### Scenario 4: Immediate Effect Without Reload

**Acceptance Criteria:** AC4 - Settings changes take effect immediately without plugin reload

#### Test 4.1: Global Toggle Immediate Effect
- [ ] Open Settings, auto-pull: **enabled**
- [ ] Create scenario: Repository A has remote changes
- [ ] Switch toggle to **disabled**
- [ ] **Without closing settings or reloading plugin**
- [ ] Trigger fetch for Repository A
- [ ] Verify pull **does not execute** (setting already in effect)
- [ ] Switch toggle back to **enabled**
- [ ] Trigger fetch again
- [ ] Verify pull **executes immediately**

**Expected:** ✅ No reload required for global setting

#### Test 4.2: Per-Repo Override Immediate Effect
- [ ] Global: **enabled**
- [ ] Repository A override: **enabled** (matching global)
- [ ] Create scenario: Repository A has remote changes
- [ ] Change Repository A override to: **disabled**
- [ ] **Without closing settings**
- [ ] Trigger fetch for Repository A
- [ ] Verify pull **skipped** (new setting in effect)

**Expected:** ✅ Per-repo changes apply immediately

#### Test 4.3: Verbosity Change Immediate Effect
- [ ] Set verbosity: **All operations**
- [ ] Trigger successful pull
- [ ] Verify **notification appears**
- [ ] Immediately change verbosity to: **Silent**
- [ ] Trigger another successful pull
- [ ] Verify **no notification** (change already active)

**Expected:** ✅ Verbosity changes apply immediately

#### Test 4.4: UI Updates Immediately
- [ ] Global auto-pull: **disabled**
- [ ] Observe: Per-repository toggles **hidden** (because repositories disabled)
- [ ] Enable global auto-pull
- [ ] Observe: Per-repository toggles **appear immediately** in UI
- [ ] No manual refresh or settings re-open needed

**Expected:** ✅ UI reflects setting changes instantly

**Status:** ☐ Pass / ☐ Fail  
**Notes:**

---

### Scenario 5: Safe Defaults

**Acceptance Criteria:** AC5 - Default behavior is safe (automatic pull enabled but only for fast-forward)

#### Test 5.1: Fresh Installation Defaults
- [ ] Perform fresh plugin installation
- [ ] Check Settings → Multi-Git
- [ ] Verify "Enable Automatic Pull": **ON** (enabled by default)
- [ ] Verify notification verbosity: **All operations** (see all activity)
- [ ] Verify per-repo overrides: **empty** (none set by default)
- [ ] Check data.json: matches `DEFAULT_SETTINGS` in code

**Expected:** ✅ Defaults are safe and sensible

#### Test 5.2: Safety Mechanisms Enforced
- [ ] Auto-pull: **enabled**
- [ ] Repository B has **uncommitted changes**
- [ ] Trigger fetch for Repository B (remote has changes)
- [ ] Verify pull **skipped** with reason: "commit your changes first"
- [ ] Status panel shows "Updates Available" (not automatically pulled)
- [ ] Files **not modified** (safety check prevented pull)

**Expected:** ✅ Uncommitted changes prevent pull despite enabled setting

#### Test 5.3: Diverged Branches Prevent Pull
- [ ] Auto-pull: **enabled**
- [ ] Repository C has **diverged branches** (local and remote both ahead)
- [ ] Trigger fetch for Repository C
- [ ] Verify pull **not attempted** (fast-forward impossible)
- [ ] Modal dialog appears: "Manual merge required"
- [ ] Status panel shows "Manual merge required" with warning icon

**Expected:** ✅ Diverged branches require manual intervention despite enabled setting

#### Test 5.4: Fast-Forward-Only Flag Used
- [ ] Enable debug logging
- [ ] Auto-pull: **enabled**
- [ ] Repository A can fast-forward (clean, behind remote)
- [ ] Trigger fetch and automatic pull
- [ ] Check debug logs for git command
- [ ] Verify command includes: `git pull --ff-only`
- [ ] Verify pull succeeds with fast-forward

**Expected:** ✅ All automatic pulls use --ff-only flag for safety

**Status:** ☐ Pass / ☐ Fail  
**Notes:**

---

### Scenario 6: Clear Documentation and Warnings

**Acceptance Criteria:** AC6 - Clear documentation of settings with warnings about safety implications

#### Test 6.1: Global Toggle Documentation
- [ ] Open Settings → Multi-Git → "Enable Automatic Pull"
- [ ] Read description below toggle
- [ ] Verify contains: ⚠️ Safety warning explaining fast-forward-only
- [ ] Verify explains: What happens when branches diverge or uncommitted changes exist
- [ ] Verify contains: 📢 Manual Intervention notice about critical modals

**Expected:** ✅ Comprehensive safety documentation visible

#### Test 6.2: Notification Verbosity Documentation
- [ ] Open notification verbosity dropdown
- [ ] Read description
- [ ] Verify explains each option: "all", "failures-only", "silent"
- [ ] Verify warns: Critical scenarios always show modals even in silent mode
- [ ] Verify explains: What "critical scenarios" means (diverged branches, auth failures)

**Expected:** ✅ Clear explanation of each verbosity level

#### Test 6.3: Per-Repository Override Documentation
- [ ] Find per-repository toggle in repository list
- [ ] Read setting description
- [ ] Verify explains: Override purpose (per-repo control)
- [ ] Verify explains: Inheritance behavior (uses global when not overridden)

**Expected:** ✅ Override behavior clearly documented

#### Test 6.4: Safety Warning Prominence
- [ ] Review all auto-pull related settings
- [ ] Verify safety warnings use: ⚠️ emoji or similar visual indicator
- [ ] Verify warnings appear **before** potential issues occur
- [ ] Verify critical modal behavior clearly documented with 📢 indicator

**Expected:** ✅ Safety warnings are prominent and clear

**Status:** ☐ Pass / ☐ Fail  
**Notes:**

---

## Integration Testing

### Integration 1: Settings + AutoPullService
- [ ] Set global: **enabled**, Repository A override: **disabled**
- [ ] Trigger fetch for Repository A
- [ ] Verify `AutoPullService.attemptAutoPull()` checks settings
- [ ] Debug logs show: "Auto-pull disabled for repository: Repository A"
- [ ] Pull **not attempted**

**Expected:** ✅ Service respects settings

### Integration 2: Settings + NotificationService
- [ ] Set verbosity: **failures-only**
- [ ] Trigger successful pull
- [ ] Verify `NotificationService` **does not** call `new Notice()`
- [ ] Trigger failed pull
- [ ] Verify `NotificationService` **does** call `new Notice()`
- [ ] Notification content appropriate for failure

**Expected:** ✅ Notifications filtered by verbosity setting

### Integration 3: Settings Persistence Across Sessions
- [ ] Configure all settings to non-default values:
  - Global: **disabled**
  - Repository A override: **enabled**
  - Verbosity: **silent**
- [ ] Close Obsidian completely
- [ ] Reopen Obsidian
- [ ] Check all settings in UI
- [ ] Verify all match pre-close state
- [ ] Trigger operations to verify behavior matches settings

**Expected:** ✅ All settings persist and function correctly after restart

**Status:** ☐ Pass / ☐ Fail  
**Notes:**

---

## Edge Cases

### Edge 1: Rapid Setting Changes
- [ ] Toggle global auto-pull rapidly: ON → OFF → ON → OFF
- [ ] Trigger fetch during toggle sequence
- [ ] Verify behavior matches **final** toggle state
- [ ] No race conditions or stale settings

**Expected:** ✅ Final setting state always used

### Edge 2: Per-Repo Toggle When Global Disabled
- [ ] Global: **disabled**
- [ ] Observe per-repository toggles in UI
- [ ] Verify they are **still accessible** (can set override for future)
- [ ] Set Repository A override: **enabled**
- [ ] Verify pull **occurs** for Repository A (override takes precedence)

**Expected:** ✅ Per-repo overrides work regardless of global state

### Edge 3: Notification Verbosity with Multiple Repos
- [ ] Configure 3 repositories
- [ ] Set verbosity: **failures-only**
- [ ] Trigger simultaneous operations:
  - Repository A: success
  - Repository B: failure
  - Repository C: skip (uncommitted changes)
- [ ] Verify only **Repository B failure** generates notification
- [ ] No notification for success or non-critical skip

**Expected:** ✅ Verbosity applies consistently across all repos

**Status:** ☐ Pass / ☐ Fail  
**Notes:**

---

## Performance Testing

### Performance 1: Settings Access Speed
- [ ] Enable debug logging with high-precision timing
- [ ] Trigger 100 rapid setting accesses from service
- [ ] Measure time per access
- [ ] Verify: < 1ms per settings read

**Expected:** ✅ Settings access does not impact performance

### Performance 2: Save Operation Speed
- [ ] Change setting in UI
- [ ] Measure time from toggle change to disk write complete
- [ ] Verify: < 100ms for settings save
- [ ] Check: No UI blocking or freezing during save

**Expected:** ✅ Settings save is fast and non-blocking

**Status:** ☐ Pass / ☐ Fail  
**Notes:**

---

## Final Validation

### All Acceptance Criteria Met

- [ ] **AC1:** Global setting to enable/disable automatic pull (default: enabled) ✅
- [ ] **AC2:** Per-repository setting to enable/disable automatic pull ✅
- [ ] **AC3:** Setting to control notification verbosity (all, failures-only, silent) ✅
- [ ] **AC4:** Settings changes take effect immediately without plugin reload ✅
- [ ] **AC5:** Default behavior is safe (automatic pull enabled but only for fast-forward) ✅
- [ ] **AC6:** Clear documentation of settings with warnings about safety implications ✅

### Quality Gates

- [ ] No settings-related bugs found during testing
- [ ] All edge cases handled gracefully
- [ ] Settings UI is intuitive and self-explanatory
- [ ] Documentation matches actual behavior
- [ ] Performance is acceptable (no lag or blocking)

### Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**Result:** ☐ PASS / ☐ FAIL  
**FR-5 Status:** ☐ Complete and Validated / ☐ Issues Found (see notes)

---

## Issues Found

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| | | | |

---

## Notes

Use this section for additional observations, recommendations, or context:

---

**Next Steps After Testing:**
1. If all tests pass → Create validation report confirming FR-5 complete
2. If issues found → Document in issues table and create bug tickets
3. Update user documentation based on testing insights
4. Sign off on FR-5 as production-ready
