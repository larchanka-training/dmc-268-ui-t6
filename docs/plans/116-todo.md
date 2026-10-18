# Tasks: Findings filters on active runs (#116)

Plan: [116-plan.md](116-plan.md). Original implementation baseline `origin/main@c1535766faae454c8a52a91ca1b82894b43b99ea`.

## Entry checkpoint

- [x] User has reviewed and approved the saved plan (agent-loop gate).
- [x] Resolve current overlap with #122 and FA owners #109/#106; authorized coordination comments posted on #122 (6248951344), #109 (6248951788), #106 (6248952257).
- [x] Start an isolated checkout from latest main; `/private/tmp/dmc268-ui-116`, `fix/116-filters-from-link`, baseline `c153576`. Shared #110 branch and unrelated plans preserved.
- [x] Confirm baseline toolchain and fixture behavior; final six gates and new #116 regressions verified with exact results below.

## Task 1: Active shared links retain their diff

**Description:** Make active-run incompleteness explicit from the page to the widget and controls; apply content-based file hiding only when findings are ready.

**Acceptance criteria:**

- [x] Mocked real-page cases cover `queued`, `running`, `publishing` × severity/search URL, empty findings and completed comments: files remain visible, URL filters remain present, pending message replaces final zero count/empty state.
- [x] A valid file filter still limits files during pending; a same-run transition to success applies the original severity/search filter and normal count/empty state.
- [x] Existing widget callers default to completed behavior and `/comments` pending retains its existing empty-message guard.

**Verification:** Write failing assertions first; implement using `isActive(run.status)` and a separate `findingsPending` prop; run focused page/widget/bar tests; undo the pending guard temporarily to prove red, then restore. Full gates at final checkpoint.

**Dependencies:** Entry checkpoint.

**Files likely touched:** `src/pages/runs/RunDetailPage.tsx`, `src/pages/runs/RunDetailPage.filters.test.tsx`, `src/widgets/diff-viewer/ui/RunDiff.tsx`, `src/features/finding-filters/ui/FindingFiltersBar.tsx`.

**Estimated scope:** Medium (4 files).

## Task 2: Unknown file URL values have no selected control state

**Description:** Use the effective intersection for the Files Select and reset eligibility, preserving raw URL filters.

**Acceptance criteria:**

- [x] Unknown-only completed-run URL retains its exact address, displays every finding/diff, shows no foreign chip and disables reset.
- [x] Mixed valid/unknown values select only real files; unknown plus severity/query/draft text still enables reset for that clearable state, including whitespace-only search.
- [x] Delayed diff preserves valid file URLs until they can become effective; no sanitizing navigation occurs on rendering or data arrival.

**Verification:** Change the old foreign-chip bar/page expectations to fail first; add mixed/reset assertions and extend the existing delayed-diff test with the selected-chip assertion. Run bar, model, page-filter and widget-filter suites; remove effective projection temporarily to prove red. Full gates at final checkpoint.

**Dependencies:** Task 1 (shared bar contract).

**Files likely touched:** `src/features/finding-filters/ui/FindingFiltersBar.tsx`, its co-located test, `src/pages/runs/RunDetailPage.filters.test.tsx`.

**Estimated scope:** Medium (3 files).

## Checkpoint: User-visible cases

- [x] Focused suites pass for both issue cases and active-to-success transition.
- [x] Pending props distinguish active run state from comments loading.
- [x] Raw URL parser/writer and debounce/navigation semantics are unchanged.

## Task 3: Preserve card state through pending updates

**Description:** Lock down the interactions most likely to regress as display conditions change.

**Acceptance criteria:**

- [x] A matching card manually collapsed under a nonblank query remains collapsed when pending status changes and when more matching text is typed; starting/clearing search retains established expansion behavior.
- [x] Summary-only active runs keep their file list under content filters and show pending status; terminal summary-only filtering still works.
- [x] Existing no-controls, outside-diff, duplicate-merge and whole-run highlight-budget tests remain green.

**Verification:** Add focused widget rerender tests; retain `findingCardKey` unchanged unless the red test proves a necessary change. Run `RunDiff.filters.test.tsx`, page search and URL-hook suites; prove regressions detect status-dependent keys/content hiding. Full gates at final checkpoint.

**Dependencies:** Tasks 1–2.

**Files likely touched:** `src/widgets/diff-viewer/ui/RunDiff.filters.test.tsx`; widget implementation only if a test reveals an actual gap.

**Estimated scope:** Small (1–2 files).

## Task 4: Verify and document the reviewable behavior

