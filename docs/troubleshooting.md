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

### Pull Operations Fail with "not a git command" Error

**Symptom:**
```
Pull failed: Command failed: git pull --ff-only
git: 'remote-codecommit' is not a git command. See 'git --help'.
fatal: remote helper 'codecommit' aborted session
```

**Cause:**
Credential helper not found in PATH. Git uses credential helpers (like `git-remote-codecommit` for AWS CodeCommit) to authenticate with remote repositories. Obsidian's environment doesn't include user-specific PATH entries by default, so these helpers may not be found during git operations.

**Solution:**

1. **Locate Your Credential Helper:**
   ```bash
   # Find where git-remote-codecommit is installed:
   which git-remote-codecommit
   # Should output something like:
   # /Users/you/.local/bin/git-remote-codecommit
   # or
   # /Users/you/.cargo/bin/git-remote-codecommit
   ```

2. **Open Plugin Settings:**
   - Settings → Multi-Git
   - Scroll to "Custom PATH entries" section

3. **Add the Directory Containing Your Credential Helper:**
   
   The plugin includes these default PATH entries:
   - `~/.cargo/bin` (Rust tools like git-remote-codecommit)
   - `~/.local/bin` (Python pip --user installs)
   - `/opt/homebrew/bin` (Homebrew on Apple Silicon Mac)
   - `/usr/local/bin` (Homebrew on Intel Mac, common Linux)
   
   **If your credential helper is in a different location**, add that directory to the custom PATH entries.

4. **Verify the Fix:**
   ```bash
   # Test manually in terminal first:
   cd /path/to/repository
   git pull
   # Should succeed without "not a git command" error
   ```

5. **Restart Obsidian:**
   - Close and reopen Obsidian
   - Plugin will use enhanced PATH on next fetch/pull operation

**Common Credential Helper Locations:**

| Tool | macOS/Linux | Windows | Install Method |
|------|-------------|---------|----------------|
| git-remote-codecommit | `~/.local/bin` | `%APPDATA%\Python\Scripts` | `pip install git-remote-codecommit` |
| git-credential-manager | `/usr/local/bin` | `C:\Program Files\Git\mingw64\bin` | Included with Git for Windows |
| git-credential-libsecret | `/usr/bin` | N/A | `apt install git-credential-libsecret` |

**AWS CodeCommit Specific Setup:**

If you're using AWS CodeCommit, ensure:

1. **git-remote-codecommit is installed:**
   ```bash
   pip install git-remote-codecommit
   ```

2. **AWS credentials are configured:**
   ```bash
   aws configure
   # Or ensure ~/.aws/credentials exists
   ```

3. **Repository URL uses codecommit:// protocol:**
   ```bash
   # Check remote URL:
   git remote get-url origin
   
   # Should be:
   codecommit::us-east-1://my-repo
   
   # Not:
   https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo
   ```

4. **Test AWS connection:**
   ```bash
   aws codecommit list-repositories
   ```

**Other Credential Helpers:**

**GitHub CLI (gh):**
```bash
# Install:
brew install gh  # macOS
# Windows: Download from https://cli.github.com/

# Authenticate:
gh auth login

# Ensure gh in PATH:
which gh  # Should show /usr/local/bin/gh or similar
```

**Git Credential Manager:**
```bash
# Usually included with Git installation
# Verify:
git credential-manager --version

# If missing, install from:
# https://github.com/git-ecosystem/git-credential-manager
```

**Debugging PATH Issues:**

Enable debug logging to see the enhanced PATH:

1. Close Obsidian
2. Edit `<vault>/.obsidian/plugins/multi-git/data.json`:
   ```json
   {
     "debugLogging": true
   }
   ```
3. Restart Obsidian
4. Open Developer Console (Ctrl+Shift+I / Cmd+Option+I)
5. Trigger a pull operation
6. Look for log entries showing "Enhanced PATH:" with full PATH value
7. Verify your credential helper's directory is included

**Still Not Working?**

If pull operations still fail after adding PATH entries:

1. **Test credential helper directly:**
   ```bash
   # Should execute without "command not found":
   git-remote-codecommit --version
   ```

