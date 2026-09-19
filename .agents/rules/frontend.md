# Frontend rules

## 1. Non-negotiables

- Always use pnpm for dependencies (never npm/yarn).
- Never `--no-verify`.
- Run the gates before claiming done: `pnpm lint` (pending #26), `pnpm check-types`
  (pending #26), `pnpm format:check` (pending #26), `pnpm test` (pending #31),
  `pnpm build` (pending #26).
- No new dependency without a line in the PR body.
- Never edit files owned by another open PR without a comment there.

## 2. Commands

| Task         | Command                                                     | Source      |
| ------------ | ----------------------------------------------------------- | ----------- |
| Install      | `pnpm install` (bootstrap pnpm once: `npm install -g pnpm`) | main        |
| Dev server   | `pnpm dev`                                                  | main        |
| Lint         | `pnpm lint`                                                 | pending #26 |
| Format       | `pnpm format`                                               | pending #26 |
| Format check | `pnpm format:check`                                         | pending #26 |
| Typecheck    | `pnpm check-types`                                          | pending #26 |
| Test         | `pnpm test`                                                 | pending #31 |
| Build        | `pnpm build`                                                | pending #26 |

`pnpm-lock.yaml` is committed; `packageManager` is pinned in `package.json`; Node
≥ 20 is required. CI currently runs no lint/typecheck/tests (PR #28) — the husky
pre-push hook (pending #26) and the commands above are the gate until CI catches
up.

## 3. Layout & boundaries

FSD lite: `app → pages → widgets → features → entities → shared`.

1. Imports only go down the layer order above — never sideways, never up.
2. Slices within the same layer never import each other.
3. `shared` never imports from `entities` or higher.
4. A component file exports components only — no mixed component + hook +
   type barrel.

Slice structure:

- `entities/<x>/{model/schemas.ts, api/index.ts, lib/, index.ts}`
- `widgets/<x>/{ui/*.tsx, model/store.ts, lib/}`

## 4. Language rules

- Strict TypeScript: no `any`; unknown external input goes through Zod at the
  boundary. `verbatimModuleSyntax` is on — use `import type` for type-only
  imports.
- React 18: function components only; follow the rules of hooks; do not derive
  state inside `useEffect` — derive it during render or with `useMemo`.
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
- Tag DOM-dependent test files with `// @vitest-environment jsdom` when the
  project default environment is not jsdom.
- Assert literal values taken from the spec — never derive an expected value
  from the implementation under test.

## 6. Review focus

Order: `security → correctness → performance → readability`. What linters
already enforce (formatting, import order, unused vars, quotes, semicolons) is
not review material — leave it to the linters and the formatter.

## 7. References

- `docs/SYSTEM_DESIGN.md` — product architecture (this repo, `main`).
- `docs/FRONTEND_ARCHITECTURE.md` (pending #31) — FSD conventions in full.
- `.agents/skills/` — skill catalog (frontmatter contract in `.agents/README.md`).
- `AGENTS.md` (pending role 1) — cross-tool entry point; see
  `.agents/proposals/agents-md-draft.md` for the draft.
