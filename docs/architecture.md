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
│  │  │  ┌────────────┐  ┌────────────┐    │       │  │
│  │  │  │  Commit    │  │   Fetch    │    │       │  │
│  │  │  │  Message   │  │ Scheduler  │    │       │  │
│  │  │  │  Service   │  │  Service   │    │       │  │
│  │  │  └────────────┘  └────────────┘    │       │  │
│  │  │  ┌────────────┐                    │       │  │
│  │  │  │Notification│                    │       │  │
│  │  │  │  Service   │                    │       │  │
│  │  │  └────────────┘                    │       │  │
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
- Modal dialogs (add repository, repository picker, commit message)

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
│   │   ├── RepositoryConfigService.ts
│   │   ├── CommitMessageService.ts
│   │   ├── FetchSchedulerService.ts
│   │   └── NotificationService.ts
│   ├── settings/               # UI and data models
│   │   ├── data.ts            # Type definitions
│   │   └── SettingTab.ts      # Settings UI
│   ├── ui/                     # UI components
│   │   ├── RepositoryPickerModal.ts
│   │   ├── CommitMessageModal.ts
│   │   └── StatusPanelView.ts
│   └── utils/                  # Utility functions
│       ├── errors.ts          # Custom error classes
│       ├── validation.ts      # Path validation
│       └── logger.ts          # Debug logging
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

### 5. Commit Message Service (src/services/CommitMessageService.ts)

**Responsibilities:**
- Analyze repository file changes
- Generate smart commit message suggestions
- Apply commit message rules based on change patterns
- Keep messages under 50 characters for best practice

**Key Methods:**
```typescript
class CommitMessageService {
    generateSuggestion(status: RepositoryStatus): CommitMessageSuggestion
    private analyzeChanges(status: RepositoryStatus): FileChangeAnalysis
    private generateSummary(analysis: FileChangeAnalysis): string
}
```

**Suggestion Rules:**
- Single file: "Update filename.txt"
- 2-3 files: "Update file1, file2, file3"
- 4+ files: "Update N files"
- Only additions: "Add filename" or "Add N files"
- Only deletions: "Remove filename" or "Remove N files"
- Initial commit (3+ new files): "Initial commit"

### 6. Fetch Scheduler Service (src/services/FetchSchedulerService.ts)

**Responsibilities:**
- Schedule automated fetch operations
- Manage fetch intervals
- Coordinate fetch batching
- Handle fetch-on-startup

**Key Methods:**
```typescript
class FetchSchedulerService {
    start(): void
    stop(): void
    async fetchAll(): Promise<void>
    async fetchRepository(repoId: string): Promise<void>
}
```

**Scheduling Strategy:**
- Global interval (default 5 minutes)
- Per-repository override intervals
- Fetch-on-startup option
- Batch processing for multiple repos

### 7. Notification Service (src/services/NotificationService.ts)

**Responsibilities:**
- Display user notifications
- Manage notification cooldowns
- Prevent notification spam
- Track notification history

**Key Methods:**
```typescript
class NotificationService {
    notifyRemoteChanges(repoName: string, commitCount: number): void
    notifyFetchError(repoName: string, error: string): void
    private shouldNotify(key: string): boolean
}
```

**Cooldown Logic:**
- 60-second cooldown per unique notification
- Prevents duplicate notifications
- Separate cooldowns for different repositories

### 8. Repository Picker Modal (src/ui/RepositoryPickerModal.ts)

**Responsibilities:**
- Display repositories with uncommitted changes
- Handle keyboard navigation
- Allow user selection
- Invoke callback on selection

**Key Features:**
- Arrow key navigation
- Enter to select
- Escape to cancel
- Visual selection highlighting
- Change count display

**UI Structure:**
```
┌─────────────────────────────────┐
│      Select Repository          │
├─────────────────────────────────┤
│ ▶ my-project                    │
│   Branch: main                  │
│   3 changes                     │
├─────────────────────────────────┤
│   other-repo                    │
│   Branch: develop               │
│   1 change                      │
└─────────────────────────────────┘
```

