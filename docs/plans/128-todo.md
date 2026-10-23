# #128 — Delivery and verification log

Plan: [128-plan.md](128-plan.md). Scope/seams approved on 2026-10-23.
[PR #165](https://github.com/larchanka-training/dmc-268-ui-t6/pull/165) contains the
browser method and results; its round-one review is the source for this follow-up.

## Implemented scope

- [x] Initial run-data loading uses shared `PageLoading`; section waits/error output remain.
- [x] §7 documents the decorative, unannounced ring.
- [x] ProgressSteps checks rendered title/state and small root classes.
- [x] Theme checks all four danger-primary hover/press literals; contrast checks remain.
- [x] UserMenu checks avatar/compact classes and real flex/centering/padding declarations.

## Original implementation evidence

Historical results on published review head `c371c7f`, not new runs in this follow-up:
139 test files / 2117 tests and all six gates passed. The round-one reviewer
independently reproduced the mutation results and browser acceptance scenarios.

| Mutation                               | Focused command                                                                             | Recorded outcome after restore                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| ProgressSteps title class removed      | `pnpm test src/shared/ui/ProgressSteps`                                                     | Before strengthening 18 passed; named title test then failed; restored 19 passed.      |
| ProgressSteps small size removed       | Same command                                                                                | Before strengthening 18 passed; named small-root test then failed; restored 19 passed. |
| UserMenu avatar `flex: none` removed   | `pnpm test src/features/auth/ui/UserMenu.test.tsx`                                          | Named shrink/compact CSS test failed; restored 6 passed.                               |
| Dark danger hover changed to `#fa8b8a` | `pnpm test src/shared/ui/theme/buildTheme.test.ts -t 'pins danger-primary hover and press'` | New literal assertion failed; restored full theme suite: 45 passed.                    |
| Immediate run-page Spin restored       | Loading integration test, `-t 'has no instant page Spin'`                                   | Named regression failed; restored loading suite passed. Current test path is below.    |

Browser evidence, recorded in PR #165: Chrome, mocks off, fresh context/document and
query cache, actual HTTP client, schema-valid HTTP stand-ins, 1200 ms run-response
hold and controlled lazy chunk. Frame samples/MutationObserver tracked host identity,
state, rings and center; network timings verified the delay. The base reproduced two
differently positioned rings. The implementation retained one shown host through the
pending handover; success/error, both themes, reduced motion and 390px checks passed.
Avatars measured 28×28 and keyboard/overflow checks passed. No live-backend claim.

Center continuity is limited to the pending handover. At content arrival, classic
scrollbars can shift the same fading host about 7 px; no runtime change addresses that
existing behavior. Cold browser waits under 300 ms were not established; deterministic
integration tests cover that boundary. The round-one review additionally reports no
ring on in-app navigation with 0/150 ms responses. This follow-up changes tests/docs,
so it does not repeat or present the previous browser matrix as a new run.

## Round-one review corrections

Base for this follow-up: `main` `54718990293a25f3114d72a9d2a4cd00dd988aac`.
The clean branch was rebased before edits; the product/runtime diff is unchanged.

- [x] P2-1: sample the same shown host immediately after handover and every 16 ms through 1008 ms.
- [x] P3-4: sample fast-response ring absence every 16 ms before and after settlement.
- [x] P3-2: move loading integration to `src/app/runDetailLoading.page.test.tsx`; no duplicate remains.
- [x] P3-3: replace the mocked empty-query fixture with real offline-paused QueryClient coverage and cleanup.
- [x] P3-1: clarify local text/danger literals versus primary/default literals in `buildTheme`.
- [x] P3-5: update the affected architecture tree and run-data PageLoading marker description.
- [x] P3-6/P3-7: reduce plans to architecture/evidence and qualify pending-center claims.

New timing mutation evidence (each mutant applied separately, then fully restored):

| Mutation                        | Named test command                                                                  | Old assertion | Frame-sampled assertion   | Restore |
| ------------------------------- | ----------------------------------------------------------------------------------- | ------------- | ------------------------- | ------- |
| Run-page marker delayed 50 ms   | `pnpm test src/app/runDetailLoading.page.test.tsx -t 'keeps the same shown host'`   | Passed        | Failed on hidden host     | Passed  |
| Run-page marker delayed 400 ms  | Same command                                                                        | Passed        | Failed on hidden host     | Passed  |
| Run-page marker delayed 1000 ms | Same command                                                                        | Passed        | Failed on hidden host     | Passed  |
| Host delay reduced to 50 ms     | `pnpm test src/app/runDetailLoading.page.test.tsx -t 'never flashes the page ring'` | Passed        | Failed when ring appeared | Passed  |

The old-assertion probes ran before the test move/strengthening; the command column
uses the current path. Restored focused loading/offline coverage: 2 files / 11 tests.
Temporary mutation reports/logs remain outside Git; they are not repository artifacts.

## Final follow-up verification and publication

- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check`
- [x] `pnpm test`
- [x] `VITE_USE_MOCKS=false pnpm build`
- [x] `pnpm verify:prod-bundle` after that build
      Final restored follow-up results: Node 24.20.0 / pnpm 12.4.1, all six gates passed,
      144 test files / 2294 tests. Production build ran with mocks off before bundle
      verification. Runtime mutation files were restored exactly; `git diff --check` passed.

- [x] Fresh independent Standards/Spec review of the complete follow-up: Standards 0 / Spec 0.

Publication status, the current commit graph, CI and review replies are maintained in
[live PR #165](https://github.com/larchanka-training/dmc-268-ui-t6/pull/165).
The publication workflow includes atomic commit history with normally wrapped bodies
(P3-8), current-main verification and replies that identify the published fix commits.
This log records completed development/verification; GitHub is the source for live
publication and review state.

## External merge requirements

A current-head approving review, reviewer-owned thread resolution and normal
merge/issue acceptance remain external requirements, not agent follow-up tasks.
