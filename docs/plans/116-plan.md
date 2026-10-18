# Implementation Plan: Findings filters on active runs (#116)

## Scope and baseline

Implement [issue #116](https://github.com/larchanka-training/dmc-268-ui-t6/issues/116): URL severity/search filters must leave the diff visible while a run is `queued`, `running`, or `publishing`, with a pending-findings message instead of a final empty result. An unknown `file=` must remain in the URL but must not appear selected or enable reset by itself.

Planning baseline: `origin/main` at `c1535766faae454c8a52a91ca1b82894b43b99ea` (2026-10-18). The shared checkout is `fix/110-mock-rerun` at `e4a19fe`; the relevant filter/page/widget files have no diff against that baseline. Do not base #116 on unrelated #110 commits. Leave `.pnpm-store/` and the concurrent `docs/plans/114-{plan,todo}.md` untouched. Use an isolated checkout from current `main` for implementation after plan approval and overlap coordination.

Read: `AGENTS.md`, `.agents/README.md`, frontend/git workflow rules, planning skill, `RunDiff.tsx`, `findingFilters.ts`, `FindingFiltersBar.tsx`, the page/widget/filter tests, FA §2/§6, UI test-plan pointer, canonical API `docs/TEST_PLAN.md` §§2/2.5, and UI `docs/CICD.md`. No product code or external state changed in planning.

## Findings and design

- `RunDetailPage` passes `commentsPending` but no run-completion state to `RunDiff`. The widget always uses content matches to hide files, even when the active run has not produced findings. Merely suppressing the empty message will leave the diff hidden.
- Keep run lifecycle knowledge on the page: derive a `findingsPending` boolean using the existing exported `isActive(run.status)` and pass it to the widget/bar (default false for existing callers). Do not conflate it with `/comments` loading or infer completion from an empty findings array. Failed/cancelled/skipped keep existing terminal behavior.
- During `findingsPending`, keep effective file selection working but suspend content-based file exclusion. Preserve selected severity/query in the controls and URL so they apply automatically when the run becomes terminal. Existing available cards can still be filtered by their content. Replace the final `Показано 0 из 0 замечаний` status with a short pending status such as `Замечания появятся после завершения прогона`; suppress final empty-results UI. When only comments are pending, retain the existing empty-message guard.
- Give `FindingFiltersBar` effective selected files, derived from its `fileOptions` through `effectiveFileFilter`, for both its Select value and reset eligibility. Keep raw parsed URL filters for persistence; do not write sanitized values back on mount, diff arrival, or status changes. A user action keeps the existing partial-change/URL merge contract. Mixed known/unknown files show only known chips; reset remains available for severity, nonempty URL query (including whitespace), or typed text.
- Keep `findingCardKey(id, searchActive)` tied to whether the URL query is nonblank. Do not add run status, pending state, query text, or result counts to keys. Active-to-terminal changes must not remount surviving cards and lose manual collapse/expansion. Retain whole-run highlight budget, outside-diff behavior, summary-only behavior, and no-controls compatibility.
- No new dependency, API/schema change, store, base-component style, or hook-navigation rewrite is needed. #86 remains separate.

## Ordered vertical tasks

1. **Active shared links:** add red mocked page cases for all three active statuses with severity and search URLs; add the pending prop and visible-diff behavior. Include a same-run transition to success proving content filters become effective without another navigation. Three source files and focused tests at most per task; details in the todo.
2. **Effective file controls:** change the two tests that currently require a foreign chip, add mixed/unknown-only/reset/loading regressions, then derive the controls from effective files without changing URL storage.
3. **Stability checkpoint:** add a surviving-card active-to-terminal regression and summary-only pending case; run existing search/remount, comments-loading, highlight-budget and URL-navigation coverage. Confirm new tests fail when the relevant change is reverted.
4. **Evidence and documentation:** update FA §6 (and only necessary §2 wording), run browser checks and six gates, collect real staging screenshots, then review/publish through the authorized agent loop. A missing staging after-fix capture remains an explicit unmet AC.

Tasks 1–3 share widget/bar contracts and run sequentially. Documentation/evidence can be prepared alongside verification after behavior is stable. Approval checkpoint: the user reviews these saved plans before development. This gate is separate from staging deployment availability.

## Acceptance matrix

| Scenario                                                                                                     | Expected assertion                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queued` / `running` / `publishing`, `?severity=critical` or `?q=unmatched`, comments already returned empty | Patched files remain visible; pending status present; final empty message and final zero-total status absent; URL unchanged                             |
| Active run becomes `succeeded`, unchanged query                                                              | Pending status disappears; normal count, filtering and empty state become effective                                                                     |
| Active run with effective file + content filters                                                             | Selected file stays visible even without a content hit; unrelated files stay excluded                                                                   |
| Unknown-only `?file=nope.py` on completed run                                                                | All findings/diffs remain, no selected file chip, reset disabled, URL unchanged                                                                         |
| Mixed valid and unknown files                                                                                | Only valid chip(s) and matching file(s); reset enabled; raw URL retained                                                                                |
| Unknown file plus severity, URL query, or typed search                                                       | Unknown chip absent; reset enabled for the real or clearable control state                                                                              |
| Valid file while `/diff` is delayed                                                                          | No URL cleanup; after arrival the valid file becomes selected and effective                                                                             |
| Search active while findings/pending status changes                                                          | Matching surviving card retains manual state; further typing preserves manual collapse; toggling nonblank/blank search retains established key behavior |
| Comments delayed; summary-only; no filter controls                                                           | Existing loading guard, summary-only list, and backward-compatible unfiltered behavior remain correct                                                   |

## Verification and evidence

Use mocked transport (`initMockTransport` / `withMockTransportOverlay`) and real `RunDetailPage` routing for the AC regression. Keep status/empty findings/comments deterministic through endpoint overlays or existing timeline snapshots; do not depend on wall-clock timing of the walking run. Existing static demo has five diff files and eleven displayed findings; only use literal expected values after confirming the chosen fixture. The walking mock timeline has all three active statuses and produces findings on success.

Focused suites: `RunDetailPage.filters.test.tsx`, `RunDiff.filters.test.tsx`, `FindingFiltersBar.test.tsx`, `findingFilters.test.ts`; also run existing `RunDetailPage.search.test.tsx` and URL-hook tests after integrating overlapping #122 changes. jsdom cannot prove layout, browser focus, or native Enter behavior. Browser QA must cover both themes, keyboard reset/clear/focus, narrow 390px layout, console/network errors, active URL and unknown-file URL. Start or reuse a confirmed local Vite listener with `VITE_USE_MOCKS=true`; browser screenshots there are mock evidence, not staging evidence.

Required gates before declaring implementation done, in order: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm verify:prod-bundle`. Last gate consumes the production build; do not build it with mock mode. Record exact results and any environmental limitation. Planning does not claim the full gate set passed.

### Staging path and limits

`docs/CICD.md` identifies the course staging UI as `https://staging-ui.dmc268-t6.axyi.ru`; requests under `/api/` go to the staging API. After authenticating through the normal UI, choose an accessible active run with a fetched diff, open a severity/search URL, and capture status, pending copy and visible patch together. For the second capture, choose a completed run (the issue used sandbox PR #2 with `calc.py`), append `?file=nope.py`, and show the unchanged URL, unselected Files control, disabled reset, and visible findings/diff. Record run IDs, URL, observed status, timestamp and deployed UI revision with the screenshots in the PR. A new rerun is a mutation and must be explicitly within the authorized testing scope before triggering one.

Current staging can supply **before-fix** evidence only. CI/CD deploys staging on `main`, not arbitrary PR branches; fixed-build screenshots require a permitted deployment containing this fix or post-merge capture. Do not deploy, merge, rerun, synthesize responses on the staging origin, or label local mock captures as staging proof to bypass that limit. Other possible blockers are no authorized browser session/workspace, no active run long enough to capture, missing `/diff`, or unavailable staging. These conditions have not been validated during planning. Document them honestly if encountered; the screenshots AC remains open until both real cases are captured on the fixed build.

## Coordination before code edits

The coordinator found open PR #122 (`fix/86-filter-query-navigation`) overlapping `RunDiff.tsx`, `FindingFiltersBar.tsx` and FA; #109/#106 also touch FA. Repo rules require a comment on another open PR before editing owned files. Planning creates only these new documents. No external comment has been sent; obtain authorization for the concrete coordination comments, or wait until the overlapping PRs merge and re-evaluate the touched files.

Proposed #122 comment: “Planning #116: active queued/running/publishing links should retain the diff with a pending-findings status; unknown file URL values will stay in the URL but disappear from the selected Files chips/reset state. This overlaps RunDiff.tsx, FindingFiltersBar.tsx and FA §6 with your #86 navigation work. I will preserve the navigation/debounce contract and coordinate the base before editing these files.”

Proposed #109/#106 comment, only if still open when editing FA: “#116 needs a small FA §6 update documenting active-run pending findings and effective selected file chips/reset. This overlaps your architecture document; I will keep the edit scoped to the finding-filters subsection and rebase after your changes.”

## Risks and checkpoints

| Risk                                                            | Mitigation                                                                                                      |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| #122 changes shared signatures/debounce and doc text            | Coordinate first; re-read merged diff and test navigation after rebasing                                        |
| Current shared branch contains unrelated work                   | Isolated checkout from current main; stage explicit #116 paths only                                             |
| Pending state accidentally used as completion or query identity | Derive from `isActive`; regression for terminal transition and surviving manual card state                      |
| Unknown URL value removed while diff loads                      | Read-time intersection only; delayed-diff and unchanged-address assertions                                      |
| Pending counter falsely claims final zero findings              | Use pending status in the same polite status region until completion                                            |
| Staging after-fix screenshots unavailable pre-merge             | Keep evidence AC open, record precise deployment/auth/run blocker, request only the concrete missing capability |

Checkpoint after tasks 1–2: focused suites pass and review the pending/effective-filter contract. Checkpoint after task 3: regression mutation checks and browser QA pass. Final checkpoint: six gates pass, docs match behavior, required real staging evidence exists (or explicitly remains blocked), independent standards/spec review is addressed, and the PR accurately distinguishes mocked, browser and staging evidence.

## Review round 1 follow-up (2026-10-18)

Approved scope remains #116. Review fixed point: `40dbe32787e4ca4b5b3c74ee09bf91c269f68a4b`.
Before follow-up edits, rebased onto `origin/main@6f5a122` (rebased implementation `8df4775`).
Main's #115 selection-state removal requires removing only the obsolete page-test fixture property.

- P2: distinguish selected-value assertions (all non-rest tags, independent of opacity) from visual
  responsive-chip assertions. Drain initial React work before negative assertions; prove the exact
  `value={effectiveFiles}` → `value={filters.files}` mutation fails all six affected bar cases.
- P2: preserve parsed unknown file values across visible Files selection changes and clearing, as
  severity changes already do. Keep unknown values hidden until file options make them known. Global
  Reset retains its existing contract and removes all filter params, including unknown files.
  Verify through the bar callback and routed page URLs, including a findings-only file becoming known.
- P3: add the direct bar pending-status test and settle `/comments` in the success-transition test.
  Correct delayed-diff bookkeeping: that regression existed and was extended with a chip assertion.
  Issue is On Review; current-head approval and all review threads resolved remain merge prerequisites.
- Deferred P3 suggestions: mock active-comment fixtures, terminal empty findings and stale/cancel copy
  are separate behavior changes. Patched pending rendering already has page coverage; do not edit
  `RunDiff.filters.test.tsx`, currently owned by #138, for a nonblocking duplicate test.
- Real fixed-build staging screenshots remain open: no authenticated session and no deployed fix.
  No merge, deployment or issue closure is authorized by this review iteration.