2. **Check executable permissions:**
   ```bash
   ls -l $(which git-remote-codecommit)
   # Should show execute permissions (x)
   
   # Fix if needed:
   chmod +x /path/to/git-remote-codecommit
   ```

3. **Verify git can find the helper:**
   ```bash
   cd /path/to/repository
   GIT_TRACE=1 git pull
   # Look for lines showing git searching for helper
   ```

4. **Check for shell-specific issues:**
   - If installed via `pip install --user`, ensure `~/.local/bin` in PATH
   - If using virtualenv, credential helper must be globally installed
   - On Windows, check both User and System PATH variables

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

## Manual Intervention Notifications

### Understanding Manual Intervention Scenarios

The plugin notifies you when automatic pull operations cannot proceed safely. These notifications guide you through resolving issues that require manual action.

### Notification Types

**1. Modal Dialog (Critical Scenarios):**
- Non-dismissible to ensure critical issues aren't missed
- Requires acknowledgment via "I'll Handle This" button
- Provides "Open Terminal" button for immediate access to repository
- Appears for: diverged branches, authentication failures, concurrent operations

**2. Notice (Non-Critical Scenarios):**
- Dismissible notification with 10-second duration
- Less intrusive for issues that don't require immediate action
- Appears for: uncommitted changes, lock errors
- Can be manually dismissed or auto-dismissed after timeout

### Critical Scenarios

#### Diverged Branches (Most Common)

**When it appears:**
- Your local branch and remote branch have different commits
- Cannot fast-forward safely
- Manual merge or rebase required

**Modal Content:**
```
┌──────────────────────────────────────────┐
│  ⚠️  Manual Merge Required                │
├──────────────────────────────────────────┤
│ Repository: my-vault                     │
│ Branch: main                             │
│                                          │
│ Your branch and the remote have          │
│ diverged. A manual merge is needed.      │
│                                          │
│ Details:                                 │
│ • Local: 2 commits ahead                 │
│ • Remote: 3 commits ahead                │
│                                          │
│ Resolution Options:                      │
│ 1. Merge: git pull (keeps both)         │
│ 2. Rebase: git pull --rebase (linear)   │
│                                          │
│ [Open Terminal] [I'll Handle This]       │
└──────────────────────────────────────────┘
```

**Resolution Steps:**

1. **Click "Open Terminal"** to open terminal at repository location

2. **Check divergence:**
   ```bash
   git status
   git log --oneline --graph --all -10
   ```

3. **Choose resolution strategy:**

   **Option A - Merge (Recommended for beginners):**
   ```bash
   git pull
   # Creates a merge commit
   # Handles conflicts if they appear
   ```

   **Option B - Rebase (Clean linear history):**
   ```bash
   git pull --rebase
   # Replays your commits on top of remote
   # May need to resolve conflicts for each commit
   ```

   **Option C - Force remote (⚠️ Loses local commits):**
   ```bash
   git fetch origin
   git reset --hard origin/main
   # WARNING: Your local commits are lost permanently
   ```

4. **Resolve conflicts if they appear:**
   - Open conflicted files
   - Look for `<<<<<<<`, `=======`, `>>>>>>>` markers
   - Edit to resolve
   - Save files
   - `git add <resolved-files>`
   - `git commit` (for merge) or `git rebase --continue` (for rebase)

5. **Push resolution:**
   ```bash
   git push
   ```

6. **Auto-pull resumes** on next fetch cycle

**Prevention:**
- Pull frequently before making changes
- Push commits regularly
- Coordinate with team on shared files
- Use feature branches for larger changes

#### Authentication Failures

**When it appears:**
- Git credentials not configured or expired
- SSH keys not loaded
- Token/password incorrect

**Modal Content:**
```
┌──────────────────────────────────────────┐
│  🔑  Authentication Required              │
├──────────────────────────────────────────┤
│ Repository: my-project                   │
│                                          │
│ Git operation failed due to              │
│ authentication issues.                   │
│                                          │
│ Resolution Steps:                        │
│ • For SSH: Check SSH keys are loaded    │
│ • For HTTPS: Update credentials          │
│ • Verify remote URL is correct          │
│                                          │
│ [Open Terminal] [I'll Handle This]       │
└──────────────────────────────────────────┘
```

**Resolution Steps:**

