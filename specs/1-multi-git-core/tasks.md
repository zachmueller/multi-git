# Task Breakdown: Repository Configuration (FR-1)

**Created:** 2025-01-12
**Implementation Plan:** [plan-fr1.md](./plan-fr1.md)
**Specification:** [spec.md](./spec.md)
**Status:** Planning

## Task Summary

**Total Tasks:** 31
**Phases:** 6 (Setup → Foundation → Core → Integration → Quality → Polish)
**Estimated Complexity:** Medium
**Parallel Execution Opportunities:** 8 task groups

## Phase 0: Setup & Environment

### ENV-001: Initialize Plugin Project
**Description:** Create Obsidian plugin project structure with TypeScript configuration and build tooling
**Files:** `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `manifest.json`, `.gitignore`
**Dependencies:** None
**Acceptance Criteria:**
- [ ] Package.json configured with required dependencies (Obsidian API, TypeScript, esbuild, Jest)
- [ ] TypeScript strict mode enabled in tsconfig.json
- [ ] Esbuild configuration for development and production builds
- [ ] Plugin manifest with correct metadata (name, version, minAppVersion)
- [ ] Git repository initialized with appropriate .gitignore

**Commands:**
```bash
npm init -y
npm install --save-dev obsidian typescript esbuild @types/node
npm install --save-dev jest @types/jest ts-jest eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### ENV-002: Create Project Structure
**Description:** Set up directory structure and basic plugin entry point
**Files:** `src/main.ts`, `src/settings/`, `src/services/`, `src/utils/`, `test/`
**Dependencies:** ENV-001
**Acceptance Criteria:**
- [ ] Directory structure matches plan.md specification
- [ ] Main plugin class created extending Obsidian's Plugin
- [ ] Empty onload() and onunload() methods implemented
- [ ] Build system can compile TypeScript to JavaScript
- [ ] Development mode with hot reload functional

**Commands:**
```bash
mkdir -p src/{settings,services,utils} test/services
touch src/main.ts
npm run dev
```

### ENV-003 [P]: Configure Development Environment
**Description:** Set up linting, formatting, and testing infrastructure
**Files:** `.eslintrc.json`, `jest.config.js`, `.vscode/settings.json`
**Dependencies:** ENV-001
**Acceptance Criteria:**
- [ ] ESLint configured with TypeScript plugin
- [ ] Jest configured for TypeScript with ts-jest
- [ ] VSCode settings for auto-format on save
- [ ] Linting and type checking pass on empty project
- [ ] Test runner functional with sample test

**Commands:**
```bash
npx eslint --init
npm run lint
npm run test
npm run type-check
```

## Phase 1: Foundation & Data Model

### ARCH-001: Define Data Model Interfaces
**Description:** Create TypeScript interfaces for repository configuration and plugin settings
**Files:** `src/settings/data.ts`
**Dependencies:** ENV-002
**Acceptance Criteria:**
- [ ] RepositoryConfig interface matches plan.md specification
- [ ] MultiGitSettings interface with repositories array
- [ ] Default settings constant defined
- [ ] Version field for migration tracking
- [ ] All fields properly typed with TSDoc comments

**Code Structure:**
```typescript
interface RepositoryConfig {
  id: string;
  path: string;
  name: string;
  enabled: boolean;
  createdAt: number;
  lastValidated?: number;
}

interface MultiGitSettings {
  repositories: RepositoryConfig[];
  version: string;
}
```

### ARCH-002: Implement Plugin Lifecycle
**Description:** Set up plugin initialization, settings loading, and cleanup
**Files:** `src/main.ts`
**Dependencies:** ARCH-001
**Acceptance Criteria:**
- [ ] Plugin class properly extends Obsidian Plugin
- [ ] onload() initializes settings and services
- [ ] onunload() performs cleanup
- [ ] loadSettings() reads from data.json
- [ ] saveSettings() persists to data.json
- [ ] Plugin loads without errors in Obsidian

**Commands:**
```bash
npm run build
# Symlink to Obsidian vault for testing
ln -s $(pwd) ~/.obsidian/plugins/multi-git
```

