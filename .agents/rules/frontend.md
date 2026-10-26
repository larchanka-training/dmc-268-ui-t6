# Frontend rules

## 1. Non-negotiables

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
- User docs (`docs-site/content/docs/`) follow
  [api `docs/CONTRIBUTING.md` §8](https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/CONTRIBUTING.md#8-пользовательская-документация):
  a PR that changes user-visible behavior updates them in the same PR, or links a follow-up
  issue in the PR body (`Refs`). Core pages index.mdx, how-it-works.mdx and features.mdx
  change only with an explicit review by the tech lead or a participant they appoint: for each
  changed core page the reviewer writes in Submit review «`<page>.mdx` прочитана целиком».
  Prefer adding to Roadmap or FAQ, or a status badge, over rewriting a core page. A PR that
  changes a mockup in `docs-site/components/dashboard/` or an app component it uses takes the
  docs pictures again (`pnpm --dir docs-site shots`) and commits `docs-site/public/screens/`
  with `docs-site/components/mockups/screens.json`.

## 2. Commands

<!-- SYNC: commands table mirrored in AGENTS.md § Commands — change both together -->

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

`pnpm-lock.yaml` is committed; `packageManager` is pinned in `package.json`; Node
≥ 22.22.0 is required (`engines` in `package.json`).

What enforces the gates today:

- CI (every PR and every push to `main`): all six gates, `pnpm verify:prod-bundle` last, after
  the build, then the `landing` and `docs-site` package gates — the `UI quality` job in
  `.github/workflows/ci-cd.yml`, a required status check on `main` (`docs/CICD.md` §8). Root
  `pnpm lint` covers `landing/` and `docs-site/` too.
  The Docker image build in the same workflow runs `pnpm build` once more via
  `Dockerfile`.
- pre-commit (`.husky/pre-commit`): `lint-staged` on staged files — `eslint --fix`,
  `stylelint --fix`, `prettier --write` (`lint-staged.config.js`).
- pre-push (`.husky/pre-push`): `pnpm check-types`, `pnpm lint`.

## 3. Layout & boundaries

FSD lite: `app → pages → widgets → features → entities → shared`.

1. Imports only go down the layer order above — never sideways, never up.
2. Slices within the same layer never import each other, except `entities/run` →
   `entities/review` (`FindingViewSchema` for `RunDetail.findings`; documented in
   `docs/FRONTEND_ARCHITECTURE.md` §1). `run/api` uses the review public index;
   `run/model/schemas.ts` file-imports `review/model/schemas.ts` so the api Zod
   snapshot generator can load it in Node ESM.
3. `shared` never imports from `entities` or higher.
4. A component file exports components only — no mixed component + hook +
   type barrel.

Slice structure:

- `entities/<x>/{model/schemas.ts, api/index.ts, lib/, index.ts}`
- `widgets/<x>/{ui/*.tsx, model/{store,types}.ts, lib/, index.ts}`

No path aliases. Import another slice through its `index.ts` by relative path;
never deep-import its internals.

Exception: the dashboard mockups in `docs-site/components/dashboard/` import slice internals of
`src/` (CSS Modules in `ui/`, `widgets/diff-viewer/lib/*`) by relative path, so the docs pictures
use the app's own styles. They are outside FSD and only feed `pnpm --dir docs-site shots`. A
rename in those files breaks `pnpm --dir docs-site check-types`/`build`, but a renamed CSS
Module class does not: after changing such a file, take the docs pictures again
(`docs-site/README.md`).

## 3a. Design system

The look of every screen comes from the design system in `src/shared/ui` (Flat Console):
Ant Design under our theme plus our own components. The numbers, the rules and the checklist
for a new component are in `docs/DESIGN_SYSTEM.md`; the showcase is `pnpm storybook`.

1. Take base components only from Ant Design (themed by `DesignSystemProvider`) and from
   `src/shared/ui`. Do not restyle them on a screen and do not bring a component from another
   library.
2. Write your own component only when it is a composite for a specific screen (a repository
   table, an action tree, a diff view). Build it from base components in `widgets`/`features`.
3. A base component that is missing or looks wrong is fixed in the design system first
   (`docs/DESIGN_SYSTEM.md` §9) and gets a story, and only then is used on a screen.
4. No raw colours, font sizes, radii or control heights in screen code: use the theme and the
   `--rv-*` tokens. Layout spacing of a screen is written in numbers of the 4px grid
   (`docs/DESIGN_SYSTEM.md` §5).
5. The look of an Ant Design component (colour, font, size, radius, border, inner spacing) is
   changed only inside `src/shared/ui`: a token in `theme/buildTheme.ts`, a rule in
   `styles/antd.css` or the CSS Module of a wrapper component. In the CSS Module of a screen
   `:global(.ant-…)` is allowed only to place a component in the layout of that screen (outer
   margin, width, grid position).
6. `Tag` and `Spinner` come from `src/shared/ui`, not from Ant Design.

## 3b. Before you open a UI pull request

Run this list in a real browser, in both themes. The gates do not catch any of it. The expected
values are in `docs/DESIGN_SYSTEM.md` §3, §5 and §7: this list says what to check, not what the
numbers are.

1. **Keyboard.** Every action is available without a mouse. A clickable row or card is not
   enough: put a link or a button inside it.
2. **Focus is visible.** Every focused element shows the focus of `docs/DESIGN_SYSTEM.md` §7:
   a 2px `--rv-link` ring on buttons and links; on fields a `--rv-link` border and halo, or only
   the halo while the field is in the error state. Check it after arrow keys too, not only after
   Tab, and on a field in the error state.
3. **Focus survives the action.** When the focused element disappears (a menu or a modal
   closes, a panel folds, a row is deleted), move the focus to the element the user would
   expect: the button that opened the menu, the button that undoes the fold. It must not fall
   back to the top of the page. This is not about `:focus-visible`, which only decides whether
   the ring is drawn.
4. **Nothing fires twice.** A key press that closes a menu must not reopen it; a click on a
   link inside a clickable row is one navigation.
5. **Names.** Every control has an accessible name. An icon-only button has `aria-label`. Text
   hidden from the eye but meant for a screen reader is clipped (`clip-path: inset(50%)`, as in
   `NavMenu.module.css`), never removed with `display: none`.
6. **Contrast.** Text is at least 4.5:1 against its background in both themes, including hover,
   pressed, empty and error states; disabled controls are exempt (WCAG 1.4.3). Measure the
   computed colours, do not judge by eye.
7. **Sizes.** Controls in one row have one height, one of the control heights of
   `docs/DESIGN_SYSTEM.md` §5. Measure with `getBoundingClientRect()`.
8. **Narrow screen.** At the narrow-screen width of `docs/DESIGN_SYSTEM.md` §5 (390px) the page
   has no horizontal scroll: `document.documentElement.scrollWidth` equals the viewport width.
9. **Reduced motion.** With `prefers-reduced-motion: reduce` nothing essential depends on an
   animation.
10. **No new shortcut** of a single key without a way to turn it off.

Tests for UI code, on top of §5:

- A test must fail when the behaviour in its title breaks. Before you commit, break the code on
  purpose (remove the line under test) and see the test go red.
- jsdom computes no styles (CSS Module classes are present, their rules are not applied) and
  does not turn Enter into a click: what depends on either is checked in the browser, and the PR
  body says so.
- A wrapper component has a test that its own CSS-module class stays next to a class of the
  caller.

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
- View state that is shared by link (finding filters) lives in URL search params,
  parsed with Zod at the boundary — never mirrored in a store.
- Wire payloads use camelCase.

## 5. Testing

- Co-located: `src/**/*.test.{ts,tsx}` next to the code it tests.
- `setupFiles: src/test/setup.ts`; no `globals` — import explicitly:
  `import { describe, it, expect } from 'vitest'`.
- `afterEach(() => { cleanup() })` in every component test file.
- One wait budget: `asyncUtilTimeout` in `src/test/setup.ts`. Do not pass `{ timeout }` to a
  single `waitFor`/`findBy*`; `testTimeout` in `vite.config.ts` is sized from it. Outside CI a
  run takes half of the cores (`maxWorkers`), so parallel runs do not starve each other.
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

- [`SYSTEM_DESIGN.md`][sd] — product architecture (`dmc-268-api-t6`, `main`).
- `docs/FRONTEND_ARCHITECTURE.md` — FSD conventions in full.
- `.agents/skills/` — skill catalog (frontmatter contract in `.agents/README.md`).
- `AGENTS.md` — cross-tool entry point (decided in #32).

[sd]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md
