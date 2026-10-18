# Todo: Remove obsolete diff-viewer state (#115)

Implementation follows [115-plan.md](115-plan.md). Status: approved by the user ("делай") on 2026-10-18; implementation and verification complete; publishing pending.

## Preparation

- [x] Human approved the plan and public test seams.
- [x] Human authorized necessary coordination comments; post them to still-open #106/#109/#122 before overlapping edits and record links.
- [x] Fetch main; create `chore/115-remove-dead-diff-viewer-state` from fresh `origin/main`; transfer only #115 plans, exclude #110 commits, preserve untracked `.pnpm-store/`.
- [x] Repeat reference and ownership checks on the implementation baseline.

## Task 1: Clean provider/widget reset setup

**Description:** Remove obsolete selection resets while retaining live diff-mode test coverage.

**Acceptance criteria:**

- [x] Five suites reset only `viewType`; their behavior assertions remain intact.
- [x] Unified/split rendering, themes, findings, filtering and context behavior remain unchanged.

**Verification:**

- [x] Establish focused baseline with `pnpm exec vitest run` for the five files below; record a relevant temporary behavior mutation going RED, restore it, then rerun GREEN after cleanup.
- [x] Run all six gates before marking complete (completion checklist may supply results for a batch).

Evidence: baseline and post-cleanup focused runs each passed all 79 tests in five files. Temporary split-view mutation failed the existing public behavior test as expected, then was fully restored. All six final gates passed; the complete suite revalidated this behavior.

**Dependencies:** Preparation.

**Files:**

- `src/app/providers/UiProvider.diffTheme.test.tsx`
- `src/widgets/diff-viewer/ui/DiffViewer.test.tsx`
- `src/widgets/diff-viewer/ui/DiffViewer.theme.test.tsx`
- `src/widgets/diff-viewer/ui/RunDiff.test.tsx`
- `src/widgets/diff-viewer/ui/RunDiff.filters.test.tsx`

**Estimated scope:** Medium, five mechanical setup edits.

## Task 2: Clean run-page reset setup

**Description:** Remove unused selection setup from page tests and remove the unrelated Storybook substring match.

**Acceptance criteria:**

- [x] Four page suites reset only `viewType`; URL/search/progress and mutation assertions stay intact.
- [x] Storybook local array is named `defaultSelectedOptions`; options/default selections are identical.

**Verification:**

- [x] Run the four page suites below with `pnpm exec vitest run` before/after cleanup; confirm existing URL-filter and rerun/cancel cases remain green.
- [x] Typecheck and run all six gates before marking complete.

Evidence: baseline passed all 87 tests in four files; independent review reported Standards 0 / Spec 0. The first post-cleanup run result could not be recovered after the agent turn ended; the successful final full suite (105 files, 1270 tests) supplies post-cleanup verification. Typecheck and all six final gates passed.

**Dependencies:** Task 1.

**Files:**

- `src/pages/runs/RunDetailPage.test.tsx`
- `src/pages/runs/RunDetailPage.filters.test.tsx`
- `src/pages/runs/RunDetailPage.search.test.tsx`
- `src/pages/runs/RunDetailPage.progress.test.tsx`
- `src/shared/ui/stories/Select.stories.tsx`

**Estimated scope:** Medium, five mechanical edits.

## Task 3: Remove unused store/mock selection

**Description:** Delete the dead exported selection field/action and fixture state after consumers are cleaned up.

**Acceptance criteria:**

- [x] Store retains `viewType`/`setViewType`; `selectedFile`/`selectFile` are absent.
- [x] `MockUiState` and `mockUiState` lack the selection field; remove its obsolete test and now-unused `mockUiState` test import only.
- [x] No unrelated mock fixtures or live store behavior changes.

**Verification:**

- [x] Confirm authorized coordination comments exist for still-open #106/#109 before touching mock files.
- [x] Run `pnpm exec vitest run src/app/mocks/app-state.test.ts` and prior focused suites; run `pnpm check-types`.
- [x] Source search now finds only local `selectedFilename` in the orphan reviewed in task 4; all six gates pass before completion.

Evidence: mock-state suite passed 20 baseline tests; after deleting its obsolete selection assertion, all 19 remaining tests passed. `pnpm check-types` passed. At this checkpoint, source search found only the two local `selectedFilename` lines in the orphan page. The final full suite revalidated prior focused suites; typecheck and all six gates passed. Final source searches are empty after task 4.

**Dependencies:** Tasks 1–2 and coordination.

**Files:**

- `src/widgets/diff-viewer/model/store.ts`
- `src/app/mocks/app-state.ts`
- `src/app/mocks/app-state.test.ts`

**Estimated scope:** Medium, three files.

## Checkpoint: Live state preserved

- [x] Tasks 1–3 tests/typecheck pass; source search confirms no store/mock selection consumer.
- [x] Diff contains no changes to filter logic, run-page implementation or API contracts.

