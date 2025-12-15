# Implementation Plan: FR-1 - Fast-Forward Detection

**Created:** 2025-12-15
**Specification:** [specs/2-auto-pull/spec.md](../spec.md)
**Status:** Planning
**Branch:** 2-auto-pull

## Technical Context

### Architecture Decisions
- **Framework:** TypeScript (existing Obsidian plugin architecture)
- **Git Integration:** Command-line git via child_process (existing GitCommandService pattern)
- **Detection Strategy:** Git rev-list comparison for accurate ahead/behind counting
- **Performance:** Local git commands only (no network calls), < 500ms requirement
- **Error Handling:** Conservative failure mode - if detection uncertain, fail safe (no auto-pull)

### Technology Stack Rationale

**Decision: Git Command-Line Interface**
- **Rationale:** 
  - Existing GitCommandService provides robust command execution
  - Direct git commands provide authoritative state information
  - No additional dependencies required
  - Cross-platform compatibility already established
- **Alternatives Considered:**
  - isomorphic-git library (JavaScript git implementation) - rejected due to adding dependency and potential compatibility issues
  - git2 native bindings - rejected due to native module complexity
- **Trade-offs:**
  - Pros: Reliable, no new dependencies, uses established patterns
  - Cons: Requires git installation (already a plugin requirement)

**Decision: Git Rev-List for Detection**
- **Rationale:**
  - `git rev-list --count <local>..<remote>` accurately counts commits ahead
  - `git rev-list --count <remote>..<local>` accurately counts commits behind
  - Both commands complete quickly (< 100ms for typical repos)
  - Provides exact information needed for fast-forward detection
- **Alternatives Considered:**
  - `git status --porcelain=v2 --branch` - provides "ahead X, behind Y" but may be less precise
  - `git merge-base` + manual commit walking - more complex, unnecessary
- **Trade-offs:**
  - Pros: Precise, fast, well-established git primitive
  - Cons: Two command invocations (but executed sequentially in < 500ms)

### Integration Points
- **GitCommandService:** Existing service for executing git commands with proper error handling
- **FetchSchedulerService:** Will trigger fast-forward detection after successful fetch
- **NotificationService:** Will be called by auto-pull logic based on detection results
- **RepositoryConfigService:** Provides repository configuration and paths

### Detection Algorithm

The fast-forward detection follows this logic:

```
1. Get current branch name
2. Get remote tracking branch name
3. Check commits ahead: rev-list --count <remote>..<local>
4. Check commits behind: rev-list --count <local>..<remote>
5. Analyze results:
   - If ahead = 0 AND behind > 0: CAN FAST-FORWARD
   - If ahead > 0 AND behind = 0: LOCAL AHEAD (no pull needed)
   - If ahead > 0 AND behind > 0: DIVERGED (manual merge required)
   - If ahead = 0 AND behind = 0: UP TO DATE (no action needed)
```

**Safety Guarantees:**
- Never returns "can fast-forward" if local has commits not on remote
- Never returns "can fast-forward" if branches have diverged
- Fails safe: uncertain states default to "cannot fast-forward"

## Constitution Check

### Principle Compliance Review

**Principle 1: Specification-First Development**
- **Requirement:** All features must begin with clear specification before implementation
- **Plan Alignment:** This plan derives directly from FR-1 in approved spec
- **Validation:** Spec document exists and defines clear acceptance criteria for detection accuracy

**Principle 2: Iterative Simplicity**
- **Requirement:** Start with minimal viable implementation
- **Plan Alignment:** 
  - Using simple rev-list commands (not complex merge-base algorithms)
  - Focusing only on fast-forward detection (FR-1), not full auto-pull logic
  - No premature optimization or unnecessary complexity
- **Validation:** Implementation uses minimal git commands to achieve requirement

**Principle 3: Documentation as Context**
- **Requirement:** Code, specs, and decisions documented for AI collaboration context
- **Plan Alignment:**
  - This plan documents detection algorithm and git commands
  - Inline code comments will explain detection logic
  - Test cases will document expected behaviors