### 9. Status Panel View (src/ui/StatusPanelView.ts)

**Responsibilities:**
- Display repository status in dedicated sidebar panel
- Real-time status updates every 30 seconds
- Show uncommitted changes, unpushed commits, remote changes
- Provide manual refresh capability
- Integrate with fetch completion events

**Key Methods:**
```typescript
class StatusPanelView extends ItemView {
    async onOpen(): Promise<void>
    async onClose(): Promise<void>
    async refreshAll(): Promise<void>
    async refreshRepository(repoId: string): Promise<void>
    private renderStatuses(): void
    private renderRepositoryStatus(status: RepositoryStatus): HTMLElement
    private startPolling(): void
    private stopPolling(): void
}
```

**Status Display:**
- Repository name and current branch
- Visual indicators for status:
  - 🔴 Red dot - Uncommitted changes
  - ⬆️ Arrow up - Unpushed commits
  - ⬇️ Arrow down - Remote changes available
  - ✅ Green check - Clean and up-to-date
  - ❌ Red X - Error fetching status
- Last refresh timestamp in header
- Manual refresh button

**Panel Behavior:**
- Opens in right sidebar by default
- Registered as Obsidian ItemView
- Polling starts on open, stops on close
- Updates automatically after fetch/commit/push operations
- Debounces rapid refresh requests

**UI Structure:**
```
┌─────────────────────────────────┐
│ Multi-Git Status      [Refresh] │
│ Last updated: 2m ago            │
├─────────────────────────────────┤
│ my-project              🔴 ⬆️   │
│ main • 3 uncommitted            │
│ 2 unpushed commits              │
├─────────────────────────────────┤
│ other-repo              ⬇️       │
│ develop • clean                 │
│ 1 remote change available       │
├─────────────────────────────────┤
│ third-repo              ✅       │
│ main • up to date               │
└─────────────────────────────────┘
```

### 10. Commit Message Modal (src/ui/CommitMessageModal.ts)

**Responsibilities:**
- Display repository and file information
- Show commit message suggestions
- Allow message editing
- Execute commit and push operation
- Handle errors with retry capability

**Key Features:**
- Pre-filled suggested message
- File list display (max 10, then "and N more...")
- Multiline message support (Shift+Enter)
- Loading state during operation
- Error display in modal

**UI Structure:**
```
┌─────────────────────────────────┐
│    Commit and Push              │
│    my-project on main           │
├─────────────────────────────────┤
│ Changed files:                  │
│ • README.md                     │
│ • src/main.ts                   │
│ • styles.css                    │
├─────────────────────────────────┤
│ Commit message:                 │
│ ┌─────────────────────────────┐ │
│ │ Update 3 files              │ │
│ │                             │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│           [Cancel] [Commit & Push]│
└─────────────────────────────────┘
```

### 11. Validation Utilities (src/utils/validation.ts)

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

### 12. Error Classes (src/utils/errors.ts)

**Hierarchy:**
```
RepositoryConfigError (base)
    ├── ValidationError
    └── DuplicateError

GitRepositoryError (base)
    ├── FetchError
    ├── GitStatusError
    ├── GitCommitError
    └── GitPushError
```

**Error Codes:**
- `INVALID_PATH` - Path validation failed
- `PATH_NOT_FOUND` - Directory doesn't exist
- `NOT_GIT_REPOSITORY` - Not a git repository
- `DUPLICATE_PATH` - Path already configured
- `SECURITY_ERROR` - Security violation detected
- `AUTH_ERROR` - Authentication failure
- `NETWORK_ERROR` - Network connectivity issue
- `TIMEOUT` - Operation timeout

### 13. Error Classification Service (src/services/ErrorClassificationService.ts)

**Responsibilities:**
- Classify git errors by scenario and severity
- Pattern matching for common error types
- Generate suggested actions for errors
- Support error recovery workflows

**Key Methods:**
```typescript
class ErrorClassificationService {
    classifyError(error: string, command: string, repoName: string): ClassifiedError
    private isAuthenticationFailure(error: string): boolean
    private isMergeConflict(error: string): boolean
    private isNetworkError(error: string): boolean
    private isPermissionDenied(error: string): boolean
    private getSuggestedActions(scenario: ErrorScenario): string[]
}
```

