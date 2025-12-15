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
