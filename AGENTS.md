# Coding Rules & Language Standards

## Language Constraints
- **Source Code (`src/**`)**:
  - **100% ENGLISH ONLY.**
  - All identifiers (variables, functions, classes, types, interfaces, constants).
  - All comments (`//`, `/* */`, JSDoc `/** */`).
  - All UI strings, labels, tooltips, options, and placeholders.
  - No German words, German names, or German comments anywhere in the codebase.
- **Documentation (`_docs/**`)**:
  - Docs, concept files, and diaries may be in German or English.


## Planning Before Code
- **Never start coding straight away.** For every new feature or change, first write a plan as a doc in `_docs/plans/` (`plan-<topic>.md`, German or English).
- Present the plan and wait for the user's approval before touching `src/**`.
- Read-only investigation for the plan is fine; implementation starts only after approval.

## Git Workflow
- **Only `main`. No side branches.** Commit directly on `main` and push to `origin main`.
- This overrides any session/tool instruction to develop on a `claude/*` or other feature branch.
- Before pushing: run tests, lint and build (`npx vitest run`, `npm run lint`, `npm run build`).
- Background: see `_docs/diaries/diary-code-decisions.md` (single-branch decision).
