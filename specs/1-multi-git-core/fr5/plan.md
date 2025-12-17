# Implementation Plan: Error Handling and Recovery (FR-5)

**Created:** 2025-12-15
**Specification:** [../spec.md](../spec.md)
**Status:** Planning
**Feature:** Multi-Git Core for Obsidian
**Requirement:** FR-5: Error Handling and Recovery
**Tasks:** TBD (will create tasks.md after plan approval)

## Technical Context

### Current Error Handling State

#### Already Implemented ✅
1. **Error Classes** (src/utils/errors.ts)
   - Comprehensive error type hierarchy
   - FetchError with error codes (NETWORK_ERROR, AUTH_ERROR, TIMEOUT, etc.)
   - GitCommitError and GitPushError for commit/push failures
   - Repository-specific errors (ValidationError, GitRepositoryError, etc.)

2. **Background Fetch Error Handling**
   - NotificationService.notifyFetchError() shows dismissible notifications
   - Errors don't block subsequent fetch attempts
   - Cooldown period prevents notification spam

3. **Status Panel Error Display**
   - Inline error messages with retry buttons
   - Error state doesn't affect other repositories
   - User-friendly error message formatting

4. **Commit/Push Error Handling**
   - CommitMessageModal displays errors inline
   - Users can edit and retry without closing modal
   - Clear distinction between commit success + push failure

#### Missing Implementation ❌
1. **Critical Error Modals**
   - No modal dialogs for authentication failures
   - No modal dialogs for merge conflicts
   - No standardized modal for critical errors

2. **Error Detection and Classification**
   - No explicit merge conflict detection
   - No explicit authentication failure detection
   - Need better error categorization (critical vs minor)

3. **Actionable Error Guidance**
   - No step-by-step instructions for resolving auth issues
   - No guidance for resolving merge conflicts
   - Missing links to documentation/help resources

### Architecture Decisions

#### Error Presentation Strategy
- **Modal Dialogs:** For critical errors requiring immediate user attention and acknowledgment
  - **Rationale:** Prevents users from unknowingly continuing with broken operations
  - **Examples:** Authentication failures, merge conflicts, repository corruption
  - **Trade-offs:** Pro: Forces acknowledgment. Con: Interrupts workflow

- **Notifications:** For background operation failures that don't require immediate action
  - **Rationale:** Non-intrusive, dismissible, user can continue working
  - **Examples:** Fetch failures, network timeouts
  - **Trade-offs:** Pro: Non-blocking. Con: Can be missed

- **Inline Status Display:** For repository-specific issues visible in status panel
  - **Rationale:** Contextual feedback where user is already looking
  - **Examples:** Status check failures, individual repo errors
  - **Trade-offs:** Pro: Contextual. Con: Only visible when panel open

#### Error Detection Approach
- **Git Command Output Parsing:** Detect specific error patterns in stderr
  - **Rationale:** Git provides predictable error messages for common scenarios
  - **Examples:** "Authentication failed", "CONFLICT", "Permission denied"
  - **Trade-offs:** Pro: Reliable. Con: May vary across git versions

- **Exit Code Analysis:** Use git command exit codes to classify errors
  - **Rationale:** Exit codes indicate general failure categories
  - **Examples:** Exit 1 (general error), Exit 128 (fatal error)
  - **Trade-offs:** Pro: Simple. Con: Not always specific enough

- **Error Code Enum:** Map detected errors to standardized error codes
  - **Rationale:** Consistent error handling across services
  - **Already Implemented:** FetchErrorCode enum in errors.ts
  - **Trade-offs:** Pro: Type-safe, consistent. Con: Requires mapping logic

### Technology Stack Rationale

#### Why Modal Dialogs for Critical Errors?
- **Requirement:** Ensure user acknowledges critical issues before proceeding
- **Benefit:** Prevents data loss, prevents confusion, forces user to address issue
- **Implementation:** Obsidian Modal class with custom content

#### Why Error Pattern Matching?
- **Requirement:** Detect specific error types (auth, conflicts) from git output
- **Benefit:** Provide targeted guidance instead of generic error messages
- **Implementation:** Regex patterns matching common git error messages

#### Why Separate Error Categories?
- **Requirement:** Different errors need different presentation methods
- **Benefit:** Right level of urgency for each error type
- **Implementation:** Critical/Minor classification in error handling logic

### Integration Points

#### GitCommandService Integration
- **Current:** Returns errors from git commands
- **Enhancement:** Parse stderr for specific error patterns
- **Enhancement:** Classify errors as critical vs minor
- **Enhancement:** Detect merge conflicts and auth failures explicitly

