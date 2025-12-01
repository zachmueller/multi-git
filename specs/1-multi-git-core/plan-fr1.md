# Implementation Plan: Repository Configuration (FR-1)

**Created:** 2025-01-12
**Completed:** 2025-01-12
**Specification:** [spec.md](./spec.md)
**Status:** ✅ Complete - Released as v0.1.0
**Feature:** Multi-Git Core for Obsidian
**Requirement:** FR-1: Repository Configuration
**Tasks:** [completed/fr1/tasks.md](./completed/fr1/tasks.md)
**Validation:** [completed/fr1/validation-report.md](./completed/fr1/validation-report.md)
**Testing:** [completed/fr1/manual-testing-checklist.md](./completed/fr1/manual-testing-checklist.md)

## Technical Context

### Architecture Decisions

#### Core Technology Stack
- **Plugin Framework:** TypeScript with Obsidian Plugin API v1.0.0+
  - **Rationale:** Obsidian plugins must use TypeScript and the official API; this is non-negotiable for Obsidian ecosystem
  - **Alternatives Considered:** None - this is mandated by platform
  - **Trade-offs:** Pro: Type safety, excellent IDE support, large ecosystem. Con: Build step required, TypeScript learning curve

- **Git Integration:** Node.js `child_process` for git CLI commands
  - **Rationale:** Most reliable cross-platform approach; works with user's existing git installation and configuration
  - **Alternatives Considered:** 
    - `isomorphic-git`: Pure JS git implementation, but limited feature set and doesn't respect system git config
    - `simple-git`: Wrapper library, but adds dependency and abstraction layer we don't need
  - **Trade-offs:** Pro: Uses system git with user's credentials, full git feature set, minimal dependencies. Con: Requires git installed on system, need to handle command output parsing

- **Data Storage:** Obsidian's native data.json settings persistence
  - **Rationale:** Built-in, automatic, follows Obsidian conventions
  - **Alternatives Considered:** 
    - Custom JSON file: More control but needs manual read/write logic
    - LocalStorage: Not appropriate for plugin settings in Obsidian context
  - **Trade-offs:** Pro: Automatic persistence, type-safe access, standard pattern. Con: All settings in single object, limited to JSON-serializable data

#### Development Environment
- **Build Tool:** esbuild (standard for Obsidian plugins)
- **Testing Framework:** Jest for unit tests
- **Linting:** ESLint with TypeScript plugin
- **Type Checking:** TypeScript strict mode

### Technology Stack Rationale

#### Why Obsidian Plugin API + TypeScript?
- **Requirement:** Plugin must integrate with Obsidian's UI and lifecycle
- **Benefit:** Type-safe API access, excellent documentation, hot reload during development
- **Constraint:** Must follow Obsidian's plugin architecture patterns

#### Why child_process for Git?
- **Requirement:** Must work with user's existing git installation and credentials
- **Benefit:** Full compatibility with SSH keys, credential managers, git config
- **Constraint:** Requires git installed on user's system (acceptable trade-off)

#### Why Absolute Paths?
- **Requirement:** Spec explicitly requires absolute paths for device-specific configs
- **Benefit:** Supports symlink-based workflows where repo locations vary per device
- **Constraint:** Users must specify full paths (UI can provide file browser)

### Integration Points

#### Obsidian Plugin API Integration
- **Plugin lifecycle:** `onload()` and `onunload()` hooks for initialization and cleanup
- **Settings tab:** Custom settings panel following Obsidian patterns
- **Data persistence:** Automatic save/load through `loadData()` and `saveData()`

#### File System Integration
- **Path validation:** Node.js `fs` module for checking directory existence
- **Git detection:** Execute `git rev-parse --git-dir` to verify valid repository

#### Security Considerations
- **Path traversal:** Validate absolute paths, reject relative paths and path traversal attempts
- **Command injection:** Sanitize all paths before passing to shell commands
- **Credential handling:** Rely on system git configuration; never store credentials

## Constitution Check

### Principle Compliance Review

#### Principle 1: Specification-First Development
- **Requirement:** All features must begin with clear specification before implementation
- **Plan Alignment:** This plan implements FR-1 from approved specification
- **Validation:** Spec exists at `specs/1-multi-git-core/spec.md` with complete acceptance criteria

