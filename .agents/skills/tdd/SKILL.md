---
name: tdd
description: This skill should be used when building React/TypeScript features or fixing bugs test-first with Vitest, when the user mentions "red-green-refactor", or when component/store integration tests are needed.
metadata:
  version: 1.0.0
  source: instructor-pack
  adapted-for: frontend
---

# Test-Driven Development

TDD is the red → green loop. This skill makes that loop produce tests worth
keeping: what a good test is, where tests go, the anti-patterns, the rules.

Tests are Vitest 3, co-located as `*.test.ts(x)`, with explicit imports (no
globals: `import { describe, it, expect, vi } from 'vitest'`). Tag
DOM-dependent files with `// @vitest-environment jsdom` and call
`afterEach(() => { cleanup() })` from `@testing-library/react` in component
tests. See the stack rules file in `.agents/rules/` for full conventions.

## What a good test is

Tests verify behavior through public interfaces, not implementation details.
A good test reads like a specification — "user can submit an inline comment
on a diff line" — and survives refactors because it doesn't care about
internal structure. See [tests.md](tests.md) for examples and
[mocking.md](mocking.md) for mocking guidelines.

## Seams — where tests go

A **seam** is the public boundary you test at: a component's rendered output
and callback props, a store's exported actions and state, a Zod schema's
parse result. Tests live at seams, never against internals. Write down the
seams under test and confirm them with the user before writing any test:
"What's the public interface, and which seams should we test?"

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private
  helpers, or reads a store's internal state instead of its selector.
- **Tautological** — the assertion recomputes the expected value the way the
  code does. Expected values come from an independent source of truth — a
  known-good literal, the spec.
- **Horizontal slicing** — all tests first, then all implementation. Work in
  **vertical slices**: one test → one implementation → repeat.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code
  to pass it — don't anticipate future tests.
- **One slice at a time.** One seam, one test, one minimal implementation.
- **Refactoring is not part of the loop** — that's the `code-review` skill.