**Description:** Update the architecture contract, complete browser/gate validation and collect evidence that matches the issue's explicit staging AC.

**Acceptance criteria:**

- [x] FA §6 describes pending-run file visibility/status and effective chips/reset; §2 read-time-only URL preservation stays intact.
- [x] Real browser QA covers both themes, 390px, keyboard reset/focus, both URLs, and no new console/network errors; six gates are green.
- [ ] PR contains real fixed-build staging screenshots of both cases, or clearly identifies that AC as blocked with the exact missing deployment/session/run capability. Local mock evidence is labeled separately.

**Verification:** Use the staging procedure in the plan; record run/status/revision alongside captures. Check actual active run and completed unknown-file case. Do not merge/deploy/trigger rerun merely to manufacture staging evidence. Run all commands below and record results.

**Dependencies:** Task 3; authorization/coordination for FA edits; staging fixed-build availability for after-fix captures.

**Files likely touched:** `docs/FRONTEND_ARCHITECTURE.md`, these plan/todo records if updating progress; screenshots as review artifacts.

**Estimated scope:** Small documentation plus browser/evidence work.

## Final checkpoint

- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check`
- [x] `pnpm test`
- [x] `pnpm build` (production configuration, no mock code)
- [x] `pnpm verify:prod-bundle` (after the build)
- [x] New regressions proved red when the behavior is removed, then restored green.
- [x] Both staging screenshot ACs met or expressly outstanding; no completion claim while required proof is missing. Real fixed-build staging captures remain outstanding as documented below.
- [x] Current review follow-up received independent standards/spec review: Standards 0 / Spec 0.
- [x] PR/commit mention `Refs #116`, no closing keyword; PR sections `What` / `Why` / `How to verify` / `Refs` distinguish exact validation environments.
- [ ] Current-head approval and resolved review threads obtained before merge; issue is On Review and staging evidence remains open.

## Task 1 development evidence (2026-10-18)

- Applied the approved TDD seam: routed `RunDetailPage` with deterministic transport responses, real widget/bar rendering, and unchanged URL. First RED: queued run with `?severity=critical`, empty findings, completed empty comments expected four patched diff files but rendered zero (`RunDetailPage.filters.test.tsx`; 1 failed / 15 skipped, 43.76s).
- Minimal GREEN: derive `findingsPending` from `isActive(run.status)`, pass page → widget → bar, retain effective file filtering while pending, suppress final empty state and replace final count with pending status. The original focused regression passed (1 passed / 15 skipped, 4.58s).
- Environment: Node 24.20.0, pinned pnpm 12.4.1. Offline frozen installs failed with `ERR_PNPM_NO_OFFLINE_TARBALL`; registry DNS was unavailable. Cloned existing complete `node_modules` into this isolated checkout (separate files), without dependency/lockfile changes. Commands use `pnpm --config.verify-deps-before-run=false` to avoid automatic reinstall. Focused suites use one worker under concurrent-machine load.
- Staging evidence remains open: coordinator verified login reaches the GitHub sign-in form, with no authenticated session; fixed-build captures also need a deployment containing the fix. No staging run inspected or triggered.

- Task 1 expanded focused run: 122 passed, one test selector failed because `README.md` correctly appeared in both chip and diff header (3 suites / 123 tests, 352.40s under concurrent machine load). Scoped that assertion to the diff header; targeted rerun passed (1 passed / 23 skipped, 28.11s). Together all 123 focused cases are verified; existing `/comments` guard and default widget callers pass. `pnpm check-types` passed; `git diff --check` passed. Independent coordinator review: Standards 0 / Spec 0.

## Task 2 development evidence (2026-10-18)

- RED: changed the existing completed-run `?file=gone.ts` page expectation to no selected file chip and disabled reset. Test failed with actual `['gone.ts']` versus expected `[]` (1 failed / 23 skipped, 25.56s).
- GREEN: Files Select value and reset eligibility now use the intersection with available file options; raw URL filters remain unchanged. Original targeted test passed (1 passed / 23 skipped, 11.59s).
- Expanded focused verification passed: 11 tests / 69 skipped across page and bar suites, 33.52s, one worker. Covers mixed files, unchanged unknown URL/all four patched files, delayed diff and selected chip arrival, unknown combined with severity/nonblank or whitespace URL query/local draft, no emitted changes on render, and the known long-file chip. Its fixture now supplies that long file as an actual option.

## Task 3 development evidence (2026-10-18)

