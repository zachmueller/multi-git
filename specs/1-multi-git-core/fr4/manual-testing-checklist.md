# FR-4 Manual Testing Checklist: Repository Status Display

**Feature:** Repository Status Display
**Version:** 1.0.0
**Created:** 2025-12-14
**Status:** Planning

## Test Environment Setup

- [ ] Obsidian version 1.0.0+ installed
- [ ] Multi-Git plugin with FR-4 implemented
- [ ] At least 3 test repositories configured
- [ ] Test repositories have various states (clean, uncommitted, unpushed, remote changes)
- [ ] Git 2.20.0+ available in PATH

## 1. Panel Activation and Lifecycle

### Test Case 1.1: Open Status Panel
**Steps:**
1. Look for Multi-Git icon in left/right ribbon
2. Click the ribbon icon

**Expected Result:**
- [ ] Status panel opens in sidebar
- [ ] Panel displays "Multi-Git Status" title
- [ ] Refresh button visible in header
- [ ] Repository list visible (or empty state if no repos)

### Test Case 1.2: Panel Persists Across Restarts
**Steps:**
1. Open status panel
2. Restart Obsidian (Cmd+R or reload)
3. Observe panel state

**Expected Result:**
- [ ] Panel reopens automatically in same position
- [ ] Panel shows previously visible state
- [ ] No errors in console

### Test Case 1.3: Close Status Panel
**Steps:**
1. Open status panel
2. Click ribbon icon again (or close panel tab)

**Expected Result:**
- [ ] Panel closes cleanly
- [ ] No errors in console
- [ ] Status polling stops (verify in debug logs if enabled)

### Test Case 1.4: Toggle Panel Multiple Times
**Steps:**
1. Open panel, close panel (repeat 5 times quickly)

**Expected Result:**
- [ ] Panel opens and closes smoothly each time
- [ ] No memory leaks or performance degradation
- [ ] No errors in console

## 2. Empty and Loading States

### Test Case 2.1: Empty State Display
**Steps:**
1. Remove all repositories from plugin settings
2. Open status panel

**Expected Result:**
- [ ] Panel shows "No repositories configured" message
- [ ] Message includes helpful hint (e.g., "Add repositories in settings")
- [ ] No error messages
- [ ] Refresh button still visible but disabled or shows notice

### Test Case 2.2: Loading State Display
**Steps:**
1. Add 5+ repositories
2. Open status panel
3. Observe initial loading

**Expected Result:**
- [ ] Loading indicator appears briefly
- [ ] Loading text (e.g., "Loading repository status...")
- [ ] Smooth transition to loaded state
- [ ] No flickering or UI jumping

## 3. Repository Status Display

### Test Case 3.1: Clean Repository Display
**Steps:**
1. Ensure one repository has no changes (clean state)
2. Open status panel
3. Locate clean repository in list

**Expected Result:**
- [ ] Repository name displayed correctly
- [ ] Branch name shown (e.g., "main")
- [ ] No uncommitted changes indicator
- [ ] No unpushed commits indicator
- [ ] No remote changes indicator
- [ ] Last commit message visible
- [ ] Visual style indicates clean state (subtle/neutral)