#### Principle 2: Iterative Simplicity
- **Requirement:** Start with minimal viable implementation
- **Plan Alignment:** 
  - Focuses solely on FR-1 (repository configuration)
  - Minimal UI: settings tab with list, add/remove buttons
  - No advanced features like batch operations or custom validation rules
  - Simple data model: array of repository configs in settings
- **Validation:** Implementation includes only features explicitly required by FR-1 acceptance criteria

#### Principle 3: Documentation as Context
- **Requirement:** Code and decisions documented for future work and AI assistance
- **Plan Alignment:**
  - This plan documents all technical decisions with rationale
  - Code will include TSDoc comments for all public interfaces
  - Data model documented in this plan
  - Architecture decisions recorded with alternatives considered
- **Validation:** Plan follows template with complete decision documentation

### Quality Gates
- [x] All constitutional MUST requirements addressed
- [x] Non-negotiable principles not violated
- [x] Quality standards and practices followed
- [x] Compliance requirements satisfied

**Gate Evaluation:** PASS

## Phase 0: Research & Architecture

### Technology Research Tasks

No additional research required for FR-1. All technology decisions are straightforward:

1. **Obsidian Plugin Development:** Standard TypeScript + Obsidian API
   - Well-documented at https://docs.obsidian.md/Plugins/Getting+started
   - Existing plugin template available
   - Clear best practices established

2. **Git CLI Integration:** Standard Node.js child_process patterns
   - Documented in Node.js docs
   - Common pattern in existing tools

3. **Path Handling:** Node.js path and fs modules
   - Standard library, well-documented
   - Cross-platform support built-in

### Architecture Investigation

No complex architecture decisions needed for FR-1. This is a straightforward CRUD feature:
- Settings tab for UI
- Service class for git operations
- Data model for configuration
- Validation functions for paths

### Research Deliverables

✅ No research.md needed - all decisions are clear from requirements and platform constraints.

## Phase 1: Design & Contracts

### Data Model Design

#### Entity: Repository Configuration

```typescript
interface RepositoryConfig {
  // Unique identifier for the repository
  id: string;  // UUID v4
  
  // Absolute file system path to the repository
  path: string;  // Must be absolute, validated on add/edit
  
  // User-friendly display name (defaults to directory name)
  name: string;
  
  // Whether this repository is actively managed
  enabled: boolean;  // Default: true
  
  // Timestamp of when this config was created
  createdAt: number;  // Unix timestamp in milliseconds
  
  // Timestamp of last successful validation
  lastValidated?: number;  // Unix timestamp in milliseconds, optional
}

interface MultiGitSettings {
  // Array of configured repositories
  repositories: RepositoryConfig[];
  
  // Plugin version for migration tracking
  version: string;  // Semantic version
}
```

**Entity Relationships:**
- Settings → Repositories: One-to-Many (settings contains array of configs)
- No complex relationships needed for FR-1

**Validation Rules:**
1. **Path Validation:**
   - Must be absolute path (starts with `/` on Unix, drive letter on Windows)
   - Directory must exist at specified path
   - Directory must be a valid git repository (contains `.git/` or is bare repo)
   - No duplicate paths allowed

2. **Name Validation:**
   - Must be non-empty string
   - Trimmed of whitespace
   - Defaults to last path component if not provided

3. **ID Validation:**
   - Must be unique within settings
   - Generated on creation, immutable

**State Transitions:**
```
[New] → Add → [Enabled] (default)
[Enabled] ⟷ Toggle ⟷ [Disabled]
[Any State] → Remove → [Deleted]
```

**Business Rules:**
- Removing a repository only removes configuration; does not affect repository on disk
- Disabling a repository keeps configuration but excludes from automated operations
- Path changes require re-validation
- Cannot add same path twice (duplicate prevention)

### API Contract Generation

#### Internal Service API

