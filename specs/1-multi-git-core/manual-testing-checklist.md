# Manual Testing Checklist: FR-1 Repository Configuration

**Feature:** Multi-Git Core - Repository Configuration (FR-1)  
**Status:** Implementation Complete, Manual Testing Required  
**Created:** 2025-01-12  
**Implementation Tasks:** Phases 0-4 Complete (71%), Phase 5-6 Partial

## Testing Environment Setup

### Prerequisites
- [ ] Obsidian installed (version 1.0.0+)
- [ ] Git installed and accessible from command line (version 2.20.0+)
- [ ] Plugin symlinked to Obsidian vault plugins directory
- [ ] At least 2 test git repositories available with different states:
  - [ ] Test Repo 1: Clean repository (no uncommitted changes)
  - [ ] Test Repo 2: Repository with uncommitted changes
  - [ ] Test Repo 3 (optional): Repository with special characters in path

### Setup Commands
```bash
# Build plugin
cd /Volumes/workplace/multi-git
npm run build

# Symlink to test vault (adjust path as needed)
ln -s $(pwd) ~/.obsidian/plugins/multi-git

# Or copy to vault's plugin directory
cp -r . /path/to/vault/.obsidian/plugins/multi-git
```

---

## Test Suite 1: Plugin Installation & Initialization

### 1.1 Plugin Installation
- [ ] Plugin appears in Settings → Community plugins
- [ ] Plugin can be enabled without errors
- [ ] Plugin ribbon icon appears (if applicable)
- [ ] Settings tab appears under Plugin Options

### 1.2 First Launch
- [ ] Plugin loads successfully on first launch
- [ ] No console errors in Developer Tools
- [ ] Settings tab is accessible
- [ ] Empty state message displayed (no repositories configured)
- [ ] Plugin loads in under 2 seconds (NFR-1)

**Expected Results:**
- Plugin initializes cleanly
- Settings interface displays correctly
- No error messages or crashes

---

## Test Suite 2: Adding Repositories

### 2.1 Basic Repository Addition
- [ ] Click "Add Repository" button
- [ ] Modal dialog appears
- [ ] Path input field is present
- [ ] Name input field is present (optional)
- [ ] Add button is initially disabled

**Test Case 2.1.1: Valid Repository - Absolute Path**
- [ ] Enter valid absolute path to git repository
- [ ] Add button becomes enabled
- [ ] Click Add button
- [ ] Repository appears in list
- [ ] Shows correct path (absolute)
- [ ] Shows correct name (directory name or custom)
- [ ] Shows enabled state (toggle on)
- [ ] Shows creation timestamp
- [ ] Modal closes automatically
- [ ] Settings persist (visible after restarting plugin)

**Test Case 2.1.2: Valid Repository - Custom Name**
- [ ] Add repository with custom name
- [ ] Custom name displays in repository list
- [ ] Path is still absolute
- [ ] Both name and path visible

### 2.2 Path Validation

**Test Case 2.2.1: Relative Path Rejection**
- [ ] Enter relative path (e.g., `./my-repo`)
- [ ] Add button remains disabled OR shows validation error
- [ ] Error message clearly states "absolute path required"
- [ ] User can correct path and try again

**Test Case 2.2.2: Non-Existent Path**
- [ ] Enter absolute path to non-existent directory
- [ ] Click Add button
- [ ] Error message displays clearly
- [ ] Message indicates directory doesn't exist
- [ ] Modal remains open for correction
- [ ] User can cancel or fix path

**Test Case 2.2.3: Non-Git Directory**
- [ ] Enter absolute path to valid directory that is NOT a git repository
- [ ] Click Add button
- [ ] Error message displays clearly
- [ ] Message indicates "not a valid git repository"
- [ ] User can cancel or choose different path

**Test Case 2.2.4: Duplicate Path Prevention**
- [ ] Add a repository successfully
- [ ] Try to add same repository path again
- [ ] Error message displays: "Repository already configured"
- [ ] Duplicate is not added to list
- [ ] Existing repository remains unchanged

### 2.3 Edge Cases

**Test Case 2.3.1: Path with Spaces**
- [ ] Add repository with spaces in path (e.g., `/path/to/my repo`)
- [ ] Repository adds successfully
- [ ] Path displays correctly with spaces
- [ ] Operations work on this repository

**Test Case 2.3.2: Path with Special Characters**
- [ ] Add repository with special characters (e.g., parentheses, @, -)
- [ ] Repository adds successfully
- [ ] All operations functional

