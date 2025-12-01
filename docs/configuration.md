# Configuration Guide

Complete guide to configuring and managing repositories in Multi-Git for Obsidian.

## Table of Contents

- [Configuration Overview](#configuration-overview)
- [Repository Configuration](#repository-configuration)
- [Fetch Configuration](#fetch-configuration)
- [Path Requirements](#path-requirements)
- [Configuration File](#configuration-file)
- [Advanced Configuration](#advanced-configuration)
- [Migration & Backup](#migration--backup)
- [Best Practices](#best-practices)

## Configuration Overview

Multi-Git stores all repository configurations in a single JSON file within your Obsidian vault's plugin data directory. The plugin automatically handles reading, writing, and validating this configuration.

### Configuration Location

```
<vault>/.obsidian/plugins/multi-git/data.json
```

### Automatic Management

The plugin automatically:
- Creates the configuration file on first use
- Validates all paths before saving
- Backs up previous configurations
- Migrates between schema versions

## Repository Configuration

### Adding a Repository

**Via Settings UI:**

1. Open Settings → Multi-Git
2. Click "Add Repository" button
3. Fill in the form:
   - **Path** (required): Absolute path to git repository
   - **Name** (optional): Custom display name
4. Click "Add"

**Validation Process:**

The plugin validates that:
1. Path is an absolute path
2. Directory exists at the path
3. Directory contains a valid `.git` folder
4. Path is not already configured
5. Path does not contain security risks (path traversal)

**Example Paths:**

```
# macOS/Linux
/Users/username/projects/my-repo
/home/username/repositories/work-project
/Volumes/External/backup-repos/notes

# Windows
C:\Users\username\projects\my-repo
D:\Repositories\work-project
\\server\share\team-repos\docs
```

### Repository Properties

Each repository has the following properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID v4) |
| `path` | string | Yes | Absolute path to repository |
| `name` | string | Yes | Display name |
| `enabled` | boolean | Yes | Whether repository is active |
| `createdAt` | number | Yes | Unix timestamp (milliseconds) |
| `lastValidated` | number | No | Last validation timestamp |
| `fetchInterval` | number | Yes | Fetch interval in milliseconds |
| `lastFetchTime` | number | No | Last successful fetch timestamp |
| `lastFetchStatus` | string | Yes | Current status: 'idle', 'fetching', 'success', 'error' |
| `lastFetchError` | string | No | Error message from last failed fetch |
| `remoteChanges` | boolean | Yes | Whether remote changes are available |
| `remoteCommitCount` | number | No | Number of commits behind remote |

### Modifying Repositories

**Enable/Disable:**
- Click the toggle button next to repository
- Disabled repositories remain in configuration but are inactive
- Useful for temporarily excluding repositories without removing them

**Remove:**
- Click the remove button (trash icon)
- Confirm removal in the modal dialog
- Removing a repository only deletes the configuration
- Files on disk are never affected

**Rename:**
- Currently requires manual edit of `data.json`
- Or remove and re-add with new name

## Fetch Configuration

### Global Fetch Settings

Configure automated remote fetch behavior for all repositories:

**Settings Location:** Settings → Multi-Git → Fetch Settings

#### Global Fetch Interval

**Description:** Default interval for automatic fetch operations

**Options:**
- Minimum: 60,000ms (1 minute)
- Maximum: 3,600,000ms (1 hour)
- Default: 300,000ms (5 minutes)

**Setting:**
```
Global Fetch Interval: 300000 ms (5 minutes)
```

**Use Cases:**
- **Fast-paced projects:** 60,000ms (1 minute) for active collaboration
- **Moderate activity:** 300,000ms (5 minutes) - recommended default
- **Low activity:** 900,000ms (15 minutes) for stable projects
- **Archive projects:** 3,600,000ms (1 hour) for rarely updated repos

#### Fetch on Startup

**Description:** Automatically fetch all repositories when plugin loads

**Options:**
- Enabled (default): Fetches immediately on Obsidian startup
- Disabled: Waits for first scheduled interval

**Recommendation:** Keep enabled to ensure fresh status on startup

#### Notify on Remote Changes

**Description:** Show notifications when remote changes are detected

**Options:**
- Enabled (default): Notifications appear for each repository with changes
- Disabled: Fetch runs silently, check status panel manually

**Notification Format:**
```
📥 Repository 'vault-name' has 3 new commits available
```

### Per-Repository Fetch Interval

**Override global interval for specific repositories:**

1. Find repository in settings list
2. Locate "Fetch Interval" field
3. Enter custom interval in milliseconds
4. Changes apply immediately

**Example Use Cases:**
- Critical repository: 60,000ms (check every minute)
- Archive repository: 3,600,000ms (check every hour)
- Shared team repo: 120,000ms (check every 2 minutes)

### Manual Fetch Operations

**Fetch Single Repository:**
- Click "Fetch Now" button next to repository
- Immediate fetch regardless of interval
- Shows real-time status update

**Fetch All Repositories:**
- Click "Fetch All Now" button at top of settings
- Sequential fetch of all enabled repositories
- Progress shown per repository

**When to Use Manual Fetch:**
- Before starting work to ensure latest changes
- After making changes elsewhere to sync status
- When notification received to confirm changes
- To verify fetch configuration is working

### Fetch Status Indicators

Each repository shows current fetch status:

| Status | Icon | Description | Action |
|--------|------|-------------|--------|
| **Idle** | ◯ | No fetch has run yet | Wait for first interval or fetch manually |
| **Fetching** | ⟳ | Fetch in progress | Operation running, wait for completion |
| **Success** | ✓ | Last fetch successful | No action needed |
| **Error** | ✗ | Last fetch failed | Check error message, verify connectivity |
| **Changes** | 📥 | Remote changes available | Pull changes manually when ready |

### Last Fetch Time Display

**Format:** Relative time (e.g., "2 minutes ago", "1 hour ago")

**Updates:**
- After each successful fetch
- Shown in repository list
- Hover for exact timestamp

**Use Cases:**
- Verify fetch is running on schedule
- Identify stale repositories
- Troubleshoot fetch issues

### Fetch Error Handling

**Error Types:**

1. **Network Error:**
   - No internet connection
   - Remote URL unreachable
   - Firewall blocking connection
   - **Solution:** Check network, verify remote URL

2. **Authentication Error:**
   - SSH key not configured
   - HTTPS credentials expired
   - Permission denied
   - **Solution:** Configure git credentials, test manual fetch

3. **Timeout Error:**
   - Repository too large
   - Network too slow
   - **Solution:** Increase timeout or use faster connection

4. **Repository Error:**
   - Invalid git state
   - Corrupted repository
   - Missing remote
   - **Solution:** Check repository health with `git status`

**Error Display:**
- Error icon (✗) in status
- Error message shown below repository
- Hover for full error details

### Troubleshooting Fetch Issues

**Fetch Not Running:**
1. Check repository is enabled
2. Verify fetch interval is set
3. Check plugin is active
4. Review console for errors

**Fetch Taking Too Long:**
1. Check network speed
2. Verify repository size
3. Consider increasing interval
4. Test manual fetch

**No Notifications:**
1. Verify "Notify on Remote Changes" enabled
2. Check OS notification permissions
3. Test with manual fetch
4. Ensure remote actually has changes

**False Positive Changes:**
1. Verify remote tracking branch configured
2. Check for local uncommitted changes
3. Run `git status` manually to confirm
4. Review fetch logs

## Path Requirements

### Absolute Paths Only

The plugin requires absolute paths for security and reliability:

✅ **Valid absolute paths:**
```
/Users/username/repos/project
C:\Users\username\repos\project
/home/username/work/repo
```

❌ **Invalid relative paths:**
```
./repos/project
../project
~/repos/project
repos/project
```

### Platform-Specific Paths

**macOS/Linux:**
- Must start with `/`
- Case-sensitive
- Use forward slashes `/`
- Example: `/Users/john/projects/notes`

**Windows:**
- Must start with drive letter (e.g., `C:\`)
- Case-insensitive
- Can use forward or backslashes
- UNC paths supported: `\\server\share\path`
- Example: `C:\Users\john\projects\notes`

### Special Characters

**Supported:**
- Spaces: `/Users/John Doe/My Projects`
- Hyphens: `/Users/user/my-project`
- Underscores: `/Users/user/my_project`
- Numbers: `/Users/user/project-2024`
- Unicode: `/Users/用户/项目`

**Not Supported:**
- Null bytes (`\0`)
- Path traversal patterns (`../`, `..`)

### Symbolic Links

- Symbolic links are resolved to their target
- Target must be a valid git repository
- Original symlink path is stored in configuration

## Configuration File

### File Format

```json
{
  "repositories": [
    {
      "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "path": "/Users/username/projects/my-repo",
      "name": "My Repository",
      "enabled": true,
      "createdAt": 1704067200000,
      "lastValidated": 1704153600000,
      "fetchInterval": 300000,
      "lastFetchTime": 1704153600000,
      "lastFetchStatus": "success",
      "lastFetchError": null,
      "remoteChanges": false,
      "remoteCommitCount": 0
    },
    {
      "id": "f6e7d8c9-b0a1-4d3c-9e8f-7a6b5c4d3e2f",
      "path": "/Users/username/work/project",
      "name": "Work Project",
      "enabled": false,
      "createdAt": 1704067260000,
      "fetchInterval": 600000,
      "lastFetchTime": 1704150000000,
      "lastFetchStatus": "error",
      "lastFetchError": "Network error: Connection refused",
      "remoteChanges": false,
      "remoteCommitCount": null
    }
  ],
  "globalFetchInterval": 300000,
  "fetchOnStartup": true,
  "notifyOnRemoteChanges": true,
  "lastGlobalFetch": 1704153600000,
  "version": "0.1.0"
}
```

### Schema Version

The `version` field tracks the configuration schema version:
- Current version: `0.1.0`
- Used for automatic migrations
- Prevents loading incompatible configurations

### Manual Editing

While possible, manual editing is not recommended:

**If you must edit manually:**

1. **Backup first:**
   ```bash
   cp data.json data.json.backup
   ```

2. **Validate JSON syntax:**
   - Use a JSON validator
   - Ensure all brackets and commas are correct
   - Check string escaping

3. **Maintain required fields:**
   - All required properties must be present
   - UUIDs must be valid v4 format
   - Timestamps must be in milliseconds
   - Paths must be absolute

4. **Reload plugin:**
   - Disable and re-enable the plugin
   - Or restart Obsidian

## Advanced Configuration

### Multiple Configurations

**Use Cases:**
- Different repository sets for work/personal
- Project-specific configurations
- Environment-specific setups

**Implementation:**
1. Keep multiple `data.json` files with different names
2. Manually swap them when needed:
   ```bash
   cp data.json.work data.json
   ```
3. Reload the plugin

### Batch Operations

**Adding Multiple Repositories:**

Create a script to generate configuration:

```javascript
const repos = [
  '/path/to/repo1',
  '/path/to/repo2',
  '/path/to/repo3',
];

const config = {
  repositories: repos.map((path, i) => ({
    id: generateUUID(), // Use proper UUID library
    path: path,
    name: path.split('/').pop(),
    enabled: true,
    createdAt: Date.now() + i,
  })),
  version: '0.1.0',
};

// Write to data.json
```

### Cross-Vault Sharing

**Sharing configurations between vaults:**

1. Export configuration from source vault:
   ```bash
   cp vault1/.obsidian/plugins/multi-git/data.json ~/shared-config.json
   ```

2. Import to target vault:
   ```bash
   cp ~/shared-config.json vault2/.obsidian/plugins/multi-git/data.json
   ```

3. Update paths if vault locations differ

4. Reload plugin in target vault

## Migration & Backup

### Automatic Backups

The plugin does NOT automatically backup configurations. Manual backups are recommended.

### Manual Backup

**Before making changes:**

```bash
# Backup configuration
cp <vault>/.obsidian/plugins/multi-git/data.json \
   <vault>/.obsidian/plugins/multi-git/data.json.backup

# With timestamp
cp <vault>/.obsidian/plugins/multi-git/data.json \
   <vault>/.obsidian/plugins/multi-git/data.json.$(date +%Y%m%d_%H%M%S)
```

### Restore from Backup

```bash
# Restore backup
cp <vault>/.obsidian/plugins/multi-git/data.json.backup \
   <vault>/.obsidian/plugins/multi-git/data.json

# Reload plugin in Obsidian
```

### Version Migration

**Future versions may include:**
- Automatic schema migration
- Backward compatibility checks
- Migration reports

**Current version (0.1.0):**
- No migrations needed yet
- First stable schema version

### Exporting Configuration

**For documentation or sharing:**

```bash
# Pretty print JSON
cat data.json | python -m json.tool > config-readable.json

# Or using jq
cat data.json | jq '.' > config-readable.json
```

## Best Practices

### Organization

**Naming Conventions:**
- Use descriptive names: "Work Notes" not "Repo1"
- Include project or team name
- Use consistent casing

**Repository Selection:**
- Only add repositories you actively use
- Remove unused repositories to reduce clutter
- Use enable/disable for temporary exclusion

### Security

**Path Validation:**
- Always use absolute paths
- Verify paths before adding
- Don't add repositories you don't control

**Permissions:**
- Ensure read access to all repositories
- Check file system permissions if errors occur
- Be cautious with network paths

### Performance

**Optimization Tips:**
- Limit to 10-20 active repositories for best performance
- Disable unused repositories to reduce fetch overhead
- Remove deleted repositories from configuration
- Increase fetch intervals for low-priority repositories
- Disable fetch on startup for better load times

**Fetch Performance:**
- Plugin handles 20+ repositories without UI blocking
- Fetch operations run sequentially to avoid system overload
- Average overhead: ~20ms per repository
- No performance impact during normal Obsidian use

**Monitoring:**
- Check plugin performance in large setups
- Monitor fetch durations in console
- Report performance issues on GitHub
- Review last fetch times for stale repositories

### Maintenance

**Regular Tasks:**
- Review repository list monthly
- Remove deleted repositories
- Update repository names as needed
- Verify all paths are still valid

**Health Checks:**
- Ensure git is up to date
- Verify repositories are accessible
- Check for configuration corruption

### Troubleshooting

**Configuration Issues:**

1. **Invalid JSON:**
   - Validate with online JSON validator
   - Check for missing commas or brackets
   - Look for unescaped characters

2. **Plugin won't load:**
   - Check Obsidian console for errors
   - Verify configuration file exists
   - Try restoring from backup

3. **Repositories not appearing:**
   - Reload plugin
   - Check paths are still valid
   - Verify git repositories exist

**Recovery Steps:**

1. Check console errors (Ctrl+Shift+I / Cmd+Option+I)
2. Restore from backup if available
3. Delete `data.json` to reset (loses all configuration)
4. Re-add repositories manually

## Configuration Reference

### Default Configuration

When first installed, the plugin creates:

```json
{
  "repositories": [],
  "globalFetchInterval": 300000,
  "fetchOnStartup": true,
  "notifyOnRemoteChanges": true,
  "version": "0.1.0"
}
```

When a repository is added, default fetch settings are:

```json
{
  "fetchInterval": 300000,
  "lastFetchStatus": "idle",
  "remoteChanges": false
}
```

### Maximum Limits

| Item | Limit | Notes |
|------|-------|-------|
| Repositories | Unlimited | Performance may degrade >50 |
| Path length | 4096 chars | OS-dependent |
| Name length | 255 chars | Display constraint |

### Debug Logging

**Hidden Setting:** Debug logging is not exposed in the settings UI and must be enabled manually by editing the configuration file.

#### When to Enable

Enable debug logging for:
- Troubleshooting fetch operations
- Investigating performance issues
- Diagnosing unexpected behavior
- Reporting bugs with detailed logs

#### How to Enable

1. **Close Obsidian completely**
2. **Locate configuration file:**
   - macOS: `/path/to/vault/.obsidian/plugins/multi-git/data.json`
   - Windows: `C:\path\to\vault\.obsidian\plugins\multi-git\data.json`  
   - Linux: `/path/to/vault/.obsidian/plugins/multi-git/data.json`

3. **Edit configuration:**
   Open `data.json` in a text editor and add or modify:
   ```json
   {
     "repositories": [...],
     "debugLogging": true,
     ...
   }
   ```

4. **Save and restart Obsidian**

5. **Open Developer Console:**
   - macOS: `Cmd + Option + I`
   - Windows/Linux: `Ctrl + Shift + I`

#### What Gets Logged

When `debugLogging` is `true`, the plugin logs:

**Git Operations:**
- Command execution with sanitized parameters
- Execution timing (duration in milliseconds)
- Command results (success/failure)
- Remote change detection results

**Fetch Scheduler:**
- Interval scheduling and unscheduling events
- Batch fetch execution flow
- Active operation tracking (concurrent fetch prevention)
- Fetch completion with timing and status

**Repository Configuration:**
- Status updates and transitions
- Configuration persistence events
- Remote changes flag updates
- Settings migration operations

**Notifications:**
- Notification trigger events
- Notification suppression logic (cooldown, settings)
- Duplicate prevention tracking

#### Log Format

All debug logs follow a consistent format:

```
[Multi-Git Debug] [ISO-Timestamp] [Component] Message
```

**Example Logs:**

```
[Multi-Git Debug] [2025-01-12T22:30:15.123Z] [Plugin] Multi-Git plugin loading
[Multi-Git Debug] [2025-01-12T22:30:15.234Z] [FetchScheduler] Starting automated fetch for 3 enabled repositories
[Multi-Git Debug] [2025-01-12T22:30:15.345Z] [GitCommand] Executing git command in /path/to/repo: git fetch --all --tags --prune
[Multi-Git Debug] [2025-01-12T22:30:16.456Z] [GitCommand] Git command succeeded in 1111ms: git fetch --all --tags --prune
[Multi-Git Debug] [2025-01-12T22:30:16.567Z] [GitCommand] Fetch operation completed in 1222ms (my-vault)
[Multi-Git Debug] [2025-01-12T22:30:16.678Z] [FetchScheduler] Remote changes detected for my-vault: 3 commits behind
[Multi-Git Debug] [2025-01-12T22:30:16.789Z] [Notification] Showing remote changes notification for my-vault: 3 commits
```

#### Security Considerations

**Automatic Sanitization:**
Debug logs automatically sanitize sensitive information:
- Passwords masked: `password=***`
- Tokens masked: `token=***`
- Bearer tokens: `Bearer ***`
- SSH URLs: `ssh://***@host`
- HTTPS credentials: `https://***:***@host`

**Safe to Log:**
- Repository paths (no credentials in paths)
- Git command structure (credentials sanitized)
- Timing information
- Status codes and states
- Error messages (sanitized)

**Never Logged:**
- Raw git output containing credentials
- SSH private keys
- Authentication tokens
- User passwords

#### Performance Impact

**When Disabled (default):**
- Negligible overhead: Single boolean check per log call
- No string formatting or processing
- No console I/O

**When Enabled:**
- Minimal overhead: Only console logging
- No file I/O or network operations
- Acceptable for debugging scenarios

#### Disabling Debug Logging

1. Edit `data.json` again
2. Change `debugLogging` to `false`:
   ```json
   {
     "debugLogging": false
   }
   ```
3. Save and restart Obsidian

#### Using Debug Logs for Bug Reports

When reporting issues on GitHub:

1. Enable debug logging
2. Reproduce the issue
3. Copy relevant log entries from console
4. Include logs in your bug report
5. Disable debug logging when done

**What to include:**
- Full log entries showing the issue
- Timestamps to show sequence of events
- Any error messages or stack traces
- Context about what you were trying to do

### Error Codes

Common configuration errors:

| Error | Code | Description |
|-------|------|-------------|
| Invalid Path | `INVALID_PATH` | Path is not absolute |
| Not Found | `PATH_NOT_FOUND` | Directory doesn't exist |
| Not Git Repo | `NOT_GIT_REPOSITORY` | Not a valid git repository |
| Duplicate | `DUPLICATE_PATH` | Path already configured |
| Security | `SECURITY_ERROR` | Path contains risks |

---

For additional help, see:
- [README.md](../README.md) - General usage
- [Troubleshooting](../README.md#troubleshooting) - Common issues
- [GitHub Issues](https://github.com/YOUR_USERNAME/multi-git/issues) - Report bugs
