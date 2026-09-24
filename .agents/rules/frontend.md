# Frontend rules

## 1. Non-negotiables

- Always use pnpm for dependencies (never npm/yarn).
- Never `--no-verify`.
- Run the gates before claiming done: `pnpm lint`, `pnpm check-types`,
  `pnpm format:check`, `pnpm test`, `pnpm build`.
- No new dependency without a line in the PR body.
- Never edit files owned by another open PR without a comment there.

## 2. Commands

<!-- SYNC: commands table mirrored in .agents/proposals/agents-md-draft.md § Commands -->

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

`pnpm-lock.yaml` is committed; `packageManager` is pinned in `package.json`; Node
≥ 20 is required (`engines` in `package.json`).

What enforces the gates today:

- CI (every PR): `pnpm build` (includes `tsc -b`) — the Docker image build in
  `.github/workflows/ci-cd.yml` runs it via `Dockerfile`.
- pre-commit (`.husky/pre-commit`): `lint-staged` on staged files — `eslint --fix`,
  `stylelint --fix`, `prettier --write` (`lint-staged.config.js`).
- pre-push (`.husky/pre-push`): `pnpm check-types`, `pnpm lint`.
- Enforced nowhere: `pnpm test`, `pnpm format:check` — run them yourself before
  claiming done.

## 3. Layout & boundaries

FSD lite: `app → pages → widgets → features → entities → shared`.

1. Imports only go down the layer order above — never sideways, never up.
2. Slices within the same layer never import each other.
3. `shared` never imports from `entities` or higher.
4. A component file exports components only — no mixed component + hook +
   type barrel.

Slice structure:

- `entities/<x>/{model/schemas.ts, api/index.ts, lib/, index.ts}`
- `widgets/<x>/{ui/*.tsx, model/{store,types}.ts, lib/, index.ts}`

No path aliases. Import another slice through its `index.ts` by relative path;
never deep-import its internals.

## 4. Language rules

- Strict TypeScript: no `any`; unknown external input goes through Zod at the
  boundary. `verbatimModuleSyntax` is on — use `import type` for type-only
  imports.
- React 19: function components only; `ref` is a regular prop (no `forwardRef`);
  follow the rules of hooks; do not derive state inside `useEffect` — derive it
  during render or with `useMemo`.
- Zod schemas are the single source of truth for a shape; infer TS types from
  them, not the other way round.
- Zustand is for UI state local to a widget only — never server data.
- TanStack Query is the server cache — do not duplicate server data in Zustand.
- Wire payloads use camelCase.

## 5. Testing

- Co-located: `src/**/*.test.{ts,tsx}` next to the code it tests.
- `setupFiles: src/test/setup.ts`; no `globals` — import explicitly:
  `import { describe, it, expect } from 'vitest'`.
- `afterEach(() => { cleanup() })` in every component test file.
- Every DOM-dependent test file starts with `// @vitest-environment jsdom` (the
  project default is `node`).
- Assert literal values taken from the spec — never derive an expected value
  from the implementation under test.
- Start from the proven templates in `.agents/templates/frontend/` (entity
  schema, pure function, widget component, Zustand store).

## 6. Review focus

Order: `security → correctness → performance → readability`. What linters
already enforce (formatting, import order, unused vars, quotes, semicolons) is
not review material — leave it to the linters and the formatter. FSD layer and
slice imports (§3) are not linted; check them by hand in every review.

## 7. References

- `docs/SYSTEM_DESIGN.md` — product architecture (this repo, `main`).
- `docs/FRONTEND_ARCHITECTURE.md` — FSD conventions in full.
- `.agents/skills/` — skill catalog (frontmatter contract in `.agents/README.md`).
- `AGENTS.md` (pending role 1) — cross-tool entry point; see
  `.agents/proposals/agents-md-draft.md` for the draft.