**Test Case 2.3.3: Path with Unicode Characters**
- [ ] Add repository with non-ASCII characters in path
- [ ] Repository adds successfully (platform-dependent)
- [ ] Document any limitations

---

## Test Suite 3: Repository List Display

### 3.1 Basic Display
- [ ] List shows all configured repositories
- [ ] Each item displays:
  - [ ] Repository name
  - [ ] Full absolute path
  - [ ] Enabled/disabled toggle
  - [ ] Creation date/timestamp
  - [ ] Remove button
- [ ] List is scrollable if many repositories
- [ ] Empty state shows when no repositories

### 3.2 Multiple Repositories
- [ ] Add 3+ repositories
- [ ] All repositories visible in list
- [ ] Each has unique ID (not visible but functional)
- [ ] Repository order is consistent (by creation date or name)
- [ ] Repository count displayed accurately

### 3.3 Repository Status Indicators
- [ ] Enabled repositories show toggle in "on" position
- [ ] Disabled repositories show toggle in "off" position
- [ ] Visual distinction between enabled/disabled states
- [ ] Icons/indicators follow Obsidian design patterns

---

## Test Suite 4: Repository Operations

### 4.1 Toggle Enable/Disable

**Test Case 4.1.1: Disable Repository**
- [ ] Click toggle on enabled repository
- [ ] Toggle switches to "off" position immediately
- [ ] Visual feedback confirms change
- [ ] No errors displayed
- [ ] Change persists after plugin reload
- [ ] Repository remains in list (not removed)

**Test Case 4.1.2: Enable Repository**
- [ ] Click toggle on disabled repository
- [ ] Toggle switches to "on" position immediately
- [ ] Visual feedback confirms change
- [ ] No errors displayed
- [ ] Change persists after plugin reload

**Test Case 4.1.3: Rapid Toggle**
- [ ] Toggle repository on/off quickly multiple times
- [ ] All toggles register correctly
- [ ] No race conditions or stuck states
- [ ] Final state persists correctly

### 4.2 Remove Repository

**Test Case 4.2.1: Remove with Confirmation**
- [ ] Click remove button on a repository
- [ ] Confirmation modal appears
- [ ] Modal shows repository name
- [ ] Modal has Cancel and Remove buttons
- [ ] Click Cancel → modal closes, repository unchanged
- [ ] Click remove button again
- [ ] Click Remove → repository disappears from list
- [ ] Repository count updates
- [ ] Settings persist (repository gone after reload)

**Test Case 4.2.2: Remove Last Repository**
- [ ] Remove all repositories until only one remains
- [ ] Remove the last repository
- [ ] Empty state message displays
- [ ] "Add Repository" button still functional
- [ ] Can add new repositories normally

**Test Case 4.2.3: Files on Disk Unaffected**
- [ ] Note the path of repository before removing
- [ ] Remove repository from plugin
- [ ] Verify actual git repository on disk is unchanged
- [ ] Verify .git directory still exists
- [ ] Verify files are intact

### 4.3 Edit Operations (if implemented)
- [ ] Can update repository name (if edit functionality exists)
- [ ] Path updates if repository moved (if applicable)
- [ ] Changes persist correctly

---

## Test Suite 5: Settings Persistence

### 5.1 Plugin Reload
- [ ] Configure 2-3 repositories
- [ ] Toggle one to disabled
- [ ] Disable and re-enable plugin
- [ ] All repositories still present
- [ ] Enabled/disabled states preserved
- [ ] Paths remain absolute
- [ ] Names unchanged

### 5.2 Obsidian Restart
- [ ] Configure repositories
- [ ] Close Obsidian completely
- [ ] Reopen Obsidian
- [ ] Enable plugin if needed
- [ ] All repositories present with correct settings
- [ ] data.json file exists in plugin directory

### 5.3 Settings File Validation
- [ ] Navigate to plugin data directory
- [ ] Open `data.json` file
- [ ] Verify structure matches expected format:
  ```json
  {
    "repositories": [
      {
        "id": "uuid-here",
        "path": "/absolute/path/to/repo",
        "name": "Repo Name",
        "enabled": true,
        "createdAt": 1234567890,
        "lastValidated": 1234567890
      }
    ],
    "version": "0.1.0"
  }
  ```
- [ ] All paths are absolute
- [ ] All IDs are unique UUIDs
- [ ] Timestamps are valid Unix timestamps

---

## Test Suite 6: User Interface & UX

### 6.1 Visual Design
- [ ] Settings UI matches Obsidian's design system
- [ ] Buttons use standard Obsidian styling
- [ ] Spacing and layout are consistent
- [ ] Typography matches Obsidian fonts
- [ ] Icons are appropriate and clear
- [ ] Colors follow current theme (light/dark)