See [Authentication Failures](#authentication-failures) section above for detailed SSH and HTTPS setup instructions.

**Quick Checks:**

For SSH:
```bash
# Check SSH agent has keys
ssh-add -l

# If empty, add your key
ssh-add ~/.ssh/id_ed25519

# Test connection
ssh -T git@github.com
```

For HTTPS:
```bash
# Reconfigure credential helper
git config --global credential.helper osxkeychain  # macOS
git config --global credential.helper manager-core  # Windows

# Manually trigger credential prompt
cd /path/to/repository
git fetch
# Enter your credentials when prompted
```

For Personal Access Tokens:
1. Generate new token with `repo` scope
2. Use token as password when prompted
3. Credentials will be cached for future use

#### Concurrent Operations

**When it appears:**
- Another git process is running in the repository
- Repository is locked by another operation
- Multiple tools accessing repository simultaneously

**Modal Content:**
```
┌──────────────────────────────────────────┐
│  🔒  Repository Busy                      │
├──────────────────────────────────────────┤
│ Repository: my-vault                     │
│                                          │
│ Another git operation is currently       │
│ in progress or the repository is locked. │
│                                          │
│ Resolution Steps:                        │
│ • Wait for other operation to complete   │
│ • Check for stuck git processes          │
│ • Close other git tools (VS Code, etc)   │
│                                          │
│ [Open Terminal] [I'll Handle This]       │
└──────────────────────────────────────────┘
```

**Resolution Steps:**

1. **Check for running git processes:**
   ```bash
   # macOS/Linux:
   ps aux | grep git
   
   # Windows:
   tasklist | findstr git
   ```

2. **Wait a moment:**
   - Often resolves itself in seconds
   - Plugin will retry automatically

3. **Close other git tools:**
   - VS Code with git extensions
   - GitKraken, SourceTree, GitHub Desktop
   - Terminal windows with active git commands

4. **Remove stale lock (if safe):**
   ```bash
   cd /path/to/repository
   # ONLY if certain no git operations are running:
   rm .git/index.lock
   ```

5. **Check for stuck processes:**
   ```bash
   # Kill stuck git processes (macOS/Linux)
   killall git
   
   # Windows: Use Task Manager to end git.exe processes
   ```

### Non-Critical Scenarios

#### Uncommitted Changes

**When it appears:**
- Working directory has unsaved changes
- Auto-pull would risk data loss
- Safety check prevents pulling

**Notice Content:**
```
⚠️ my-vault: Uncommitted changes detected.
Commit or stash your changes before pulling.
```

**Resolution Steps:**

**Option A - Commit changes:**
```bash
cd /path/to/repository
git add -A
git commit -m "Your descriptive message"
# Auto-pull will work on next fetch cycle
```

**Option B - Stash changes:**
```bash
cd /path/to/repository
git stash push -m "Work in progress"
# Auto-pull will work on next fetch cycle
# Later restore: git stash pop
```

**Option C - Discard changes (⚠️ Loses work):**
```bash
cd /path/to/repository
git checkout .  # Discard tracked file changes
git clean -fd   # Remove untracked files
```

**Best Practice:**
- Commit frequently with meaningful messages
- Use stash for temporary work-in-progress
- Don't leave uncommitted changes for long periods

#### Lock Errors

**When it appears:**
- Repository lock file exists
- Temporary lock from another operation
- Usually resolves quickly

**Notice Content:**
```
🔒 my-vault: Repository locked.
Wait for operation to complete or check for stuck processes.
```

**Resolution Steps:**

1. **Wait for automatic retry:**
   - Plugin retries automatically
   - Lock usually releases within seconds

2. **Check for active operations:**
   ```bash
   ps aux | grep git  # macOS/Linux
   tasklist | findstr git  # Windows
   ```

3. **Remove lock if stale:**
   ```bash
   cd /path/to/repository
   # Only if you're certain no git operations running:
   find .git -name "*.lock" -type f
   rm .git/index.lock
   ```

### Status Panel Indicators

The status panel provides persistent visual feedback for manual intervention scenarios:

| Icon | Color | Meaning | Action Button |
|------|-------|---------|---------------|
| ⚠️ | Yellow/Orange | Manual merge required (diverged) | "Open Terminal" |
| 🔑 | Red | Authentication needed | "Open Terminal" |
| 🔒 | Gray | Repository busy or locked | None (wait) |
| ℹ️ | Blue | Updates available (auto-pull disabled) | "Pull" |

**How to use:**

1. **Check status panel** after notifications
2. **Hover over icons** for tooltip explanations
3. **Click action buttons** when available:
   - "Open Terminal" → Opens terminal at repository location
   - "Pull" → Manually triggers pull operation

**Icon meanings in detail:**

**⚠️ Warning (Yellow/Orange):**
- Branches have diverged
- Requires manual merge or rebase
- Action needed to proceed
- Won't auto-resolve

**🔑 Key (Red):**
- Authentication credentials needed
- SSH keys not loaded or HTTPS credentials expired
- Must configure credentials to proceed
- Won't auto-resolve

**🔒 Lock (Gray):**
- Repository locked by concurrent operation
- Another git process is running
- Usually temporary
- May auto-resolve

**ℹ️ Info (Blue):**
- Updates available but auto-pull is disabled
- Can manually pull when ready
- Not an error condition
- User choice to pull or not

### Terminal Launch Feature

The "Open Terminal" button provides direct access to your repository for manual resolution.

**What it does:**
- Opens native terminal application
- Sets working directory to repository path
- Ready for immediate git command execution
- Cross-platform support (macOS, Windows, Linux)

**Platform-specific behavior:**

**macOS:**
- Opens Terminal.app
- Executes: `open -a Terminal /path/to/repo`
- Working directory set automatically

**Windows:**
- Opens Command Prompt or PowerShell
- Executes: `start cmd /K cd /d C:\path\to\repo`
- Ready for git commands

**Linux:**
- Opens default terminal (gnome-terminal, konsole, xterm)
- Executes: `gnome-terminal --working-directory=/path/to/repo`
- Fallback to xterm if default not available

**Usage example:**
```
1. Modal appears: "Manual merge required"
2. Click "Open Terminal" button
3. Terminal opens at repository location
4. Verify with: pwd  # Should show repository path
5. Execute resolution commands:
   git status
   git pull
   git merge --continue
```

**Troubleshooting terminal launch:**

**Terminal doesn't open:**
- Verify terminal application is installed
- Check console for errors (Ctrl+Shift+I / Cmd+Option+I)
- Try launching terminal manually
- Copy repository path from modal for manual navigation

**Wrong directory:**
- Plugin uses absolute path from configuration
- Verify repository path in settings is correct
- Try manual navigation: `cd /path/to/repository`

**Permission denied:**
- Check file system permissions
- Ensure repository directory is accessible
- Try opening terminal with elevated privileges

### Notification Verbosity Control

Configure how much notification you want:

**Settings → Multi-Git → Auto-pull notification verbosity**

**Options:**

1. **All Operations:**
   - Success notifications: "Pulled 3 commits"
   - Failure notifications: Network errors, timeouts
   - Manual intervention modals: Always shown
   - **Best for:** Staying fully informed

2. **Failures Only (Default):**
   - Success notifications: Suppressed (silent)
   - Failure notifications: Shown as notices
   - Manual intervention modals: Always shown
   - **Best for:** Reducing noise while catching issues

3. **Silent:**
   - Success notifications: Suppressed
   - Failure notifications: Suppressed (non-critical)
   - Manual intervention modals: **Still shown** (critical)
   - **Best for:** Minimal interruption

**Important:** Critical scenarios (diverged branches, auth failures) always show modals regardless of verbosity setting to prevent data loss.

**Recommendation:**
- Start with "Failures Only" (default)
- Switch to "All" if you want confirmation of successful pulls
- Use "Silent" only if actively monitoring status panel

### FAQ: Manual Intervention

**Q: Why does the plugin show modals instead of just pulling?**

A: Safety-first design. Automatic merges could:
- Create merge conflicts unexpectedly
- Lose your uncommitted work
- Overwrite important local changes
- Fail authentication midway

Modals ensure you're aware of issues that require human judgment.

**Q: Can I disable manual intervention modals?**

A: Critical modals (diverged branches, auth failures) cannot be disabled—they prevent data loss. Non-critical notices can be suppressed with "Silent" verbosity setting.

**Q: The terminal button doesn't work. What do I do?**

A: Alternatives:
1. Copy repository path from modal
2. Open terminal manually
3. Navigate: `cd /path/to/repository`
4. Execute git commands

Check console for terminal launch errors.

**Q: How often do I need to handle diverged branches?**

A: Depends on workflow:
- Solo projects: Rare (only if pushing from multiple machines)
- Team projects: More frequent with concurrent work
- Prevention: Pull before making changes, push commits regularly

**Q: Can auto-pull handle any conflicts automatically?**

A: No. Auto-pull uses `--ff-only` (fast-forward only) which never creates merge commits. This guarantees:
- No automatic conflict resolution
- No surprise merge commits
- No data loss
- Safe, predictable behavior

**Q: What's the difference between "I'll Handle This" and closing the modal?**

A: You cannot close critical modals except by clicking "I'll Handle This." This ensures:
- You've acknowledged the issue
- You understand action is needed
- The issue won't be forgotten

Non-critical notices can be dismissed normally.

**Q: Why does the modal show for uncommitted changes?**

A: Protection against data loss. Pulling with uncommitted changes could:
- Create merge conflicts
- Require manual conflict resolution
- Risk losing your work

Commit or stash first for safety.

**Q: How do I prevent getting these notifications frequently?**

A: Best practices:
1. **Commit frequently** - Keeps working directory clean
2. **Pull before starting work** - Reduces divergence
3. **Push commits regularly** - Keeps branches in sync
4. **Communicate with team** - Coordinate on shared files
5. **Use feature branches** - Isolates changes

**Q: The modal appeared but I resolved the issue. Do I need to do anything?**

A: Click "I'll Handle This" to acknowledge, then:
- Auto-pull will retry on next fetch cycle (5 minutes default)
- Or use status panel "Pull" button for immediate pull
- Status panel icon will update when resolved

**Q: Can I see a history of manual intervention events?**

A: Yes, in the status panel:
1. Open status panel (ribbon icon)
2. Find your repository
3. Expand "Pull History" section
4. Review last 10 pull attempts with skip reasons

This shows when and why manual intervention was needed.

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
- Investigating auto-pull behavior

**How to enable:**

**Method 1: Via Settings (Recommended):**
1. Settings → Community plugins → Multi-Git → Settings
2. Scroll to "Debug Settings" section
3. Enable "Debug logging"
4. Open Developer Console (Ctrl+Shift+I / Cmd+Option+I)
5. Trigger operation to see logs

**Method 2: Via Configuration File:**
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
- **Auto-pull operations** (detection, attempts, results)
- **Fast-forward detection** (working directory checks, branch comparisons)

**Example debug output:**
```
[Multi-Git Debug] [2025-12-15T13:45:23.456Z] [GitCommand] Executing: git fetch --all
[Multi-Git Debug] [2025-12-15T13:45:24.789Z] [GitCommand] Completed in 1333ms
[Multi-Git Debug] [2025-12-15T13:45:24.890Z] [ErrorClassification] Classifying error: auth
[Multi-Git Debug] [2025-12-15T13:45:24.891Z] [ErrorPresentation] Showing AuthFailureModal
```

### Pull Operation Logging

**Purpose:** Debug logs provide detailed information about automatic pull operations, helping diagnose why pulls succeed, fail, or are skipped.

#### What Gets Logged

**Fast-Forward Detection:**
- Detection initiation with repository context
- Working directory status (clean/dirty)
- Branch comparison results (commits ahead/behind)
- Final detection decision and reason

**Pull Operations:**
- Pull attempt start with retry count
- Current commit hash before pull
- Git command execution details
- Pull success with before/after commit hashes
- Number of commits pulled
- Pull failure with sanitized error messages
- Pull skip with specific reason
- Retry attempts with timing

#### Log Format Reference

**Successful Pull Operation:**
```
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Starting check for vault-notes
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Working directory clean: true
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Local ahead: 0, behind: 3
[2025-12-16 07:30:15] [DEBUG] [FastForwardDetection] Result: canFastForward=true
[2025-12-16 07:30:15] [DEBUG] [AutoPull] Starting pull for vault-notes (attempt 1/3)
[2025-12-16 07:30:15] [DEBUG] [AutoPull] Current commit: a1b2c3d4e5f6
[2025-12-16 07:30:17] [DEBUG] [AutoPull] Pull successful for vault-notes
[2025-12-16 07:30:17] [DEBUG] [AutoPull] Previous commit: a1b2c3d4e5f6
[2025-12-16 07:30:17] [DEBUG] [AutoPull] New commit: f6e5d4c3b2a1
[2025-12-16 07:30:17] [DEBUG] [AutoPull] Commits pulled: 3
```

**Failed Pull with Retry:**
```
[2025-12-16 07:35:20] [DEBUG] [AutoPull] Starting pull for vault-notes (attempt 1/3)
[2025-12-16 07:35:20] [DEBUG] [AutoPull] Current commit: a1b2c3d4e5f6
[2025-12-16 07:35:22] [DEBUG] [AutoPull] Pull failed for vault-notes: Network timeout
[2025-12-16 07:35:32] [DEBUG] [AutoPull] Starting pull for vault-notes (attempt 2/3)
[2025-12-16 07:35:34] [DEBUG] [AutoPull] Pull successful for vault-notes
[2025-12-16 07:35:34] [DEBUG] [AutoPull] Previous commit: a1b2c3d4e5f6
[2025-12-16 07:35:34] [DEBUG] [AutoPull] New commit: f6e5d4c3b2a1
[2025-12-16 07:35:34] [DEBUG] [AutoPull] Commits pulled: 3
```

**Skipped Pull (Uncommitted Changes):**
```
[2025-12-16 07:40:10] [DEBUG] [FastForwardDetection] Starting check for vault-notes
[2025-12-16 07:40:10] [DEBUG] [FastForwardDetection] Working directory clean: false
[2025-12-16 07:40:10] [DEBUG] [FastForwardDetection] Result: canFastForward=false, reason=uncommitted-changes
[2025-12-16 07:40:10] [DEBUG] [AutoPull] Pull skipped for vault-notes: uncommitted-changes
```

**Skipped Pull (Diverged Branches):**
```
[2025-12-16 07:45:00] [DEBUG] [FastForwardDetection] Starting check for project-repo
[2025-12-16 07:45:00] [DEBUG] [FastForwardDetection] Working directory clean: true
[2025-12-16 07:45:00] [DEBUG] [FastForwardDetection] Local ahead: 2, behind: 3
[2025-12-16 07:45:00] [DEBUG] [FastForwardDetection] Result: canFastForward=false, reason=divergent-branches
[2025-12-16 07:45:00] [DEBUG] [AutoPull] Pull skipped for project-repo: divergent-branches
```

#### Log Field Descriptions

**Component Prefixes:**
- `[FastForwardDetection]` - Fast-forward safety checks
- `[AutoPull]` - Automatic pull operations
- `[GitCommand]` - Low-level git command execution

**Common Fields:**
- **Timestamp:** ISO 8601 format, local timezone
- **Repository ID:** Local repository identifier (not remote URL)
- **Commit Hash:** Git commit SHA (first 7 characters or full)
- **Attempt Count:** Current retry attempt number (e.g., "1/3")
- **Skip Reason:** Why pull was not attempted
  - `uncommitted-changes` - Working directory has uncommitted changes
  - `divergent-branches` - Local and remote have diverged
  - `detached-head` - Repository in detached HEAD state
  - `no-tracking-branch` - No upstream branch configured
  - `not-fast-forward` - Local is ahead of remote
  - `concurrent-operation` - Another git operation in progress

#### Troubleshooting with Logs

**Scenario 1: Pull Never Happens**

**Symptoms:** Remote changes detected but no pull occurs

**Steps:**
1. Enable debug logging
2. Wait for or trigger fetch cycle
3. Review logs in Developer Console
4. Look for `[FastForwardDetection]` entries

**What to Look For:**
```
[FastForwardDetection] Result: canFastForward=false, reason=uncommitted-changes
```

**Resolution:** Check skip reason and resolve:
- `uncommitted-changes` → Commit or stash changes
- `divergent-branches` → Manual merge required
- `detached-head` → Checkout a branch
- `no-tracking-branch` → Set upstream branch

**Scenario 2: Pull Fails Repeatedly**

**Symptoms:** Pull attempts fail with errors

**Steps:**
1. Enable debug logging
2. Trigger pull operation
3. Look for `[AutoPull] Pull failed` entries
4. Check error message and retry count

**What to Look For:**
```
[AutoPull] Pull failed for vault-notes: Network timeout
[AutoPull] Starting pull for vault-notes (attempt 2/3)
```

**Resolution Based on Error:**
- `Network timeout` → Check internet connection, increase git timeout
- `Authentication failed` → Verify SSH keys or HTTPS credentials
- `Repository locked` → Wait for retry or check for stuck processes
- `Permission denied` → Check file system permissions

**Scenario 3: Credential Issues**

**Symptoms:** Authentication errors in logs

**Steps:**
1. Enable debug logging
2. Look for sanitized error messages
3. Check for authentication patterns

**What to Look For:**
```
[AutoPull] Pull failed for my-repo: fatal: could not read Username for 'https://[CREDENTIALS]@github.com'
```

**Note:** Credentials are sanitized in logs (shown as `[CREDENTIALS]`)

**Resolution:**
- For SSH: Check `ssh-add -l` shows your key
- For HTTPS: Reconfigure credential helper
- For Tokens: Generate new personal access token

**Scenario 4: Performance Issues**

**Symptoms:** Pull operations take too long

**Steps:**
1. Enable debug logging
2. Note timestamps for operation start and completion
3. Calculate duration

**What to Look For:**
```
[AutoPull] Starting pull for large-repo (attempt 1/3)
[2025-12-16 07:30:15] Current commit: a1b2c3d
[2025-12-16 07:30:45] Pull successful for large-repo  // 30 seconds!
```

**Resolution:**
- Large repositories: Normal for first pull
- Slow network: Check connection speed
- Timeout: Operation has 5-second safety timeout
- Consider manual pull for large changes

**Scenario 5: Silent Failures**

**Symptoms:** No logs appear, no errors shown

**Steps:**
1. Verify debug logging is enabled in settings
2. Check Developer Console is open
3. Ensure operations are actually triggering

**What to Look For:**
- No `[DEBUG]` prefix logs → Debug mode not enabled
- No logs at all → Check console filter settings
- Logs present but no pull logs → Auto-pull may be disabled

**Resolution:**
1. Verify `debugLogging: true` in settings
2. Check console filter is set to "All levels"
3. Check auto-pull global setting enabled
4. Check per-repository auto-pull toggle

#### Security and Privacy

**What IS Logged (Safe):**
- Repository names (local identifiers)
- Commit hashes (public identifiers)
- Operation timestamps
- Success/failure outcomes
- Error types (sanitized)
- Branch names
- File counts and statistics

**What is NOT Logged (Sensitive):**
- Git remote URLs with embedded credentials
- Authentication tokens or API keys
- SSH private keys
- Passwords or passphrases
- File contents from commits
- Personal access tokens

**Credential Sanitization Example:**
```
// ACTUAL ERROR (never logged):
fatal: could not read Username for 'https://user:ghp_abc123xyz@github.com'

// LOGGED ERROR (sanitized):
[AutoPull] Pull failed: fatal: could not read Username for 'https://[CREDENTIALS]@github.com'
```

**Sanitization Patterns:**
- `https://user:pass@host` → `https://[CREDENTIALS]@host`
- `token=abc123` → `token=[REDACTED]`
- SSH private keys → `[SSH_KEY_REDACTED]`

**Note:** Commit hashes are NOT sanitized because they are public identifiers and safe to log.

#### Best Practices

**Development/Troubleshooting:**
1. Enable debug logging temporarily
2. Reproduce issue
3. Copy relevant logs
4. Disable debug logging when done
5. Never share logs publicly without reviewing for sensitive data

**Performance Considerations:**
- Debug logging has minimal performance impact
- Logs are only generated when debug mode enabled
- Log level checks occur before expensive string formatting
- No impact on git operation timing

**Log Review Checklist:**
Before sharing logs:
- [ ] Check for repository URLs with credentials
- [ ] Check for tokens or API keys in error messages
- [ ] Check for personal information in paths
- [ ] Verify commit hashes only (safe to share)
- [ ] Remove any internal network details if present

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
