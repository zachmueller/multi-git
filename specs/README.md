# Specifications Directory

This directory contains feature specifications following the project's constitutional principles.

## Purpose

All feature specifications are stored here before implementation begins. This aligns with the project's **Specification-First Development** principle.

## Structure

Each specification should:
- Use the spec template from `.clinerules/templates/spec-template.md`
- Be named descriptively (e.g., `repository-list-view.md`, `auto-commit-feature.md`)
- Reference the project constitution's principles
- Define clear requirements and success criteria

## Workflow

1. **Create Spec**: Use the `specify` workflow to create a new specification
2. **Review & Approve**: Ensure spec aligns with constitutional principles
3. **Plan Implementation**: Use the `plan` workflow to create an implementation plan
4. **Implement**: Follow the approved plan to build the feature
5. **Update Status**: Mark spec as "Implemented" when complete

## Status Values

- **Draft**: Specification in progress
- **Approved**: Ready for implementation planning
- **Implemented**: Feature has been built
- **Deprecated**: No longer relevant or superseded

## Example Naming

- `core-plugin-architecture.md` - Initial plugin setup
- `repository-status-display.md` - Show repo status in UI
- `batch-git-operations.md` - Perform operations across multiple repos
