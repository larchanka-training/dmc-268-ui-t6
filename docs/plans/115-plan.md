# Implementation Plan: Remove obsolete diff-viewer state (#115)

## Overview

Implement [ui#115](https://github.com/larchanka-training/dmc-268-ui-t6/issues/115): remove unused diff-viewer selection state and the unreachable `ReviewPage`, retain `/review` redirects and all run-page behavior, and align `FRONTEND_ARCHITECTURE.md` (FA) with the current application. No dependencies or API behavior changes are needed.

Status: approved by the user ("делай") on 2026-10-18; implementation and verification complete; publishing pending.

## Baseline and isolation

Planning inspected checkout `fix/110-mock-rerun` at `e4a19fe6edc29af3bbf892e246adcfc2d715b6f5`.
Its tracked working tree was clean; pre-existing untracked `.pnpm-store/` must remain untouched and unstaged.
Remote `main`, verified through GitHub on 2026-10-18, is `c1535766faae454c8a52a91ca1b82894b43b99ea` (also local `origin/main`).
The current branch contains four #110 commits beyond that baseline; **do not carry them into #115**.
After approval, fetch main and create `chore/115-remove-dead-diff-viewer-state` from fresh `origin/main`, preferably in an isolated worktree; transfer only these two plan documents. Recheck source references and open-PR ownership there.

Important baseline difference: current `main` already corrected FA §7 and §11 cancel/rerun descriptions in #111. The checked-out #110 branch still has the obsolete §7 text. Base implementation on main; retain and verify its correct descriptions rather than restoring obsolete text or duplicating corrections.

## Architecture decisions

1. `selectedFile` and `selectFile` in `useDiffViewerStore` have no runtime consumer. Keep only `viewType` and `setViewType`; remove obsolete resets and mock field/assertion. File filtering remains in URL search params, owned by `useFindingFiltersParams` and consumed by `RunDiff`; do not alter those components.
2. Delete `src/pages/review/ReviewPage.tsx` and its CSS Module. Its local `selectedFilename` is independent of the Zustand field, and the component has no import, route, or Storybook consumer. Preserve `ReviewRedirect`, its tests, `/review`, lazy route wrappers and the sidebar. Mock builds still redirect to `/runs/${DEMO_RUN_ID}`; production builds still redirect to `/runs`, using replacement history.
3. In FA, remove the selection row in §2 and deleted page entries in the source tree; record deletion and the preserved redirects in §11, superseding the historical #65 retention decision. Remove obsolete follow-up claims from the filters paragraph. Keep historical #65 plan files unchanged.
4. Preserve FA §7 and §11 descriptions of implemented `RunControls`, `endpoints.runs.cancel` / `rerun`, mutation hooks and rerun navigation. Review them against fresh-main code; edit only if an actual stale statement remains.
5. The `selectedFiles` Storybook example is unrelated to the dead state but matches the issue's literal `git grep -n selectedFile src` criterion. Rename that local array to `defaultSelectedOptions` without altering the story; this avoids leaving an unnecessary exception in FA.

## Test-first strategy and seams

Approval covers these public seams: rendered `DiffViewer` unified/split behavior, `RunDiff` filtering/rendering, `RunDetailPage` URL filtering/search/progress/cancel/rerun behavior, and `ReviewRedirect` destination/history behavior. Reuse existing tests; cleanup must not introduce implementation-shaped tests asserting private object keys or file existence.

This is behavior-preserving cleanup, so characterize the baseline before each slice. For RED evidence, temporarily break a relevant public behavior (for example `setViewType` or a redirect destination), run its existing focused test and record the expected failure, then restore the mutation before cleanup. This follows frontend §3b's mutation-proof requirement without inventing a new behavior or leaving a test tied to deleted implementation. Typechecking and the literal source search establish removal. Add a failing behavior test only if inspection exposes a real missing contract guard; keep its scope within these seams and report the reason.

## Ordered tasks

Detailed per-task criteria and file lists are in [115-todo.md](115-todo.md).

1. Remove stale resets from the provider and four diff-widget test suites (five files).
2. Remove stale resets from the four run-page suites and rename the unrelated Storybook local array (five files).
3. Remove the dead store API and mock selection field/assertion (three files).
4. Delete the unreachable review-page component and stylesheet while preserving redirects (two files).
5. Reconcile FA §2, source tree and §11; verify already-correct §7/§11 controls documentation (one file).
6. Run all quality gates, browser smoke checks and independent Standards/Spec review, then publish through the pull-request skill.

Tasks 1–3 form a dependency chain: remove consumers before deleting the typed field. Tasks 4–5 follow after that checkpoint. Implementation is sequential because these changes share state, tests and documentation; review axes can run in parallel.

## Checkpoints and completion

- After tasks 1–3: targeted suites pass, types pass, `git grep -n selectedFile src` has only the soon-to-be-deleted local `selectedFilename` in `ReviewPage`; no dead store/mock field remains.
- After tasks 4–5: `git grep -n selectedFile src` and `git grep -n ReviewPage src` are empty; FA documents the final state; redirects and run-page regressions pass.
- Completion: all six gates green: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`, then `pnpm verify:prod-bundle`. Browser smoke test in both themes: `/review` redirects in mock and production builds; run detail still displays/filter files and switches diff mode; controls remain as before. Do not add API calls or real external side effects to this cleanup.
- Independent code-review reports zero Standards and Spec findings. Publisher stages explicit new paths / tracked updates, excludes `.pnpm-store/`, rebases on main and creates a PR with `What` / `Why` / `How to verify` / `Refs` (no closing keyword or Development-panel link). No merge or issue closure is in this implementation phase.

## Open-PR file coordination

Read-only ownership check on 2026-10-18 found these overlaps. Repo instructions require a comment on each owning PR **before editing overlapping files**. The user authorized the exact comments below with "делай" on 2026-10-18. All three PRs were still open at the implementation ownership recheck. Comments posted before edits:

- [#106 coordination](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106#issuecomment-6248963170)
- [#109 coordination](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109#issuecomment-6248963622)
- [#122 coordination](https://github.com/larchanka-training/dmc-268-ui-t6/pull/122#issuecomment-6248964019)

| Open PR                                                              | Expected overlapping files                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [#106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106) | `src/app/mocks/app-state.ts`, `src/app/mocks/app-state.test.ts`, `docs/FRONTEND_ARCHITECTURE.md` |
| [#109](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109) | `src/app/mocks/app-state.ts`, `src/app/mocks/app-state.test.ts`, `docs/FRONTEND_ARCHITECTURE.md` |
| [#122](https://github.com/larchanka-training/dmc-268-ui-t6/pull/122) | `docs/FRONTEND_ARCHITECTURE.md`                                                                  |

Draft for #106 and #109:

> По ui#115 планируется удалить неиспользуемый `selectedFile` из `MockUiState`/`mockUiState` в `src/app/mocks/app-state.ts` и соответствующую проверку в `app-state.test.ts`, а также обновить FA: убрать мёртвое состояние и записать удаление недостижимой `ReviewPage` при сохранении `/review` redirect. Поведение прогонов и настройки репозитория не меняются. Отмечаю пересечение файлов для координации.

Draft for #122:

> По ui#115 планируется точечно обновить `docs/FRONTEND_ARCHITECTURE.md`: убрать мёртвое состояние выбора файла, записать удаление недостижимой `ReviewPage` при сохранении `/review` redirect и проверить актуальность описания cancel/rerun. Поведение URL-фильтров и страницы прогона не меняется. Отмечаю пересечение файла для координации.

Recheck open PRs immediately before edits and publication. A merged/closed PR no longer owns an open-PR overlap; do not post unnecessary comments.

## Risks and mitigations

| Risk                                                                  | Impact | Mitigation                                                                                  |
| --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Starting from #110 branch regresses newer main documentation/controls | High   | Fresh-main branch; exclude #110 commits; verify main descriptions before edits.             |
| Concurrent PRs alter shared mock/FA files                             | Medium | Authorize and post coordination comments, keep patches local, recheck ownership and rebase. |
| Literal substring AC catches Storybook plural and orphan local state  | Low    | Rename unrelated story local; delete orphan; verify exact source search.                    |
| Cleanup accidentally drops live diff-mode behavior or redirects       | Medium | Existing public tests, mutation-proof evidence, targeted runs and browser checks.           |
| Pre-existing package cache is staged or reformatted                   | Low    | Preserve `.pnpm-store/`, explicit staging, inspect final diff.                              |

## Approved decisions and execution evidence

The user approved the plan, public test seams and coordination comments with "делай" on 2026-10-18. No product decision is unresolved.

Implementation worktree: `/private/tmp/dmc-268-ui-115`, branch `chore/115-remove-dead-diff-viewer-state`, fresh baseline `c1535766faae454c8a52a91ca1b82894b43b99ea`. The original checkout and other issue plans remain untouched. No dependency was added; existing dependencies are reused with Node 24.20.0 and pinned pnpm 12.4.1. Dependency auto-install is disabled for tool runs (`pnpm_config_verify_deps_before_run=false`) to preserve the shared cache.

Task 1 characterization: the five focused suites passed on the baseline (79 tests). Temporarily keeping unified mode when `setViewType('split')` is called made the existing public split-view test fail at `table.diff-split` (expected truthy, received null). The mutation was restored before removing the five obsolete reset fields. The post-cleanup focused run passed all 79 tests again. Full six-gate verification remains scheduled for the final batch.

Task 1 independent review: Standards 0 findings; Spec 0 findings. Task 2 baseline passed 87 tests; independent review reported Standards 0 / Spec 0. The post-cleanup run result could not be recovered after the agent turn ended, so final full-suite verification remains required. No additional behavior test is needed for the four mechanical setup removals and Storybook local rename.

Task 3 evidence: mock-state baseline 20/20 passed, remaining 19/19 passed after removing the obsolete assertion; typecheck passed. Only orphan-page local `selectedFilename` references remain in the literal source search. No filter/run-page implementation or API contract changed.

Task 3 independent review: Standards 0 / Spec 0. Task 4 route baseline and post-deletion runs each passed 15 tests in two files. A temporary production destination mutation to `/runs/wrong` made the existing redirect test fail (missing expected runs-page); the redirect source was restored byte-for-byte before deletion. Only the unreachable `ReviewPage.tsx` and its CSS Module were deleted; both `git grep -n selectedFile src` and `git grep -n ReviewPage src` are empty. Final browser smoke and six-gate verification remain outstanding.

Task 4 independent review: Standards 0 / Spec 0. Task 5 reconciles FA source-tree and state entries, records deletion superseding ui#65, removes obsolete filter follow-ups and clarifies that `pages/review` retains a redirect. Existing main cancel/rerun descriptions are preserved and checked against `RunControls`, `RunDetailPage`, mutation hooks/endpoints and route source; a short implementation-reference paragraph records hooks/endpoints/navigation. Historical ui#65 plan documents remain unchanged.

Coordinator browser evidence after source cleanup: mock `/review` redirects to the demo run; light and dark themes display (computed backgrounds rgb(255,255,255) and rgb(9,13,24)); search `q=Retry` shows 1/11 findings, file filter `README.md` shows 2/11, split/unified toggles work, reset restores findings, no console errors. Authenticated production browser redirect requires an existing backend session and is not yet browser-verified; production redirect unit tests pass, and source retains `replace`. No API stand-in or auth bypass is introduced.

Task 5 independent review: Standards 0 / Spec 0. Production browser preview at `http://127.0.0.1:15115/review` redirected to `/login` and rendered «Вход в Reviewer»; GitHub login is disabled without configuration/session. This verifies unauthenticated production routing only. Authenticated production `/review` → `/runs` remains covered by redirect unit tests and unchanged source, not a browser session.

Final independent full-patch review: Standards 0 / Spec 0. Browser environment limitation: the development server denied font-file reads through the external `node_modules` symlink under its filesystem allow-list; behavior/theme checks are valid, but exact font/visual parity was not established. Production refresh could not reach a backend session, consistent with the observed login redirect. No application changes were made for these local environment limitations.

Final quality gates (2026-10-18): `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`, and `pnpm verify:prod-bundle` all passed. Full tests: 105 files / 1270 tests, 522.94s; this resolves Task 2 post-cleanup verification. Bundle check: 22 clean asset files. Durable local logs: `/private/tmp/115-gate-{lint,types,format,test,build,bundle}.log`. Final independent full-patch review reported Standards 0 / Spec 0. All source changes are complete; only publishing and attachment remain.