### DATA-001 [P]: Create Validation Utilities
**Description:** Implement path validation and git repository detection utilities
**Files:** `src/utils/validation.ts`
**Dependencies:** ARCH-001
**Acceptance Criteria:**
- [ ] validateAbsolutePath() checks for absolute paths
- [ ] isDirectory() verifies directory existence
- [ ] Platform-specific validation (Unix/Windows paths)
- [ ] Path normalization function
- [ ] Secure against path traversal attacks
- [ ] All validation functions have unit tests

### DATA-002 [P]: Define Error Classes
**Description:** Create custom error types for repository operations
**Files:** `src/utils/errors.ts`
**Dependencies:** None
**Acceptance Criteria:**
- [ ] RepositoryConfigError base class
- [ ] ValidationError for path/git validation failures
- [ ] DuplicateError for duplicate path detection
- [ ] Error codes for programmatic handling
- [ ] User-friendly error messages
- [ ] TSDoc documentation for each error type

## Phase 2: Git Integration Layer

### GIT-001: Implement Git Command Service
**Description:** Create service for executing git CLI commands
**Files:** `src/services/GitCommandService.ts`
**Dependencies:** DATA-001, DATA-002
**Acceptance Criteria:**
- [ ] isGitRepository() validates git directories using `git rev-parse --git-dir`
- [ ] getRepositoryRoot() returns absolute path to repo root
- [ ] Command execution uses Node.js child_process
- [ ] Proper error handling for command failures
- [ ] Cross-platform path handling
- [ ] Security: command injection prevention

**Example Implementation:**
```typescript
class GitCommandService {
  async isGitRepository(path: string): Promise<boolean> {
    // Execute: git -C <path> rev-parse --git-dir
    // Return: true if exit code 0, false otherwise
  }
  
  async getRepositoryRoot(path: string): Promise<string> {
    // Execute: git -C <path> rev-parse --show-toplevel
    // Return: absolute path to repository root
  }
}
```

### GIT-002 [P]: Unit Tests for Git Service
**Description:** Create comprehensive tests for git command execution
**Files:** `test/services/GitCommandService.test.ts`
**Dependencies:** GIT-001
**Acceptance Criteria:**
- [ ] Test isGitRepository() with valid repository
- [ ] Test isGitRepository() with non-repository
- [ ] Test getRepositoryRoot() returns correct path
- [ ] Test error handling for invalid paths
- [ ] Test cross-platform behavior
- [ ] All tests passing with 100% coverage

**Commands:**
```bash
npm run test -- GitCommandService.test.ts
```

## Phase 3: Repository Configuration Service

### REPO-001: Create Repository Config Service Structure
**Description:** Set up repository configuration management service skeleton
**Files:** `src/services/RepositoryConfigService.ts`
**Dependencies:** ARCH-001, GIT-001
**Acceptance Criteria:**
- [ ] Class structure with constructor accepting plugin instance
- [ ] Private settings reference
- [ ] Method stubs for all CRUD operations
- [ ] UUID generation utility for repository IDs
- [ ] Service accessible from main plugin class

### REPO-002: Implement Add Repository
**Description:** Implement repository addition with validation
**Files:** `src/services/RepositoryConfigService.ts`
**Dependencies:** REPO-001, DATA-001
**Acceptance Criteria:**
- [ ] addRepository() validates path is absolute
- [ ] Verifies directory exists at path
- [ ] Confirms path is valid git repository
- [ ] Prevents duplicate paths
- [ ] Generates unique ID (UUID v4)
- [ ] Sets default name from directory name if not provided
- [ ] Saves settings after adding
- [ ] Returns RepositoryConfig on success
- [ ] Throws appropriate errors on failure

### REPO-003 [P]: Implement Remove Repository
**Description:** Implement repository removal with confirmation
**Files:** `src/services/RepositoryConfigService.ts`
**Dependencies:** REPO-001
**Acceptance Criteria:**
- [ ] removeRepository() finds repository by ID
- [ ] Removes repository from settings array
- [ ] Saves updated settings
- [ ] Returns true if removed, false if not found
- [ ] Does not affect repository on disk
- [ ] Handles missing repository gracefully

