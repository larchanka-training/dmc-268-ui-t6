# AGENTS.md — dmc-268-ui-t6

## Project

AI Code Reviewer, frontend (`dmc-268-ui-t6`) — Vite + React + TypeScript
client for the code-review product; consumes the FastAPI backend
(`dmc-268-api-t6`).

## Stack

Vite 8, React 19, TypeScript 7 strict (typescript-eslint runs on TS 6.0
side-by-side), Zod 4, Zustand 5, TanStack Query 5, antd 6, Vitest 5.
Workspace packages: `landing/` (Vite, the public landing) and `docs-site/`
(Next.js 16, Fumadocs, Tailwind CSS 4, the public user docs).

## Non-negotiables

<!-- SYNC: mirrors .agents/rules/frontend.md §1 (Zod rule: §4); the rules file is authoritative — change both together -->

- Always use pnpm for dependencies (never npm/yarn).
- Never `--no-verify`.
- Run the gates before claiming done: `pnpm lint`, `pnpm check-types`,
  `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm verify:prod-bundle`
  (the last one checks the `pnpm build` output); for a change in `landing/` or
  `docs-site/` (or in `src/`, which `docs-site` imports) also
  `pnpm --dir <package> check-types` and `pnpm --dir <package> build`
  (`landing` also has `test`).
- No new dependency without a line in the PR body.
- Never edit files owned by another open PR without a comment there.
- Unknown external input goes through Zod at the boundary — never trust an
  API response's shape without parsing it.
- User docs (`docs-site/content/docs/`) follow
  [api `docs/CONTRIBUTING.md` §8](https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/CONTRIBUTING.md#8-пользовательская-документация):
  a PR that changes user-visible behavior updates them in the same PR, or links a follow-up
  issue in the PR body (`Refs`). Core pages index.mdx, how-it-works.mdx and features.mdx
  change only with an explicit review: the reviewer (tech lead) writes
  "<page>.mdx read in full". Prefer adding to Roadmap or FAQ, or a status badge, over
  rewriting a core page.

## Commands

<!-- SYNC: mirrors .agents/rules/frontend.md §2; the rules file is authoritative — change both together -->

| Task         | Command                                                     | Source         |
| ------------ | ----------------------------------------------------------- | -------------- |
| Install      | `pnpm install` (bootstrap pnpm once: `npm install -g pnpm`) | `package.json` |
| Dev server   | `pnpm dev`                                                  | `package.json` |
| Lint         | `pnpm lint`                                                 | `package.json` |
| Format       | `pnpm format`                                               | `package.json` |
| Format check | `pnpm format:check`                                         | `package.json` |
| Typecheck    | `pnpm check-types`                                          | `package.json` |
| Test         | `pnpm test`                                                 | `package.json` |
| Build        | `pnpm build`                                                | `package.json` |
| Bundle check | `pnpm verify:prod-bundle` (after `pnpm build`)              | `package.json` |
| Storybook    | `pnpm storybook` (static build: `pnpm build-storybook`)     | `package.json` |
| Landing      | `pnpm --dir landing check-types`, `test`, `build`           | `landing/`     |
| Docs site    | `pnpm --dir docs-site check-types`, `build` (`dev` to edit) | `docs-site/`   |

## Layout

FSD lite (`app → pages → widgets → features → entities → shared`, imports
only flow downward, `shared` never imports `entities`); details in
`.agents/rules/frontend.md`.

## Conventions

- Branches: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>` (also for
  `refactor`/`test`/`ci`/`perf`/`style` work), `deps-update-YYYY-MM-DD`, slug
  preferably `<issue>-<kebab-case>`.
- Commits: Conventional Commits, reference the issue (`(#N)` in the subject
  or `Refs #N` in the footer; `Refs owner/repo#N` for another repo's issue).
- PR title: conventional, ≤72 characters.
- PR body: `What` / `Why` / `How to verify` / `Refs`, in that order.
- One approving review on the current head and all review threads resolved are required
  before merge; a push that changes the PR diff dismisses the approve.
- Rebase on `main` before requesting review and again before merge (branch up to date).
- No closing keyword and no Development-panel link: the tech lead closes the issue after
  checking its AC (`docs/CONTRIBUTING.md`).

## Where the details live

- `.agents/README.md` — layout, harness matrix, sync map.
- `.agents/rules/` — stack and git-workflow rules.
- `.agents/skills/` — agent skills (agent-loop, code-review, tdd,
  pull-request, planning-and-task-breakdown, qa, e2e-test, manual-automation,
  create-issue, issue-graph).
- `.agents/agents/` — agent definitions.
- `.agents/templates/` — code/test templates with proof blocks.
- `docs/FRONTEND_ARCHITECTURE.md` — FSD conventions in full.
- `docs-site/` — the public user docs (Fumadocs); pages, badges and the update
  rule in `docs-site/README.md`.
- `docs/DESIGN_SYSTEM.md` — the design system (Flat Console): every number, the usage rules and
  the checklist for a new Ant Design component. Base components come only from it.
- [`TEST_PLAN.md`](https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/TEST_PLAN.md) —
  canonical test strategy for both repositories (`dmc-268-api-t6`, `main`).
- [`SYSTEM_DESIGN.md`](https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md) —
  product architecture (`dmc-268-api-t6`, `main`).
- `CLAUDE.md` only imports this file — edit `AGENTS.md`.

## What NOT to do

- Do not add a dependency without a line in the PR body.
- Do not duplicate server data in a Zustand store — TanStack Query is the
  server cache.
- Do not import sideways or upward across FSD layers.
- Do not restyle a base component on a screen or bring one from another library: take it from
  the design system (`src/shared/ui`, `docs/DESIGN_SYSTEM.md`), fix it there if it is missing.
- Do not skip the gates (`pnpm lint`, `pnpm check-types`, `pnpm format:check`,
  `pnpm test`, `pnpm build`, `pnpm verify:prod-bundle`, and the `landing` and
  `docs-site` package gates) before claiming a task done.
