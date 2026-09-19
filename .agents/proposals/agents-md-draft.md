# DRAFT proposed by role 7 (issue #18) — role 1 owns `AGENTS.md`; this file is NOT `AGENTS.md`

Frontend variant — the api repo carries its own draft at the same path. Role 1 can adopt
this content as-is for `dmc-268-ui-t6/AGENTS.md`.

## Project

AI Code Reviewer, frontend (`dmc-268-ui-t6`) — Vite + React + TypeScript
client for the code-review product; consumes the FastAPI backend
(`dmc-268-api-t6`).

## Stack

Vite, React 18, TypeScript strict, Zod 4, Zustand 5, TanStack Query 5, antd 6, Vitest 3.2.

## Non-negotiables

- Always use pnpm for dependencies (never npm/yarn).
- Never `--no-verify`.
- No new dependency without a line in the PR body.
- Unknown external input goes through Zod at the boundary — never trust an
  API response's shape without parsing it.

## Commands

| Task         | Command                                                     | Source      |
| ------------ | ----------------------------------------------------------- | ----------- |
| Install      | `pnpm install` (bootstrap pnpm once: `npm install -g pnpm`) | main        |
| Dev server   | `pnpm dev`                                                  | main        |
| Lint         | `pnpm lint`                                                 | pending #26 |
| Format check | `pnpm format:check`                                         | pending #26 |
| Typecheck    | `pnpm check-types`                                          | pending #26 |
| Test         | `pnpm test`                                                 | pending #31 |
| Build        | `pnpm build`                                                | pending #26 |

## Layout

FSD lite (`app → pages → widgets → features → entities → shared`, imports
only flow downward, `shared` never imports `entities`); details in
[.agents/rules/frontend.md](../rules/frontend.md).

## Conventions

- Branches: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`,
  `deps-update-YYYY-MM-DD`, slug preferably `<issue>-<kebab-case>`.
- Commits: Conventional Commits, reference the issue (`(#N)` in the subject
  or `Refs #N` in the footer).
- PR title: conventional, ≤72 characters.
- PR body: `What` / `Why` / `How to verify` / `Refs`, in that order.
- One approving review required before merge.
- Rebase on `main` before requesting review.

## Where the details live

- `.agents/rules/` — stack and git-workflow rules.
- `.agents/skills/` — agent skills (agent-loop, code-review, tdd,
  pull-request, planning-and-task-breakdown, qa, e2e-test, manual-automation).
- `.agents/templates/` — code/test templates with proof blocks.

## What NOT to do

- Do not add a dependency without a line in the PR body.
- Do not duplicate server data in a Zustand store — TanStack Query is the
  server cache.
- Do not import sideways or upward across FSD layers.
- Do not skip the gates (`pnpm lint`, `pnpm check-types`, `pnpm format:check`,
  `pnpm test`, `pnpm build`) before claiming a task done.

## Note for role 1

`CLAUDE.md` should be the single line `@AGENTS.md`.