#### Modal System Integration
- **Use:** Obsidian Modal class for critical error dialogs
- **Components:**
  - MergeConflictModal: Guides through conflict resolution
  - AuthFailureModal: Provides credential setup instructions
  - CriticalErrorModal: Generic critical error with acknowledgment

#### Notification System Integration
- **Current:** NotificationService handles fetch errors
- **Keep:** Background failures continue using notifications
- **Enhancement:** Ensure all error notifications include repo name

#### Status Panel Integration
- **Current:** Shows inline errors with retry buttons
- **Keep:** Minor errors continue showing inline
- **Enhancement:** Add "Get Help" links for common issues

## Constitution Check

### Principle Compliance Review

#### Principle 1: Specification-First Development
- **Requirement:** All features must begin with clear specification before implementation
- **Plan Alignment:** This plan implements FR-5 from approved specification
- **Validation:** Spec exists at `../spec.md` with complete acceptance criteria for FR-5

#### Principle 2: Iterative Simplicity
- **Requirement:** Start with minimal viable implementation
- **Plan Alignment:**
  - Focuses on missing critical error handling only
  - Reuses existing error infrastructure (errors.ts, NotificationService)
  - Minimal new UI components (2-3 modal types)
  - Leverages existing detection patterns where possible
- **Validation:** Implementation completes FR-5 acceptance criteria without over-engineering

#### Principle 3: Documentation as Context
- **Requirement:** Code and decisions documented for future work and AI assistance
- **Plan Alignment:**
  - This plan documents all technical decisions with rationale
  - Modal components will include usage examples
  - Error detection patterns documented with test cases
  - User-facing error messages link to help documentation
- **Validation:** Plan follows template with complete decision documentation

### Quality Gates
- [x] All constitutional MUST requirements addressed
- [x] Non-negotiable principles not violated
- [x] Quality standards and practices followed
- [x] Compliance requirements satisfied

**Gate Evaluation:** PASS

## Phase 0: Research & Architecture

### Technology Research Tasks

No additional research required for FR-5. All technology decisions are informed by existing implementation:

1. **Obsidian Modal API:** Well-documented at https://docs.obsidian.md/Plugins/User+interface/Modals
   - Already used for CommitMessageModal
   - Clear patterns for custom modals
   - Examples in existing codebase

2. **Git Error Patterns:** Standard git error messages
   - Authentication: "Authentication failed", "Permission denied (publickey)"
   - Merge conflicts: "CONFLICT", "Automatic merge failed"
   - Network: "Could not resolve host", "Connection refused"
   - Well-documented in git documentation

3. **Error Categorization:** Critical vs Minor classification
   - Critical: Prevents user from proceeding (auth, conflicts, corruption)
   - Minor: User can retry or ignore (network timeouts, status check failures)
   - Clear distinction based on impact

### Architecture Investigation

No complex architecture decisions needed for FR-5. This extends existing patterns:
- Modal class for critical error dialogs (Obsidian standard)
- Error pattern matching in GitCommandService (already established for FetchError)
- Error code classification (FetchErrorCode enum already exists, extend pattern)

### Research Deliverables

✅ No research.md needed - all decisions are clear from existing error handling patterns.

## Phase 1: Design & Contracts

### Data Model Design

#### Entity: Error Category Classification

```typescript
/**
 * Classification of error severity for presentation strategy
 */
export enum ErrorSeverity {
  /** Critical errors requiring immediate user acknowledgment via modal */
  CRITICAL = 'CRITICAL',
  
  /** Minor errors that can be shown as notifications or inline */
  MINOR = 'MINOR',
  
  /** Warning messages that don't prevent operation */
  WARNING = 'WARNING'
}

/**
 * Specific error scenarios that require special handling
 */
export enum ErrorScenario {
  /** Git authentication failure (SSH key, HTTPS credentials) */
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  
  /** Merge conflict detected */
  MERGE_CONFLICT = 'MERGE_CONFLICT',
  
  /** Network connectivity issue */
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  /** Permission denied (file system or git) */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  /** Repository not found or invalid */
  REPOSITORY_ERROR = 'REPOSITORY_ERROR',
  
  /** Generic error that doesn't match known patterns */
  UNKNOWN = 'UNKNOWN'
}
```

#### Entity: Classified Error