### 6.2 Responsive Design
- [ ] Settings UI works on narrow windows
- [ ] Settings UI works on wide windows
- [ ] No horizontal scrolling required
- [ ] Repository list scrolls vertically if needed
- [ ] Modal dialogs centered and sized appropriately

### 6.3 Interaction Feedback
- [ ] Buttons show hover states
- [ ] Loading indicators during operations (if applicable)
- [ ] Success messages after adding repository (notice or inline)
- [ ] Error messages are clear and actionable
- [ ] No operations complete silently without feedback

### 6.4 Keyboard Navigation
- [ ] Tab key navigates between controls
- [ ] Enter key submits forms
- [ ] Escape key closes modals
- [ ] Focus indicators visible
- [ ] All interactive elements reachable via keyboard

### 6.5 Accessibility
- [ ] Screen reader can announce button labels
- [ ] Form fields have proper labels
- [ ] Error messages are announced
- [ ] Sufficient color contrast
- [ ] Focus states clearly visible

---

## Test Suite 7: Error Handling

### 7.1 Validation Errors (Inline)
- [ ] Invalid path shows inline error message
- [ ] Error appears below input field
- [ ] Error is red/warning colored
- [ ] Error message is specific and helpful
- [ ] User can correct error and retry

### 7.2 Operation Failures (Modals)
- [ ] Critical error shows modal dialog
- [ ] Modal has clear title (e.g., "Error Adding Repository")
- [ ] Modal body explains what went wrong
- [ ] Modal has "OK" or "Close" button
- [ ] User can dismiss modal and retry

### 7.3 Git Command Failures
**Test Case 7.3.1: Git Not Installed**
- [ ] Temporarily rename git executable (or test on system without git)
- [ ] Try to add repository
- [ ] Clear error message about git not found
- [ ] Instructions on installing git
- [ ] Plugin doesn't crash

**Test Case 7.3.2: Permission Denied**
- [ ] Try to add repository path without read permissions
- [ ] Clear error about permission issue
- [ ] User can understand what went wrong

### 7.4 Recovery
- [ ] After any error, user can retry operation
- [ ] Plugin remains functional after errors
- [ ] No corrupted state after failed operations
- [ ] Settings remain valid after errors

---

## Test Suite 8: Performance (NFR-1)

### 8.1 Plugin Load Time
- [ ] Measure plugin initialization time (Developer Tools)
- [ ] Should add less than 1 second to Obsidian startup
- [ ] No noticeable delay when opening settings

### 8.2 Operation Speed
- [ ] Add repository completes in under 2 seconds
- [ ] Remove repository completes immediately
- [ ] Toggle completes immediately
- [ ] Settings UI renders in under 500ms
- [ ] No UI blocking during operations

### 8.3 Multiple Repositories
- [ ] Add 10 repositories
- [ ] All operations remain fast
- [ ] List renders without lag
- [ ] Scrolling is smooth
- [ ] Memory usage under 50MB (check in Dev Tools)

### 8.4 Large Path Lengths
- [ ] Add repository with very long absolute path
- [ ] Path displays correctly (truncated or scrollable)
- [ ] No performance degradation

---

## Test Suite 9: Cross-Platform Compatibility

### 9.1 macOS Testing
- [ ] All basic operations work on macOS
- [ ] Paths with spaces handled correctly
- [ ] Unix-style absolute paths (/Users/...) validated correctly
- [ ] No platform-specific errors

### 9.2 Windows Testing (if available)
- [ ] All basic operations work on Windows
- [ ] Drive letters recognized (C:\...)
- [ ] Backslashes handled correctly
- [ ] UNC paths work (if supported)
- [ ] Case sensitivity handled properly

### 9.3 Linux Testing (if available)
- [ ] All basic operations work on Linux
- [ ] Unix-style paths work
- [ ] Symlinks handled correctly
- [ ] No platform-specific errors

---

## Test Suite 10: Integration Testing

### 10.1 Console Testing (Backend Services)
Open Developer Console and test services directly:

```javascript
// Access plugin instance
const plugin = app.plugins.plugins['multi-git'];

// Test 1: Add repository
await plugin.repositoryConfigService.addRepository('/path/to/test/repo');
// Expected: Repository added, returns RepositoryConfig object

// Test 2: Get repositories
plugin.repositoryConfigService.getRepositories();
// Expected: Array of all repositories

// Test 3: Get single repository
const repos = plugin.repositoryConfigService.getRepositories();
plugin.repositoryConfigService.getRepository(repos[0].id);
// Expected: Single repository object

// Test 4: Toggle repository
await plugin.repositoryConfigService.toggleRepository(repos[0].id);
// Expected: Returns new enabled state (true/false)

// Test 5: Get enabled repositories only
plugin.repositoryConfigService.getEnabledRepositories();
// Expected: Array of only enabled repositories

// Test 6: Remove repository
await plugin.repositoryConfigService.removeRepository(repos[0].id);
// Expected: Returns true, repository removed

// Test 7: Verify persistence
plugin.settings.repositories;
// Expected: Array matches what's displayed in UI
```

**Console Test Results:**
- [ ] All service methods accessible
- [ ] Methods return expected types
- [ ] Async methods resolve correctly
- [ ] Errors thrown for invalid inputs
- [ ] Settings object synchronized with UI

### 10.2 Settings Synchronization
- [ ] Add repository via UI
- [ ] Check `plugin.settings.repositories` in console
- [ ] Verify repository appears in settings object
- [ ] Remove via UI → verify removed from settings
- [ ] Toggle via UI → verify enabled state in settings

---

## Test Suite 11: Edge Cases & Stress Testing

### 11.1 Boundary Conditions
- [ ] Add repository with maximum path length
- [ ] Add 50+ repositories (stress test)
- [ ] Rapidly add/remove multiple repositories
- [ ] Add repository with minimal name (1 character)
- [ ] Add repository with very long name (200+ characters)

### 11.2 Concurrent Operations
- [ ] Add two repositories simultaneously (if possible)
- [ ] Toggle while adding repository
- [ ] Close modal during repository addition

### 11.3 Data Corruption Recovery
- [ ] Manually edit data.json with invalid JSON
- [ ] Reload plugin
- [ ] Verify graceful handling (reset or error message)
- [ ] Plugin remains functional after recovery

### 11.4 Network/Disk Issues
- [ ] Add repository on network drive (if applicable)
- [ ] Add repository on full disk (error handling)
- [ ] Add repository with intermittent disk access

---

## Test Suite 12: Regression Testing

After any bug fixes or changes:
- [ ] Re-run basic operations (add, remove, toggle)
- [ ] Verify settings persistence
- [ ] Check console for new errors
- [ ] Verify no features broken
- [ ] Test on all available platforms

---

## Pass/Fail Criteria

### Must Pass (Critical)
- [ ] All repositories must persist across restarts
- [ ] Path validation prevents invalid configurations
- [ ] No data loss during operations
- [ ] All CRUD operations functional
- [ ] No console errors during normal operation
- [ ] Settings UI fully functional

### Should Pass (Important)
- [ ] All error messages clear and actionable
- [ ] Performance meets requirements (<2s operations)
- [ ] UI follows Obsidian design patterns
- [ ] Keyboard navigation works
- [ ] Cross-platform compatibility verified

### Nice to Have (Enhancement)
- [ ] Advanced edge cases handled gracefully
- [ ] Outstanding UX polish
- [ ] Comprehensive error recovery

---

## Testing Results Summary

**Date Tested:** _____________  
**Tested By:** _____________  
**Platform:** _____________  
**Obsidian Version:** _____________  
**Plugin Version:** _____________

### Test Suite Results

| Suite | Tests | Passed | Failed | Skipped | Notes |
|-------|-------|--------|--------|---------|-------|
| 1. Installation | | | | | |
| 2. Adding Repos | | | | | |
| 3. Display | | | | | |
| 4. Operations | | | | | |
| 5. Persistence | | | | | |
| 6. UI/UX | | | | | |
| 7. Error Handling | | | | | |
| 8. Performance | | | | | |
| 9. Cross-Platform | | | | | |
| 10. Integration | | | | | |
| 11. Edge Cases | | | | | |
| 12. Regression | | | | | |

### Critical Issues Found
1. 
2. 
3. 

### Minor Issues Found
1. 
2. 
3. 

### Recommendations
1. 
2. 
3. 

### Overall Status
- [ ] **PASS** - Ready for deployment
- [ ] **PASS WITH ISSUES** - Minor issues, can deploy with caveats
- [ ] **FAIL** - Critical issues must be fixed before deployment

---

## Next Steps After Testing

If all tests pass:
1. Update tasks.md marking INT-001, PERF-001 as complete
2. Proceed with Phase 6 validation (VAL-001, VAL-002)
3. Prepare for deployment (DEPLOY-001)

If critical issues found:
1. Document issues in GitHub issues or task tracker
2. Fix critical bugs
3. Re-run affected test suites
4. Update this checklist with new test cases if needed
