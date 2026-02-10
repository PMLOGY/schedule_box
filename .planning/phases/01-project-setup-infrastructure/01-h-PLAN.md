---
phase: 01-project-setup-infrastructure
plan: h
type: execute
wave: 1
depends_on: []
files_modified:
  - Multiple files (39)
autonomous: true
gap_closure: true

must_haves:
  truths:
    - 'pnpm format:check exits with code 0'
  artifacts:
    - path: 'all source files'
      provides: 'Prettier-compliant code formatting'
  key_links: []
---

<objective>
Fix all Prettier code style violations across 39 files.

Purpose: Ensure consistent code formatting across the codebase
Output: All files pass `pnpm format:check`
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-project-setup-infrastructure/01-UAT.md
@.planning/debug/typescript-errors-diagnosis.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Auto-fix all Prettier violations</name>
  <files>Multiple files (39)</files>
  <action>
Run Prettier auto-fix to format all files with code style issues:

```bash
pnpm format --write
```

This will automatically format all 39 files reported by the format:check failure. Prettier will fix:
- Indentation inconsistencies
- Quote style (single vs double)
- Semicolon usage
- Line length violations
- Trailing commas
- Object/array formatting

No manual intervention needed - Prettier handles all formatting automatically.
  </action>
  <verify>
Run format check to confirm all files pass:
```bash
pnpm format:check
```

Should exit with code 0 and report no formatting issues.
  </verify>
  <done>All 39 files formatted correctly, `pnpm format:check` passes with exit code 0</done>
</task>

</tasks>

<verification>
- [ ] `pnpm format:check` exits with code 0
- [ ] No files listed as needing formatting
- [ ] Git diff shows only formatting changes (whitespace, quotes, etc.)
</verification>

<success_criteria>
All source files conform to Prettier style rules. Format check passes in CI/CD pipeline.
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-setup-infrastructure/01-h-SUMMARY.md`
</output>