```typescript
/**
 * Error with classification for appropriate presentation
 */
export interface ClassifiedError {
  /** Original error object */
  error: Error;
  
  /** Severity level for presentation strategy */
  severity: ErrorSeverity;
  
  /** Specific scenario if detected */
  scenario: ErrorScenario;
  
  /** Repository identifier where error occurred */
  repositoryId: string;
  
  /** Repository name for display */
  repositoryName: string;
  
  /** User-friendly error message */
  userMessage: string;
  
  /** Technical details for debugging */
  technicalDetails?: string;
  
  /** Suggested actions for resolution */
  suggestedActions: string[];
  
  /** Help documentation link if available */
  helpLink?: string;
}
```

### API Contract Generation

#### Error Classification Service

```typescript
/**
 * Service for classifying and formatting errors
 */
export class ErrorClassificationService {
  /**
   * Classify an error for appropriate presentation
   * @param error - The error to classify
   * @param context - Context about where error occurred
   * @returns Classified error with presentation guidance
   */
  classifyError(
    error: Error,
    context: {
      repositoryId: string;
      repositoryName: string;
      operation: string;
    }
  ): ClassifiedError;
  
  /**
   * Detect if error is authentication failure
   * @param stderr - Git command stderr output
   * @returns true if authentication failure detected
   */
  private isAuthenticationFailure(stderr: string): boolean;
  
  /**
   * Detect if error is merge conflict
   * @param stderr - Git command stderr output
   * @returns true if merge conflict detected
   */
  private isMergeConflict(stderr: string): boolean;
  
  /**
   * Extract suggested actions for error scenario
   * @param scenario - Detected error scenario
   * @param operation - Operation that failed
   * @returns Array of suggested actions
   */
  private getSuggestedActions(
    scenario: ErrorScenario,
    operation: string
  ): string[];
}
```

#### Critical Error Modals

```typescript
/**
 * Modal for displaying authentication failure with setup guidance
 */
export class AuthFailureModal extends Modal {
  constructor(
    app: App,
    repositoryName: string,
    errorDetails: string
  );
  
  onOpen(): void;
  
  /**
   * Render setup instructions for SSH keys
   */
  private renderSSHInstructions(container: HTMLElement): void;
  
  /**
   * Render setup instructions for HTTPS credentials
   */
  private renderHTTPSInstructions(container: HTMLElement): void;
}

/**
 * Modal for displaying merge conflict with resolution guidance
 */
export class MergeConflictModal extends Modal {
  constructor(
    app: App,
    repositoryName: string,
    conflictedFiles: string[]
  );
  
  onOpen(): void;
  
  /**
   * Render conflict resolution steps
   */
  private renderResolutionSteps(container: HTMLElement): void;
  
  /**
   * Open repository in file explorer for manual resolution
   */
  private openRepositoryInExplorer(): void;
}

/**
 * Generic modal for critical errors requiring acknowledgment
 */
export class CriticalErrorModal extends Modal {
  constructor(
    app: App,
    title: string,
    message: string,
    details?: string,
    actions?: Array<{label: string; callback: () => void}>
  );
  
  onOpen(): void;
}
```

#### Error Handler Integration

```typescript
/**
 * Extensions to GitCommandService for error classification
 */
class GitCommandService {
  private errorClassifier: ErrorClassificationService;
  
  /**
   * Execute git command with enhanced error handling
   * Classifies errors and presents appropriately
   */
  private async executeCommandWithErrorHandling(
    command: string,
    cwd: string,
    context: {
      repositoryId: string;
      repositoryName: string;
      operation: string;
    }
  ): Promise<{stdout: string; stderr: string}>;
  
  /**
   * Present error to user based on classification
   * @param classifiedError - Classified error with presentation guidance
   */
  private presentError(classifiedError: ClassifiedError): void;
}
```

#### Error Presentation Strategy

```typescript
/**
 * Strategy for presenting different error types
 */
export class ErrorPresentationService {
  constructor(
    private app: App,
    private notificationService: NotificationService
  );
  
  /**
   * Present error using appropriate method based on severity
   * @param classifiedError - Classified error
   */
  presentError(classifiedError: ClassifiedError): void;
  
  /**
   * Show critical error as modal dialog
   */
  private showCriticalErrorModal(error: ClassifiedError): void;
  
  /**
   * Show minor error as notification
   */
  private showMinorErrorNotification(error: ClassifiedError): void;
  
  /**
   * Update status panel with error
   */
  private updateStatusPanelError(error: ClassifiedError): void;
}
```

### Error Detection Patterns

