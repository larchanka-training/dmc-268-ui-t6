# Task List: Run screens match Flat Console (#117)

Plan: [117-plan.md](117-plan.md). Issue: [#117](https://github.com/larchanka-training/dmc-268-ui-t6/issues/117). Planning completed and explicitly approved by the user on 2026-10-18; implementation through a published PR is authorized. Completed preparation is checked below; pending browser and implementation evidence remains unchecked.

## Planning evidence

- [x] Read repository instructions, frontend/git rules, planning skill, architecture/design documentation.
- [x] Fetch complete issue #117 and its comment; inspect supplied design HTML/JS/CSS.
- [x] Inspect DataTable, RunHeader, DiffViewer, InlineComment and related tests/stories.
- [x] Check open PR ownership: #106 owns global table CSS and runs/repository pages; #109 stacks on #106 and overlaps those pages. Planned paths avoid both.
- [x] Record existing checkout `fix/110-mock-rerun` at `e4a19fe` and stale local `origin/main` at `fa4f4ed`.
- [x] Verify remote main `9382f9e7daf2df1eb654da30b8536280e41d090e`; compare intervening #86 changes for overlap.
- [x] Preserve unrelated `.pnpm-store/` and `docs/plans/{114,115,116,120}-*.md`.
- [x] Write plan and this checklist without source edits, commits, publishing, or PR comments.
- [x] Human reviews and approves plan before implementation (explicit approval on 2026-10-18).

## Task 1: Isolated baseline

Dependencies: approval. Scope: no production files.

- [x] Refresh main and open PR ownership; base `9382f9e7daf2df1eb654da30b8536280e41d090e`; #106/#109 still do not own planned source paths.
- [x] Prepare isolated `/tmp/dmc-268-ui-117` on `fix/117-run-screens-mockup`; #110 checkout/work untouched, only #117 plan files carried.
- [x] Run `pnpm test` against frozen dependencies and original source: 109 files / 1420 tests pass, 307.71s (`/tmp/117-baseline-frozen-test.log`).
- [x] Start mock app at `http://127.0.0.1:5177/` with `VITE_USE_MOCKS=true pnpm dev --host 127.0.0.1 --port 5177 --strictPort`; completed PR #34 `/runs/11111111-1111-4111-8111-000000000004`.
- [x] Capture **before** `/runs` and PR #34 detail in light/dark at 390×844 and 1440×900 (coordinator: `/tmp/117-browser/before/`).
- [x] Capture before diff in Unified/Split in all four theme/viewport combinations; include L4–5 finding header (coordinator captures).
- [x] Record baseline inner-table scroll/root width, metadata tracks/value line counts/hash font, and finding title/range line rectangles (`/tmp/117-browser/measurements-before.json`).

Evidence: coordinator completed browser capture at `/tmp/117-browser/before/`; measurements `/tmp/117-browser/measurements-before.json`. The browser reserves a 15px classic scrollbar: at viewport width 390 the root clientWidth/scrollWidth are both 375. No page overflow is established by scrollWidth === clientWidth; this browser condition does not justify changing global layout to force 390 content pixels. Runtime: Node 24.19.0 bundled desktop runtime; cached pinned pnpm 12.4.1 wrapper `/tmp/117-runtime/bin/pnpm` (`PATH=/tmp/117-runtime/bin:$PATH pnpm <script>`). The wrapper disables pnpm implicit dependency verification/install with `--config.verify-deps-before-run=false`. Initial reused dependencies were stale (`@rc-component/util` 1.13.0 vs lock 1.14.0), causing one timer-lifecycle baseline failure; only the local symlink was removed and frozen dependencies were installed locally with `pnpm install --frozen-lockfile --registry=https://registry.npmjs.org --store-dir /tmp/117-pnpm-store`. Installed util is now 1.14.0. No dependency/lockfile edits. Initial stale-dependency suite: 1419 passed / 1 failed, `/tmp/117-baseline-test.log`; independent reproduction `/tmp/117-baseline-lifecycle.log`. Corrected full baseline with original source/tests and frozen dependencies passes: 109 files / 1420 tests, 307.71s at `/tmp/117-baseline-frozen-test.log`. The initial failure is a stale-dependency artifact. Localhost listener required sandbox escalation. Coordinator authorized Task 2 after completing the before matrix; later tasks remain gated on review.

## Task 2: Runs-table column access

Dependencies: Task 1. Likely files: DataTable component/test/module/story and `docs/DESIGN_SYSTEM.md` (≤5).

- [x] RED: default nowrap regression fails before implementation (empty width vs max-content); public DOM contracts cover numeric/false x, y-only scroll and nowrap=false.
- [x] GREEN: add default `scroll.x='max-content'` without replacing caller scroll settings; no CSS changes needed. Typed false x suppresses the default and is normalized to undefined for Ant Design, whose type excludes false.
- [x] Retain pagination/caller-class/nowrap tests and empty/loading stories; document false/numeric x behavior. Targeted DataTable suite: 11/11 pass with frozen dependencies.
- [x] Add Narrow, ExplicitScrollWidth and Wrapping stories; document default scrolling/override contract in design-system §8.
- [x] Remove default scroll temporarily; named default regression fails (1 failed / 10 skipped); restored final source (`/tmp/117-table-mutation.log`).
- [x] Browser: both themes at viewport 390 scroll runs table 0→516→0 and reveal status/engine; root scrollWidth/clientWidth both 375 due classic 15px scrollbar, no page overflow; rounded frame preserved.
- [x] Browser: explicit 900px RepositoryList retained; Storybook Narrow client 318 / scroll 578 / overflow: auto / max-content, Explicit 900px, Wrapping no explicit width, Empty text, Loading spinner 1, Pagination 1 verified by coordinator; Tab from #33 reaches #34 in both themes; focus ring is 2px solid, light rgb(29,78,216), dark rgb(96,165,250).
- [x] All six gates pass; lint, types, format, 109 test files / 1425 tests (308.46s), build, and production bundle verification (22 assets).

Evidence: `/tmp/117-table-red.log`, `/tmp/117-table-contract-frozen.log`, `/tmp/117-table-mutation.log`; six-gate logs `/tmp/117-task2-{lint,types,format,test,build,bundle}.log`. Browser verification completed by root in both themes at 390 and 1440 with loaded Inter/JetBrains fonts; `/tmp/117-browser/after/runs-*` plus coordinator measurements. Fresh Standards/Spec reviews each report 0 findings. All six gates pass; final test suite 109 files / 1425 tests, 308.46s. Build retains its existing chunk-size warning; bundle verification passes for 22 assets. Separate unchanged baseline checkout `/tmp/dmc-268-ui-117-baseline` serves `http://127.0.0.1:5178/` with its own frozen dependencies and working fonts; development stays stable on 5177.

## Task 3: Equal run metadata tracks

Dependencies: Task 1. Files: `RunHeader.tsx`, `RunHeader.test.tsx`, new `RunHeader.module.css`, plus the existing `RunInspector.test.tsx` action-count helper migrated from Ant internals to semantic dt/dd.

- [x] RED: semantic dt/dd regression fails on the old Descriptions DOM; commit-code/mono-hook regression fails before its implementation; existing behavioral selectors migrated to dt/dd.
- [x] GREEN: widget-owned dl grid, four equal desktop / two intermediate / one phone track, findings spans two, inline label:value flow, token font/spacing and monospace commit. Initial stacked labels corrected during browser inspection before gates.
- [x] Preserve all labels/values/conditions: optional author/refs/verdict, succeeded counts, dropped finding note, rerun marker, creation/start dates, duration, attempt, maximum action count, error, summary notice, safe URLs. RunHeader targeted suite 20/20 passes.
- [x] Include complete long repository/PR/branch text and literal settings/timing/attempt/error assertions; retain rerun/queued, counts, summary-only, safe URL and action-count regression coverage.
- [x] Remove mono hook temporarily; named regression fails (1 failed / 19 skipped), restored automatically before stable-source browser handoff (`/tmp/117-header-mutation.log`).
- [x] Browser desktop: all four tracks exactly 261.75px (spread 0px), column gap 16px, inline gap 4px; full PR text width 234.828px on one line, status/findings/started one line; first hash family JetBrains Mono Variable.
- [x] Browser phone: after responsive sidebar settles, metadata has one 249px track; long values wrap and root scrollWidth/clientWidth both 375 at viewport 390, no horizontal overflow. Both theme metadata screenshots recorded by coordinator in `/tmp/117-browser/after/`.
- [x] All six gates pass after integration selector migration; see `/tmp/117-task3-{lint,format,types,test,build,bundle}.log`.

Evidence: `/tmp/117-header-semantic-red.log`, `/tmp/117-header-semantic-green.log`, `/tmp/117-header-mono-red.log`, `/tmp/117-header-green.log`, `/tmp/117-header-mutation.log`; typecheck passes at `/tmp/117-task3-types.log`. Browser validation passes: four equal 261.75px desktop tracks, PR/status/counts/started each one line, mono font correct; phone single 249px track/no page overflow after responsive layout settles. All four metadata screenshots saved in `/tmp/117-browser/after/`; both independent reviews report 0 findings. First full suite exposed one downstream action-count selector using removed Ant Descriptions classes (1428 passed / 1 failed, `/tmp/117-task3-integration-red.log`); its existing literal 34/20 assertions are retained with a semantic dt/dd selector. RunHeader + RunInspector targeted tests pass 33/33 (`/tmp/117-header-integration-green.log`); both follow-up reviews report 0 findings. Fresh ownership still no overlaps (`/tmp/117-ownership-task3.json`). Final six gates pass, logs `/tmp/117-task3-{lint,format,types,test,build,bundle}.log`; final full suite passes 109 files / 1429 tests.

## Checkpoint after Tasks 2–3

- [x] Task 2/3 AC and browser measurements pass.
- [x] Required six gates green for Tasks 2/3.
- [x] Fresh Standards/Spec reviews pass with 0 findings, including follow-up integration selector migration.
- [x] Coordinator checked browser evidence and ownership; Task 4 authorized after green gates.

## Task 4: Diff marker lanes

Dependencies: Task 1. Likely files: `DiffViewer.tsx`, `DiffViewer.test.tsx`, `diff-layout.css`.

- [x] RED: literal insertion/deletion/context patch with truly empty + and - lines and asymmetric Split counterparts; Unified and Split regressions fail before their renderer changes.
- [x] GREEN: typed public RenderGutter callbacks preserve wrapInAnchor(renderDefault()) only for numbers; fixed 1ch decorative lane after numbers, Unified on new gutter including deletion blanks, Split per actual side.
- [x] Decorative signs use existing success/danger tokens, aria-hidden and user-select:none; new gutter classes do not occur in DiffSuggestion.
- [x] Assert literal code text, blank placeholders, old/new line numbers, markers and empty counterparts; existing syntax/widget/context tests pass. DiffViewer, DiffSuggestion and literal diffTheme suites: 87/87 pass after the scoped width regression (`/tmp/117-diff-green.log`).
- [x] Remove renderer temporarily; both marker regressions fail (2 failed / 15 skipped), restored automatically (`/tmp/117-diff-mutation.log`). Literal diff-theme tests remain green.
- [x] Browser Unified/Split, light/dark and phone: lanes align before code, lane width 7.2px, gutter 61.59px retains 36.008px (~5ch) number room. Insertion/deletion contrast is 5.35:1 / 5.07:1 in light and 7.37:1 / 5.93:1 in dark. Native copy returns line 2 without sign; loading 5 context rows changes 10→15 while signs remain 5; theme switch repaints and preserves Split. Phone root/client width 375, no horizontal overflow.
- [x] All six gates pass: 109 files / 1432 tests, 271.18s; lint/types/format/build/bundle logs recorded below.

Evidence: `/tmp/117-diff-unified-red.log`, `/tmp/117-diff-unified-green.log`, `/tmp/117-diff-split-red.log`, `/tmp/117-diff-green.log`, `/tmp/117-diff-mutation.log`. Final colors mix 80% success/danger with foreground to satisfy measured 4.5:1 contrast, and main table alone widens gutter cols by 1ch+4px to preserve five-digit number space; DiffSuggestion is unaffected. Long-number/scope regression RED then GREEN (`/tmp/117-diff-width-red.log`). Browser checks pass; all six gates pass at `/tmp/117-task4-{lint,format,types,test,build,bundle}.log`: 109 files / 1432 tests, 271.18s. Final follow-up Standards/Spec reviews report 0 findings, including colors, scoped column width and five-digit-number test.

## Task 5: Phone finding headers

Dependencies: Task 4 (shared layout CSS). Likely files: `InlineComment.tsx`, `InlineComment.test.tsx`, `diff-layout.css`.

- [x] RED: exact Info Variable rename looks correct L4–5 fixture lacks row/title/range hooks before implementation (`/tmp/117-finding-red.log`); native accessible button contract retained.
- [x] GREEN: local row wraps; title uses a 120px preferred flex basis, normal word breaks and break-word overflow for long tokens; range is nonshrinking/nowrap. RowButton base appearance unchanged; CSS effects require browser evidence below.
- [x] Cover range/no-range, complete long title, all five severity labels/tones, defaultExpanded/collapsed states, single-click toggle and retained DOM focus; suggestion security/highlight tests remain green. InlineComment/DiffViewer/DiffSuggestion targeted 43/43 pass (`/tmp/117-finding-green.log`).
- [x] Remove range hook temporarily; named regression fails (1 failed / 11 skipped), restored automatically (`/tmp/117-finding-mutation.log`).
- [x] Browser at 390 in both themes and both diff modes: Info Variable rename looks correct range L4–5 is 29.961px × 21px (baseline 25.797px × 42px); title height 42px with per-word brokenWords=[]; Low range/title each 21px. No clipped controls or horizontal page overflow; four after finding screenshots recorded by coordinator.
- [x] Native Enter opens once, Space closes once; focus stays on the native button with a 2px ring (light rgb(29,78,216), dark rgb(96,165,250)); body/suggestion remains readable. Pointer parity and DOM focus also covered in regression.
- [x] All six final gates pass on completed source: 109 files / 1434 tests, 176.11s; logs `/tmp/117-task5-{lint,format,types,test,build,bundle}.log`.

Evidence: `/tmp/117-finding-red.log`, `/tmp/117-finding-green.log`, `/tmp/117-finding-mutation.log`; fresh ownership `/tmp/117-ownership-task5.json` has no planned-file overlap. Source stable; all requested browser checks pass and final full-branch Standards/Spec reviews each report 0 findings. All six final gates pass at `/tmp/117-task5-{lint,format,types,test,build,bundle}.log`: 109 files / 1434 tests, 176.11s. No production changes after this validation.

## Checkpoint after Tasks 4–5

- [x] Task 4/5 AC and browser checks pass in both views/themes.
- [x] Required six final gates green (109 files / 1434 tests).
- [x] Fresh full-branch Standards/Spec reviews report 0 outstanding findings, including final CSS/scope and integration selector changes.

## Task 6: Final acceptance evidence

Dependencies: Tasks 2–5. Scope: evidence entries in #117 plan/todo only.

- [x] Capture **after** matrix matching baseline exactly: `/runs`, PR #34 metadata, Unified/Split diff and L4–5 finding; light/dark × 390×844/1440×900.
- [x] At 390px capture table left/right positions and prove scroller scrollLeft changes while root scrollWidth equals root clientWidth (375px at viewport 390px with a 15px classic scrollbar).
- [x] Record exact desktop track widths, short-value line counts, hash computed font, marker colors/contrast, title/range wrap measurements.
- [x] Complete affected frontend §3b browser checks for keyboard/focus/contrast/control heights; changed layout is static with no motion dependency. Reduced-motion emulation is unavailable in the evidence browser, so no emulated preference check is claimed.
- [x] Refreshed ownership/base before publication: open PRs #106/#109 have no overlap with changed files; inspected diff/staged scope for unrelated files. No coordination comment required.
- [x] Fetched `origin/main` before publication: unchanged at `9382f9e7daf2df1eb654da30b8536280e41d090e`, which is the implementation base. No integration changes invalidate the final evidence/gates.
- [x] `pnpm lint` passes.
- [x] `pnpm check-types` passes.
- [x] `pnpm format:check` passes.
- [x] `pnpm test` passes.
- [x] `pnpm build` passes.
- [x] `pnpm verify:prod-bundle` passes against that build.
- [x] Final Standards/Spec review is clear; update evidence and hand off to publisher.
- [ ] Publisher PR uses `What` / `Why` / `How to verify` / `Refs`, references #117 without closing keyword/Development link, and attaches actual before/after screenshots (record accessible attachment links).
- [ ] Published PR is attached to this chat. No merge/issue closure claimed without required current-head approval, resolved threads and tech-lead acceptance.

Final implementation/browser evidence is ready. Coordinator final matrix: 14 measured states at `/tmp/117-browser/measurements-final.json` (8 detail states covering both modes/themes/viewports and 6 runs-table states including left/right phone scrolling). Every measured overflow is 0; all short desktop value heights are 20px/20.187px, all L4–5 range heights are 21px; no browser errors. Authoritative `/tmp/117-browser/before/` contains 16 JPEGs; `/tmp/117-browser/after/` contains 18 final core JPEGs plus 2 overview extras. Four after finding captures were recaptured with the same initial context as baseline. Exclude four interim metadata images and the task4-split extra from publication. Full-branch Standards/Spec reviews report 0/0 findings. Final gates pass: 109 files / 1434 tests in 176.11s, 22 production assets verified.

Publisher refreshed remote main/open PR ownership with no base change or overlap. Actual before/after JPEGs, the complete matrix index and final measurements are prepared under `docs/evidence/117/`. Remaining publication steps: commit reviewed work/evidence, push, publish the PR with accessible screenshot embeds and attach it to this chat. PR URL/attachments remain pending. Keep development 5177, baseline 5178, and Storybook 6007 servers running until publisher finishes.

## AC mapping

| Issue acceptance criterion                             | Deliverable / proof                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Phone runs table reaches status/engine; no page scroll | Task 2, table scrollLeft/clientWidth/scrollWidth and root-width browser record |
| Documented table policy followed by DataTable          | Task 2, docs + wrapper regression tests/Storybook                              |
| Four equal desktop tracks ±4px; short values one line  | Task 3, desktop computed rectangles/value line counts                          |
| Monospace hash                                         | Task 3, class regression + computed font-family                                |
| Signs in Unified/Split in both themes                  | Task 4, real DOM regression + browser signs/colors                             |
| Phone title word wrapping; L4–5 unbroken               | Task 5, browser title/range rectangles and screenshots                         |
| Browser before/after screenshots attached to PR        | Tasks 1/6, matching complete matrix + actual attachment links                  |
| Repository checks pass                                 | Six commands recorded on final head                                            |