```typescript
/**
 * Service for managing repository configurations
 */
class RepositoryConfigService {
  /**
   * Add a new repository to management
   * @param path - Absolute path to git repository
   * @param name - Optional display name (defaults to directory name)
   * @returns Repository configuration if successful
   * @throws ValidationError if path is invalid or not a git repository
   * @throws DuplicateError if path already configured
   */
  async addRepository(path: string, name?: string): Promise<RepositoryConfig>;
  
  /**
   * Remove a repository from management
   * @param id - Repository identifier
   * @returns true if removed, false if not found
   */
  async removeRepository(id: string): Promise<boolean>;
  
  /**
   * Toggle repository enabled state
   * @param id - Repository identifier
   * @returns new enabled state, or null if not found
   */
  async toggleRepository(id: string): Promise<boolean | null>;
  
  /**
   * Get all configured repositories
   * @returns Array of repository configurations
   */
  getRepositories(): RepositoryConfig[];
  
  /**
   * Get single repository by ID
   * @param id - Repository identifier
   * @returns Repository config or null if not found
   */
  getRepository(id: string): RepositoryConfig | null;
  
  /**
   * Validate that a path is a valid git repository
   * @param path - Absolute path to validate
   * @returns true if valid git repository
   * @throws ValidationError if invalid
   */
  async validateRepositoryPath(path: string): Promise<boolean>;
}
```

#### Git Validation API

```typescript
/**
 * Low-level git operations wrapper
 */
class GitCommandService {
  /**
   * Check if directory is a git repository
   * @param path - Absolute path to check
   * @returns true if valid git repository, false otherwise
   */
  async isGitRepository(path: string): Promise<boolean>;
  
  /**
   * Get repository root directory
   * @param path - Path within repository
   * @returns Absolute path to repository root
   * @throws Error if not a git repository
   */
  async getRepositoryRoot(path: string): Promise<string>;
}
```

#### Settings UI API

```typescript
/**
 * Settings tab for plugin configuration
 */
class MultiGitSettingTab extends PluginSettingTab {
  /**
   * Display settings UI
   */
  display(): void;
  
  /**
   * Show file picker dialog for repository path
   * @returns Selected path or null if cancelled
   */
  private async pickRepositoryPath(): Promise<string | null>;
  
  /**
   * Render repository list item
   * @param config - Repository configuration
   * @param container - Parent element
   */
  private renderRepositoryItem(
    config: RepositoryConfig,
    container: HTMLElement
  ): void;
}
```

#### Error Handling

```typescript
/**
 * Base error for repository configuration operations
 */
class RepositoryConfigError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'RepositoryConfigError';
  }
}

/**
 * Thrown when path validation fails
 */
class ValidationError extends RepositoryConfigError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * Thrown when attempting to add duplicate repository
 */
class DuplicateError extends RepositoryConfigError {
  constructor(path: string) {
    super(`Repository already configured: ${path}`, 'DUPLICATE_ERROR');
  }
}
```

**Error Response Patterns:**
- Validation errors: Display inline in settings UI with red text
- Duplicate errors: Display modal with option to navigate to existing config
- Git command failures: Display error notice with git output for debugging

### Development Environment Setup

#### Prerequisites
- Node.js 18+ (for development)
- Git 2.20.0+ (required for plugin functionality)
- Obsidian 1.0.0+ (for testing)

#### Project Structure
```
multi-git/
├── src/
│   ├── main.ts              # Plugin entry point
│   ├── settings/
│   │   ├── SettingTab.ts    # Settings UI
│   │   └── data.ts          # Data model interfaces
│   ├── services/
│   │   ├── RepositoryConfigService.ts
│   │   └── GitCommandService.ts
│   └── utils/
│       ├── validation.ts     # Path and git validation
│       └── errors.ts         # Error classes
├── test/
│   └── services/
│       ├── RepositoryConfigService.test.ts
│       └── GitCommandService.test.ts
├── manifest.json            # Plugin manifest
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── README.md
```

