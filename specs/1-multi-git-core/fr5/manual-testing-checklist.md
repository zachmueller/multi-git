# FR-5 Manual Testing Checklist: Error Handling and Recovery

**Feature:** Multi-Git Core for Obsidian  
**Requirement:** FR-5: Error Handling and Recovery  
**Created:** 2025-12-15  
**Status:** Ready for Testing

## Test Environment Setup

- [ ] Obsidian installed and running
- [ ] Multi-Git plugin loaded in development mode
- [ ] At least 2 test repositories configured
- [ ] Test repositories have remote origins (for auth/network testing)

## Test Scenarios

### 1. Authentication Failure Testing

#### 1.1 SSH Authentication Failure
**Setup:**
- Configure a repository with SSH URL that requires authentication
- Remove or invalidate SSH keys temporarily

**Steps:**
1. Trigger a fetch operation
2. Verify AuthFailureModal appears
3. Check modal shows SSH setup instructions
4. Verify instructions are platform-specific
5. Check links to GitHub/GitLab/Bitbucket work
6. Verify "I Understand" button closes modal

**Expected Results:**
- [ ] Modal appears immediately when auth fails
- [ ] SSH instructions show correct commands for your OS
- [ ] All external links open in new tab
- [ ] Technical details are collapsible
- [ ] Modal has proper styling in light and dark themes

#### 1.2 HTTPS Authentication Failure
**Setup:**
- Configure a repository with HTTPS URL requiring credentials
- Use invalid credentials or remove credential helper

**Steps:**
1. Trigger a push operation
2. Verify AuthFailureModal appears
3. Check HTTPS credential setup instructions
4. Verify divider between SSH and HTTPS options
5. Test links to token/password setup pages

**Expected Results:**
- [ ] HTTPS instructions shown clearly
- [ ] Platform-specific credential helper command displayed
- [ ] Personal access token links work
- [ ] Instructions are beginner-friendly

### 2. Merge Conflict Testing

#### 2.1 Merge Conflict During Pull
**Setup:**
- Create conflicting changes in local and remote branches
- Ensure conflict will occur on pull

**Steps:**
1. Trigger pull operation
2. Verify MergeConflictModal appears
3. Check conflicted files are listed
4. Verify conflict marker explanation is clear
5. Test "Open in File Explorer" button
6. Check resolution steps are actionable

**Expected Results:**
- [ ] All conflicted files listed correctly
- [ ] Conflict markers (<<<<<<, =======, >>>>>>>) explained
- [ ] Resolution steps are numbered and clear
- [ ] "Open in File Explorer" opens correct directory
- [ ] "I'll Resolve This" button closes modal
- [ ] Technical details show git output

#### 2.2 Multiple Conflicted Files
**Setup:**
- Create conflicts in 3+ files

**Steps:**
1. Trigger operation that causes conflicts
2. Verify all files are listed in modal
3. Check each file is clearly displayed

**Expected Results:**
- [ ] All conflicted files shown in list
- [ ] Files are formatted clearly
- [ ] Modal scrollable if many files

### 3. Network Error Testing

#### 3.1 Network Timeout
**Setup:**
- Disconnect network or use invalid remote URL

**Steps:**
1. Trigger fetch operation
2. Verify error is classified as network error
3. Check notification (not modal) appears
4. Verify error message mentions network issue

**Expected Results:**
- [ ] Notification shown (not modal)
- [ ] Error message clear about network issue
- [ ] Repository name included in message
- [ ] Other repositories can still be fetched

#### 3.2 Host Unreachable
**Setup:**
- Configure repository with non-existent host

**Steps:**
1. Attempt fetch
2. Verify appropriate error handling
3. Check retry functionality works

**Expected Results:**
- [ ] Error handled gracefully
- [ ] User can retry operation
- [ ] Error doesn't crash plugin

### 4. Error Presentation Testing

#### 4.1 Critical vs Minor Error Routing
**Test Cases:**
- Authentication failure → Modal
- Merge conflict → Modal
- Network timeout → Notification
- Status check failure → Inline in status panel

**Steps:**
1. Test each error type
2. Verify correct presentation method used
3. Check all include repository name

**Expected Results:**
- [ ] Critical errors show modals
- [ ] Minor errors show notifications
- [ ] Status errors show inline
- [ ] Repository name always visible