**Error Scenarios:**
- `AUTHENTICATION_FAILURE` - SSH/HTTPS credential issues
- `MERGE_CONFLICT` - Conflicted files requiring resolution
- `NETWORK_ERROR` - Connectivity and timeout issues
- `PERMISSION_DENIED` - File system permission problems
- `REPOSITORY_NOT_FOUND` - Invalid or missing repository
- `UNKNOWN` - Unclassified errors

**Pattern Matching:**
- Uses regex patterns to detect error types
- Multiple patterns per scenario for reliability
- Case-insensitive matching where appropriate
- Logs unmatched patterns for future refinement

### 14. Error Presentation Service (src/services/ErrorPresentationService.ts)

**Responsibilities:**
- Route errors to appropriate presentation method
- Show modal dialogs for critical errors
- Display notifications for minor errors
- Update status panel for inline errors
- Prevent duplicate modal displays

**Key Methods:**
```typescript
class ErrorPresentationService {
    presentError(classifiedError: ClassifiedError): void
    private showCriticalErrorModal(error: ClassifiedError): void
    private showMinorErrorNotification(error: ClassifiedError): void
    private updateStatusPanelError(error: ClassifiedError): void
}
```

**Presentation Strategy:**
- **CRITICAL severity** → Modal dialog (blocks user interaction)
- **MINOR severity** → Notification (non-blocking)
- **WARNING severity** → Inline in status panel

**Modal Selection:**
- `AUTHENTICATION_FAILURE` → `AuthFailureModal` (setup instructions)
- `MERGE_CONFLICT` → `MergeConflictModal` (resolution guidance)
- Other critical errors → `CriticalErrorModal` (generic error display)

### 15. Critical Error Modal (src/ui/CriticalErrorModal.ts)

**Responsibilities:**
- Base class for error modal dialogs
- Standard modal layout and styling
- Collapsible technical details
- Suggested actions display
- Acknowledgment handling

**Key Features:**
- Repository name always displayed
- Clear error message
- Collapsible technical details section
- Bulleted list of suggested actions
- Consistent styling across modals

### 16. Authentication Failure Modal (src/ui/AuthFailureModal.ts)

**Responsibilities:**
- Display authentication error details
- Provide SSH key setup instructions
- Provide HTTPS credential instructions
- Platform-specific guidance
- Links to git documentation

**Key Features:**
- Step-by-step SSH key generation guide
- Credential helper configuration
- GitHub/GitLab personal access token guidance
- Cross-platform instructions (macOS, Windows, Linux)
- External documentation links

### 17. Merge Conflict Modal (src/ui/MergeConflictModal.ts)

**Responsibilities:**
- Display conflicted files list
- Explain conflict markers
- Provide resolution instructions
- Open repository in file explorer
- Track resolution status

**Key Features:**
- Lists all conflicted files
- Visual explanation of `<<<<<<<`, `=======`, `>>>>>>>` markers
- Step-by-step resolution guide
- "Open in File Explorer" button (cross-platform)
- "I've Resolved the Conflicts" confirmation

### 18. Logger Utility (src/utils/logger.ts)

**Responsibilities:**
- Centralized logging
- Debug mode control
- Timestamp formatting
- Component identification

**Log Levels:**
- Debug: Detailed operational information
- Error: Error conditions
- Timing: Performance metrics
- Git Command: Git command execution traces

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

### Commit and Push Workflow