- Added two widget rerender regressions: matching card manually collapsed under search survives pending → terminal and more search text, while clearing/restarting search keeps existing expansion behavior; summary-only file list stays visible under a nonmatching query while pending and uses normal filtering/count/empty state after completion. Both passed initially (2 passed / 50 skipped, 10.98s); no further product code change or card-key change was needed.
- Mutation proof (temporary code, restored byte-for-byte in `finally`): reverting the effective Select value caused the unknown-file page regression to fail; adding a pending-dependent `DiffViewer` key caused the manual-collapse regression to fail; removing the pending visibility bypass caused the summary-list regression to fail. All three targeted tests failed for their intended assertions (3 failed / 74 skipped, 9.26s). Exact original source restored afterward; restored focused verification follows below.

- Restored Task 3 and existing search/navigation coverage passed: 40 selected tests / 70 skipped across four suites, 150.53s. Tasks 1, 2 and 3 each received independent Standards 0 / Spec 0 review from the coordinator's review agents. No application changes were needed after those reviews.

## Task 4 verification (2026-10-18)

- FA §6 now documents effective file chips/reset, separate `findingsPending` lifecycle and pending status, retained pending diff/summary files, automatic terminal filtering and stable card state. The read-time-only URL preservation contract remains intact.
- Coordinator local-browser evidence: active severity URL showed running status, pending copy and all five diff-file entries; completed `?file=nope.py` retained its address, selected no file, disabled reset and showed 11/11 findings with diff. Native Enter reset from unknown-file + severity cleared filters and focused Files, then settled to 11/11 with reset disabled. These are local mock checks, not staging evidence; remaining theme/mobile/console checks are in progress.
- `pnpm lint` passed (ESLint and Stylelint). Final typecheck and format-check in progress. Full test suite is running with `--maxWorkers=2 --reporter=verbose`, log `/private/tmp/dmc268-116-fulltest.log`.
- Real fixed-build staging screenshots remain unmet: no authenticated browser session (normal GitHub button reaches sign-in) and staging deployment follows main only, so this branch is not deployed. No deployment, merge or staging rerun was performed to manufacture evidence. Issue is On Review.

- Final source gates: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, production `VITE_USE_MOCKS=false pnpm build` and subsequent `pnpm verify:prod-bundle` passed. Build completed in 21.41s with its existing chunk-size advisory; bundle scan found 22 clean asset files. Full tests remain running.
- Coordinator completed local mock browser QA in both themes at desktop 1265px and mobile 390px: active severity/search retain pending copy and diff; unknown-only URL stays unchanged, shows all 11 findings, no chip and disabled reset. At mobile, document scrollWidth equals clientWidth (375px with scrollbar in the 390px viewport), pending copy wraps, and no console warning/error was captured. Native Enter reset focuses Files and ends at 11/11; Enter in search debounces to `?q=unsafe` without reload. Original system theme preference and viewport were restored. These checks do not satisfy the real staging screenshot AC.

- Final independent review: Standards 0 hard findings / 0 heuristic findings; Spec 0 implementation findings, with one explicit external evidence AC still open. At that original checkpoint, fetched main was `c153576`; the review follow-up rebase is recorded below. The unmet AC is two real staging screenshots on a deployed fixed UI: (1) an active run under severity/search with pending copy and fetched diff visible, and (2) a completed run with unknown `file=` retained in the address, no selected chip, disabled reset and visible findings/diff. Local mock captures cannot replace these; authenticated staging access and a permitted deployment containing the fix are still missing.

- First full-suite attempt: all 1,278 executed tests passed across 104 files (817.90s), but the command exited 1 because Vitest could not start the forks worker for `AppSidebar.test.tsx` before its response timeout. This was a worker-start error, not an assertion failure; the test gate is not green from this run. The omitted file is being rerun alone, followed by a constrained full-suite retry. Original full-run log is `/private/tmp/dmc268-116-fulltest.log`.

- User publication decision: publish a regular PR ready for review after a clean full-suite retry; the user will assign the reviewer. Keep the staging screenshots AC explicitly open and do not request a reviewer automatically. No commit or push has been made by the development agent.

- Clean full-suite retry passed: **105 test files / 1,289 tests**, zero errors, exit 0, 471.20s, using `pnpm --config.verify-deps-before-run=false test --maxWorkers=1 --reporter=verbose`. Log: `/private/tmp/dmc268-116-fulltest-retry.log`. This includes all original no-controls, outside-diff, duplicate-merge, highlight-budget, page search and URL-hook cases. The previous omitted AppSidebar suite also independently passed 11/11 in 11.89s. All six required gates are now green; the initial worker-start failure remains recorded above.
- Implementation, documentation, local browser checks and independent review are ready for the user-authorized regular PR. The two real fixed-build staging screenshots remain an external acceptance gap, so this record does not claim every issue AC is complete. Development made no commit, push, PR or reviewer request.