### REPO-004 [P]: Implement Toggle Repository
**Description:** Implement enable/disable toggle for repositories
**Files:** `src/services/RepositoryConfigService.ts`
**Dependencies:** REPO-001
**Acceptance Criteria:**
- [ ] toggleRepository() finds repository by ID
- [ ] Flips enabled boolean state
- [ ] Saves updated settings
- [ ] Returns new enabled state
- [ ] Returns null if repository not found
- [ ] Updates lastValidated timestamp

### REPO-005 [P]: Implement Get Operations
**Description:** Implement repository query methods
**Files:** `src/services/RepositoryConfigService.ts`
**Dependencies:** REPO-001
**Acceptance Criteria:**
- [ ] getRepositories() returns all repositories
- [ ] getRepository(id) returns single repository or null
- [ ] getEnabledRepositories() returns only enabled repos
- [ ] Results are immutable (defensive copies)
- [ ] Efficient O(1) or O(n) performance

### REPO-006: Repository Service Unit Tests
**Description:** Create comprehensive test suite for repository service
**Files:** `test/services/RepositoryConfigService.test.ts`
**Dependencies:** REPO-002, REPO-003, REPO-004, REPO-005
**Acceptance Criteria:**
- [ ] Test successful repository addition
- [ ] Test duplicate path prevention
- [ ] Test invalid path rejection
- [ ] Test non-git directory rejection
- [ ] Test repository removal
- [ ] Test toggle operations
- [ ] Test get operations
- [ ] Test error scenarios
- [ ] Test settings persistence
- [ ] 90%+ code coverage

**Commands:**
```bash
npm run test -- RepositoryConfigService.test.ts --coverage
```

## Phase 4: Settings User Interface

### UI-001: Create Settings Tab Structure
**Description:** Implement basic settings tab extending Obsidian's PluginSettingTab
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** ARCH-002, REPO-001
**Acceptance Criteria:**
- [ ] MultiGitSettingTab extends PluginSettingTab
- [ ] display() method implemented
- [ ] Settings container properly cleared on display
- [ ] Plugin description header added
- [ ] Tab registered in main plugin onload()
- [ ] Settings tab visible in Obsidian settings

### UI-002: Implement Repository List Display
**Description:** Create UI to display list of configured repositories
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** UI-001
**Acceptance Criteria:**
- [ ] Renders list of all repositories
- [ ] Shows repository name and path
- [ ] Displays enabled/disabled state
- [ ] Shows creation date
- [ ] Empty state message when no repositories
- [ ] Repository count displayed
- [ ] List updates when repositories change

### UI-003: Add Repository Controls
**Description:** Implement add, remove, and toggle controls per repository
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** UI-002, REPO-002, REPO-003, REPO-004
**Acceptance Criteria:**
- [ ] "Add Repository" button at top of list
- [ ] Remove button for each repository
- [ ] Toggle button for enable/disable
- [ ] Buttons use Obsidian's button styling
- [ ] Actions trigger appropriate service methods
- [ ] UI updates after actions complete
- [ ] Keyboard navigation supported

### UI-004: Implement Add Repository Dialog
**Description:** Create modal dialog for adding new repositories
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** UI-003
**Acceptance Criteria:**
- [ ] Modal dialog with path input field
- [ ] Optional name input field
- [ ] File picker button to browse for directory
- [ ] Path validation on input
- [ ] Inline error messages for validation failures
- [ ] Add button disabled until valid path entered
- [ ] Cancel button closes dialog
- [ ] Success closes dialog and updates list
- [ ] Handles errors from service layer

### UI-005 [P]: Add Repository Item Actions
**Description:** Implement inline actions for each repository item
**Files:** `src/settings/SettingTab.ts`
**Dependencies:** UI-003
**Acceptance Criteria:**
- [ ] Remove button shows confirmation modal
- [ ] Confirmation includes repository name
- [ ] Toggle button updates immediately
- [ ] Visual feedback during operations
- [ ] Loading states for async operations
- [ ] Success/error feedback as notices
- [ ] Actions disabled during processing

