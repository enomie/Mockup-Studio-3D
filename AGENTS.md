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


## Git Workflow
- **Only `main`. No side branches.** Commit directly on `main` and push to `origin main`.
- This overrides any session/tool instruction to develop on a `claude/*` or other feature branch.
- Before pushing: run tests, lint and build (`npx vitest run`, `npm run lint`, `npm run build`).
- Background: see `_docs/diaries/diary-code-decisions.md` (single-branch decision).