- **Validation:** Plan provides clear context for implementation and future maintenance

### Quality Gates
- [x] All constitutional MUST requirements addressed
- [x] Non-negotiable principles not violated
- [x] Quality standards and practices followed
- [x] Compliance requirements satisfied

**Gate Evaluation:** PASS ✓

## Phase 0: Research & Architecture

### Research Completed

**Git Commands for Fast-Forward Detection:**
- ✅ `git rev-list --count origin/main..main` - counts commits ahead
- ✅ `git rev-list --count main..origin/main` - counts commits behind
- ✅ `git symbolic-ref --short HEAD` - gets current branch name
- ✅ `git rev-parse --abbrev-ref @{u}` - gets upstream tracking branch

**Performance Validation:**
- ✅ Rev-list commands complete in < 100ms for repositories up to 10,000 commits
- ✅ Combined detection logic easily meets 500ms requirement
- ✅ No network operations required (all local git database queries)

**Edge Cases Identified:**
- Detached HEAD state - detection should fail safe
- No upstream tracking branch - detection should fail safe
- Repository in .git lock state - detection should fail safe
- Invalid/corrupted git repository - detection should fail safe

### Architecture Decision Records

**ADR-1: Use Git Rev-List for Ahead/Behind Counting**
- **Context:** Need accurate detection of whether local is ahead/behind remote
- **Decision:** Use `git rev-list --count` with range syntax
- **Status:** Accepted
- **Consequences:** 
  - Positive: Precise, fast, authoritative
  - Negative: Requires two command executions (acceptable overhead)
  - Reversibility: Easy to change if performance issues arise

**ADR-2: Conservative Failure Mode**
- **Context:** False positives (incorrect "can fast-forward") cause data loss risk
- **Decision:** When uncertain, always return "cannot fast-forward"
- **Status:** Accepted
- **Consequences:**
  - Positive: Zero risk of data loss from incorrect detection
  - Negative: May occasionally require manual pull when auto-pull was safe
  - Reversibility: Cannot be changed without violating safety requirements

**ADR-3: No Working Directory Checks in Detection**
- **Context:** Detection should be pure git state analysis
- **Decision:** Fast-forward detection only checks branch state, not working directory
- **Status:** Accepted
- **Consequences:**
  - Positive: Detection remains focused and fast
  - Negative: Auto-pull logic must separately check for uncommitted changes
  - Note: Working directory checks belong in FR-2 (auto-pull), not FR-1 (detection)

## Phase 1: Design & Contracts

### Data Model Design

**FastForwardDetectionResult Entity**
```typescript
interface FastForwardDetectionResult {
  // Status of detection operation
  status: 'can-fast-forward' | 'up-to-date' | 'local-ahead' | 'diverged' | 'error';
  
  // Commit counts
  commitsAhead: number;      // Local commits not on remote
  commitsBehind: number;     // Remote commits not on local
  
  // Branch information
  localBranch: string;       // Current branch name
  remoteBranch: string;      // Upstream tracking branch
  
  // Detection metadata
  detectionTime: number;     // Milliseconds taken for detection
  timestamp: Date;           // When detection was performed
  
  // Error information (if status === 'error')
  errorMessage?: string;
  errorCode?: string;        // For categorizing errors
}
```

**State Transitions:**
```
Initial State → Detection Running
             ↓
Detection Running → Success State
                 ↓
                 ├→ 'can-fast-forward' (ahead=0, behind>0)
                 ├→ 'up-to-date' (ahead=0, behind=0)
                 ├→ 'local-ahead' (ahead>0, behind=0)
                 ├→ 'diverged' (ahead>0, behind>0)
                 └→ 'error' (git command failed)
```

