# Configuration Guide

Complete guide to configuring and managing repositories in Multi-Git for Obsidian.

## Table of Contents

- [Configuration Overview](#configuration-overview)
- [Repository Configuration](#repository-configuration)
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
      "lastValidated": 1704153600000
    },
    {
      "id": "f6e7d8c9-b0a1-4d3c-9e8f-7a6b5c4d3e2f",
      "path": "/Users/username/work/project",
      "name": "Work Project",
      "enabled": false,
      "createdAt": 1704067260000
    }
  ],
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
- Limit to 10-20 active repositories
- Disable unused repositories
- Remove deleted repositories

**Monitoring:**
- Check plugin performance in large setups
- Report performance issues on GitHub

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
  "version": "0.1.0"
}
```

### Maximum Limits

| Item | Limit | Notes |
|------|-------|-------|
| Repositories | Unlimited | Performance may degrade >50 |
| Path length | 4096 chars | OS-dependent |
| Name length | 255 chars | Display constraint |

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