### UI-006 [P]: Polish Settings UI
**Description:** Add visual polish and improved UX to settings
**Files:** `src/settings/SettingTab.ts`, `styles.css`
**Dependencies:** UI-004, UI-005
**Acceptance Criteria:**
- [ ] Consistent spacing and alignment
- [ ] Follows Obsidian design patterns
- [ ] Proper icon usage
- [ ] Hover states for interactive elements
- [ ] Clear visual hierarchy
- [ ] Responsive to different window sizes
- [ ] Accessibility: keyboard navigation, ARIA labels

## Phase 5: Integration & Quality

### INT-001: End-to-End Integration Testing
**Description:** Test complete workflows in real Obsidian environment
**Files:** `test/integration/repository-workflow.test.ts`
**Dependencies:** UI-006, REPO-006
**Acceptance Criteria:**
- [ ] Test complete add repository workflow
- [ ] Test remove repository with confirmation
- [ ] Test toggle enable/disable
- [ ] Test settings persistence across plugin reloads
- [ ] Test with multiple repositories
- [ ] Test validation error scenarios
- [ ] Test UI updates correctly after operations
- [ ] All workflows complete successfully

### INT-002 [P]: Cross-Platform Path Testing
**Description:** Validate path handling across operating systems
**Files:** `test/integration/cross-platform.test.ts`
**Dependencies:** GIT-002
**Acceptance Criteria:**
- [ ] Test absolute path validation on macOS
- [ ] Test absolute path validation on Windows (drive letters)
- [ ] Test absolute path validation on Linux
- [ ] Test path normalization across platforms
- [ ] Test special characters in paths
- [ ] Test spaces in directory names
- [ ] Document platform-specific behaviors

**Note:** Requires testing on actual platforms, not just unit tests

### INT-003 [P]: Error Handling Validation
**Description:** Verify error handling and recovery scenarios
**Files:** `test/integration/error-scenarios.test.ts`
**Dependencies:** UI-005
**Acceptance Criteria:**
- [ ] Test missing git installation gracefully handled
- [ ] Test permission denied errors
- [ ] Test invalid repository paths
- [ ] Test duplicate repository prevention
- [ ] Test corrupted settings recovery
- [ ] Test network unavailable scenarios
- [ ] All errors display user-friendly messages
- [ ] User can recover from all error states

### PERF-001: Performance Validation
**Description:** Validate performance requirements are met
**Files:** `test/performance/benchmarks.test.ts`
**Dependencies:** INT-001
**Acceptance Criteria:**
- [ ] Plugin loads in under 1 second
- [ ] Add repository completes in under 2 seconds
- [ ] Settings UI renders in under 500ms
- [ ] Memory usage under 50MB with 10 repositories
- [ ] No UI blocking during operations
- [ ] Benchmark results documented

**Commands:**
```bash
npm run test -- benchmarks.test.ts
# Profile memory usage in Obsidian dev tools
```

## Phase 6: Documentation & Deployment

### DOC-001: User Documentation
**Description:** Create user-facing documentation for FR-1 features
**Files:** `README.md`, `docs/configuration.md`
**Dependencies:** INT-001
**Acceptance Criteria:**
- [ ] README overview of plugin purpose
- [ ] Installation instructions
- [ ] Configuration guide with screenshots
- [ ] Adding/removing repositories tutorial
- [ ] Troubleshooting section
- [ ] Requirements (git version, Obsidian version)
- [ ] Links to full documentation

### DOC-002 [P]: Technical Documentation
**Description:** Create developer documentation for codebase
**Files:** `docs/architecture.md`, `docs/contributing.md`
**Dependencies:** REPO-006
**Acceptance Criteria:**
- [ ] Architecture overview with diagrams
- [ ] Service layer documentation
- [ ] Data model documentation
- [ ] API reference for public methods
- [ ] Development setup instructions
- [ ] Testing guidelines
- [ ] Code style guide