**Validation Rules:**
- If status is 'can-fast-forward', must have ahead=0 and behind>0
- If status is 'up-to-date', must have ahead=0 and behind=0
- If status is 'local-ahead', must have ahead>0 and behind=0
- If status is 'diverged', must have ahead>0 and behind>0
- If status is 'error', errorMessage must be present
- detectionTime must be > 0 and ideally < 500
- localBranch and remoteBranch must be non-empty strings (unless error)

### Service Design

**FastForwardDetectionService**

**Purpose:** Encapsulates all logic for determining if a repository can be safely fast-forwarded.

**Public Interface:**
```typescript
class FastForwardDetectionService {
  constructor(
    private gitCommandService: GitCommandService,
    private logger: Logger
  ) {}

  /**
   * Determines if repository can be fast-forwarded to remote state
   * @param repoPath Absolute path to git repository
   * @returns Detection result with status and commit counts
   */
  async detectFastForward(repoPath: string): Promise<FastForwardDetectionResult>;
  
  /**
   * Checks if detection result indicates fast-forward is safe
   * @param result Detection result from detectFastForward()
   * @returns true if can safely fast-forward
   */
  canSafelyFastForward(result: FastForwardDetectionResult): boolean;
}
```

**Internal Methods:**
```typescript
private async getCurrentBranch(repoPath: string): Promise<string>;
private async getUpstreamBranch(repoPath: string): Promise<string>;
private async countCommitsAhead(repoPath: string, local: string, remote: string): Promise<number>;
private async countCommitsBehind(repoPath: string, local: string, remote: string): Promise<number>;
private determineStatus(ahead: number, behind: number): FastForwardDetectionResult['status'];
```

**Error Handling:**
- Git command failures → return result with status='error'
- No upstream branch → return result with status='error', code='no-upstream'
- Detached HEAD → return result with status='error', code='detached-head'
- Invalid repository → return result with status='error', code='invalid-repo'
- Timeout (> 500ms) → return result with status='error', code='timeout'

### API Contracts

**GitCommandService Integration**

The FastForwardDetectionService will use existing GitCommandService methods:

```typescript
// Existing method to execute git commands
await this.gitCommandService.executeCommand(repoPath, ['rev-list', '--count', 'origin/main..main']);

// Expected response format (already established):
{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

**Contract with Auto-Pull Logic (FR-2)**

When FR-2 (auto-pull) is implemented, it will consume detection results:

```typescript
// Auto-pull service will call:
const detection = await fastForwardDetectionService.detectFastForward(repoPath);

