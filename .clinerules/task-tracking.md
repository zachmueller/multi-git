# Task Tracking Standards

## MANDATORY: Keep tasks.md Synchronized

**When a `tasks.md` file exists and is being used to guide work, Cline MUST keep it up-to-date throughout the implementation process.**

### Core Requirement

If you are working from a `tasks.md` file (or any task tracking document referenced in the spec/plan):
- ✅ Update task status IMMEDIATELY after completing each step
- ✅ Add notes about implementation decisions or blockers
- ✅ Mark tasks as complete when verified working
- ✅ Update task descriptions if scope changes

### Update Triggers

Update the `tasks.md` file when:
1. **Completing a task** - Mark as complete `[x]`
2. **Starting a task** - Add "In Progress" indicator if needed
3. **Discovering blockers** - Add notes about what's blocking progress
4. **Scope changes** - Update task description to match reality
5. **Breaking down tasks** - Add sub-tasks if original task needs decomposition
6. **Finishing a work session** - Ensure status reflects current state

### Update Format

```markdown
- [x] Task description
  - Implementation notes if relevant
  - Any decisions made or issues encountered

- [ ] 🔄 Task in progress
  - Current status or blocker notes

- [ ] Future task (not yet started)
```

**Status Indicators:**
- `[x]` = Complete
- `[ ] 🔄` = In Progress (actively working on)
- `[ ]` = Not Yet Started (no emoji)

### When to Update

**During Implementation:**
- After each significant file modification
- When completing logical chunks of work
- Before committing changes to git
- Before responding to user with completion status

**DO NOT:**
- ❌ Leave tasks.md stale while making progress
- ❌ Bulk update all tasks at the end
- ❌ Forget to mark dependencies completed
- ❌ Update only when user asks for status

### Integration with Git Workflow

Since commits are mandatory after modifications:
1. Update `tasks.md` status for work completed
2. Stage the updated `tasks.md` along with implementation files
3. Commit with message mentioning task progress

Example:
```bash
git add src/feature.ts specs/1-feature/tasks.md
git commit -m "[Cline] Implement feature X: Complete task FR1.1

- Implemented feature.ts with core functionality
- Updated tasks.md to mark FR1.1 as complete
- Added error handling as discovered during implementation

---

{human_input}"
```

### Task File Location Patterns

Task files may appear at:
- `specs/{spec-name}/tasks.md` - Most common
- `specs/{spec-name}/checklists/*.md` - Detailed checklists
- Project root `tasks.md` - Project-wide tasks

**Always check spec/plan documents to identify which task files are in use.**

### Constitutional Alignment

This rule supports:
- **Specification-First Development**: Tasks derive from specs, keeping them current maintains spec integrity
- **Documentation as Context**: Up-to-date tasks provide essential context for AI and human collaborators
- **Iterative Simplicity**: Real-time updates prevent large documentation debt

### Quality Standards

- Task updates should be atomic with the work they describe
- Task notes should provide context for future work
- Task status should accurately reflect current implementation state
- Task files should be committed alongside implementation changes