#### Build Configuration

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit && node esbuild.config.mjs production",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  }
}
```

**Development workflow:**
1. `npm run dev` - Start development build with watch mode
2. Symlink built plugin to Obsidian vault for testing
3. Enable plugin in Obsidian settings
4. Hot reload on code changes

See `quickstart.md` for complete setup instructions.

## Implementation Readiness Validation

### Technical Completeness Check
- [x] All technology choices made and documented
- [x] Data model covers all functional requirements
- [x] API contracts support all user scenarios
- [x] Security requirements addressed (path validation, command injection prevention)
- [x] Performance considerations documented (sync operations acceptable for settings)
- [x] Integration points defined (Obsidian API, Node.js, git CLI)
- [x] Development environment specified

### Quality Validation
- [x] Architecture supports scalability requirements (simple array-based storage suitable for expected use case)
- [x] Security model matches threat analysis (path validation, no credential storage)
- [x] Data model supports all business rules (enable/disable, duplicate prevention, validation)
- [x] API design follows established patterns (Obsidian plugin conventions, async/await)
- [x] Documentation covers all major decisions

### Constitution Alignment Re-check
- [x] All principles still satisfied
- [x] No new violations introduced
- [x] Quality gates still passing
- [x] Compliance requirements met

**Final Validation:** ✅ PASS - Ready for task breakdown

## Implementation Phases

### Phase 1: Core Data Structures (Foundation)

**Goal:** Establish data model and basic plugin structure

**Tasks:**
1. **Setup plugin scaffold**
   - Create `main.ts` with plugin class extending `Plugin`
   - Implement `onload()` and `onunload()` lifecycle hooks
   - Setup settings load/save in `onload()`

2. **Define data model**
   - Create `settings/data.ts` with interfaces
   - Define `RepositoryConfig` interface
   - Define `MultiGitSettings` interface with defaults

3. **Initialize settings persistence**
   - Implement `loadSettings()` method
   - Implement `saveSettings()` method
   - Add settings migration logic for version updates

**Acceptance:**
- Plugin loads in Obsidian without errors
- Settings persist across Obsidian restarts
- Data structure follows TypeScript interfaces

### Phase 2: Git Validation Service

**Goal:** Implement git repository detection and validation

**Tasks:**
1. **Create GitCommandService**
   - Implement `isGitRepository()` using `git rev-parse --git-dir`
   - Implement `getRepositoryRoot()` for path normalization
   - Handle cross-platform path differences
   - Add error handling for command failures

2. **Path validation utilities**
   - Create `validateAbsolutePath()` function
   - Implement `isDirectory()` check
   - Add platform-specific path validation (Unix vs Windows)

3. **Unit tests**
   - Test git repository detection
   - Test path validation logic
   - Test error handling for invalid paths

**Acceptance:**
- Can detect valid git repositories
- Rejects non-git directories
- Handles invalid paths gracefully
- All tests passing

### Phase 3: Repository Configuration Service

**Goal:** Implement repository management operations

**Tasks:**
1. **Create RepositoryConfigService**
   - Implement `addRepository()` with validation
   - Implement `removeRepository()` with confirmation
   - Implement `toggleRepository()` for enable/disable
   - Implement `getRepositories()` and `getRepository()`

2. **Validation logic**
   - Add duplicate path detection
   - Implement ID generation (UUID v4)
   - Add path normalization
   - Set default name from path

3. **Error handling**
   - Define error classes
   - Add user-friendly error messages
   - Handle edge cases (missing directories, permission errors)

4. **Unit tests**
   - Test add/remove/toggle operations
   - Test validation logic
   - Test error scenarios

**Acceptance:**
- Can add repositories with validation
- Can remove repositories
- Can toggle enabled state
- Prevents duplicate paths
- All tests passing

### Phase 4: Settings UI

**Goal:** Create user interface for repository configuration

**Tasks:**
1. **Create MultiGitSettingTab**
   - Extend Obsidian's `PluginSettingTab`
   - Implement `display()` method
   - Add plugin description header

2. **Repository list UI**
   - Render list of configured repositories
   - Show path, name, enabled state
   - Add remove button per repository
   - Add toggle button per repository

3. **Add repository UI**
   - Add "Add Repository" button
   - Create path input with file picker
   - Add name input (optional)
   - Show validation errors inline

4. **Polish and UX**
   - Add empty state message
   - Show repository count
   - Add confirmation for remove action
   - Display loading states during validation

**Acceptance:**
- Settings tab visible in plugin settings
- Can add repositories through UI
- Can remove repositories with confirmation
- Can toggle repositories
- Validation errors displayed clearly
- UI follows Obsidian design patterns

### Phase 5: Integration and Testing

**Goal:** Complete end-to-end testing and polish

**Tasks:**
1. **Integration testing**
   - Test full add/remove workflow
   - Test persistence across Obsidian restarts
   - Test with multiple repositories
   - Test error scenarios in real Obsidian environment

2. **Cross-platform testing**
   - Test on macOS
   - Test on Windows
   - Test on Linux
   - Verify path handling on each platform

3. **Edge case testing**
   - Test with very long paths
   - Test with special characters in paths
   - Test with network paths (if applicable)
   - Test with symbolic links

4. **Documentation**
   - Write user-facing README section for FR-1
   - Document configuration format
   - Add troubleshooting guide

**Acceptance:**
- All FR-1 acceptance criteria met
- Works across all platforms
- Edge cases handled gracefully
- Documentation complete

## Risk Assessment

### Technical Risks

#### High Risk: Git Not Installed
- **Impact:** Plugin cannot function without git CLI
- **Likelihood:** Low (target users are developers/tech-savvy)
- **Mitigation:** 
  - Check for git on plugin load
  - Display clear error message with installation instructions
  - Disable plugin features gracefully if git missing
- **Contingency:** Provide fallback instructions in error message

#### Medium Risk: Path Permission Issues
- **Impact:** Cannot validate or access repository directories
- **Likelihood:** Medium (varies by system configuration)
- **Mitigation:**
  - Check directory permissions during validation
  - Provide clear error messages about permission issues
  - Test on various permission scenarios
- **Contingency:** Document required permissions in error messages

#### Medium Risk: Cross-Platform Path Handling
- **Impact:** Path validation fails on some platforms
- **Likelihood:** Medium (Windows vs Unix differences)
- **Mitigation:**
  - Use Node.js `path` module for normalization
  - Test on all platforms early
  - Handle drive letters correctly on Windows
- **Contingency:** Platform-specific validation logic if needed

#### Low Risk: Settings Corruption
- **Impact:** User loses repository configuration
- **Likelihood:** Low (Obsidian handles persistence)
- **Mitigation:**
  - Validate settings structure on load
  - Provide defaults for missing fields
  - Add version-based migration logic
- **Contingency:** Settings reset with clear notification

### Dependencies and Assumptions

#### External Dependencies
- **Git CLI:** Must be installed and accessible in PATH
- **Node.js:** Built-in with Obsidian (electron-based)
- **Obsidian API:** Requires v1.0.0+

#### Technical Assumptions
- Users have git 2.20.0+ installed
- Repositories are standard git repositories (not exotic setups)
- File system is accessible and permissions are reasonable
- Obsidian vault has write permissions for settings

#### Business Assumptions
- Users understand basic git concepts
- Users know where their repositories are located
- Absolute paths are acceptable requirement
- ~10 repositories is typical use case

## Next Phase Preparation

### Task Breakdown Readiness
- [x] Clear technology choices and architecture
- [x] Complete data model and API specifications
- [x] Development environment and tooling defined
- [x] Quality standards and testing approach specified
- [x] Integration requirements and dependencies clear

### Implementation Prerequisites

#### Development Environment
- [x] Node.js 18+ required
- [x] TypeScript compiler and tooling
- [x] Obsidian plugin development environment
- [x] Git 2.20.0+ for testing

#### Technical Architecture
- [x] Plugin structure defined
- [x] Service layer architecture clear
- [x] Data model complete
- [x] API contracts documented

#### Quality Assurance
- [x] Unit testing framework (Jest)
- [x] Integration testing approach
- [x] Cross-platform testing plan
- [x] Error handling patterns

#### Documentation
- [x] Technical decisions documented
- [x] API contracts specified
- [x] User-facing documentation planned

### Ready for Implementation
✅ All prerequisites met. Ready to break down into specific implementation tasks.

---

**Next Steps:** 
1. Break down phases into specific tasks with time estimates
2. Setup development environment using quickstart guide
3. Begin Phase 1 implementation
4. Use TDD approach: write tests first, then implementation