### DOC-003 [P]: API Documentation
**Description:** Generate TypeScript API documentation
**Files:** `docs/api/`, inline TSDoc comments
**Dependencies:** DOC-002
**Acceptance Criteria:**
- [ ] All public classes have TSDoc comments
- [ ] All public methods documented with @param and @returns
- [ ] Usage examples in doc comments
- [ ] Error conditions documented
- [ ] Generated API docs using TypeDoc or similar
- [ ] Documentation builds without errors

**Commands:**
```bash
npm install --save-dev typedoc
npx typedoc src/
```

### VAL-001: Specification Validation
**Description:** Validate all FR-1 acceptance criteria are met
**Files:** `specs/1-multi-git-core/validation-report.md`
**Dependencies:** INT-003, PERF-001
**Acceptance Criteria:**
- [ ] All FR-1 acceptance criteria checked and passing
- [ ] User can add repositories by specifying absolute paths
- [ ] Paths stored as absolute paths
- [ ] User can remove repositories
- [ ] User can view list with full paths
- [ ] Configurations persist across restarts
- [ ] User can enable/disable repositories
- [ ] Path validation confirms valid git repository
- [ ] Cross-platform compatibility verified
- [ ] Performance requirements met
- [ ] Error handling complete

### VAL-002: Constitutional Compliance Check
**Description:** Verify implementation aligns with project constitution
**Files:** Inline validation in commit message
**Dependencies:** VAL-001
**Acceptance Criteria:**
- [ ] Specification-first development followed (spec existed before code)
- [ ] Iterative simplicity maintained (minimal scope, no over-engineering)
- [ ] Documentation as context provided (plan, tasks, inline docs)
- [ ] All quality gates passed
- [ ] No constitutional principles violated
- [ ] Ready for approval

### DEPLOY-001: Prepare for Release
**Description:** Final preparation for FR-1 release
**Files:** `manifest.json`, `versions.json`, `CHANGELOG.md`
**Dependencies:** VAL-002, DOC-001
**Acceptance Criteria:**
- [ ] Version bumped to 0.1.0
- [ ] Changelog entry for FR-1
- [ ] Manifest.json has correct metadata
- [ ] versions.json updated
- [ ] Production build succeeds
- [ ] Plugin validated in fresh Obsidian install
- [ ] Release notes prepared
- [ ] Git tags created

**Commands:**
```bash
npm run build
npm version minor
git tag v0.1.0
git push --tags
```

## Task Execution Order

### Critical Path
The following tasks form the critical path and should be prioritized:
1. ENV-001 → ENV-002 → ARCH-001 → ARCH-002
2. GIT-001 → REPO-001 → REPO-002
3. UI-001 → UI-002 → UI-003 → UI-004
4. INT-001 → VAL-001 → VAL-002 → DEPLOY-001

### Parallel Execution Opportunities

**Phase 0-1 (Setup):**
- ENV-003 can run parallel with ENV-002
- DATA-001, DATA-002 can run parallel after ARCH-001

**Phase 2 (Git Layer):**
- GIT-002 can run parallel with GIT-001 implementation (TDD approach)

**Phase 3 (Config Service):**
- REPO-003, REPO-004, REPO-005 can run parallel after REPO-002

**Phase 4 (UI):**
- UI-005, UI-006 can run parallel after UI-004

**Phase 5-6 (Quality):**
- INT-002, INT-003 can run parallel with INT-001
- DOC-002, DOC-003 can run parallel with DOC-001

## Dependencies Graph

