# Multi-Git Plugin - Development Quickstart

**Last Updated:** 2025-01-12  
**Target:** Developers implementing FR-1 (Repository Configuration)

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git 2.20.0+** - [Download](https://git-scm.com/)
- **Obsidian 1.0.0+** - [Download](https://obsidian.md/)
- **Code Editor** - VSCode recommended with TypeScript support

Verify installations:
```bash
node --version  # Should be 18.x or higher
git --version   # Should be 2.20.0 or higher
```

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to your workspace
cd /Volumes/workplace/multi-git

# Install dependencies (when package.json is created)
npm install
```

### 2. Project Structure Setup

The plugin follows standard Obsidian plugin structure:

```
multi-git/
├── src/                      # Source code
│   ├── main.ts              # Plugin entry point
│   ├── settings/            # Settings and data models
│   ├── services/            # Business logic services
│   └── utils/               # Utility functions
├── test/                     # Test files
├── manifest.json            # Plugin manifest
├── package.json             # Node dependencies
├── tsconfig.json            # TypeScript configuration
└── esbuild.config.mjs       # Build configuration
```

## Development Workflow

### 1. Start Development Build

```bash
# Start development build with watch mode
npm run dev
```

This command:
- Compiles TypeScript to JavaScript
- Bundles code with esbuild
- Watches for file changes
- Auto-rebuilds on save

### 2. Link Plugin to Obsidian

Create a symbolic link from your build output to an Obsidian vault's plugins directory:

**macOS/Linux:**
```bash
# Create test vault if needed
mkdir -p ~/Documents/ObsidianTestVault/.obsidian/plugins/multi-git

# Link plugin (adjust paths as needed)
ln -s /Volumes/workplace/multi-git ~/Documents/ObsidianTestVault/.obsidian/plugins/multi-git
```

**Windows (PowerShell as Administrator):**
```powershell
# Create test vault if needed
New-Item -ItemType Directory -Path "$env:USERPROFILE\Documents\ObsidianTestVault\.obsidian\plugins\multi-git" -Force

# Link plugin
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\Documents\ObsidianTestVault\.obsidian\plugins\multi-git" -Target "C:\workspace\multi-git"
```

### 3. Enable Plugin in Obsidian

1. Open Obsidian
2. Open your test vault
3. Go to Settings → Community Plugins
4. Enable "Community plugins" if not already enabled
5. Click "Reload" if plugin doesn't appear
6. Find "Multi-Git" and toggle it on

### 4. Hot Reload During Development

The plugin supports hot reload:
1. Make changes to source code
2. Save files
3. In Obsidian: Press `Ctrl/Cmd + R` to reload
4. Or use Command Palette: "Reload app without saving"

## Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build with type checking
npm run build

# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Type checking only (no build)
npm run type-check

# Lint code
npm run lint

# Lint and auto-fix
npm run lint -- --fix
```

## Testing Setup

### Unit Tests with Jest

Tests are located in `test/` directory, mirroring the `src/` structure.

**Run tests:**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- RepositoryConfigService.test.ts
```

**Writing tests:**
```typescript
// test/services/RepositoryConfigService.test.ts
import { RepositoryConfigService } from '../../src/services/RepositoryConfigService';

describe('RepositoryConfigService', () => {
  let service: RepositoryConfigService;

  beforeEach(() => {
    service = new RepositoryConfigService();
  });

  test('should add repository with valid path', async () => {
    const config = await service.addRepository('/path/to/repo');
    expect(config.path).toBe('/path/to/repo');
    expect(config.enabled).toBe(true);
  });
});
```

### Integration Testing in Obsidian

For features requiring Obsidian environment:

1. **Manual Testing:**
   - Use linked plugin in test vault
   - Test UI interactions
   - Verify persistence across restarts

2. **Test Repositories:**
   - Create test git repositories for validation
   - Use various repository states (clean, dirty, etc.)
   - Test with different git configurations

## Debugging

### VSCode Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Obsidian Developer Console

1. In Obsidian: `Ctrl/Cmd + Shift + I` to open DevTools
2. Console tab shows plugin logs
3. Use `console.log()`, `console.error()` in code
4. Network tab for git command debugging

### Common Debug Patterns

```typescript
// Enable verbose logging
if (process.env.DEBUG) {
  console.log('Debug info:', data);
}

// Log git command output
console.log('Git command:', command);
console.log('Git stdout:', stdout);
console.log('Git stderr:', stderr);

// Trace service calls
console.trace('Service method called');
```

## Git Workflow for Development

### Branch Strategy

```bash
# Create feature branch
git checkout -b feat/fr1-repository-config

# Make changes and commit
git add .
git commit -m "feat: implement repository configuration service"

# Push to remote
git push origin feat/fr1-repository-config
```

### Commit Message Format

Follow conventional commits:

```
feat: add repository configuration service
fix: handle invalid path validation
test: add unit tests for git service
docs: update quickstart guide
refactor: simplify path validation logic
```

## Troubleshooting

### Plugin Not Loading

**Symptom:** Plugin doesn't appear in Obsidian plugins list

**Solutions:**
1. Check manifest.json is present and valid
2. Verify symbolic link is correct
3. Reload Obsidian with `Ctrl/Cmd + R`
4. Check Obsidian console for errors
5. Ensure `main.js` is being generated by build

### Build Errors

**Symptom:** TypeScript compilation errors

**Solutions:**
1. Run `npm install` to ensure dependencies are installed
2. Check TypeScript version: `npx tsc --version`
3. Verify tsconfig.json is correctly configured
4. Clear build cache: `rm -rf node_modules/.cache`

### Git Commands Failing

**Symptom:** Git operations return errors

**Solutions:**
1. Verify git is in PATH: `which git` (Unix) or `where git` (Windows)
2. Check repository is valid: `cd /path/to/repo && git status`
3. Verify user has permissions to repository
4. Check git version compatibility: `git --version`

### Hot Reload Not Working

**Symptom:** Changes not reflected in Obsidian

**Solutions:**
1. Verify `npm run dev` is running
2. Check build output for errors
3. Manual reload: `Ctrl/Cmd + R` in Obsidian
4. Restart Obsidian completely
5. Check file watcher limits on Linux

## Performance Testing

### Test with Multiple Repositories

```bash
# Create test repositories
for i in {1..10}; do
  mkdir -p ~/test-repos/repo-$i
  cd ~/test-repos/repo-$i
  git init
  echo "test" > README.md
  git add .
  git commit -m "Initial commit"
done
```

### Monitor Memory Usage

1. Open Obsidian DevTools
2. Go to Memory tab
3. Take heap snapshot before operations
4. Perform operations (add repositories)
5. Take another snapshot
6. Compare memory usage

### Measure Operation Time

```typescript
// In code
console.time('addRepository');
await service.addRepository(path);
console.timeEnd('addRepository');
```

## Cross-Platform Testing

### macOS Testing
- Test with standard Unix paths: `/Users/username/repos`
- Verify symlink handling
- Check with brew-installed git

### Windows Testing
- Test with drive letters: `C:\Users\username\repos`
- Test with UNC paths: `\\network\share\repos`
- Verify path separators (backslash handling)
- Check with Git for Windows

### Linux Testing
- Test with standard paths: `/home/username/repos`
- Verify permissions handling
- Check with distribution git packages

## Next Steps

After setup:

1. ✅ Verify all commands work
2. ✅ Create test repository for development
3. ✅ Run `npm run dev` and confirm build succeeds
4. ✅ Link plugin to Obsidian test vault
5. ✅ Enable plugin in Obsidian
6. ✅ Make small test change and verify hot reload
7. ✅ Run `npm test` to verify test framework works

You're ready to start implementing FR-1! See `plan-fr1.md` for implementation phases and tasks.

## Resources

- **Obsidian Plugin Docs:** https://docs.obsidian.md/Plugins/Getting+started
- **Obsidian API Reference:** https://docs.obsidian.md/Reference/TypeScript+API
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/intro.html
- **Jest Documentation:** https://jestjs.io/docs/getting-started
- **esbuild Documentation:** https://esbuild.github.io/

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Obsidian plugin development docs
3. Check existing plugin examples in Obsidian community
4. Consult the specification at `spec.md`
5. Review implementation plan at `plan-fr1.md`