#### 4.2 Concurrent Errors
**Setup:**
- Multiple repositories with different errors

**Steps:**
1. Trigger operations that cause errors in multiple repos
2. Verify errors handled independently
3. Check modal queue works (one modal at a time)

**Expected Results:**
- [ ] Each repository's error handled separately
- [ ] Only one modal shown at a time
- [ ] Notifications can appear concurrently
- [ ] Status panel shows all repo errors

### 5. Error Recovery Testing

#### 5.1 Retry After Network Error
**Steps:**
1. Cause network error
2. Fix network issue
3. Click retry button
4. Verify operation succeeds

**Expected Results:**
- [ ] Retry button visible
- [ ] Retry executes operation again
- [ ] Success updates status appropriately

#### 5.2 Retry After Auth Fix
**Steps:**
1. Cause auth failure
2. Fix SSH keys/credentials
3. Retry operation
4. Verify success

**Expected Results:**
- [ ] Can retry after fixing auth
- [ ] Operation succeeds after fix
- [ ] No lingering error state

### 6. UI/UX Testing

#### 6.1 Modal Appearance
**Test in both light and dark themes:**

**Checks:**
- [ ] Text is readable in both themes
- [ ] Colors have good contrast
- [ ] Icons render correctly
- [ ] Buttons are clearly visible
- [ ] Links are distinguishable

#### 6.2 Modal Responsiveness
**Steps:**
1. Open modals in different window sizes
2. Test with narrow Obsidian pane

**Expected Results:**
- [ ] Modal content doesn't overflow
- [ ] Text wraps appropriately
- [ ] Buttons remain accessible
- [ ] Scrolling works if needed

#### 6.3 Technical Details Toggle
**Steps:**
1. Open modal with technical details
2. Click "Show Technical Details"
3. Verify details appear
4. Click "Hide Technical Details"
5. Verify details hide

**Expected Results:**
- [ ] Toggle button text updates
- [ ] Details expand/collapse smoothly
- [ ] Formatted error output readable

### 7. Cross-Platform Testing

**Test on available platforms:**

#### 7.1 macOS
- [ ] SSH copy command uses `pbcopy`
- [ ] Credential helper uses `osxkeychain`
- [ ] File explorer opens Finder
- [ ] All functionality works

#### 7.2 Windows
- [ ] SSH copy command uses `clip`
- [ ] Credential helper uses `wincred`
- [ ] File explorer opens Explorer
- [ ] All functionality works

#### 7.3 Linux
- [ ] SSH copy command uses `cat`
- [ ] Credential helper uses `store`
- [ ] File explorer opens correctly
- [ ] All functionality works

### 8. Edge Cases

#### 8.1 Very Long Error Messages
**Steps:**
1. Generate error with very long stderr output
2. Verify modal handles it gracefully

**Expected Results:**
- [ ] Long messages don't break layout
- [ ] Technical details scrollable
- [ ] Message remains readable

#### 8.2 Special Characters in Errors
**Steps:**
1. Generate errors with special characters
2. Check proper escaping/display

**Expected Results:**
- [ ] Special characters display correctly
- [ ] No XSS vulnerabilities
- [ ] Format remains intact

#### 8.3 Missing Error Details
**Steps:**
1. Trigger errors with minimal information
2. Verify modal handles gracefully

**Expected Results:**
- [ ] Modal doesn't crash
- [ ] Shows available information
- [ ] Provides generic but helpful guidance

## Regression Testing

### Existing Functionality
- [ ] Fetch operations still work normally
- [ ] Commit/push operations still work
- [ ] Status panel updates correctly
- [ ] Notifications still appear for minor issues
- [ ] Multiple repositories work independently

## Performance Testing

- [ ] Modals appear quickly (<500ms)
- [ ] Error classification doesn't slow operations
- [ ] No memory leaks from modal creation/destruction
- [ ] Plugin remains responsive during errors

## Documentation Verification

- [ ] README mentions error handling features
- [ ] Common errors documented
- [ ] Troubleshooting guide helpful
- [ ] Links in modals work and are current

## Sign-off

**Tester:** ________________  
**Date:** ________________  
**Build/Version:** ________________

**Overall Assessment:**
- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Ready for production

**Notes:**