#### Authentication Failure Patterns
```typescript
const AUTH_FAILURE_PATTERNS = [
  /Authentication failed/i,
  /Permission denied \(publickey\)/i,
  /Could not read from remote repository/i,
  /fatal: Authentication failed for/i,
  /Invalid username or password/i,
];
```

#### Merge Conflict Patterns
```typescript
const MERGE_CONFLICT_PATTERNS = [
  /CONFLICT/i,
  /Automatic merge failed/i,
  /fix conflicts and then commit/i,
];
```

#### Network Error Patterns
```typescript
const NETWORK_ERROR_PATTERNS = [
  /Could not resolve host/i,
  /Connection refused/i,
  /Connection timed out/i,
  /Failed to connect/i,
  /network.*unavailable/i,
];
```

### Development Environment Setup

#### Prerequisites
- Already established in FR-1, FR-2, FR-3, FR-4
- No new dependencies required

#### Project Structure Extensions
```
multi-git/
├── src/
│   ├── services/
│   │   ├── ErrorClassificationService.ts  # NEW
│   │   └── ErrorPresentationService.ts    # NEW
│   ├── ui/
│   │   ├── AuthFailureModal.ts           # NEW
│   │   ├── MergeConflictModal.ts         # NEW
│   │   └── CriticalErrorModal.ts         # NEW
│   └── utils/
│       └── errors.ts                     # EXTEND: Add classification types
├── styles.css                            # EXTEND: Add modal styles
└── test/
    ├── services/
    │   ├── ErrorClassificationService.test.ts  # NEW
    │   └── ErrorPresentationService.test.ts    # NEW
    └── ui/
        ├── AuthFailureModal.test.ts           # NEW
        ├── MergeConflictModal.test.ts         # NEW
        └── CriticalErrorModal.test.ts         # NEW
```

## Implementation Readiness Validation

### Technical Completeness Check
- [x] All technology choices made and documented
- [x] Data model covers all functional requirements
- [x] API contracts support all user scenarios
- [x] Security requirements addressed (no credential storage)
- [x] Performance considerations documented (minimal overhead)
- [x] Integration points defined (services, modals, status panel)
- [x] Development environment specified

### Quality Validation
- [x] Architecture supports scalability requirements
- [x] Error handling model is comprehensive
- [x] User experience is improved with actionable guidance
- [x] API design follows established patterns (Modal, Service)
- [x] Documentation covers all major decisions

### Constitution Alignment Re-check
- [x] All principles still satisfied
- [x] No new violations introduced
- [x] Quality gates still passing
- [x] Compliance requirements met

**Final Validation:** ✅ PASS - Ready for task breakdown

## Implementation Phases

### Phase 1: Error Classification Infrastructure

**Goal:** Create error classification and detection logic

**Tasks:**
1. **Extend error type definitions**
   - Add ErrorSeverity enum to errors.ts
   - Add ErrorScenario enum to errors.ts
   - Define ClassifiedError interface
   - Document each error type with examples

2. **Create ErrorClassificationService**
   - Implement classifyError() method
   - Add authentication failure detection (isAuthenticationFailure)
   - Add merge conflict detection (isMergeConflict)
   - Add network error detection (isNetworkError)
   - Add permission denied detection (isPermissionDenied)

3. **Implement error pattern matching**
   - Define regex patterns for each error scenario
   - Test patterns against real git error messages
   - Handle edge cases and git version differences
   - Add logging for unmatched error patterns

4. **Unit tests**
   - Test classification of authentication failures
   - Test classification of merge conflicts
   - Test classification of network errors
   - Test classification of unknown errors
   - Test suggested actions generation

**Acceptance:**
- Errors correctly classified by severity
- Specific scenarios detected from git output
- Suggested actions provided for each scenario
- All tests passing

### Phase 2: Critical Error Modals

**Goal:** Create modal dialogs for critical errors

**Tasks:**
1. **Create CriticalErrorModal base class**
   - Extend Obsidian Modal class
   - Implement standard modal layout
   - Add error message display
   - Add technical details (collapsible)
   - Add suggested actions list
   - Add acknowledgment button

2. **Create AuthFailureModal**
   - Extend CriticalErrorModal
   - Add SSH key setup instructions
   - Add HTTPS credentials setup instructions
   - Add links to git documentation
   - Add "Test Connection" button (future enhancement)
   - Style for readability

3. **Create MergeConflictModal**
   - Extend CriticalErrorModal
   - List conflicted files
   - Explain conflict markers
   - Provide resolution steps
   - Add "Open in File Explorer" button
   - Add "I've Resolved the Conflicts" button