```
User triggers hotkey
    ↓
Main plugin command callback
    ↓
Get all enabled repositories
    ↓
For each repository:
    GitCommandService.getRepositoryStatus()
    ↓
Filter repositories with uncommitted changes
    ↓
If no changes:
    Show Notice "No uncommitted changes"
    Exit
    ↓
If single repository with changes:
    Skip picker, go directly to commit
    ↓
If multiple repositories with changes:
    RepositoryPickerModal opens
    User selects repository (keyboard/mouse)
    ↓
CommitMessageService.generateSuggestion()
    Analyzes staged/unstaged/untracked files
    Applies suggestion rules
    Returns suggested message
    ↓
CommitMessageModal opens
    Display repo name, branch, files
    Pre-fill textarea with suggestion
    User can edit message
    User confirms or cancels
    ↓
If confirmed:
    GitCommandService.commitAndPush()
        ├→ stageAllChanges() (git add -A)
        ├→ createCommit() (git commit -m)
        └→ pushToRemote() (git push)
    ↓
If success:
    Show success Notice
    Close modal
    ↓
If error:
    Display error in modal
    Keep modal open for retry
    User can cancel or fix issue
```

### Automated Fetch Workflow

```
Plugin loads
    ↓
FetchSchedulerService.start()
    ↓
Set up interval timer (default 5 min)
    ↓
On interval trigger:
    Get all enabled repositories
    ↓
For each repository:
    GitCommandService.fetchRepository()
        Execute: git fetch --all --tags --prune
        ↓
    If fetch succeeds:
        GitCommandService.checkRemoteChanges()
            Compare local vs remote branches
            Count commits behind
        ↓
        If commits behind > 0:
            Update repository status
            NotificationService.notifyRemoteChanges()
                Check cooldown
                Show Obsidian Notice
        ↓
    If fetch fails:
        Categorize error (auth, network, timeout)
        NotificationService.notifyFetchError()
        Update repository error status
    ↓
Update last fetch timestamps
Persist status to settings
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

## Command Registration

The plugin registers commands that appear in Obsidian's command palette and can be bound to hotkeys:

**Registered Commands:**
```typescript
// In main.ts onload()
this.addCommand({
    id: 'multi-git:commit-push',
    name: 'Commit and push changes',
    callback: async () => {
        // Commit and push workflow
    }
});
```

**Command Flow:**
1. User triggers via hotkey or command palette
2. Command callback executes
3. Workflow handles repository selection
4. User confirms action in modal
5. Operation executes with feedback

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
    const output = await this.executeGitCommand(
        'branch --show-current',
        { cwd: path }
    );
    return output.stdout.trim();
}
```

2. **Update validation if needed:**
```typescript
private validateCommand(command: string): void {
    // Add 'branch' to validSubcommands if not present
}
```

3. **Add tests:**
```typescript
it('should get current branch name', async () => {
    const branch = await service.getBranchName('/path/to/repo');
    expect(branch).toBe('main');
});
```

### Adding New Commands

1. **Register command in main.ts:**
```typescript
this.addCommand({
    id: 'multi-git:your-command',
    name: 'Your Command Name',
    callback: async () => {
        // Command logic
    }
});
```

2. **Implement workflow:**
   - Get necessary data from services
   - Show modal if user input needed
   - Execute operations
   - Provide feedback via Notice

3. **Add hotkey support:**
   - User configures in Obsidian settings
   - No code needed beyond registration

### Adding New Modal Dialogs

1. **Create modal class:**
```typescript
export class YourModal extends Modal {
    constructor(
        app: App,
        data: YourData,
        callback: (result: YourResult) => void
    ) {
        super(app);
        // Store parameters
    }
    
    onOpen(): void {
        // Render UI
    }
    
    onClose(): void {
        // Cleanup
    }
}
```

2. **Add styles to styles.css:**
```css
.your-modal {
    /* Modal styles */
}
```

3. **Use in command:**
```typescript
new YourModal(this.app, data, (result) => {
    // Handle result
}).open();
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

5. **Pull Operations:**
   - Interactive pull with conflict resolution
   - Merge strategy selection
   - Stash management

6. **Status Panel:**
   - Dedicated sidebar for repository status
   - Real-time updates
   - Quick actions

7. **Branch Management:**
   - Switch branches via UI
   - Create/delete branches
   - Branch comparison

### Migration Path

1. Maintain backward compatibility
2. Version configuration schema
3. Provide migration utilities
4. Document breaking changes

---

For implementation details, see source code and inline documentation.
For contribution guidelines, see [contributing.md](contributing.md).
