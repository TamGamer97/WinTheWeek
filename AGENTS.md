# Project agent instructions

## Project context

Before making significant changes, read `docs/PROJECT.md`.

When making architectural decisions, changing important product behaviour,
or working around an existing non-obvious constraint, also read
`docs/DECISIONS.md`.

Inspect the existing implementation before introducing new patterns.

## Existing behaviour

Preserve existing behaviour unless the task explicitly changes it.

Do not remove, redesign, simplify, or revert existing functionality merely
because another implementation appears cleaner.

If existing code looks intentional but the reason is unclear, inspect
`docs/DECISIONS.md`, tests, relevant git history, and surrounding code before
changing it.

## Implementation

- Prefer existing patterns, utilities, and architecture.
- Keep changes scoped to the requested task.
- Avoid unrelated refactors.
- Do not duplicate existing functionality.
- Do not add dependencies unless justified.

## Verification

After changes:
- run relevant tests/checks
- verify affected existing flows
- check for regressions in related functionality

## Project documentation

At the end of every task, consider whether durable project knowledge changed.

Update `docs/PROJECT.md` only when current architecture, important product
behaviour, invariants, data relationships, major features, or important
system structure changed.

Update `docs/DECISIONS.md` only when an important non-obvious decision was
made whose reasoning future agents should know.

Do not update documentation for routine implementation details, normal bug
fixes, styling changes, temporary information, or facts obvious from the code.

Documentation describes the current system. It is not a task log or changelog.

When something changes, update the existing description and remove information
that is no longer true.

## This project, specifically

There is no test suite and no CI. "Run relevant tests/checks" means:

- `npx tsc --noEmit` — must be clean before considering any change done.
  This is the only automated gate the project has; treat a type error as a
  build failure.
- For a UI change, build and eyeball it: `npx expo export --platform web`,
  serve `dist/` (e.g. `python3 -m http.server`), and check the affected
  screens in both light and dark mode. There is no device/emulator in this
  environment, so anything Android-only (status bar color, overscroll glow,
  font-metric alignment) cannot be verified here — say so explicitly rather
  than claiming it was confirmed.
- There is no backend and no git repository in this working copy at the time
  of writing — do not assume `git log`/`git blame` are available; if a repo
  has since been initialized, prefer it as a source of history over guessing.