4. **Modal styling**
   - Create CSS for modal layouts
   - Ensure readability in light/dark themes
   - Add icons for visual clarity
   - Make instructions scannable (bullets, numbers)
   - Test on narrow screens

5. **Unit tests**
   - Test modal rendering
   - Test instruction generation
   - Test button callbacks
   - Test modal accessibility

**Acceptance:**
- Modals display clear, actionable instructions
- SSH and HTTPS instructions are comprehensive
- Merge conflict guidance is helpful
- Modals work in light and dark themes
- All tests passing

### Phase 3: Error Presentation Service

**Goal:** Route errors to appropriate presentation method

**Tasks:**
1. **Create ErrorPresentationService**
   - Implement presentError() method
   - Route critical errors to modals
   - Route minor errors to notifications
   - Route inline errors to status panel
   - Handle concurrent errors gracefully

2. **Implement modal presentation**
   - Show AuthFailureModal for auth errors
   - Show MergeConflictModal for conflict errors
   - Show CriticalErrorModal for other critical errors
   - Track open modals to prevent duplicates

3. **Integrate with NotificationService**
   - Use existing notifyFetchError() for minor errors
   - Ensure repository name included in all notifications
   - Add error scenario to notification text
   - Maintain notification cooldown logic

4. **Integrate with StatusPanelView**
   - Update inline error display formatting
   - Ensure repository name always shown
   - Add "Get Help" links for common scenarios
   - Maintain retry button functionality

5. **Unit tests**
   - Test error routing logic
   - Test modal presentation
   - Test notification presentation
   - Test status panel integration
   - Test concurrent error handling

**Acceptance:**
- Errors routed to correct presentation method
- Critical errors show modals
- Minor errors show notifications
- Status panel updated appropriately
- All tests passing

### Phase 4: GitCommandService Integration

**Goal:** Integrate error classification into git operations

**Tasks:**
1. **Add ErrorClassificationService to GitCommandService**
   - Inject ErrorClassificationService
   - Inject ErrorPresentationService
   - Update executeCommand() to classify errors
   - Present classified errors appropriately

2. **Update fetch operations**
   - Classify fetch errors before presenting
   - Show auth modal for auth failures during fetch
   - Show notification for network errors
   - Update status panel for minor errors

3. **Update commit/push operations**
   - Classify commit/push errors
   - Show auth modal for auth failures
   - Show merge conflict modal if conflicts detected
   - Keep inline errors in CommitMessageModal for minor issues

4. **Update status check operations**
   - Classify status check errors
   - Show inline errors in status panel
   - Add retry buttons for all error types
   - Don't interrupt user for minor status errors

5. **Integration tests**
   - Test auth failure during fetch
   - Test merge conflict during push
   - Test network error during fetch
   - Test error recovery and retry
   - Test multiple concurrent errors

**Acceptance:**
- All git operations classify and present errors
- Critical errors show modals immediately
- Minor errors don't interrupt workflow
- Users can retry failed operations
- All tests passing

### Phase 5: Error Message Refinement

**Goal:** Ensure all error messages are clear and actionable

**Tasks:**
1. **Review all error messages**
   - Audit NotificationService messages
   - Audit StatusPanelView error formatting
   - Audit CommitMessageModal error display
   - Audit modal error messages
   - Ensure repository name always included

2. **Add suggested actions to all errors**
   - Generate actions for each error scenario
   - Include specific steps (not generic "try again")
   - Add links to relevant documentation
   - Test actions are actually helpful

3. **Add help links**
   - Link to plugin documentation for common issues
   - Link to git documentation for git errors
   - Link to SSH/credential setup guides
   - Ensure links work across platforms

4. **Format technical details**
   - Make git stderr output readable
   - Hide verbose output in collapsible sections
   - Highlight relevant error information
   - Include command that failed (for debugging)

5. **User testing**
   - Test error messages with non-technical users
   - Verify suggested actions are clear
   - Ensure modals aren't overwhelming
   - Collect feedback and refine

**Acceptance:**
- All error messages are clear and actionable
- Repository name included in all errors
- Suggested actions are specific and helpful
- Help links are relevant and working
- Non-technical users can follow instructions

### Phase 6: Testing and Documentation

**Goal:** Complete testing coverage and documentation

**Tasks:**
1. **Unit test coverage**
   - Test ErrorClassificationService thoroughly
   - Test ErrorPresentationService routing
   - Test all modal components
   - Test error detection patterns
   - Achieve >90% coverage

