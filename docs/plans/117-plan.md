# Implementation Plan: Run screens match Flat Console (#117)

## Overview

Implement [issue #117](https://github.com/larchanka-training/dmc-268-ui-t6/issues/117): make every runs-table column reachable at 390px without page overflow, give run metadata four equal desktop tracks with a monospace commit hash, add visible change signs in Unified and Split diffs, and keep finding titles/ranges readable on phones. The user approved this plan on 2026-10-18 and authorized implementation through a published PR. Tasks 1–6 and final verification are complete in the isolated checkout. [PR #141](https://github.com/larchanka-training/dmc-268-ui-t6/pull/141) is published ready for review with no reviewer assigned, as explicitly requested by the user; its body embeds the actual screenshots and links the complete committed evidence index.

## Evidence and starting point

- Human approval received on 2026-10-18. Task 1 checkout: `/tmp/dmc-268-ui-117`, branch `fix/117-run-screens-mockup`, freshly fetched base `9382f9e7daf2df1eb654da30b8536280e41d090e`. Fresh ownership check still finds #106/#109; planned source files remain unowned.

- Read the complete issue and its one comment on 2026-10-18. The comment confirms #104 was merged; its centering, narrow-screen documentation, pressed buttons, and transitions are out of scope.
- Inspected `AGENTS.md`, `.agents/README.md`, frontend/git rules, the planning skill, `docs/FRONTEND_ARCHITECTURE.md` §7, `docs/DESIGN_SYSTEM.md`, and the relevant components/tests.
- Read the supplied [mockup](https://reviewer-design-systems.vercel.app/app.html), `app-demo.js`, and `styles.css` with curl after web.open could not access the page. Its metadata uses four `minmax(0, 1fr)` tracks with a two-track findings item; the hash uses the mono font. Unified signs are present in the mockup. The issue explicitly requires signs in Split too, so its AC governs that mode.
- At planning, the original checkout was `fix/110-mock-rerun` at `e4a19fe6edc29af3bbf892e246adcfc2d715b6f5`. It contains unrelated #110 work; do not switch/reset/rebase that checkout as part of implementation.
- At planning, local `origin/main` was stale at `fa4f4ed0937bb161b85c7638cdfb37cf9077c10e`. Remote `main`, verified then with `git ls-remote`, was `9382f9e7daf2df1eb654da30b8536280e41d090e`. The intervening #86 merge changes filtering/RunDiff/RunDetailPage and architecture documentation, not the planned source files. Task 1 refreshed this base before implementation.
- The approved preparation used an isolated checkout based on refreshed `origin/main`, on `fix/117-run-screens-mockup`. Preserve `.pnpm-store/` and the untracked `docs/plans/{114,115,116,120}-{plan,todo}.md` files. Carry only these two #117 plan files into the isolated checkout.
- No source changes or repository gates were run during planning. Implementation baseline captures and tests are complete; verification evidence is recorded in the todo file.

## Architecture decisions

1. **Default overflow behavior belongs to `shared/ui/DataTable`.** For its default `nowrap=true`, supply `scroll.x = 'max-content'` when the caller did not provide an x value. Preserve an explicit x value (including an intentional false value), retain y/other scroll settings, and keep `nowrap=false` as the wrapping escape hatch. Do not add per-page widths or change `RunsPage`. Keep the outer rounded frame's `overflow: hidden`; the inner Ant Design content/body handles scrolling. Prefer no CSS change if Ant Design's scroll prop suffices; any needed wrapper layout CSS lives in `DataTable.module.css`. Document the default and overrides in the design system.
2. **Run metadata is a screen composite, owned by the run-inspector widget.** Replace content-driven `Descriptions` table layout with a semantic `dl`/`dt`/`dd` grid using existing Typography/Tag components and `--rv-*` tokens. Four equal desktop tracks, two intermediate tracks, one phone track; use the current responsive xs/sm/lg intent. Keep the findings item two tracks wide when there is room, as in the mockup. Use `min-width: 0`; allow genuinely long content to wrap without forcing unequal tracks or page overflow. Give the short hash `--rv-font-mono` (first family `JetBrains Mono Variable`). Short values on mock PR #34 remain single-line. Preserve every existing field, its conditions, safe PR URL handling, count semantics, dates, and summary-only notice. Do not hard-code the old 167px mockup card height: #96 added required date/origin fields.
3. **Diff signs use the existing renderer's public extension point.** Supply a typed `renderGutter` to `DiffViewer`. Keep the library's `renderDefault` and `wrapInAnchor` behavior for numbers, and append a fixed-width marker lane between the numbers and code. Unified places one sign after the new-side number gutter; Split places `-` on the old side and `+` on the new side, with no sign on empty counterpart cells. Context lines keep an empty aligned lane. Marker spans are decorative (`aria-hidden`, `user-select:none`) and use `--rv-success`/`--rv-danger` mixed 80/20 with `--rv-text` for sufficient contrast in both themes; main-table gutter columns reserve the original five-character number width plus the marker lane; source text and syntax token trees stay untouched. No dependency, parser change, DOM postprocessing, or library fork. Keep `DiffSuggestion` unchanged by scoping marker styles to the new gutter classes.
4. **Phone finding layout stays local to `InlineComment`.** Add semantic classes to its row/title/range and layout rules in `diff-layout.css`. Let the row wrap as necessary, give title text usable width with normal word wrapping, and keep the complete range nonshrinking/nowrap. Do not restyle the shared `RowButton` or Ant Design control appearance in widget CSS. Preserve one native button, expansion state, keyboard activation, and focus.
5. **No state/API/schema changes.** The change is presentation-only and retains FSD downward imports, existing TanStack Query/Zustand boundaries, mocks, filtering, navigation, and all unknown-input Zod parsing.

## Ownership and coordination

Open PR file ownership was checked on 2026-10-18 using `gh pr list --state open --json files`:

| PR                                                                                  | Relevant owned files                                                                                                                                                          | Plan                                                                                                                       |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [#106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106)                | `src/shared/ui/styles/antd.css`, `src/shared/ui/styles/antd.table.test.tsx`, `src/pages/runs/RunsPage*`, `src/widgets/repository-list/ui/RepositoryList*`, architecture/mocks | Avoid edits: shared wrapper scroll should fix the page. Verify RepositoryList's explicit `scroll={{ x: 900 }}` still wins. |
| [#109](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109), based on #106 | `RunsPage*`, `RepositoryList*`, architecture/mocks                                                                                                                            | Avoid edits; refresh ownership before implementation and publishing.                                                       |

No currently open PR owns the planned implementation paths below. If a real-browser failure proves `antd.css` must change, stop that dependent slice, comment on #106 with the concrete overlap and proposed coordination before editing, and record the coordination. Do not silently work around ownership by copying global Ant Design style rules into a screen. No PR comments are needed or posted during planning.

#114/#116 target adjacent `RunDiff.tsx`; avoid it. #128 was identified in the issue comment as a potential `RunDetailPage.tsx` overlap; avoid that file too. Recheck all open PRs after approval because ownership can change.

## Task list

### Task 1: Establish an isolated baseline

**Description:** After approval, prepare the #117 checkout from current main and capture a reproducible baseline before source edits.

**Acceptance criteria:**

- [x] The implementation checkout/branch is isolated from #110 and includes only #117 work; ownership is refreshed.
- [x] `pnpm test` baseline result is recorded: frozen dependencies, 109 files / 1420 tests pass at `9382f9e`; initial stale dependency failure classified in todo.
- [x] Before screenshots and measurements cover `/runs` and `/runs/11111111-1111-4111-8111-000000000004` (mock PR #34), in light/dark at 390×844 and 1440×900, with Unified/Split captures for the diff.

**Verification:** Run `VITE_USE_MOCKS=true pnpm dev` in the implementation checkout and use the real app/browser, selecting the PR #34 completed mock. Record theme, viewport, route, table content widths/overflow, metadata track starts/value line counts/hash computed font, and the L4–5 finding. View the reference mockup alongside it. Screenshot both table left/right positions at 390px. Baseline failures must be classified before edits.

**Dependencies:** Human approval. **Files likely touched:** #117 plan/todo evidence entries only. **Estimated scope:** Small, no production files.

### Task 2: Reach every runs-table column on phones

**Description:** Deliver the shared DataTable scrolling default and its documented contract, leaving caller pages untouched.

**Acceptance criteria:**

- [x] Default nowrap tables get intrinsic-width horizontal scrolling; explicit x/y settings and nowrap=false retain their intended behavior.
- [x] At 390×844, horizontal movement of the inner runs-table scroller reveals both «Статус ревью» and «Движок» while root scrollWidth equals clientWidth (375px with a 15px classic scrollbar at a 390px viewport); rounded corners remain correct in both themes.
- [x] The design-system rule and a narrow/wide Storybook example describe/show default scroll and explicit overrides; pagination, empty/loading, caller classes, and RepositoryList behavior are retained.

**Verification:** Write failing DataTable tests first for the wrapper's public scrolling defaults/overrides (assert actual Table DOM width/scroll config output, without pretending jsdom computes layout), then implement. Retain the wrapper/caller class test. Exercise default, explicit numeric x, explicit false x, y-only scroll, and nowrap=false. Prove a relevant test fails when default scroll is removed. Real browser checks actual scrollLeft movement, rightmost cells, containment, border/radius, keyboard access to the PR link, and explicit 900px RepositoryList behavior in both themes. Run the six-gate set below.

**Dependencies:** Task 1. **Files likely touched (maximum five):** `src/shared/ui/DataTable/DataTable.tsx`, `DataTable.test.tsx`, `DataTable.module.css` if needed, `DataTable.stories.tsx`, `docs/DESIGN_SYSTEM.md`. **Estimated scope:** Medium.

### Task 3: Read equal-width run metadata

**Description:** Deliver the four-track widget composite without dropping established metadata.

**Acceptance criteria:**

- [x] At 1440×900, the four track widths on mock PR #34 differ by at most 4px; short PR/status/findings/started values remain on one line, and computed hash font begins with the §4 mono family.
- [x] All current metadata and conditions survive (optional author/refs/verdict, succeeded-only counts, dropped-findings explanation, rerun-only origin, created/start dates, duration, attempt, maximum action count, error, summary-only notice, safe URLs).
- [x] At 390px metadata is readable with no root horizontal overflow; long titles/repositories/branches and dropped-findings text can wrap.

**Verification:** Write failing semantic DOM assertions for the new metadata structure and hash class, then retain/migrate existing behavioral tests from Ant Design selectors to label/value semantics. Add long-content and rerun/queued fixtures where needed. Remove the hash class to prove its regression test goes red. Measure grid track rectangles (including the two-track findings item), line rectangles, and computed font in the browser; compare screenshots in both themes. Run the six-gate set.

**Dependencies:** Task 1. **Files likely touched:** `src/widgets/run-inspector/ui/RunHeader.tsx`, `RunHeader.test.tsx`, new `RunHeader.module.css`. **Estimated scope:** Medium.

### Checkpoint: After Tasks 2–3

- [x] Six gates are green, with browser evidence for the table and metadata.
- [x] Standards/Spec review finds no table API regression, metadata loss, FSD violation, or owned-file conflict.
- [x] Coordinator reviewed evidence and remaining tasks; no material deviation required human input.

### Task 4: Distinguish diff changes with signs

**Description:** Add the marker lane through renderGutter in both views.

**Acceptance criteria:**

- [x] Each actual insertion has exactly one `+` and deletion one `-` in its dedicated gutter lane; Unified and both Split halves align correctly, including blank code lines, consecutive changes, and asymmetric pairs.
- [x] Context lines and Split empty counterpart cells have no change sign; code text, syntax spans, line numbers, comment anchoring, and context expansion remain correct.
- [x] Signs use diff-compatible theme tokens, repaint on theme change, and remain readable in both themes without adding tab stops or duplicate accessible names.

**Verification:** Add failing DiffViewer DOM tests in both view modes using a literal patch with insert/delete/context and empty/asymmetric changes. Assert signs per side/change, source-code text unchanged, existing widgets still attach to their lines, and no signs in unrelated suggestions. Remove the renderer to demonstrate RED. Existing literal diff-theme expectations must remain green. In the browser measure the lane placement and computed colors, check contrast against actual gutter backgrounds, switch themes without remount, select/copy code, open a finding, and load context. Run the six-gate set.

**Dependencies:** Task 1. **Files likely touched:** `src/widgets/diff-viewer/ui/DiffViewer.tsx`, `DiffViewer.test.tsx`, `diff-layout.css`. **Estimated scope:** Medium.

### Task 5: Read finding headers at 390px

**Description:** Give the finding row a word-wrapping title and an unbroken range while preserving its button behavior.

**Acceptance criteria:**

- [x] At 390×844, the PR #34 finding title wraps between words and its complete «L4–5» range stays on one line in both themes.
- [x] A longer title, all severity tags, range/no-range, and expanded/collapsed states remain readable without root overflow or clipped controls.
- [x] Clicking or pressing Enter/Space toggles once; focused rows retain visible focus after toggling.

**Verification:** First add a failing DOM contract regression for the title/range class hooks and preserved accessible button/expansion behavior in InlineComment tests. Prove RED by removing the range/title hook. Browser checks CSS effects, keyboard activation (jsdom does not synthesize Enter clicks), focus, wrapped line rectangles, and expanded suggestions. Run the six-gate set.

**Dependencies:** Task 4 (shared layout stylesheet; execute sequentially). **Files likely touched:** `src/widgets/diff-viewer/ui/InlineComment.tsx`, `InlineComment.test.tsx`, `diff-layout.css`. **Estimated scope:** Medium.

### Checkpoint: After Tasks 4–5

- [x] Six gates are green, both diff modes pass browser checks, finding words/ranges remain readable.
- [x] Fresh Standards/Spec review reports no findings; earlier findings were corrected and reverified.

### Task 6: Assemble acceptance evidence for review

**Description:** Repeat the baseline matrix after all changes and prepare reviewable evidence for the publisher.

**Acceptance criteria:**

- [x] Every implementation AC has concrete final browser measurements and matched before/after screenshots in both themes and viewport sizes; PR attachment publication is pending.
- [x] Six gates pass on the final isolated branch; all review findings are addressed, ownership was refreshed before publication, and the branch is current with main (`9382f9e`).
- [x] [PR #141](https://github.com/larchanka-training/dmc-268-ui-t6/pull/141) embeds actual screenshots and explains browser checks, unchanged data contracts, and the table default under `What` / `Why` / `How to verify` / `Refs`, referencing #117 without closing keywords or a Development link.

**Verification:** Use the matrix below, preserve evidence paths and commands in the todo file, and hand off to the agent-loop reviewer/publisher only after implementation verification. Creating a PR, approving it, resolving another reviewer's threads, board updates, and merging are not planning actions. One current-head approval and resolved threads remain merge requirements; the tech lead closes the issue after AC acceptance.

**Dependencies:** Tasks 2–5. **Files likely touched:** #117 plan/todo evidence entries only. **Estimated scope:** Small.

## Browser evidence protocol

Run the mock app with `VITE_USE_MOCKS=true pnpm dev`. Capture baseline and final states with identical fixture, theme, viewport, zoom, sidebar state, filters, selected file, diff mode, and finding expansion. Wait for fonts/data and layout stability; do not hide failures with CSS or edit mocks to produce convenient measurements.

| Surface           | Viewports         | Themes      | Required evidence                                                                                                                  |
| ----------------- | ----------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/runs`           | 390×844, 1440×900 | light, dark | Full page; at 390 also left/right table scroll positions, scrollLeft and scroller clientWidth/scrollWidth, root scrollWidth        |
| PR #34 run detail | 390×844, 1440×900 | light, dark | Metadata overview; four track widths within ±4px at desktop, PR/status/findings/started value line counts, hash font-family        |
| Same run diff     | 390×844, 1440×900 | light, dark | Unified and Split addition/deletion lanes; crop around L4–5 finding plus expanded header; computed sign colors/background contrast |

Store outside source, for example `/tmp/117-browser/{before,after}/<surface>-<mode>-<theme>-<width>x<height>.png`, plus a text/JSON measurement record. The final matching captures are committed under `docs/evidence/117/`, with a readable index and `measurements-final.json`; PR publication links that accessible evidence. Attach the actual files to the PR and record their attachment links; local paths alone do not satisfy the issue's PR evidence requirement. Include reference-design screenshots when available. At a 390px viewport require `document.documentElement.scrollWidth === document.documentElement.clientWidth` (375px in the evidence browser because its classic scrollbar occupies 15px) and separately prove inner table scroll, since page width alone missed the original bug.

Check the full frontend §3b list in the affected UI: keyboard, visible/preserved focus, one action per activation, accessible names, measured contrast, aligned control heights, narrow-screen containment, reduced motion, and no new single-key shortcut. Include Storybook DataTable narrow/default/override, empty/loading, and explicit-width RepositoryList smoke checks.

## Required verification gates

Every implementation slice must satisfy the project DoD; final verification records all six commands, with bundle verification after build:

```sh
pnpm lint
pnpm check-types
pnpm format:check
pnpm test
pnpm build
pnpm verify:prod-bundle
```

Use targeted `pnpm test <test-file>` while proving RED/GREEN, then the required suite. Tests use explicit Vitest imports, jsdom headers for DOM suites, cleanup after each test, literal spec expectations, and no per-assertion wait budget overrides. CSS classes/DOM contracts can be tested in Vitest; widths, wrapping, fonts, colors, actual scroll, and keyboard activation must be verified in the browser. Do not call those properties unit-tested merely because a class is present.

## Risks and mitigations

| Risk                                                             | Impact | Mitigation                                                                                                                                           |
| ---------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared table default changes explicit scrolling or rounded frame | Medium | Preserve caller scroll options; keep outer clipping; inspect actual inner scroller and Storybook/RepositoryList in both themes.                      |
| Four tracks still wrap or long metadata overflows                | High   | Match mock grid/counts span; measure short values at desktop; permit long values/mobile wrapping; preserve #96 fields instead of forcing old height. |
| Split library rendering pairs real/empty sides differently       | Medium | Use the public typed gutter callback, test asymmetric/blank changes, and inspect both halves in a browser before broadening renderer changes.        |
| Styling test passes while real layout is broken                  | High   | Before/after screenshot matrix plus computed measurements; mutation-check regressions only for what their assertions actually establish.             |
| Main or ownership changes during the loop                        | Medium | Isolated checkout from refreshed main; recheck open PR files before edits/publishing; coordinate on an owning PR before touching its paths.          |
| Reviewer evidence exists only on local disk                      | Medium | Publisher attaches screenshots to PR and records links before claiming issue AC complete.                                                            |

## Dependencies, sequencing, and open questions

There is no issue-level external blocker. Approval of this written plan is the development gate required by the agent-loop and planning skills. No additional product choice is needed: defaults, grid ownership, marker rendering, and evidence requirements are specified above. Task 1 precedes all code; Tasks 2/3/4 are independent in principle but should run as focused sequential slices through the loop; Task 5 follows Task 4 because both use `diff-layout.css`; Task 6 follows all changes. No new dependency is planned.