```
ENV-001
  ├─→ ENV-002
  │     ├─→ ARCH-001
  │     │     ├─→ ARCH-002
  │     │     │     ├─→ UI-001
  │     │     │     │     └─→ UI-002
  │     │     │     │           └─→ UI-003
  │     │     │     │                 ├─→ UI-004
  │     │     │     │                 │     ├─→ UI-005
  │     │     │     │                 │     └─→ UI-006
  │     │     │     │                 │           └─→ INT-001
  │     │     │     │                 └─→ REPO-003
  │     │     │     │                       └─→ REPO-004
  │     │     │     │                             └─→ REPO-005
  │     │     │     │                                   └─→ REPO-006
  │     │     │     └─→ REPO-001
  │     │     │           └─→ REPO-002
  │     │     ├─→ DATA-001
  │     │     │     ├─→ GIT-001
  │     │     │     │     ├─→ GIT-002
  │     │     │     │     └─→ REPO-001
  │     │     │     └─→ REPO-002
  │     │     └─→ DATA-002
  └─→ ENV-003

INT-001 → INT-002 → INT-003 → PERF-001 → DOC-001 → VAL-001 → VAL-002 → DEPLOY-001
                                            ├─→ DOC-002
                                            └─→ DOC-003
```

## Estimated Complexity by Phase

- **Phase 0 (Setup):** Low - Standard project initialization
- **Phase 1 (Foundation):** Low - Basic data structures and interfaces
- **Phase 2 (Git Layer):** Medium - Command execution and error handling
- **Phase 3 (Config Service):** Medium - Business logic and validation
- **Phase 4 (UI):** Medium - Obsidian UI integration
- **Phase 5 (Quality):** Medium - Testing and validation
- **Phase 6 (Polish):** Low - Documentation and deployment

**Overall Complexity:** Medium (straightforward CRUD feature with standard patterns)

## Quality Gates

### Phase Completion Criteria

**Phase 0:** Environment ready for development
- [ ] All tools installed and functional
- [ ] Project compiles without errors
- [ ] Basic plugin loads in Obsidian

**Phase 1:** Data model and architecture established
- [ ] All interfaces defined and documented
- [ ] Plugin lifecycle working
- [ ] Settings persistence functional

**Phase 2:** Git integration operational
- [ ] Can detect valid git repositories
- [ ] Cross-platform path handling works
- [ ] All git tests passing

**Phase 3:** Repository management functional
- [ ] Can add/remove/toggle repositories
- [ ] Validation prevents errors
- [ ] All service tests passing

**Phase 4:** User interface complete
- [ ] Settings UI fully functional
- [ ] All user scenarios work
- [ ] UI follows Obsidian patterns

**Phase 5:** Quality validated
- [ ] All integration tests pass
- [ ] Cross-platform testing complete
- [ ] Performance requirements met

**Phase 6:** Ready for release
- [ ] All documentation complete
- [ ] Specification criteria satisfied
- [ ] Constitutional compliance verified

## Notes

### Implementation Strategy

**Test-Driven Development:**
Where feasible, write tests before implementation, especially for:
- Validation utilities (DATA-001)
- Git command service (GIT-001)
- Repository configuration service (REPO-002-005)

**Incremental UI Development:**
Build UI incrementally:
1. Basic structure first (UI-001)
2. Read-only display (UI-002)
3. Add interactions (UI-003-005)
4. Polish and refine (UI-006)

**Continuous Integration:**
- Run tests after each task completion
- Validate in Obsidian after UI changes
- Keep plugin functional throughout development

### Risk Mitigation

**Git Installation Dependency:**
- Add check in plugin onload()
- Display clear error if git not found
- Provide installation instructions

**Path Validation Edge Cases:**
- Test with symbolic links
- Test with network paths
- Test with special characters
- Document limitations

**Cross-Platform Concerns:**
- Test on all platforms early (INT-002)
- Use Node.js path module for normalization
- Handle drive letters correctly on Windows

### Success Metrics

**Development Velocity:**
- Complete 2-3 tasks per development session
- Finish each phase within 1-2 days
- Total implementation: 1-2 weeks

**Code Quality:**
- Maintain 80%+ test coverage
- Zero linting errors
- All TypeScript strict mode checks passing

**User Experience:**
- All operations complete in under 3 seconds
- No confusing error messages
- Settings UI intuitive without documentation

---

**Next Steps:**
1. Review task breakdown for completeness
2. Begin Phase 0 (ENV-001) - Initialize plugin project
3. Follow critical path for systematic implementation
4. Update task_progress as work progresses
5. Validate each phase completion before proceeding