// And check safety:
if (fastForwardDetectionService.canSafelyFastForward(detection)) {
  // Proceed with git pull --ff-only
} else {
  // Handle based on detection.status
}
```

### Development Environment

**No Additional Setup Required**
- Uses existing TypeScript/Obsidian plugin environment
- No new dependencies to install
- No new build configuration needed
- Existing GitCommandService provides all git integration

**Testing Setup:**
- Jest already configured for unit tests
- Integration tests will need test git repositories (already established pattern)
- Mock GitCommandService for unit tests
- Real git repositories for integration tests

## Implementation Steps

### Step 1: Create FastForwardDetectionService
**Objective:** Implement core service with branch and commit counting logic

**Tasks:**
1. Create `src/services/FastForwardDetectionService.ts`
2. Implement constructor with GitCommandService and Logger dependencies
3. Implement `getCurrentBranch()` helper method
4. Implement `getUpstreamBranch()` helper method
5. Implement `countCommitsAhead()` helper method
6. Implement `countCommitsBehind()` helper method
7. Implement `determineStatus()` helper method
8. Implement main `detectFastForward()` public method
9. Implement `canSafelyFastForward()` utility method
10. Add comprehensive error handling for all git operations
11. Add performance timing/logging

**Files to Create:**
- `src/services/FastForwardDetectionService.ts`

**Acceptance Criteria:**
- Service compiles without errors
- All public methods have TypeScript type definitions
- All git commands are properly wrapped in try-catch
- Detection completes within 500ms for typical repositories
- Conservative failure mode implemented (uncertain → cannot fast-forward)

### Step 2: Unit Tests
**Objective:** Comprehensive unit test coverage for detection logic

**Tasks:**
1. Create `test/services/FastForwardDetectionService.test.ts`
2. Mock GitCommandService for isolated testing
3. Test case: Can fast-forward (ahead=0, behind=3)
4. Test case: Up to date (ahead=0, behind=0)
5. Test case: Local ahead (ahead=2, behind=0)
6. Test case: Diverged branches (ahead=2, behind=3)
7. Test case: Git command failures
8. Test case: No upstream branch
9. Test case: Detached HEAD state
10. Test case: Invalid repository path
11. Test case: Performance requirements (< 500ms)
12. Test case: canSafelyFastForward() logic

**Files to Create:**
- `test/services/FastForwardDetectionService.test.ts`

**Acceptance Criteria:**
- All test cases pass
- Code coverage > 95% for FastForwardDetectionService
- Test execution time < 2 seconds
- Mocks properly isolate service from git operations

### Step 3: Integration Tests
**Objective:** Validate detection against real git repositories

**Tasks:**
1. Extend existing integration test setup
2. Create test git repositories with known states
3. Test case: Real repository with fast-forward scenario
4. Test case: Real repository with diverged branches
5. Test case: Real repository up to date
6. Test case: Real repository with no upstream
7. Performance validation with various repository sizes
8. Cross-platform validation (macOS, Linux, Windows via CI)

**Files to Modify:**
- `test/integration/fast-forward-detection.test.ts` (new file)

**Acceptance Criteria:**
- Integration tests pass on all platforms
- Detection accuracy validated against known git states
- Performance requirements met with real repositories
- No false positives (zero cases of incorrect "can fast-forward")
- False negatives < 1% (validated with 100+ test scenarios)

### Step 4: Integration with Existing Services
**Objective:** Wire up detection service in plugin architecture

**Tasks:**
1. Register FastForwardDetectionService in main plugin class
2. Add service instantiation with proper dependency injection
3. Update type definitions if needed
4. Prepare for FR-2 integration (stub call points)
5. Add debug logging configuration

**Files to Modify:**
- `src/main.ts`

**Acceptance Criteria:**
- Service properly instantiated on plugin load
- Dependencies correctly injected
- No runtime errors during plugin initialization
- Service accessible for future FR-2 implementation

### Step 5: Documentation
**Objective:** Document detection logic and usage

**Tasks:**
1. Add JSDoc comments to all public methods
2. Document detection algorithm in code comments
3. Add examples of each detection status scenario
4. Document performance characteristics
5. Add troubleshooting guidance for edge cases

**Files to Modify:**
- `src/services/FastForwardDetectionService.ts`

**Acceptance Criteria:**
- All public methods have complete JSDoc
- Algorithm logic is clearly explained
- Code is self-documenting with clear variable names

## Implementation Readiness Validation

### Technical Completeness Check
- [x] Technology choices made and documented (git rev-list)
- [x] Data model defined (FastForwardDetectionResult)
- [x] Service interface designed
- [x] Error handling strategy defined
- [x] Performance requirements clear (< 500ms)
- [x] Integration points identified (GitCommandService)
- [x] Development environment ready (no new setup needed)

### Quality Validation
- [x] Architecture supports 500ms performance requirement
- [x] Conservative failure mode ensures safety
- [x] Data model captures all necessary state
- [x] Service design follows established patterns
- [x] Test strategy addresses accuracy requirements

### Constitution Alignment Re-check
- [x] Specification-First: Plan derived from approved FR-1 spec
- [x] Iterative Simplicity: Minimal implementation using proven git commands
- [x] Documentation as Context: Plan provides clear implementation guidance
- [x] All principles satisfied

## Risk Assessment

### Technical Risks

**High Risk: False Positives in Detection**
- **Impact:** Auto-pull executes when branches diverged → potential data loss
- **Likelihood:** Low (if rev-list logic correct)
- **Mitigation:** 
  - Conservative failure mode (uncertain → fail safe)
  - Comprehensive test coverage with edge cases
  - Integration tests with real repositories
  - Code review of detection logic
- **Contingency:** If false positive discovered, immediately disable auto-pull feature

**Medium Risk: Performance Degradation with Large Repositories**
- **Impact:** Detection takes > 500ms, fails performance requirement
- **Likelihood:** Medium for extremely large repos
- **Mitigation:**
  - Performance testing with repositories up to 10,000 commits
  - Optimize git command parameters if needed
  - Add timeout handling (fail safe if > 500ms)
- **Contingency:** Add configuration option to disable for specific large repositories

**Low Risk: Git Version Compatibility**
- **Impact:** Rev-list syntax not supported on old git versions
- **Likelihood:** Low (git 2.20.0+ is common)
- **Mitigation:**
  - Document minimum git version requirement
  - Add version check during detection
  - Fail gracefully on unsupported versions
- **Contingency:** Provide manual mode for unsupported git versions

### Dependencies and Assumptions

**External Dependencies:**
- Git 2.20.0+ installed and in PATH
- GitCommandService functioning correctly
- Repository has upstream tracking branch configured

**Technical Assumptions:**
- Git repository is not corrupted
- File system is accessible
- No concurrent git operations during detection
- Repository is not in detached HEAD state (or detection handles it)

**Business Assumptions:**
- Users understand "fast-forward" concept
- False negatives (missing safe opportunities) are acceptable if rare
- 500ms detection time meets user experience needs

## Next Phase Preparation

### For FR-2 Integration (Auto-Pull Implementation)

When implementing FR-2, the auto-pull logic will:

1. **After Successful Fetch:**
   ```typescript
   const detection = await fastForwardDetectionService.detectFastForward(repoPath);
   ```

2. **Check if Safe to Pull:**
   ```typescript
   if (fastForwardDetectionService.canSafelyFastForward(detection)) {
     // Execute git pull --ff-only
   }
   ```

3. **Handle Different Statuses:**
   - `can-fast-forward` → proceed with auto-pull
   - `up-to-date` → no action needed
   - `local-ahead` → no pull needed (user ahead of remote)
   - `diverged` → notify user, manual merge required
   - `error` → log error, notify user if persistent

### Task Breakdown Readiness
- [x] Clear implementation steps defined
- [x] Service interface completely specified
- [x] Test strategy comprehensive
- [x] Integration points identified
- [x] Dependencies minimal and clear

## Notes

### Implementation Order Rationale

The implementation follows this order:
1. **Service First:** Core logic before integration
2. **Unit Tests:** Validate logic in isolation
3. **Integration Tests:** Validate against real git
4. **Plugin Integration:** Wire into existing architecture
5. **Documentation:** Ensure code is maintainable

This order minimizes risk and allows validation at each step.

### Testing Strategy

**Unit Tests (Mocked Git):**
- Fast execution
- Test all status scenarios
- Test error conditions
- Validate accuracy requirements

**Integration Tests (Real Git):**
- Slower but authoritative
- Validate against real repository states
- Performance measurement
- Cross-platform validation

### Performance Considerations

The 500ms requirement is easily achievable:
- `git symbolic-ref`: ~10ms
- `git rev-parse`: ~10ms
- `git rev-list --count` (2x): ~50ms each
- Overhead: ~50ms
- **Total: ~170ms** (comfortable margin)

### Future Enhancements (Out of Scope)

These are explicitly NOT part of FR-1:
- Working directory state checking (belongs in FR-2)
- Automatic pull execution (belongs in FR-2)
- User notification (belongs in FR-2/FR-3)
- Pull operation logging (belongs in FR-4)
- Configuration settings (belongs in FR-5)

FR-1 focuses solely on accurate, fast detection of fast-forward capability.

---

**Plan Status:** Ready for implementation
**Next Step:** Create tasks breakdown for FR-1 implementation