## Review round 1 follow-up (2026-10-18)

- [x] Rebase before edits: original review fixed point `40dbe32`, latest main `6f5a122`, rebased
      implementation `8df4775`; no conflicts. Removed obsolete `selectedActionIndex` from the page fixture
      to follow main's #115 state removal. No changes to `RunDiff.filters.test.tsx` (#138 ownership).
- [x] P2 bar assertions: separate all-selected-value helper from visual responsive chips. Negative
      cases drain initial React work with async `act`; no opacity filtering in selection assertions.
      Exact requested mutation, and no other product change during its run, killed **6/6 targeted tests**
      (51 skipped, exit 1, 19.81s; `/private/tmp/dmc268-136-mutation-bar2.log`). Source restored exactly.
- [x] P2 public callback TDD: adding `src/a.ts` to `gone.ts` + `README.md` first failed because the
      callback dropped `gone.ts` (1 failed / 56 skipped, 4.93s). Minimal fix appends unknown raw values
      to the next visible selection. Complete restored bar suite passed **57/57**, exit 0.
- [x] P3 direct bar pending-status regression added; success-transition page test now waits for
      settled `/comments`. Existing delayed-diff test was extended, not newly added by #116.
- [x] Focused page URL regressions passed **7/7** (22 skipped, exit 0, 8.83s): mixed add/clear/severity,
      unknown file becoming known through a finding, global reset including unknown values, and settled
      success transitions. Bar suite passed **57/57** in 15.15s.
- [x] Six follow-up gates completed; exact results below.
- [x] Independent follow-up review completed: Standards 0 / Spec 0; reviewer replies/publication handled by coordinator.

P3 dispositions: active mock fixtures contradicting pending copy, terminal no-findings filtering,
and stale/cancel-request copy are follow-up candidates outside this bug's approved scope. A direct
patched-diff pending widget test would duplicate the existing page cases and touch #138's test file;
leave that suggestion for its owner. Added the cheap bar status and settled-comments checks here.
Bookkeeping now records the issue as On Review; current-head approval/resolved threads remain open.
Real fixed-build staging screenshots still require authentication and a deployed fixed build.

Public review thread mapping: chip-test P2 `PRRT_kwDOUOEIjs6tqrJO`
([discussion 4307122898](https://github.com/larchanka-training/dmc-268-ui-t6/pull/136#discussion_r4307122898));
unknown-file preservation P2 `PRRT_kwDOUOEIjs6tqrJR`
([discussion 4307122904](https://github.com/larchanka-training/dmc-268-ui-t6/pull/136#discussion_r4307122904)).
Neither thread has been replied to or resolved by development. Existing FA §2/§6 already states
raw URL preservation, so this iteration adds no changes to that shared architecture file.

### Follow-up final verification

- All six gates passed on the final source: `pnpm lint` (ESLint + Stylelint), `pnpm check-types`,
  `pnpm format:check`, `pnpm test --maxWorkers=1 --reporter=verbose`, production
  `VITE_USE_MOCKS=false pnpm build`, then `pnpm verify:prod-bundle` (**22 clean asset files**).
  Full suite: **105 files / 1,294 tests passed**, exit 0, **1,142.34s** under concurrent machine load.
  Log: `/private/tmp/dmc268-136-fulltest.log`; no FAIL, unhandled-error or window-is-not-defined output.
- Initial follow-up lint identified `require-await` in the two async `act` drains. Added an explicit
  awaited microtask, then fresh lint and type checks passed. All five negative bar cases passed
  again (52 skipped, 43.58s), and the full suite subsequently imported and passed the final bar source.
  The earlier exact six-case mutation proof remains applicable; no mutation overlapped the full suite.
- Verification logs: `/private/tmp/dmc268-136-lint-retry.log`, `dmc268-136-types-retry.log`,
  `dmc268-136-format-final.log`, `dmc268-136-build.log`, `dmc268-136-bundle.log` (all in `/private/tmp`).
  Build retains the existing chunk-size advisory. No dependency, lockfile, URL/debounce or card-key change.
- Coordinator confirms independent follow-up review: **Standards 0 / Spec 0**. Browser check confirms
  adding and clearing visible files preserve unknown `gone.ts` in the URL. These are local mock checks.
  Current-head approval and resolution by the reviewer remain merge prerequisites; staging screenshots
  are still an open acceptance gap. Development made no commit, push, PR reply, merge or deployment.
