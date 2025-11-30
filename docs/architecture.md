# Architecture Overview

Technical architecture documentation for Multi-Git Obsidian plugin.

## Table of Contents

- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)
- [Extension Points](#extension-points)

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Obsidian App                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Multi-Git Plugin                     │  │
│  │                                                   │  │
│  │  ┌──────────────┐         ┌──────────────┐     │  │
│  │  │  Main Plugin │◄────────┤ Settings Tab │     │  │
│  │  │   (main.ts)  │         │              │     │  │
│  │  └──────┬───────┘         └──────────────┘     │  │
│  │         │                                        │  │
│  │         │ initializes                           │  │
│  │         ▼                                        │  │
│  │  ┌─────────────────────────────────────┐       │  │
│  │  │         Service Layer               │       │  │
│  │  │  ┌────────────┐  ┌────────────┐    │       │  │
│  │  │  │    Git     │  │Repository  │    │       │  │
│  │  │  │  Command   │  │   Config   │    │       │  │
│  │  │  │  Service   │  │  Service   │    │       │  │
│  │  │  └─────┬──────┘  └──────┬─────┘    │       │  │
│  │  └────────┼─────────────────┼──────────┘       │  │
│  │           │                 │                   │  │
│  │           │ uses            │ uses              │  │
│  │           ▼                 ▼                   │  │
│  │  ┌─────────────────────────────────────┐       │  │
│  │  │        Utility Layer                │       │  │
│  │  │  ┌──────────┐  ┌────────────┐      │       │  │
│  │  │  │Validation│  │   Errors   │      │       │  │
│  │  │  └──────────┘  └────────────┘      │       │  │
│  │  └─────────────────────────────────────┘       │  │
│  │                                                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │              Data Persistence                   │  │
│  │         (Obsidian's Plugin Data API)            │  │
│  │              data.json storage                  │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ executes
                           ▼
                  ┌─────────────────┐
                  │   Git CLI       │
                  │ (External Tool) │
                  └─────────────────┘
```

### Layer Responsibilities

**Presentation Layer (UI):**
- Settings tab rendering
- User interaction handling
- Form validation and feedback
- Modal dialogs

**Service Layer:**
- Business logic
- Repository management
- Git operations
- Settings persistence

**Utility Layer:**
- Path validation
- Error handling
- Helper functions
- Type definitions

## Project Structure

```
multi-git/
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── services/               # Business logic services
│   │   ├── GitCommandService.ts
│   │   └── RepositoryConfigService.ts
│   ├── settings/               # UI and data models
│   │   ├── data.ts            # Type definitions
│   │   └── SettingTab.ts      # Settings UI
│   └── utils/                  # Utility functions
│       ├── errors.ts          # Custom error classes
│       └── validation.ts      # Path validation
├── test/                       # Test suites
│   ├── services/              # Service tests
│   ├── utils/                 # Utility tests
│   └── integration/           # Integration tests
├── specs/                      # Specifications
│   └── 1-multi-git-core/      # FR-1 specification
├── docs/                       # Documentation
│   ├── architecture.md        # This file
│   ├── configuration.md       # User configuration guide
│   └── contributing.md        # Contribution guidelines
├── styles.css                  # Plugin styles
├── manifest.json              # Plugin manifest
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── jest.config.js             # Test config
└── esbuild.config.mjs         # Build config
```

### File Organization Principles

1. **Separation of Concerns**: Each layer has distinct responsibilities
2. **Feature Grouping**: Related functionality grouped in directories
3. **Test Colocation**: Tests mirror source structure
4. **Documentation**: Specs and docs at project root

## Core Components

### 1. Main Plugin (src/main.ts)

**Responsibilities:**
- Plugin lifecycle management
- Service initialization
- Settings persistence
- Obsidian API integration

**Key Methods:**
```typescript
class MultiGitPlugin extends Plugin {
    settings: MultiGitSettings;
    gitCommandService: GitCommandService;
    repositoryConfigService: RepositoryConfigService;

    async onload(): Promise<void>
    onunload(): void
    async loadSettings(): Promise<void>
    async saveSettings(): Promise<void>
}
```

**Lifecycle:**
1. `onload()` - Initialize services, load settings, register UI
2. User interacts with plugin
3. `onunload()` - Cleanup resources
4. Settings automatically saved on changes

### 2. Git Command Service (src/services/GitCommandService.ts)

**Responsibilities:**
- Execute git CLI commands
- Validate git repositories
- Handle command errors
- Cross-platform compatibility

**Key Methods:**
```typescript
class GitCommandService {
    async isGitRepository(path: string): Promise<boolean>
    async getRepositoryRoot(path: string): Promise<string>
    private async executeCommand(command: string, cwd: string): Promise<string>
}
```

**Command Execution:**
- Uses Node.js `child_process.exec`
- Timeout protection (30 seconds)
- Error handling for non-zero exit codes
- Security: No command injection possible

### 3. Repository Config Service (src/services/RepositoryConfigService.ts)

**Responsibilities:**
- Repository CRUD operations
- Path validation
- Settings persistence
- Business logic enforcement

**Key Methods:**
```typescript
class RepositoryConfigService {
    async addRepository(path: string, name?: string): Promise<RepositoryConfig>
    async removeRepository(id: string): Promise<boolean>
    async toggleRepository(id: string): Promise<boolean | null>
    getRepositories(): RepositoryConfig[]
    getRepository(id: string): RepositoryConfig | null
    getEnabledRepositories(): RepositoryConfig[]
}
```

**Validation Pipeline:**
```
User Input
    ↓
Path Validation (absolute, exists, directory)
    ↓
Security Check (no traversal)
    ↓
Git Validation (is git repo)
    ↓
Duplicate Check (not already added)
    ↓
Success → Add to Configuration
```

### 4. Settings UI (src/settings/SettingTab.ts)

**Components:**
- `MultiGitSettingTab` - Main settings page
- `AddRepositoryModal` - Add repository dialog
- `ConfirmRemovalModal` - Removal confirmation

**UI Flow:**
```
Settings Tab Display
    ↓
User clicks "Add Repository"
    ↓
Modal opens with form
    ↓
User enters path (validates on input)
    ↓
Click "Add" → Service validates → Success/Error
    ↓
Modal closes → List refreshes
```

### 5. Validation Utilities (src/utils/validation.ts)

**Functions:**
```typescript
validateAbsolutePath(path: string): boolean
isDirectory(path: string): boolean
pathExists(path: string): boolean
normalizePath(path: string): string
isSecurePath(path: string): boolean
validateRepositoryPath(path: string): { isValid: boolean; error?: string }
```

**Security Features:**
- Path traversal detection (`../`, `..`)
- Null byte detection (`\0`)
- Absolute path enforcement
- Safe path normalization

### 6. Error Classes (src/utils/errors.ts)

**Hierarchy:**
```
RepositoryConfigError (base)
    ├── ValidationError
    └── DuplicateError
```

**Error Codes:**
- `INVALID_PATH` - Path validation failed
- `PATH_NOT_FOUND` - Directory doesn't exist
- `NOT_GIT_REPOSITORY` - Not a git repository
- `DUPLICATE_PATH` - Path already configured
- `SECURITY_ERROR` - Security violation detected

## Data Flow

### Adding a Repository

```
User (UI) → "Add Repository" button
    ↓
AddRepositoryModal opens
    ↓
User enters path and name
    ↓
Input validation (client-side)
    ↓
User clicks "Add"
    ↓
RepositoryConfigService.addRepository()
    ├→ Validation utilities check path
    ├→ GitCommandService validates git repo
    ├→ Check for duplicates
    ├→ Generate UUID
    ├→ Create RepositoryConfig object
    └→ Plugin.saveSettings()
        ↓
    Obsidian's plugin data API
        ↓
    data.json updated on disk
        ↓
    UI refreshes
        ↓
    User sees new repository in list
```

### Toggling a Repository

```
User clicks toggle button
    ↓
RepositoryConfigService.toggleRepository(id)
    ├→ Find repository by ID
    ├→ Flip enabled boolean
    ├→ Update lastValidated timestamp
    └→ Plugin.saveSettings()
        ↓
    UI updates immediately (optimistic)
        ↓
    Settings persist to disk
```

### Settings Persistence

```
Plugin Loads
    ↓
Plugin.loadSettings()
    ↓
Obsidian.loadData() → reads data.json
    ↓
Parse JSON to MultiGitSettings
    ↓
Services initialized with settings
    ↓
    
User makes change
    ↓
Service updates settings object
    ↓
Plugin.saveSettings()
    ↓
Obsidian.saveData() → writes data.json
    ↓
Settings persisted
```

## Design Patterns

### 1. Service Pattern

**Usage:** GitCommandService, RepositoryConfigService

**Benefits:**
- Encapsulates business logic
- Testable in isolation
- Reusable across UI components
- Clear separation of concerns

**Implementation:**
```typescript
// Services receive dependencies via constructor
class RepositoryConfigService {
    constructor(
        private plugin: MultiGitPlugin,
        private gitService: GitCommandService
    ) {}
    
    // Business logic methods
    async addRepository(path: string): Promise<RepositoryConfig> {
        // Validation, git checks, persistence
    }
}
```

### 2. Dependency Injection

**Usage:** Plugin initializes and passes services

**Benefits:**
- Loose coupling
- Easy testing with mocks
- Flexible architecture

**Implementation:**
```typescript
class MultiGitPlugin extends Plugin {
    async onload() {
        // Create services
        this.gitCommandService = new GitCommandService();
        this.repositoryConfigService = new RepositoryConfigService(
            this,
            this.gitCommandService
        );
    }
}
```

### 3. Defensive Copying

**Usage:** Service methods return copies, not references

**Benefits:**
- Prevents accidental mutations
- Immutable public API
- Thread-safe operations

**Implementation:**
```typescript
getRepositories(): RepositoryConfig[] {
    // Return deep copy, not reference
    return JSON.parse(JSON.stringify(this.plugin.settings.repositories));
}
```

### 4. Error Handling Strategy

**Usage:** Custom error classes with codes

**Benefits:**
- Structured error information
- Programmatic error handling
- User-friendly messages

**Implementation:**
```typescript
throw new ValidationError(
    'Path must be an absolute path',
    'INVALID_PATH'
);
```

### 5. Command Pattern (Git Operations)

**Usage:** GitCommandService encapsulates git commands

**Benefits:**
- Command abstraction
- Easy to add new commands
- Centralized error handling

**Implementation:**
```typescript
private async executeCommand(
    command: string,
    cwd: string
): Promise<string> {
    // Execute, handle errors, return output
}
```

## Extension Points

### Adding New Git Operations

1. **Add method to GitCommandService:**
```typescript
async getBranchName(path: string): Promise<string> {
    const output = await this.executeCommand(
        'git branch --show-current',
        path
    );
    return output.trim();
}
```

2. **Add tests:**
```typescript
it('should get current branch name', async () => {
    const branch = await service.getBranchName('/path/to/repo');
    expect(branch).toBe('main');
});
```

### Adding New Repository Operations

1. **Add method to RepositoryConfigService:**
```typescript
async updateRepositoryName(id: string, name: string): Promise<boolean> {
    const repo = this.getRepository(id);
    if (!repo) return false;
    
    repo.name = name;
    await this.plugin.saveSettings();
    return true;
}
```

2. **Update UI to call new method**
3. **Add tests**

### Adding New Validation Rules

1. **Add function to validation.ts:**
```typescript
export function validateRepositorySize(path: string): boolean {
    // Check repository size
    return true;
}
```

2. **Integrate into validation pipeline:**
```typescript
async addRepository(path: string): Promise<RepositoryConfig> {
    // Existing validations...
    
    if (!validateRepositorySize(path)) {
        throw new ValidationError('Repository too large');
    }
    
    // Continue...
}
```

### Adding New UI Components

1. **Create component in settings/**
2. **Integrate with SettingTab.ts**
3. **Add styles to styles.css**
4. **Test manually in Obsidian**

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading:**
   - Services only created when needed
   - Settings loaded on demand

2. **Caching:**
   - Repository list cached in memory
   - Only reload from disk when modified

3. **Async Operations:**
   - All git commands are async
   - UI remains responsive during operations

4. **Defensive Copying:**
   - Trade memory for safety
   - Negligible impact with <100 repositories

### Bottlenecks

Potential performance issues:

1. **Large Repository Count:**
   - Linear search in arrays
   - Consider Map/Set for >100 repos

2. **Frequent Git Commands:**
   - Each command spawns process
   - Consider batching operations

3. **Settings Persistence:**
   - Disk I/O on every change
   - Could debounce saves

### Monitoring

Track these metrics:
- Plugin load time (target: <1s)
- Settings UI render time (target: <500ms)
- Repository operations (target: <2s)
- Memory usage (target: <50MB)

## Testing Strategy

### Unit Tests

**Coverage:**
- All utility functions
- Service methods with mocked dependencies
- Error classes

**Tools:**
- Jest for test runner
- ts-jest for TypeScript
- Mock Obsidian APIs

### Integration Tests

**Coverage:**
- End-to-end workflows
- Cross-platform behavior
- Error scenarios

**Execution:**
- Some runnable in VSCode/terminal
- Some require Obsidian environment

### Manual Testing

**Scope:**
- UI interactions
- Visual appearance
- Settings persistence
- Error messages

**Process:**
- Test in actual Obsidian
- Multiple platforms (macOS, Windows, Linux)
- Different vault configurations

## Security Considerations

### Path Validation

**Threats:**
- Path traversal attacks
- Command injection
- Unauthorized file access

**Mitigations:**
- Absolute path requirement
- Pattern matching for `../`
- No user input in shell commands
- Null byte detection

### Git Command Security

**Approach:**
- No dynamic command construction from user input
- Paths passed as arguments, not in command string
- Timeouts prevent hanging
- Exit code validation

### Data Security

**Storage:**
- Settings in Obsidian's plugin data directory
- Standard file permissions apply
- No sensitive data stored

**Transmission:**
- No network operations
- All data local to vault

## Future Architecture Changes

### Planned Improvements

1. **Event System:**
   - Notify UI of service changes
   - Decouple components further

2. **Repository Cache:**
   - Cache git status/branch info
   - Background refresh

3. **Workspace Support:**
   - Multiple repository groups
   - Context switching

4. **Plugin API:**
   - Expose API for other plugins
   - Extension ecosystem

### Migration Path

1. Maintain backward compatibility
2. Version configuration schema
3. Provide migration utilities
4. Document breaking changes

---

For implementation details, see source code and inline documentation.
For contribution guidelines, see [contributing.md](contributing.md).