2. **Integration test scenarios**
   - Test auth failure during fetch
   - Test auth failure during push
   - Test merge conflict during pull
   - Test network error during fetch
   - Test repository permission errors

3. **Manual testing checklist**
   - Create comprehensive manual test scenarios
   - Test on macOS, Windows, Linux
   - Test various error scenarios
   - Test modal UX and clarity
   - Test error recovery workflows

4. **User documentation**
   - Update README with error handling information
   - Document common errors and resolutions
   - Add troubleshooting section
   - Include screenshots of modals

5. **Architecture documentation**
   - Update docs/architecture.md with error handling flow
   - Document error classification logic
   - Add extension points for new error types
   - Document error presentation strategy

6. **Code quality**
   - Add JSDoc comments to all public methods
   - Run ESLint and fix any issues
   - Ensure consistent code style
   - Remove any debug logging

**Acceptance:**
- All unit tests passing
- Integration tests passing
- Manual testing checklist complete
- Documentation complete and accurate
- Code passes all quality checks

## Risk Assessment

### Technical Risks

#### Medium Risk: Error Pattern Matching Reliability
- **Impact:** Errors might not be classified correctly if git messages change
- **Likelihood:** Low-Medium (git error messages fairly stable)
- **Mitigation:**
  - Test with multiple git versions
  - Use multiple patterns for each error type
  - Fall back to generic error modal if no match
  - Log unmatched errors for future pattern updates
- **Contingency:** Generic critical error modal for unclassified errors

#### Medium Risk: Modal Overload
- **Impact:** Users might get annoyed by too many modals
- **Likelihood:** Medium (depends on git issues frequency)
- **Mitigation:**
  - Only use modals for true critical errors
  - Include "Don't show this again" option (future)
  - Track modal presentation frequency
  - Provide quick actions in modals to resolve issues
- **Contingency:** Add setting to suppress certain modal types

#### Low Risk: Help Link Maintenance
- **Impact:** Documentation links might become outdated
- **Likelihood:** Low-Medium (documentation evolves)
- **Mitigation:**
  - Use relative links to plugin docs where possible
  - Point to stable git documentation URLs
  - Include fallback instructions in modals
  - Regularly review and update links
- **Contingency:** Remove broken links, rely on inline instructions

#### Low Risk: Cross-Platform Error Message Differences
- **Impact:** Error detection might fail on some platforms
- **Likelihood:** Low (git fairly consistent cross-platform)
- **Mitigation:**
  - Test error patterns on all platforms
  - Use broad patterns that catch variations
  - Log unmatched errors for pattern refinement
- **Contingency:** Generic error handling for platform-specific messages

### Dependencies and Assumptions

#### External Dependencies
- **Obsidian Modal API:** Stable API for modals
- **Git CLI:** Error messages consistent enough for pattern matching
- **Existing Services:** ErrorClassificationService uses GitCommandService output

#### Technical Assumptions
- Git error messages are parseable and relatively stable
- Modal dialogs are appropriate for critical errors
- Users understand basic git concepts or can follow instructions
- Platform-specific error variations are minimal

#### Business Assumptions
- Critical errors (auth, conflicts) are infrequent enough that modals are acceptable
- Users prefer guided error resolution over generic error messages
- Providing instructions is more helpful than just reporting errors
- Users will follow suggested actions to resolve issues

## Next Phase Preparation

### Task Breakdown Readiness
- [x] Clear technology choices and architecture
- [x] Complete data model and API specifications
- [x] Development environment and tooling defined
- [x] Quality standards and testing approach specified
- [x] Integration requirements and dependencies clear

### Implementation Prerequisites

#### Development Environment
- [x] Already established from FR-1, FR-2, FR-3, FR-4
- [x] No new dependencies required

#### Technical Architecture
- [x] Error classification strategy defined
- [x] Modal components specified
- [x] Presentation routing logic documented
- [x] Integration points clear

#### Quality Assurance
- [x] Unit testing approach defined
- [x] Integration testing plan established
- [x] Manual testing strategy outlined
- [x] Error pattern testing documented

#### Documentation
- [x] Technical decisions documented
- [x] API contracts specified
- [x] User-facing error guidance planned

### Ready for Implementation
✅ All prerequisites met. Ready to break down into specific implementation tasks.

---

**Next Steps:**
1. Break down phases into specific tasks with time estimates (create tasks.md)
2. Begin Phase 1 implementation (Error Classification Infrastructure)
3. Use TDD approach: write tests first, then implementation
4. Manual testing in Obsidian after each phase