### Test Case 3.2: Uncommitted Changes Display
**Steps:**
1. Modify files in a repository (don't commit)
2. Refresh status panel

**Expected Result:**
- [ ] Uncommitted changes indicator visible (yellow dot/icon)
- [ ] Change count or indicator shows changes present
- [ ] Repository item visually distinct from clean repos
- [ ] Branch name still visible
- [ ] Last commit message unchanged

### Test Case 3.3: Unpushed Commits Display
**Steps:**
1. Create and commit changes locally (don't push)
2. Refresh status panel

**Expected Result:**
- [ ] Unpushed commits indicator visible (up arrow)
- [ ] Count shows number of unpushed commits (e.g., "↑ 2")
- [ ] Indicator color/style indicates actionable state
- [ ] No uncommitted changes indicator (since committed)

### Test Case 3.4: Remote Changes Available Display
**Steps:**
1. From another location, push commits to remote
2. Fetch in test vault (automated or manual)
3. Observe status panel

**Expected Result:**
- [ ] Remote changes indicator visible (down arrow)
- [ ] Count shows commits behind (e.g., "↓ 3")
- [ ] Indicator suggests pull action needed
- [ ] Combines with other indicators if applicable

### Test Case 3.5: Combined Status Display
**Steps:**
1. Create repository with:
   - Uncommitted changes
   - 2 unpushed commits
   - 1 remote change available
2. Refresh status panel

**Expected Result:**
- [ ] All three indicators visible simultaneously
- [ ] Uncommitted changes indicator
- [ ] Unpushed commits: ↑ 2
- [ ] Remote changes: ↓ 1
- [ ] Layout handles multiple indicators gracefully
- [ ] All indicators readable and not overlapping

### Test Case 3.6: Detached HEAD Display
**Steps:**
1. Checkout a specific commit (detached HEAD state)
2. Refresh status panel

**Expected Result:**
- [ ] Branch display shows "detached HEAD" or similar
- [ ] Visual distinction from normal branch state
- [ ] Other status indicators still functional
- [ ] No errors displayed

### Test Case 3.7: Last Commit Message Display
**Steps:**
1. Observe repository with recent commit
2. Note last commit message in status panel

**Expected Result:**
- [ ] Last commit message visible
- [ ] Message truncated if too long (with ellipsis)
- [ ] Full message available on hover (tooltip)
- [ ] Message updates after new commits
- [ ] Handles special characters correctly

## 4. Status Updates and Refresh

### Test Case 4.1: Manual Refresh All
**Steps:**
1. Open status panel with multiple repositories
2. Make changes externally (outside Obsidian)
3. Click refresh button

**Expected Result:**
- [ ] Refresh button shows loading state
- [ ] All repositories update status
- [ ] UI shows "Refreshing..." or similar
- [ ] Status updates reflect external changes
- [ ] Refresh button re-enables after completion
- [ ] Last refresh timestamp updates

### Test Case 4.2: Automatic Polling Updates
**Steps:**
1. Open status panel
2. Make changes to repository externally
3. Wait 30 seconds (without manual refresh)

**Expected Result:**
- [ ] Status automatically updates after ~30 seconds
- [ ] No user interaction required
- [ ] Smooth UI update (no jarring refresh)
- [ ] Debug logs show polling activity (if enabled)

### Test Case 4.3: Updates After Commit/Push
**Steps:**
1. Open status panel
2. Use FR-3 commit and push workflow
3. Observe status panel during and after operation

**Expected Result:**
- [ ] Status updates immediately after push completes
- [ ] Uncommitted changes indicator clears
- [ ] Unpushed commits count updates
- [ ] No need for manual refresh
- [ ] Smooth transition in UI

### Test Case 4.4: Updates After Fetch Completion
**Steps:**
1. Open status panel
2. Wait for or trigger automated fetch
3. Observe status panel when fetch completes

**Expected Result:**
- [ ] Status updates immediately after fetch
- [ ] Remote changes indicator updates if changes found
- [ ] Fetch time updates
- [ ] No manual refresh needed

### Test Case 4.5: Polling Stops When Panel Closed
**Steps:**
1. Enable debug logging
2. Open status panel (observe polling in logs)
3. Close status panel
4. Watch console for 2 minutes

**Expected Result:**
- [ ] Polling logs appear while panel open
- [ ] Polling logs stop after panel closes
- [ ] No continued resource usage
- [ ] No errors from stopped polling

### Test Case 4.6: Rapid Refresh Prevention
**Steps:**
1. Open status panel
2. Click refresh button rapidly 10 times

**Expected Result:**
- [ ] Only one refresh operation runs at a time
- [ ] Button disabled during refresh
- [ ] No overlapping operations
- [ ] No errors or crashes
- [ ] Smooth completion after rapid clicks

## 5. Error Handling

### Test Case 5.1: Repository Access Error
**Steps:**
1. Configure repository with invalid/inaccessible path
2. Open status panel

**Expected Result:**
- [ ] Repository shows error state
- [ ] Error icon or indicator visible
- [ ] Helpful error message (e.g., "Repository not found")
- [ ] Other repositories still display correctly
- [ ] No crash or complete failure

### Test Case 5.2: Git Command Failure
**Steps:**
1. Temporarily break git access (rename git binary)
2. Try to refresh status

**Expected Result:**
- [ ] Error indicator shows on affected repositories
- [ ] Error message explains git issue
- [ ] Retry option available
- [ ] Panel doesn't crash
- [ ] Other operations still functional after fixing

### Test Case 5.3: No Remote Configured
**Steps:**
1. Create local-only repository (no remote)
2. Open status panel

**Expected Result:**
- [ ] Repository displays successfully
- [ ] No remote changes indicator (or shows "no remote")
- [ ] No unpushed commits indicator (or shows "no remote")
- [ ] Local status (uncommitted changes) still works
- [ ] No errors displayed

### Test Case 5.4: Network Error During Fetch
**Steps:**
1. Disconnect network
2. Trigger fetch (automated or manual)
3. Observe status panel

**Expected Result:**
- [ ] Fetch error displayed for affected repositories
- [ ] Error message indicates network issue
- [ ] Other repositories continue to work
- [ ] Retry option available
- [ ] Error clears on successful retry

### Test Case 5.5: Error Recovery
**Steps:**
1. Create error condition (inaccessible path)
2. Observe error in status panel
3. Fix error condition
4. Refresh status

**Expected Result:**
- [ ] Error state visible initially
- [ ] Refresh clears error after fix
- [ ] Repository returns to normal display
- [ ] No lingering error artifacts

## 6. Performance Testing

### Test Case 6.1: Many Repositories (10+)
**Steps:**
1. Configure 10+ repositories
2. Open status panel
3. Observe loading and refresh performance

**Expected Result:**
- [ ] Panel opens within 2 seconds
- [ ] Initial status load completes within 5 seconds
- [ ] Refresh all completes within 10 seconds
- [ ] UI remains responsive during refresh
- [ ] No significant lag or freezing

### Test Case 6.2: Large Repository Status
**Steps:**
1. Create repository with 100+ uncommitted files
2. Open status panel
3. Observe rendering

**Expected Result:**
- [ ] Status renders without delay
- [ ] Change count displays correctly
- [ ] No UI lag from large change set
- [ ] File list (if shown) truncates appropriately

### Test Case 6.3: Long-Running Refresh
**Steps:**
1. Configure repository with slow git operations
2. Trigger refresh
3. Observe UI responsiveness

**Expected Result:**
- [ ] UI shows loading state
- [ ] Other UI interactions still work
- [ ] Panel doesn't freeze
- [ ] User can still navigate Obsidian
- [ ] Timeout prevents infinite hanging

### Test Case 6.4: Memory Usage Over Time
**Steps:**
1. Open status panel
2. Leave open for 30 minutes with polling active
3. Check browser memory usage

**Expected Result:**
- [ ] Memory usage stable (no leak)
- [ ] Polling continues to work
- [ ] No performance degradation
- [ ] Status updates remain accurate

## 7. UI/UX Testing

### Test Case 7.1: Responsive Layout
**Steps:**
1. Open status panel
2. Resize sidebar to minimum width
3. Resize sidebar to maximum width

**Expected Result:**
- [ ] Layout adjusts smoothly
- [ ] Text truncates with ellipsis when needed
- [ ] Icons remain visible at narrow widths
- [ ] No horizontal scrolling
- [ ] All information readable

### Test Case 7.2: Light Mode Styling
**Steps:**
1. Switch Obsidian to light theme
2. Open status panel
3. Review all visual elements

**Expected Result:**
- [ ] All text readable (sufficient contrast)
- [ ] Icons visible and appropriate color
- [ ] Status indicators clear and distinct
- [ ] Colors harmonize with Obsidian theme
- [ ] No visual glitches

### Test Case 7.3: Dark Mode Styling
**Steps:**
1. Switch Obsidian to dark theme
2. Open status panel
3. Review all visual elements

**Expected Result:**
- [ ] All text readable (sufficient contrast)
- [ ] Icons visible and appropriate color
- [ ] Status indicators clear and distinct
- [ ] Colors harmonize with Obsidian theme
- [ ] No visual glitches

### Test Case 7.4: Hover States and Interactions
**Steps:**
1. Open status panel
2. Hover over each repository item
3. Hover over refresh button
4. Hover over status indicators

**Expected Result:**
- [ ] Repository items have hover effect
- [ ] Buttons have hover effect
- [ ] Tooltips appear for truncated text
- [ ] Cursor changes appropriately
- [ ] Visual feedback is immediate

### Test Case 7.5: Long Repository Names
**Steps:**
1. Configure repository with very long name
2. Open status panel
3. Observe name display

**Expected Result:**
- [ ] Name truncates with ellipsis
- [ ] Full name available on hover
- [ ] Layout doesn't break
- [ ] Other elements remain aligned

### Test Case 7.6: Scrolling Behavior
**Steps:**
1. Configure 20+ repositories
2. Open status panel
3. Scroll through list

**Expected Result:**
- [ ] Smooth scrolling
- [ ] Header stays fixed at top
- [ ] Scroll position maintained during refresh
- [ ] No jumping or flickering

### Test Case 7.7: Last Refresh Timestamp
**Steps:**
1. Open status panel
2. Note last refresh time
3. Wait 1 minute
4. Observe timestamp

**Expected Result:**
- [ ] Timestamp updates appropriately
- [ ] Shows relative time (e.g., "Updated 2 minutes ago")
- [ ] Updates automatically as time passes
- [ ] Format is human-readable

## 8. Integration Testing

### Test Case 8.1: Integration with Settings
**Steps:**
1. Open status panel
2. Add new repository via settings
3. Observe status panel

**Expected Result:**
- [ ] New repository appears in panel
- [ ] Status loads automatically
- [ ] No manual refresh needed
- [ ] Repository positioned appropriately

### Test Case 8.2: Integration with FR-3 (Commit/Push)
**Steps:**
1. Open status panel
2. Use FR-3 commit and push
3. Observe status panel updates

**Expected Result:**
- [ ] Status updates after successful push
- [ ] Uncommitted changes clear
- [ ] Unpushed count resets
- [ ] Update is immediate (no 30s wait)

### Test Case 8.3: Integration with FR-2 (Fetch)
**Steps:**
1. Open status panel
2. Wait for or trigger automated fetch
3. Observe status panel updates

**Expected Result:**
- [ ] Status updates after fetch completes
- [ ] Remote changes indicator appears if changes found
- [ ] Fetch time updates
- [ ] Update is immediate

### Test Case 8.4: Integration with Repository Enable/Disable
**Steps:**
1. Open status panel with multiple repos
2. Disable one repository in settings
3. Observe status panel

**Expected Result:**
- [ ] Disabled repository disappears from panel
- [ ] Other repositories unaffected
- [ ] Re-enabling repository makes it reappear
- [ ] No errors

## 9. Keyboard and Accessibility

### Test Case 9.1: Keyboard Shortcuts
**Steps:**
1. Configure "Toggle status panel" command shortcut
2. Use keyboard shortcut
3. Configure "Refresh status" command shortcut
4. Use keyboard shortcut

**Expected Result:**
- [ ] Shortcuts open/close panel correctly
- [ ] Refresh shortcut triggers manual refresh
- [ ] Shortcuts work from anywhere in Obsidian
- [ ] No conflicts with other shortcuts

### Test Case 9.2: Keyboard Navigation
**Steps:**
1. Open status panel
2. Use Tab key to navigate
3. Use Enter on focusable elements

**Expected Result:**
- [ ] Can tab through all interactive elements
- [ ] Focus indicator visible
- [ ] Enter activates focused element
- [ ] Tab order is logical

### Test Case 9.3: Screen Reader Compatibility
**Steps:**
1. Enable screen reader
2. Open status panel
3. Navigate through panel

**Expected Result:**
- [ ] Panel content is announced
- [ ] Repository names read aloud
- [ ] Status indicators described
- [ ] ARIA labels present and correct

## 10. Cross-Platform Testing

### Test Case 10.1: macOS Verification
**Steps:**
1. Test all above scenarios on macOS
2. Note any platform-specific behavior

**Expected Result:**
- [ ] All features work on macOS
- [ ] UI renders correctly
- [ ] Performance acceptable
- [ ] No macOS-specific bugs

### Test Case 10.2: Windows Verification
**Steps:**
1. Test all above scenarios on Windows
2. Note any platform-specific behavior

**Expected Result:**
- [ ] All features work on Windows
- [ ] Path handling works with Windows paths
- [ ] UI renders correctly
- [ ] Performance acceptable

### Test Case 10.3: Linux Verification
**Steps:**
1. Test all above scenarios on Linux
2. Note any platform-specific behavior

**Expected Result:**
- [ ] All features work on Linux
- [ ] UI renders correctly
- [ ] Performance acceptable
- [ ] No Linux-specific bugs

## Test Summary

**Total Test Cases:** ~80
**Tests Passed:** ___
**Tests Failed:** ___
**Tests Skipped:** ___
**Critical Issues Found:** ___
**Non-Critical Issues Found:** ___

## Notes and Observations

[Add any additional observations, edge cases discovered, or suggestions for improvement]

---

**Tested By:** ___________
**Date:** ___________
**Plugin Version:** ___________
**Obsidian Version:** ___________
