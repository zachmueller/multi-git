# Troubleshooting Guide

Comprehensive troubleshooting guide for Multi-Git Obsidian plugin error handling and recovery.

## Table of Contents

- [Error Handling Overview](#error-handling-overview)
- [Critical Error Modals](#critical-error-modals)
- [Authentication Failures](#authentication-failures)
- [Merge Conflicts](#merge-conflicts)
- [Network Errors](#network-errors)
- [Permission Errors](#permission-errors)
- [Common Git Issues](#common-git-issues)
- [Auto-Pull Issues](#auto-pull-issues)
- [Plugin Configuration Issues](#plugin-configuration-issues)
- [Debug Mode](#debug-mode)

## Error Handling Overview

The plugin uses a comprehensive error handling system that categorizes errors by severity and presents them in context-appropriate ways:

### Error Severities

- **CRITICAL**: Requires immediate attention, shown in modal dialogs
  - Authentication failures
  - Merge conflicts
  - Repository access errors

- **MINOR**: Background issues, shown as notifications
  - Network timeouts
  - Non-critical fetch failures
  - Temporary connectivity issues

- **WARNING**: Informational, shown inline
  - Repository status check failures
  - Configuration warnings

### Error Presentation Methods

1. **Modal Dialogs** - For critical errors requiring user action
2. **Notifications** - For background operation failures
3. **Inline Messages** - For status panel and UI warnings

## Critical Error Modals

### Authentication Failure Modal

**When it appears:**
- Git operations fail due to authentication issues
- SSH key not configured or invalid
- HTTPS credentials missing or expired

**Modal Content:**
```
┌────────────────────────────────────────┐
│   Authentication Failed                │
├────────────────────────────────────────┤
│ Repository: my-project                 │
│                                        │
│ Git operation failed due to            │
│ authentication issues.                 │
│                                        │
│ Suggested Actions:                     │
│ • Set up SSH keys (recommended)        │
│ • Configure HTTPS credentials          │
│ • Verify remote URL is correct         │
│                                        │
│ [Technical Details ▼]                  │
│                                        │
│ [Setup Instructions] [Close]           │
└────────────────────────────────────────┘
```

**Resolution Steps:**
See [Authentication Failures](#authentication-failures) section below.

### Merge Conflict Modal

**When it appears:**
- Git pull or merge operations encounter conflicts
- Local changes conflict with remote changes
- Conflicted files need manual resolution

**Modal Content:**
```
┌────────────────────────────────────────┐
│   Merge Conflict Detected              │
├────────────────────────────────────────┤
│ Repository: my-project                 │
│                                        │
│ Conflicted Files:                      │
│ • src/main.ts                         │
│ • README.md                            │
│                                        │
│ Resolution Steps:                      │
│ 1. Open conflicted files              │
│ 2. Look for conflict markers          │
│ 3. Edit to resolve conflicts          │
│ 4. Save files                         │
│ 5. Stage and commit                   │
│                                        │
│ [Open in File Explorer]               │
│ [I've Resolved the Conflicts] [Close] │
└────────────────────────────────────────┘
```

**Resolution Steps:**
See [Merge Conflicts](#merge-conflicts) section below.

### Generic Critical Error Modal

**When it appears:**
- Unknown critical git errors
- Repository state issues
- Unexpected command failures

**Modal Content:**
```
┌────────────────────────────────────────┐
│   Critical Error                       │
├────────────────────────────────────────┤
│ Repository: my-project                 │
│                                        │
│ An unexpected error occurred during    │
│ git operation.                         │
│                                        │
│ Suggested Actions:                     │
│ • Check repository state               │
│ • Try manual git operation             │
│ • Check for uncommitted changes        │
│                                        │
│ [Technical Details ▼]                  │
│ Error output: ...                      │
│                                        │
│ [Acknowledge]                          │
└────────────────────────────────────────┘
```

## Authentication Failures

### SSH Authentication Issues

**Problem:** Git operations fail with SSH authentication errors

**Common Error Messages:**
```
Permission denied (publickey)
Could not read from remote repository
Host key verification failed
```

**Resolution for macOS/Linux:**

1. **Generate SSH Key (if you don't have one):**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Or for older systems:
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
   ```

2. **Start SSH Agent:**
   ```bash
   eval "$(ssh-agent -s)"
   ```

3. **Add Key to SSH Agent:**
   ```bash
   ssh-add ~/.ssh/id_ed25519
   # Or for RSA:
   ssh-add ~/.ssh/id_rsa
   ```

4. **Add Public Key to Git Service:**
   ```bash
   # Copy public key to clipboard (macOS):
   pbcopy < ~/.ssh/id_ed25519.pub
   
   # Or display to manually copy:
   cat ~/.ssh/id_ed25519.pub
   ```

5. **Add to GitHub/GitLab/Bitbucket:**
   - GitHub: Settings → SSH and GPG keys → New SSH key
   - GitLab: Preferences → SSH Keys → Add SSH Key
   - Bitbucket: Personal settings → SSH keys → Add key

6. **Test Connection:**
   ```bash
   # GitHub:
   ssh -T git@github.com
   
   # GitLab:
   ssh -T git@gitlab.com
   
   # Bitbucket:
   ssh -T git@bitbucket.org
   ```

**Resolution for Windows:**

1. **Generate SSH Key (Git Bash or PowerShell):**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. **Start SSH Agent (PowerShell as Admin):**
   ```powershell
   Get-Service ssh-agent | Set-Service -StartupType Automatic
   Start-Service ssh-agent
   ```

3. **Add Key to SSH Agent:**
   ```bash
   ssh-add $HOME/.ssh/id_ed25519
   ```

4. **Copy Public Key:**
   ```bash
   # PowerShell:
   Get-Content $HOME/.ssh/id_ed25519.pub | Set-Clipboard
   
   # Or Git Bash:
   cat ~/.ssh/id_ed25519.pub
   ```

5. Follow step 5-6 from macOS/Linux instructions above.

### HTTPS Authentication Issues

**Problem:** Git operations fail with HTTPS credential errors

**Common Error Messages:**
```
Authentication failed
fatal: could not read Username
fatal: could not read Password
```

**Resolution for macOS:**

1. **Configure Git to Use Credential Helper:**
   ```bash
   git config --global credential.helper osxkeychain
   ```

2. **Test with Manual Operation:**
   ```bash
   cd /path/to/repository
   git fetch
   # Enter username and password when prompted
   ```

3. **Credentials Saved in Keychain:**
   - Stored automatically after first successful auth
   - Managed in macOS Keychain Access app

**Resolution for Windows:**

1. **Configure Git Credential Manager:**
   ```bash
   git config --global credential.helper manager-core
   ```

2. **Or Use Windows Credential Manager:**
   ```bash
   git config --global credential.helper wincred
   ```

3. **Test with Manual Operation:**
   ```bash
   cd C:\path\to\repository
   git fetch
   # Windows Credential Manager will handle authentication
   ```

**Resolution for Linux:**

1. **Install Git Credential Manager:**
   ```bash
   # Ubuntu/Debian:
   sudo apt-get install git-credential-libsecret
   
   # Or cache credentials (15-minute timeout):
   git config --global credential.helper cache
   
   # Or cache with custom timeout (1 hour):
   git config --global credential.helper 'cache --timeout=3600'
   ```

2. **Or Store Credentials (less secure):**
   ```bash
   git config --global credential.helper store
   # Stores credentials in plain text at ~/.git-credentials
   ```

3. **Test with Manual Operation:**
   ```bash
   cd /path/to/repository
   git fetch
   # Enter credentials when prompted
   ```

### Personal Access Tokens (GitHub/GitLab)

**For GitHub (since password authentication deprecated):**

1. **Generate Personal Access Token:**
   - Go to Settings → Developer settings → Personal access tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (full control of private repositories)
   - Copy the generated token

2. **Use Token as Password:**
   - Username: your GitHub username
   - Password: paste the personal access token

3. **Configure Git to Remember Token:**
   ```bash
   git config --global credential.helper store
   # Then perform git operation and enter token once
   ```

**For GitLab:**

1. **Generate Personal Access Token:**
   - Go to Preferences → Access Tokens
   - Create token with `read_repository` and `write_repository` scopes
   - Copy the generated token

2. Use token as password (same as GitHub)

## Merge Conflicts

### Understanding Merge Conflicts

**What they are:**
- Occur when same file section modified in different branches
- Git cannot automatically determine which changes to keep
- Require manual resolution

**Conflict Markers:**
```
<<<<<<< HEAD
Your local changes
=======
Remote changes
>>>>>>> origin/main
```

### Resolution Process

1. **Identify Conflicted Files:**
   - Listed in the Merge Conflict modal
   - Or run: `git status` in terminal

2. **Open Each Conflicted File:**
   - Use your preferred text editor
   - Look for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)

3. **Resolve Conflicts:**
   ```
   Before resolution:
   <<<<<<< HEAD
   Local line 1
   Local line 2
   =======
   Remote line 1
   Remote line 2
   >>>>>>> origin/main
   
   After resolution (example):
   Local line 1
   Remote line 2
   ```

4. **Remove Conflict Markers:**
   - Delete `<<<<<<<`, `=======`, `>>>>>>>` lines
   - Keep only the desired final content

5. **Stage Resolved Files:**
   ```bash
   cd /path/to/repository
   git add path/to/resolved/file.txt
   ```

6. **Commit the Resolution:**
   ```bash
   git commit -m "Resolve merge conflict in file.txt"
   ```

7. **Push to Remote:**
   ```bash
   git push
   ```

### Prevention Strategies

1. **Pull Before Making Changes:**
   ```bash
   git pull origin main
   # Make your changes
   # Commit and push
   ```

2. **Communicate with Team:**
   - Coordinate who's editing which files
   - Use feature branches for larger changes

3. **Commit Frequently:**
   - Smaller commits = easier conflict resolution
   - Atomic commits for logical changes

### Common Conflict Scenarios

**Scenario 1: Both Modified Same Lines**
```
<<<<<<< HEAD
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
=======
function calculateTotal(items) {
  return items.map(i => i.price).reduce((a, b) => a + b, 0);
>>>>>>> origin/main
}
```
**Resolution:** Choose one implementation or merge best parts of both.

**Scenario 2: One Deleted, One Modified**
```
<<<<<<< HEAD
(file section removed)
=======
Updated content
>>>>>>> origin/main
```
**Resolution:** Decide if deletion or modification should win.

**Scenario 3: Both Added Different Content**
```
<<<<<<< HEAD
New feature A implementation
=======
New feature B implementation
>>>>>>> origin/main
```
**Resolution:** May need to keep both features or choose one.

## Network Errors

### Fetch Operation Timeouts

**Problem:** Fetch operations time out or fail due to network issues

**Error Messages:**
```
fatal: unable to access 'https://github.com/...': Operation timed out
Could not resolve host: github.com
Failed to connect to github.com port 443
```

**Resolutions:**

1. **Check Internet Connection:**
   ```bash
   ping github.com
   # Or
   curl -I https://github.com
   ```

2. **Increase Git Timeout:**
   ```bash
   git config --global http.timeout 60
   git config --global http.lowSpeedLimit 0
   git config --global http.lowSpeedTime 999999
   ```

3. **Check Firewall/Proxy Settings:**
   - Ensure git traffic is allowed
   - Configure proxy if needed:
     ```bash
     git config --global http.proxy http://proxy.example.com:8080
     ```

4. **Try Different Protocol:**
   - Switch from HTTPS to SSH or vice versa:
     ```bash
     # View current remote URL:
     git remote get-url origin
     
     # Change to SSH:
     git remote set-url origin git@github.com:username/repo.git
     
     # Or change to HTTPS:
     git remote set-url origin https://github.com/username/repo.git
     ```

5. **Increase Plugin Fetch Interval:**
   - In settings, increase global fetch interval
   - Reduces frequency of network requests

### DNS Resolution Issues

**Problem:** Cannot resolve git service hostname

**Resolution:**

1. **Flush DNS Cache:**
   ```bash
   # macOS:
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Windows (as Admin):
   ipconfig /flushdns
   
   # Linux:
   sudo systemd-resolve --flush-caches
   ```

2. **Try Alternate DNS:**
   - Configure to use Google DNS (8.8.8.8) or Cloudflare (1.1.1.1)

3. **Check /etc/hosts (Unix-like):**
   - Ensure no conflicting entries for git service domains

### SSL/TLS Certificate Errors

**Problem:** SSL certificate verification failures

**Error Messages:**
```
SSL certificate problem: unable to get local issuer certificate
server certificate verification failed
```

**Resolution:**

1. **Update Git:**
   ```bash
   # macOS (Homebrew):
   brew upgrade git
   
   # Windows: Download latest from git-scm.com
   
   # Linux:
   sudo apt update && sudo apt upgrade git
   ```

2. **Update CA Certificates:**
   ```bash
   # macOS:
   brew install ca-certificates
   
   # Ubuntu/Debian:
   sudo apt install ca-certificates
   sudo update-ca-certificates
   
   # Windows: Included in Git for Windows updates
   ```

3. **Temporary Workaround (NOT RECOMMENDED for production):**
   ```bash
   # Only for testing/diagnosis:
   git config --global http.sslVerify false
   
   # Re-enable after testing:
   git config --global http.sslVerify true
   ```

## Permission Errors

### File System Permission Issues

**Problem:** Git operations fail due to file permissions

**Error Messages:**
```
Permission denied
fatal: unable to write file
error: insufficient permission for adding an object
```

**Resolution for macOS/Linux:**

1. **Check Repository Ownership:**
   ```bash
   ls -la /path/to/repository
   ```

2. **Fix Ownership (if needed):**
   ```bash
   sudo chown -R $USER:$USER /path/to/repository
   ```

3. **Fix Permissions:**
   ```bash
   chmod -R u+rw /path/to/repository
   ```

4. **Check .git Directory:**
   ```bash
   ls -la /path/to/repository/.git
   chmod -R u+rw /path/to/repository/.git
   ```

**Resolution for Windows:**

1. **Run as Administrator:**
   - Try running Obsidian as Administrator

2. **Check File Properties:**
   - Right-click repository folder
   - Properties → Security
   - Ensure your user has Full Control

3. **Remove Read-Only Attribute:**
   ```powershell
   attrib -R /S /D C:\path\to\repository\*
   ```

### Repository Lock Files

**Problem:** Git operations blocked by lock files

**Error Messages:**
```
fatal: Unable to create '.git/index.lock': File exists
Another git process seems to be running
```

**Resolution:**

1. **Check for Running Git Processes:**
   ```bash
   # macOS/Linux:
   ps aux | grep git
   
   # Windows:
   tasklist | findstr git
   ```

2. **Remove Lock File (if safe):**
   ```bash
   # Ensure no git operations are running, then:
   rm /path/to/repository/.git/index.lock
   ```

3. **Check for Stale Locks:**
   ```bash
   find /path/to/repository/.git -name "*.lock" -type f
   # Remove if you're certain no operations are running
   ```

## Common Git Issues

### Detached HEAD State

**Problem:** Repository in detached HEAD state

**Resolution:**
```bash
cd /path/to/repository

# Check current state:
git status

# Return to main branch:
git checkout main

# Or create a branch from current state:
git checkout -b new-branch-name
```

### Corrupted Repository

**Problem:** Git repository corruption

**Error Messages:**
```
fatal: loose object is corrupt
error: object file is empty
```

**Resolution:**

1. **Try Git Repair:**
   ```bash
   cd /path/to/repository
   git fsck --full
   git gc --prune=now
   ```

2. **Restore from Backup:**
   - If available, restore .git directory from backup

3. **Re-clone Repository:**
   ```bash
   # Backup your changes:
   cp -r /path/to/repository /path/to/repository-backup
   
   # Re-clone:
   cd /path/to/parent-directory
   mv repository repository-old
   git clone <repository-url> repository
   
   # Copy over uncommitted changes from backup
   ```

### Large File Issues

**Problem:** Repository contains large files causing slow operations

**Resolution:**

1. **Use Git LFS:**
   ```bash
   git lfs install
   git lfs track "*.psd"
   git lfs track "*.mp4"
   git add .gitattributes
   ```

2. **Remove Large Files from History:**
   ```bash
   # Use git filter-repo (safer than filter-branch)
   pip install git-filter-repo
   git filter-repo --path-glob '*.large-extension' --invert-paths
   ```

3. **Increase Buffer Size:**
   ```bash
   git config --global http.postBuffer 524288000
   ```

## Auto-Pull Issues

### Auto-Pull Not Working

**Problem:** Remote changes detected but not pulling automatically

**Diagnosis Checklist:**

1. **Check Global Setting:**
   - Settings → Multi-Git → "Enable automatic pull"
   - Should be enabled (toggled on)

2. **Check Per-Repository Setting:**
   - Settings → Multi-Git → Repository list
   - Look for repository-specific auto-pull toggle
   - Per-repository setting overrides global setting

3. **Check Pull History in Status Panel:**
   - Open status panel (ribbon icon or hotkey)
   - Expand "Pull History" for the repository
   - Review last 10 pull attempts
   - Look for skip reason or error message

4. **Enable Debug Logging:**
   - See [Debug Mode](#debug-mode) section
   - Logs will show why pull was skipped

**Common Causes & Solutions:**

| Cause | Indication | Solution |
|-------|-----------|----------|
| Auto-pull disabled globally | Global toggle off | Enable in plugin settings |
| Auto-pull disabled for repo | Per-repo toggle off | Enable for specific repository |
| Uncommitted changes | Skip reason: UNCOMMITTED_CHANGES | Commit or stash your changes |
| Branches diverged | Skip reason: DIVERGED_BRANCHES | Manually merge or rebase |
| Detached HEAD | Skip reason: DETACHED_HEAD | Checkout a branch |
| No tracking branch | Skip reason: NO_TRACKING_BRANCH | Set upstream: `git branch --set-upstream-to=origin/main` |
| Local ahead of remote | Skip reason: NOT_FAST_FORWARD | Push your commits first |

### Auto-Pull Fails Repeatedly

**Problem:** Pull operations consistently failing with errors

**Check Pull History:** 

Open status panel → Expand repository → View "Pull History" section. This shows:
- Last 10 pull attempts
- Timestamp for each attempt
- Result (success/failed/skipped)
- Error details or skip reasons
- Retry count for failed operations

**Common Error Types:**

#### 1. Network Errors

**Symptoms:**
```
Error: Network error: Unable to reach remote repository
Error Code: NETWORK_ERROR
Retry Count: 3
```

**What Happens:**
- Plugin automatically retries with exponential backoff
- Retry delays: immediate → 10 seconds → 30 seconds
- Maximum 3 retry attempts
- If all retries fail, marked as failed

**Solutions:**

1. **Check Internet Connection:**
   ```bash
   ping github.com
   # or ping your git server
   ```

2. **Verify Remote URL Accessible:**
   ```bash
   cd /path/to/repository
   git ls-remote
   ```

3. **Wait for Automatic Retry:**
   - Plugin will retry automatically
   - Network issues often resolve themselves

4. **Check Firewall/VPN:**
   - Ensure git traffic is allowed
   - Try disabling VPN temporarily

#### 2. Authentication Errors

**Symptoms:**
```
Error: Authentication failed. Please check your git credentials.
Error Code: AUTH_ERROR
Retry Count: 0
```

**What Happens:**
- Plugin fails fast (no retries)
- Auth errors require user intervention
- Cannot be automatically recovered

**Solutions:**

1. **For SSH:**
   ```bash
   # Check SSH agent has your key:
   ssh-add -l
   
   # If empty, add your key:
   ssh-add ~/.ssh/id_ed25519
   
   # Test connection:
   ssh -T git@github.com
   ```

2. **For HTTPS:**
   ```bash
   # Reconfigure credential helper:
   git config --global credential.helper osxkeychain  # macOS
   git config --global credential.helper manager-core  # Windows
   
   # Clear and re-enter credentials:
   cd /path/to/repository
   git fetch  # Enter credentials when prompted
   ```

3. **For Personal Access Tokens:**
   - Generate new token with proper scopes
   - Update credentials using token as password

4. **Manual Pull After Fix:**
   - After fixing auth, use status panel "Pull" button
   - Or wait for next fetch cycle to trigger auto-pull

#### 3. Timeout Errors

**Symptoms:**
```
Error: Pull operation timed out after 5 seconds
Error Code: TIMEOUT_ERROR
Retry Count: 3
```

**What Happens:**
- 5-second timeout enforced for safety
- Plugin retries up to 3 times
- May succeed on retry if network improves

**Solutions:**

1. **Check Repository Size:**
   ```bash
   cd /path/to/repository
   du -sh .git
   ```

2. **Check Network Speed:**
   - Large repositories need faster connection
   - Consider manual pull during slow network times

3. **Manual Pull for Large Changes:**
   ```bash
   cd /path/to/repository
   git pull  # No timeout in manual operation
   ```

4. **Increase Git Buffer:**
   ```bash
   git config --global http.postBuffer 524288000
   ```

#### 4. Lock Errors

**Symptoms:**
```
Error: Repository is locked by another git operation
Error Code: LOCK_ERROR
Retry Count: 2
```

**What Happens:**
- Another git process is running
- Plugin retries automatically (locks usually clear quickly)
- 10-second and 30-second delays between retries

**Solutions:**

1. **Wait for Retry:**
   - Plugin handles this automatically
   - Lock often releases within seconds

2. **Check for Stuck Processes:**
   ```bash
   # macOS/Linux:
   ps aux | grep git
   
   # Windows:
   tasklist | findstr git
   ```

3. **Remove Stale Lock (if safe):**
   ```bash
   cd /path/to/repository
   # ONLY if you're certain no git operations are running:
   rm .git/index.lock
   ```

4. **Close Other Git Tools:**
   - Close VS Code, GitKraken, SourceTree, etc.
   - These may hold locks on the repository

### Auto-Pull Skips with "Manual Intervention Required"

**Problem:** Notification says "manual intervention required"

**Common Scenarios:**

#### Scenario 1: Uncommitted Changes

**Notification:**
```
⚠️ my-vault: Uncommitted changes detected. Please resolve manually.
```

**Why It Skips:**
- Working directory has unsaved changes
- Auto-pull would risk losing your work
- Safety-first design prevents data loss

**Resolution:**

Option A - Commit Changes:
```bash
cd /path/to/repository
git add -A
git commit -m "Your commit message"
# Auto-pull will work on next fetch
```

Option B - Stash Changes:
```bash
cd /path/to/repository
git stash
# Auto-pull will work on next fetch
# Later: git stash pop
```

Option C - Discard Changes (⚠️ WARNING: Loses work):
```bash
cd /path/to/repository
git reset --hard HEAD
```

#### Scenario 2: Branches Diverged

**Notification:**
```
⚠️ my-vault: Branches have diverged, manual merge required. Please resolve manually.
```

**Why It Skips:**
- Your branch and remote have different commits
- Fast-forward-only pull cannot proceed
- Automatic merge might create conflicts

**Resolution:**

1. **Review Divergence:**
   ```bash
   cd /path/to/repository
   git status
   git log --oneline --graph --all -10
   ```

2. **Option A - Merge (Preserves Both Histories):**
   ```bash
   git pull  # Creates merge commit
   # Resolve any conflicts if they appear
   git push
   ```

3. **Option B - Rebase (Linear History):**
   ```bash
   git pull --rebase
   # Resolve any conflicts if they appear
   git push
   ```

4. **Option C - Reset to Remote (⚠️ WARNING: Loses Local Commits):**
   ```bash
   git fetch origin
   git reset --hard origin/main
   # Your local commits are lost
   ```

#### Scenario 3: Detached HEAD

**Notification:**
```
⚠️ my-vault: Detached HEAD state. Please resolve manually.
```

**Why It Skips:**
- Not on any branch
- Cannot safely pull changes
- Need to establish branch context

**Resolution:**

1. **Check Current State:**
   ```bash
   cd /path/to/repository
   git status
   ```

2. **Option A - Return to Branch:**
   ```bash
   git checkout main
   # Or whichever branch you want
   ```

3. **Option B - Create Branch from Current State:**
   ```bash
   git checkout -b new-branch-name
   ```

#### Scenario 4: No Tracking Branch

**Notification:**
```
⚠️ my-vault: No tracking branch configured. Please resolve manually.
```

**Why It Skips:**
- Current branch doesn't track a remote branch
- Git doesn't know where to pull from
- Need to configure upstream

**Resolution:**

1. **Check Branch Configuration:**
   ```bash
   cd /path/to/repository
   git branch -vv
   ```

2. **Set Upstream Branch:**
   ```bash
   # For main branch:
   git branch --set-upstream-to=origin/main main
   
   # Or for current branch:
   git branch --set-upstream-to=origin/$(git branch --show-current)
   ```

3. **Or Push with Upstream:**
   ```bash
   git push -u origin main
   ```

### Viewing Pull History

**Purpose:** Understand what happened with automatic pulls

**How to Access:**

1. Open status panel (ribbon icon or hotkey)
2. Find your repository in the list
3. Look for "Pull History" section
4. Click to expand if collapsed

**Information Shown:**

```
Pull History (Last 10 operations)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 2 minutes ago - Success (3 commits pulled)
✗ 15 minutes ago - Failed: Network error
⊘ 30 minutes ago - Skipped: Uncommitted changes
✓ 1 hour ago - Success (1 commit pulled)
⊘ 2 hours ago - Skipped: Diverged branches
...
```

**Understanding Results:**

- **✓ Success** - Pull completed, commits brought down
- **✗ Failed** - Error occurred (check error message)
- **⊘ Skipped** - Safety check prevented pull (check reason)

**Using History for Debugging:**

1. **Pattern Analysis:**
   - All fails? Check auth/network
   - All skips? Check working directory state
   - Mixed results? Check per-failure details

2. **Retry Evidence:**
   - Failed entries show retry count
   - Can see if retries attempted
   - Helps understand transient vs persistent issues

3. **Timing Analysis:**
   - Timestamps show when attempts occurred
   - Can correlate with network issues
   - Helps identify patterns

### Manual Pull from Status Panel

**When to Use:**
- Auto-pull skipped and you've resolved the issue
- Want to pull immediately without waiting for next fetch
- Testing after fixing authentication or network issues

**How to Use:**

1. Open status panel
2. Find repository with changes available
3. Click "Pull" button
4. Immediate feedback (no retry delays)
5. Check pull history for result

**Differences from Auto-Pull:**

- **No Retry Logic** - Immediate result, faster feedback
- **Works When Disabled** - Functions even if auto-pull globally disabled
- **Same Safety Checks** - Still protects against data loss
- **User-Initiated** - You control timing

**Example Workflow:**

```
1. Auto-pull skipped: "Uncommitted changes"
   ↓
2. You commit your changes
   ↓
3. Click "Pull" button in status panel
   ↓
4. Immediate pull without waiting for next fetch
   ↓
5. Success notification: "Pulled 3 commits"
```

### Notification Verbosity Settings

**Purpose:** Control how much notification you see

**Options:**

1. **All (Default):**
   - Notify on successful pulls
   - Notify on failed pulls
   - Notify when manual intervention needed
   - Best for staying informed

2. **Failures Only:**
   - Silent on successful pulls
   - Notify on failed pulls
   - Notify when manual intervention needed
   - Best for reducing noise

3. **Silent:**
   - No pull notifications at all
   - Still logs to console (if debug enabled)
   - Still updates status panel
   - Best for minimal interruption

**How to Change:**

1. Settings → Multi-Git
2. Find "Auto-pull notification verbosity"
3. Select desired level
4. Changes take effect immediately

**Recommendation:**
- Start with "All" to understand behavior
- Switch to "Failures Only" once comfortable
- Use "Silent" only if monitoring status panel actively

### Performance Considerations

**Auto-Pull Timing:**
- Safety checks: < 500ms typical
- Pull execution: < 5 seconds (enforced timeout)
- Retry delays: 0ms, 10s, 30s (exponential backoff)

**Impact on Fetch Cycle:**
- Auto-pull runs after fetch detects changes
- Extends fetch cycle by ~1-5 seconds when pulling
- No impact when no changes or pull skipped

**Reducing Load:**

1. **Increase Fetch Interval:**
   - Settings → Multi-Git → Global fetch interval
   - Default 5 minutes → increase to 10-15 minutes
   - Fewer fetch cycles = fewer pull attempts

2. **Disable for Inactive Repos:**
   - Per-repository auto-pull toggle
   - Keep active for frequently updated repos
   - Disable for rarely changing repos

3. **Monitor with Debug Logging:**
   - Enable debug mode temporarily
   - Check timing logs
   - Identify slow operations

## Plugin Configuration Issues

### Settings Not Persisting

**Problem:** Plugin settings reset after Obsidian restart

**Resolution:**

1. **Check File Permissions:**
   ```bash
   ls -la /path/to/vault/.obsidian/plugins/multi-git/
   chmod 644 /path/to/vault/.obsidian/plugins/multi-git/data.json
   ```

2. **Check for Sync Conflicts:**
   - If using Obsidian Sync or other sync service
   - Ensure data.json isn't excluded

3. **Manually Edit data.json:**
   - Close Obsidian
   - Edit `.obsidian/plugins/multi-git/data.json`
   - Restart Obsidian

### Repository Not Detected After Adding

**Problem:** Repository added but not showing in list

**Resolution:**

1. **Reload Settings Tab:**
   - Close and reopen settings

2. **Check Console for Errors:**
   - Open Developer Console (Ctrl+Shift+I / Cmd+Option+I)
   - Look for Multi-Git errors

3. **Verify data.json:**
   ```bash
   cat /path/to/vault/.obsidian/plugins/multi-git/data.json
   # Ensure repository is in the repositories array
   ```

4. **Reload Plugin:**
   - Settings → Community plugins
   - Toggle Multi-Git off and on

### Command Not Appearing

**Problem:** Multi-Git commands not in command palette

**Resolution:**

1. **Ensure Plugin Enabled:**
   - Settings → Community plugins
   - Multi-Git should be toggled on

2. **Reload Obsidian:**
   - Ctrl/Cmd + R or restart completely

3. **Check for Errors:**
   - Open Developer Console
   - Look for plugin loading errors

## Debug Mode

### Enabling Debug Logging

**When to use:**
- Troubleshooting complex issues
- Understanding operation flow
- Diagnosing performance problems

**How to enable:**

1. Close Obsidian
2. Edit `<vault>/.obsidian/plugins/multi-git/data.json`
3. Add or modify:
   ```json
   {
     "debugLogging": true,
     "repositories": [...]
   }
   ```
4. Restart Obsidian
5. Open Developer Console (Ctrl+Shift+I / Cmd+Option+I)

**What gets logged:**
- Git command execution with full output
- Timing information for operations
- Service method calls and parameters
- Error classification decisions
- Notification suppression logic

**Example debug output:**
```
[Multi-Git Debug] [2025-12-15T13:45:23.456Z] [GitCommand] Executing: git fetch --all
[Multi-Git Debug] [2025-12-15T13:45:24.789Z] [GitCommand] Completed in 1333ms
[Multi-Git Debug] [2025-12-15T13:45:24.890Z] [ErrorClassification] Classifying error: auth
[Multi-Git Debug] [2025-12-15T13:45:24.891Z] [ErrorPresentation] Showing AuthFailureModal
```

### Reporting Issues

When reporting issues to plugin maintainers:

1. **Enable debug logging** and reproduce issue
2. **Copy relevant logs** from Developer Console
3. **Include system information:**
   - OS and version
   - Obsidian version
   - Plugin version
   - Git version (`git --version`)

4. **Describe steps to reproduce:**
   - What you did
   - What you expected
   - What actually happened

5. **Include error messages:**
   - Full error text from modals
   - Console errors
   - Git command output

## Getting Help

If you continue experiencing issues after trying these solutions:

1. **Check Plugin Documentation:**
   - [README.md](../README.md) - Main documentation
   - [Configuration Guide](configuration.md) - Detailed settings
   - [Architecture](architecture.md) - Technical details

2. **Search GitHub Issues:**
   - [Existing Issues](https://github.com/YOUR_USERNAME/multi-git/issues)
   - Someone may have solved the same problem

3. **Create New Issue:**
   - [Open New Issue](https://github.com/YOUR_USERNAME/multi-git/issues/new)
   - Use issue template
   - Include debug logs

4. **Community Support:**
   - [Obsidian Forum](https://forum.obsidian.md/)
   - [GitHub Discussions](https://github.com/YOUR_USERNAME/multi-git/discussions)

---

**Last Updated:** 2025-12-15
