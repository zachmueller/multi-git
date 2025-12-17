# Contributing Guide

Thank you for your interest in contributing to Multi-Git for Obsidian! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone. We expect all contributors to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information
- Any conduct inappropriate in a professional setting

## Getting Started

### Prerequisites

**Required:**
- Node.js 18.x or higher
- npm 9.x or higher
- Git 2.x or higher
- Obsidian 1.4.0 or higher (for testing)

**Recommended:**
- VSCode with TypeScript extension
- Git client (GitHub Desktop, Fork, etc.)

### Fork and Clone

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/multi-git.git
   cd multi-git
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/multi-git.git
   ```

### Install Dependencies

```bash
npm install
```

This installs:
- TypeScript compiler
- Jest testing framework
- ESLint for code quality
- esbuild for bundling
- Obsidian API types

### Development Setup

1. **Link to Obsidian vault:**
   ```bash
   # Create symlink to your test vault
   ln -s $(pwd) /path/to/vault/.obsidian/plugins/multi-git
   ```

2. **Start development mode:**
   ```bash
   npm run dev
   ```
   
   This watches for changes and rebuilds automatically.

3. **Open Obsidian:**
   - Settings → Community plugins
   - Enable Multi-Git
   - Reload plugin after code changes

### Verify Setup

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Tests
npm test

# Build
npm run build
```

All commands should complete successfully.

## Development Workflow

### Branch Strategy

**Main branches:**
- `main` - Production-ready code
- `develop` - Integration branch for features

**Feature branches:**
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Creating a Feature Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Description of changes"

# Push to your fork
git push origin feature/your-feature-name
```

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Rebase your feature branch
git checkout feature/your-feature-name
git rebase upstream/main

# Force push if already pushed
git push --force-with-lease origin feature/your-feature-name
```

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(ui): add repository search filter"
git commit -m "fix(validation): handle symbolic links correctly"
git commit -m "docs: update installation instructions"
git commit -m "test(services): add git command timeout tests"
```

## Coding Standards

### TypeScript Style Guide

**Naming Conventions:**
```typescript
// Classes: PascalCase
class RepositoryConfigService {}

// Interfaces: PascalCase
interface RepositoryConfig {}

// Functions/Methods: camelCase
function validatePath() {}

// Constants: UPPER_SNAKE_CASE
const DEFAULT_TIMEOUT = 30000;

// Private members: prefix with underscore
private _internalState: string;
```

**Type Safety:**
```typescript
// ✅ Use strict typing
function addRepository(path: string): Promise<RepositoryConfig>

// ❌ Avoid 'any'
function addRepository(path: any): any

// ✅ Define interfaces
interface ValidationResult {
    isValid: boolean;
    error?: string;
}

// ❌ Use object types
function validate(): { isValid: boolean; error?: string }
```

**Async/Await:**
```typescript
// ✅ Use async/await
async function loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = data || DEFAULT_SETTINGS;
}

// ❌ Avoid callback hell
function loadSettings(callback: Function): void {
    this.loadData((data) => {
        // nested callbacks...
    });
}
```

### Code Organization

**File Structure:**
```typescript
// 1. Imports
import { Plugin } from 'obsidian';
import { GitCommandService } from './services/GitCommandService';

// 2. Constants
const DEFAULT_TIMEOUT = 30000;

// 3. Interfaces/Types
interface MyInterface {}

// 4. Class definition
export class MyClass {
    // Public properties
    public visible: boolean;
    
    // Private properties
    private _internal: string;
    
    // Constructor
    constructor() {}
    
    // Public methods
    public async doSomething(): Promise<void> {}
    
    // Private methods
    private helper(): void {}
}
```

**Function Size:**
- Keep functions under 50 lines
- Extract complex logic into helper functions
- One function = one responsibility

**Comments:**
```typescript
/**
 * Validates that a path is an absolute path
 * @param path - The path to validate
 * @returns true if the path is absolute, false otherwise
 */
export function validateAbsolutePath(path: string): boolean {
    // Implementation
}
```

### Error Handling

**Use custom errors:**
```typescript
// ✅ Throw specific errors
throw new ValidationError('Path must be absolute', 'INVALID_PATH');