## Task 4: Delete the unreachable review page

**Description:** Delete the orphaned screen; retain the existing redirect route and all route wiring.

**Acceptance criteria:**

- [x] `ReviewPage.tsx` and `ReviewPage.module.css` deleted; `git grep -n ReviewPage src` is empty.
- [x] `/review` still replaces history and reaches demo run in mock builds or `/runs` in production builds.
- [x] `git grep -n selectedFile src` is empty, including substring matches.

**Verification:**

- [x] Before deletion run `pnpm exec vitest run src/pages/review/ReviewRedirect.test.tsx src/App.test.tsx`; prove an existing redirect test RED with a temporary destination mutation, then restore it.
- [x] Rerun route tests after deletion and execute the six gates before marking complete.
- [x] Browser smoke for both build modes is recorded in completion.

Evidence: route baseline and post-deletion runs each passed 15/15 tests in two files. Temporary wrong-destination mutation failed the existing production redirect test as expected and was restored. Both literal source searches are empty; redirect source and route wiring remain unchanged. All six gates passed. Browser evidence and the authenticated-production-session limitation are recorded in the plan; mock redirects/filtering/diff modes and unauthenticated production routing were browser-verified.

**Dependencies:** Task 3.

**Files:**

- `src/pages/review/ReviewPage.tsx` (delete)
- `src/pages/review/ReviewPage.module.css` (delete)

**Estimated scope:** Small, two deletions.

## Task 5: Reconcile architecture documentation

**Description:** Document the cleanup and verify current-main controls descriptions against source.

**Acceptance criteria:**

- [x] FA source tree and §2 contain no active entry for deleted page/state; §11 explains deletion supersedes #65 while redirect remains.
- [x] FA filters follow-up no longer claims unused selection/unrouted page remain outstanding; unrelated limitations preserved.
- [x] FA §7/§11 accurately identify `RunControls` and implemented cancel/rerun endpoints/hooks; preserve corrections already on main.

**Verification:**

- [x] Authorized comments posted to still-open #106/#109/#122 before editing FA.
- [x] Compare against `src/widgets/run-inspector/ui/RunControls.tsx`, `src/pages/runs/RunDetailPage.tsx`, `src/entities/run/api/index.ts`, `src/shared/api/endpoints.ts`, route wiring and redirect source; read-only only for these files.
- [x] `pnpm exec prettier --check docs/FRONTEND_ARCHITECTURE.md docs/plans/115-plan.md docs/plans/115-todo.md`; all six gates before completion.

Evidence: FA §2/source tree/§11 reconciled with final source; cancel/rerun controls, mutation hooks/endpoints and navigation verified against the listed files. Existing main descriptions retained. Historical #65 plans untouched. Documentation formatting and all six final gates passed.

**Dependencies:** Task 4 and coordination.

**Files:**

- `docs/FRONTEND_ARCHITECTURE.md`

**Estimated scope:** Small, one file.

## Task 6: Verify, review and publish

**Description:** Establish final evidence, resolve independent review findings and publish a focused PR.

**Acceptance criteria:**

- [x] All issue criteria and both source searches satisfied; all six gates green.
- [x] Independent Standards/Spec review has zero findings after any correction loop; both-theme/browser behavior checks recorded.
- [ ] Publisher opens PR with standard metadata and `Refs #115`, returns URL; no merge/issue closure.

**Verification and delivery:**

- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm verify:prod-bundle` (after build)
- [x] Browser checks recorded: mock `/review` → demo run in both themes, run-detail filters and diff modes work; unauthenticated production `/review` → `/login`. Authenticated production `/review` → `/runs` is unit-verified and source-verified; browser verification requires a backend session. Local font-serving limitation is recorded in the plan.
- [x] Review final `git diff` and `git status`; no unrelated #110 commits/cache files included.
- [x] Fresh code-review agent reports Standards and Spec results; developer resolves findings and reviewer reruns if needed.
- [ ] Publisher follows pull-request skill, rebases on main, stages explicit paths/tracked updates, creates Conventional Commit/PR (≤72-character title, What/Why/How to verify/Refs, no closing keywords), and returns PR URL.
- [ ] Coordinator attaches created PR to this chat.

Evidence: all six gates passed on 2026-10-18; complete Vitest suite passed 105 files / 1270 tests in 522.94s. Production bundle check found 22 clean asset files. Final independent review: Standards 0 / Spec 0. Source searches are empty, and only intended source/docs changes are present. Publishing and PR attachment remain pending.

**Dependencies:** Tasks 1–5.

**Files:**

- `docs/plans/115-plan.md` (record final decisions/evidence if needed)
- `docs/plans/115-todo.md` (mark tasks/evidence complete)

**Estimated scope:** Small; verification and publishing only.