// ❌ Generic errors
throw new Error('Invalid path');
```

**Handle async errors:**
```typescript
// ✅ Try-catch in async functions
async function addRepository(path: string): Promise<void> {
    try {
        const isGit = await this.gitService.isGitRepository(path);
        if (!isGit) {
            throw new ValidationError('Not a git repository');
        }
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError('Failed to validate repository');
    }
}
```

### ESLint Configuration

We use ESLint with TypeScript plugin. Run before committing:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

**Key rules:**
- No unused variables
- Prefer const over let
- Use semicolons
- Single quotes for strings
- Trailing commas in multiline objects

## Testing Guidelines

### Test Structure

**Location:**
- Unit tests: `test/` directory mirroring `src/`
- Integration tests: `test/integration/`

**Naming:**
- Test files: `*.test.ts`
- Describe blocks: Component/function name
- Test cases: Should statements

```typescript
describe('GitCommandService', () => {
    describe('isGitRepository', () => {
        it('should return true for valid git repository', async () => {
            // Test implementation
        });
        
        it('should return false for non-git directory', async () => {
            // Test implementation
        });
    });
});
```

### Writing Tests

**Arrange-Act-Assert pattern:**
```typescript
it('should add repository successfully', async () => {
    // Arrange
    const service = new RepositoryConfigService(mockPlugin, mockGitService);
    const path = '/valid/git/repo';
    
    // Act
    const result = await service.addRepository(path);
    
    // Assert
    expect(result.path).toBe(path);
    expect(result.enabled).toBe(true);
});
```

**Mock external dependencies:**
```typescript
// Mock Obsidian Plugin
const mockPlugin = {
    loadData: jest.fn().mockResolvedValue({}),
    saveData: jest.fn().mockResolvedValue(undefined),
};

// Mock GitCommandService
const mockGitService = {
    isGitRepository: jest.fn().mockResolvedValue(true),
};
```

### Test Coverage

**Targets:**
- Overall: 80%+
- New features: 90%+
- Critical paths: 100%

**Check coverage:**
```bash
npm test -- --coverage
```

**Coverage reports:**
- Terminal summary
- HTML report: `coverage/lcov-report/index.html`

### Test Categories

**Unit Tests (🟢 VSCode testable):**
- Utility functions
- Service methods with mocks
- Error classes

**Integration Tests (🟡 Partial):**
- Cross-platform behavior
- Error scenarios
- Workflow testing

**Manual Tests (🔴 Obsidian required):**
- UI components
- Visual verification
- End-to-end workflows

## Submitting Changes

### Before Submitting

**Checklist:**
- [ ] Code follows style guidelines
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] Type checking passes: `npm run type-check`
- [ ] Added tests for new features
- [ ] Updated documentation
- [ ] Tested manually in Obsidian
- [ ] Commit messages follow conventions

### Pull Request Process

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request on GitHub:**
   - Go to your fork on GitHub
   - Click "Compare & pull request"
   - Fill in PR template

3. **PR Template:**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Refactoring
   
   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Manual testing completed
   - [ ] Cross-platform tested
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Tests pass
   - [ ] Documentation updated
   
   ## Screenshots (if UI changes)
   ```

4. **Respond to review feedback:**
   - Make requested changes
   - Push updates to same branch
   - Reply to comments

5. **After approval:**
   - Maintainer will merge PR
   - Delete your feature branch

### Code Review Expectations

**As author:**
- Respond promptly to feedback
- Be open to suggestions
- Explain your reasoning

**As reviewer:**
- Be constructive and respectful
- Focus on code, not person
- Suggest improvements, don't demand

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

**Examples:**
- `0.1.0` → `0.2.0`: New feature added
- `0.1.0` → `0.1.1`: Bug fix
- `1.0.0` → `2.0.0`: Breaking change

### Release Checklist

**Pre-release:**
1. All tests passing
2. Documentation updated
3. CHANGELOG.md updated
4. Version bumped in manifest.json
5. Build succeeds: `npm run build`

**Release:**
1. Create release branch
2. Final testing
3. Merge to main
4. Tag release: `git tag v0.1.0`
5. Push tags: `git push --tags`
6. Create GitHub release
7. Publish to Obsidian community plugins

## Development Tips

### Debugging

**Console logging:**
```typescript
console.log('Repository added:', repo);
```

**VSCode debugging:**
1. Set breakpoints in code
2. Run tests in debug mode
3. Inspect variables

**Obsidian console:**
- Open: Ctrl+Shift+I (Windows/Linux) / Cmd+Option+I (macOS)
- Access plugin: `app.plugins.plugins['multi-git']`
- Test methods directly

### Performance Profiling

**Measure execution time:**
```typescript
console.time('addRepository');
await service.addRepository(path);
console.timeEnd('addRepository');
```

**Obsidian DevTools:**
- Performance tab
- Memory profiling
- Network monitoring

### Common Issues

**TypeScript errors:**
- Check `tsconfig.json` settings
- Ensure Obsidian types installed
- Run `npm run type-check`

**Test failures:**
- Check mock setup
- Verify async/await usage
- Run single test: `npm test -- TestName`

**Build failures:**
- Clear `node_modules`: `rm -rf node_modules && npm install`
- Check esbuild config
- Verify dependencies

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and ideas
- **Pull Requests**: Code contributions

### Getting Help

**Before asking:**
1. Search existing issues
2. Read documentation
3. Check FAQ

**When asking:**
- Provide context
- Include error messages
- Share reproduction steps
- Mention OS and versions

### Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

## Additional Resources

### Documentation
- [README.md](../README.md) - User guide
- [Configuration Guide](configuration.md) - Setup details
- [Architecture](architecture.md) - Technical overview

### External Resources
- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

### Example PRs

Look at merged PRs for examples:
- Feature additions
- Bug fixes
- Documentation improvements

---

Thank you for contributing to Multi-Git! Your efforts make this project better for everyone.
