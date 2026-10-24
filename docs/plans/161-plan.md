# Implementation Plan: Deduplicate run-stream refreshes (#161)

## Overview and approval

Address [ui#161](https://github.com/larchanka-training/dmc-268-ui-t6/issues/161): remove overlapping run-query invalidations and combine refreshes for consecutive frames in one parsed SSE chunk. Preserve immediate step-driven journal updates, successful `vcs.fetch_diff` updates, reconnect catch-up, list refreshes, and the existing 3000 ms actions poll.

**Status: PR #166 review round 1 corrections implemented, verified, and independently reviewed; the publication-preparation snapshot is recorded below. Staging acceptance remains pending deployment and authenticated access.**

## Inspected baseline

Source baseline is `origin/main` at `1b1e702558db700908cfacdaf3daf95dd78a3a9f`. Inspected `runStreamConnect.ts`, its unit/page tests and page fixture, entity query keys, and FRONTEND_ARCHITECTURE §2.

On main, `invalidateRunQueries` invalidates `['runs', id]`, already a prefix of actions/diff/comments (and action responses), then invalidates the three nested keys again. The step path separately invalidates exact actions and, on successful fetch-diff, exact diff. Reconnect calls the same overlapping helper. Existing unit tests assert invocation counts; page tests exercise a real QueryClient and count HTTP calls.

The targeted baseline was run successfully on that source baseline using the supported Node runtime and pinned pnpm; results are recorded below.

## Architecture decisions

1. **One prefix per full-run refresh.** `run.updated`, mock `applyRunUpdated`, and reconnect invalidate `runQueryKeys.detail(runId)` once. Do not add the overlapping actions/diff/comments calls. This preserves existing descendant semantics, including cached action-response queries, and avoids editing entity query keys or hooks. Keep `invalidateRunLists` unchanged.
2. **Coalesce within each parsed chunk.** Parse and validate frames using existing boundary parsers, collect refresh targets by run ID, then flush before reading the next chunk. A full-run target subsumes exact actions/diff targets for that run; repeated step targets coalesce. Each chunk containing at least one valid update invalidates the list once; existing pagination protection is preserved. Steps alone retain exact targeting, and successful fetch-diff still adds exact diff. No timer, debounce interval, or wait for polling is introduced.
3. **Keep freshness across later chunks.** Retain TanStack Query's default `cancelRefetch: true`. A genuinely later chunk may cancel/restart an in-flight cached query so newer server data wins; this plan does not promise deduplication across an arbitrary time window. Do not blindly use `cancelRefetch: false`: joining a request that began before the event can return old data, clear invalidation on success, and miss terminal actions after polling stops. If implementation changes this choice, first add a controlled stale-in-flight regression and a bounded trailing refresh, then update this plan/review the tradeoff.
4. **Stay within the bridge boundary.** Limit production changes to `src/app/providers/runStreamConnect.ts`, tests/fixture, and architecture documentation. Keep transport/auth/backoff/watchdog, event cursor, 3000 ms polling, and progress ordering unchanged. No new dependencies.

## Ordered tasks

### Task 1: Establish the HTTP regression boundary (Small/Medium)

**Dependencies:** approved plan; coordinator prepares isolated latest-main checkout and checks open-PR ownership.

**Files:** `src/app/providers/runStreamConnect.page.test.tsx`, optionally its `.page.fixture.tsx`.

**Acceptance criteria:**

- [x] On a settled, mounted run page, a single `run.updated` adds exactly one GET each for detail, actions, diff, and comments. Count actual fetch paths using the production QueryClient, excluding initial mount requests and polling.
- [x] A combined same-run `run.step` + `run.updated` chunk adds exactly one actions request, in both frame orders; include successful fetch-diff plus update, multiple run IDs, and malformed-frame coverage where useful.
- [x] Controlled pending HTTP responses expose cancellation/restarts and verify that a later chunk still delivers newer actions/status; tests cannot pass merely by changing invalidation spy counts.

**Verification:** run `pnpm test src/app/providers/runStreamConnect.test.ts src/app/providers/runStreamConnect.page.test.tsx` before changes and save baseline; new count regressions must fail for the observed duplicate requests on main. Use real timers or existing `advance`/`settle` helpers, no custom wait budget. Scope 1–2 test files.

### Task 2: Apply non-overlapping chunk refreshes (Small)

**Dependencies:** Task 1 RED evidence.

**Files:** `src/app/providers/runStreamConnect.ts`, `src/app/providers/runStreamConnect.test.ts`.

**Acceptance criteria:**

- [x] Full refresh uses one detail-prefix invalidation for updates and reconnect; valid chunk targets are merged per run, retaining exact step-only behavior and existing list behavior.
- [x] New HTTP-count tests pass; update/reconnect spy assertions are intentionally revised to the new one-prefix contract, while invalid payload/auth/reconnect/watchdog tests keep their original behavioral meaning.
- [x] Existing page tests remain green: new journal entry without time advance, diff visible while running, reconnect journal recovery without a polling refetch. Add exact per-endpoint reconnect deltas to avoid its current permissive `>1` assertion hiding duplication.

**Verification:** rerun targeted command and relevant list/poll/progress tests; briefly remove the deduplication behavior to confirm new tests go RED, then restore it. Check inactive cached runs are invalidated for next use and other run IDs remain isolated. Scope 2 files plus Task 1 test changes if needed.

### Checkpoint: request correctness

- [x] Targeted tests green; independent review confirms HTTP counts, current data after later chunks, and no lost step/reconnect behavior.
- [x] No polling or entity API changes; no unapproved file ownership overlap.

### Task 3: Document and verify the complete change (Small)

**Dependencies:** Task 2; ownership coordination for documentation.

**Files:** `docs/FRONTEND_ARCHITECTURE.md` §2; these plan/todo records.

**Acceptance criteria:**

- [x] Replace §2's four-explicit-invalidations explanation and SSE sequence where applicable with the single prefix and per-chunk union contract; explain later-chunk freshness and retain the polling explanation.
- [x] Run all six gates: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`, then `pnpm verify:prod-bundle` against that build.
- [x] Record local browser Network evidence and explicitly distinguish unavailable staging verification.
- [x] Published PR describes which spy expectations changed and why, includes HTTP-count evidence and `Refs #161`, with no closing keyword.

**Verification:** in a local running authenticated stack, open an active run and capture Network requests around a status event; distinguish initial loads, SSE-triggered requests, and the independent 3-second poll. Confirm journal updates on steps, diff appears after successful fetch-diff, and disconnect/reconnect catches up. Repeat staging Network validation once this change is deployed and authenticated access is available; record deployment SHA, run ID, and request counts. Unit/component tests are not staging evidence. Scope <=3 documentation files.

### Checkpoint: completion and publishing

- [x] All automated and available browser evidence recorded; staging AC remains explicitly pending until observed on a deployment containing this change.
- [x] Independent standards/spec review complete: 0 hard violations, 0 baseline smells, and 0 code/spec findings. The staging acceptance limitation remains pending. Publish through the agent-loop publisher after this review; follow branch/rebase/PR rules.

## Risks and coordination

| Risk                                              | Mitigation                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fewer spy calls hide unchanged HTTP duplication   | Real active QueryClient + HTTP deltas, including cached data and pending requests.                                                                                                                                                                                                                                                    |
| Chunk batching delays a step indefinitely         | Flush synchronously after each parsed chunk and before the next `reader.read`; no timer. Existing zero-time-advance journal test remains green.                                                                                                                                                                                       |
| In-flight coalescing loses the newest event       | Preserve default cancellation for later chunks; verify final returned data with controlled response ordering.                                                                                                                                                                                                                         |
| Prefix behavior changes action-response freshness | Preserve the full detail prefix for updates/reconnect; step-only requests remain exact.                                                                                                                                                                                                                                               |
| Concurrent PR ownership                           | Coordinator found PR #155 owns entity API/schema/parser paths, #165 owns RunDetailPage paths, and #109 owns FRONTEND_ARCHITECTURE. Avoid production edits in the first two sets. User approved the coordination comment; posted before editing: https://github.com/larchanka-training/dmc-268-ui-t6/pull/109#issuecomment-6363921807. |
| Staging deployment/auth unavailable               | Complete code/tests/local verification; report staging AC as pending with concrete instructions and never infer its result from tests.                                                                                                                                                                                                |

## Open questions

No product choice is required beyond approval of this plan. Staging deployment/auth availability remains a prerequisite for staging verification; documentation coordination is complete. The chosen deduplication boundary is one parsed SSE chunk, with freshness-preserving cancellation for later chunks.

## Development evidence

- Source baseline `1b1e702`; runtime Node 24.20.0 / pnpm 12.4.1; no dependency changes.
- Baseline targeted stream/page suite: 2 files, 56 tests passed on latest main.
- RED: new page suite had 6 failures and 2 passes. One update/reconnect issued 2 actions refetches (total 3 including mount); same-chunk step/update in either order issued 3 (total 4), where one is required.
- GREEN: stream/page, list, polling/API and progress suites: 5 files, 209 tests passed after implementation. Full refresh spy expectations intentionally changed from four overlapping keys to one detail prefix; exact step assertions remain.
- Mutation sanity: temporarily restoring the baseline bridge reproduced all 6 page failures, then the implementation was restored. The pending-response regression verifies the newer terminal journal survives late completion of the older response without advancing time.
- Architecture §0/§2 updated after the authorized PR #109 coordination comment. Local browser evidence and all six gates are recorded below; staging verification remains pending until deployment and authenticated access.

Automated gates: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`
(137 files / 2107 tests), and `pnpm build` passed. The suite emits existing jsdom
unsupported-browser-API notices; Vite emits the existing large-chunk advisory.
Neither failed its gate. `pnpm verify:prod-bundle` passed against that build: 29 JS assets clean.

## Local browser HTTP evidence (2026-10-23)

The coordinator exercised the production `RunDetailPage` and query client in a real browser
against a disposable local HTTP/SSE fixture (120 ms response delay, in-memory access token).
This verifies browser request behavior, not a deployed staging backend. Initial mount requests
were excluded. Polling was suppressed for event counts; the unchanged 3000 ms poll is covered
by the existing passing tests. All nine final scenarios passed with no query errors:

| Scenario                                  | HTTP request delta                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Single `run.updated`                      | detail/actions/diff/comments/action-response/list: 1 each; unrelated run: 0                                           |
| Same-chunk step + update, either order    | same one-per-endpoint counts                                                                                          |
| Same-chunk successful fetch-diff + update | same one-per-endpoint counts                                                                                          |
| Context step alone                        | actions: 1; other endpoints: 0; journal visible after 149 ms                                                          |
| Successful fetch-diff alone               | actions: 1, diff: 1; other endpoints: 0                                                                               |
| Failed fetch-diff alone                   | actions: 1, diff: 0; other endpoints: 0                                                                               |
| Reconnect without replay                  | one request per cached run endpoint, including action-response and the other cached run's actions; stream: 1, list: 0 |
| Two separated update chunks               | detail/actions/diff/comments/action-response/list: 2 each; unrelated run: 0                                           |

The pre-change browser baseline issued actions/diff/comments/action-response twice for one
update, and actions three times for same-chunk step + update. The table is a summary of local observations, not a repository-hosted raw trace. The disposable
fixture is not a product dependency. Timing numbers include its artificial
HTTP delay and are not production performance claims.

Staging Network acceptance remains pending until this change is deployed and authenticated
access is available. Record deployment SHA/run ID and separate SSE requests from initial loads and polling.
For one isolated status update expect one GET each for detail/actions/diff/comments. For a
step plus update in the same `reader.read()` chunk expect one actions refresh; separate chunks
produce two actions refreshes, one per frame. Server yields do not establish browser read
boundaries: correlate grouping with stream-read instrumentation when available or record it
as unknown. Reconnect resync plus the API's overlapping replay can produce a second refresh
per endpoint; this is a known limitation, not cross-chunk deduplication. No staging success is
claimed from local browser or component tests.

## Initial independent review and publication

Initial independent standards/spec review completed with zero code findings (Standards: 0 hard violations, 0 baseline smells; Spec: 0 code findings). The only acceptance limitation is staging Network validation, which remains pending deployment and authenticated access.

Initial publication used the tested `origin/main` baseline `1b1e702558db700908cfacdaf3daf95dd78a3a9f`;
no source rebase was needed. Published [PR #166](https://github.com/larchanka-training/dmc-268-ui-t6/pull/166)
as a normal ready PR, initially without a reviewer as requested. Implementation commit:
`d12c6ee0f801390420d031fdaec11adbb78c60e3`. Normal pre-commit and pre-push checks passed;
the seven intended files contained no dependency changes or closing issue references.
Staging validation, current-head approval, and merge remain outstanding; publication does not
accept or close the issue.

## Review round 1 corrections

Reviewed head `d56f6c3` against the full review and both inline threads. No production
refresh algorithm changes were needed; this round strengthens boundary regressions and
clarifies the contract.

- P2-1: SSE decision is Ф-25 in the table and §2. Audited current main and every open UI PR;
  only #109 and #166 change the architecture document, and #109 retains its RAG Ф-24.
  Coordination was posted before editing: [PR #109 note](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109#issuecomment-6365194705).
- P2-2: new HTTP regressions cover update followed by a keepalive-only or malformed-only
  chunk (M4), successful fetch-diff followed by a non-diff step in one chunk (M18), and exact
  B targeting when A has a full update (M19). B detail/diff/comments/action-response stay
  fresh while its observed actions refresh once.
- P3-1/2: architecture and staging instructions state immediate reconnect resync versus
  overlapping replay, and same-read versus separate-read expectations. Reconnect catch-up
  is tested with both empty and nonempty Last-Event-ID, before replay arrives; no replay
  deduplication or delay until the first chunk was introduced.
- P3-3/4: the production stream test observes one list HTTP refresh for two valid updates
  of different runs in one chunk (M11). Standalone mock `applyRunUpdated` still refreshes
  once per event; its JSDoc makes this distinction explicit. Existing list pagination
  protection is unchanged.
- P3-5/6: inactive-cache cleanup now runs in afterEach even on assertion failure; local-only
  paths and unrelated checkout/runtime history were removed from the implementation record.
- P3-7: the pending-response test intentionally retains total actions count 3: mount, old
  request, replacement request. It verifies the chosen cancellation mechanism and newest
  terminal data. A future bounded trailing refresh would need a revised test and documented
  tradeoff; this correction retains the current contract.

Mutation RED evidence: each mutant was applied alone and the intended regression failed.
M4 produced 2 failures (detail count 3 instead of 2 after keepalive/malformed chunks); M18
produced 1 (diff count 1 instead of 2); M19 produced 1 (other-run descendant invalidated);
M11 produced 1 (list count 3 instead of 2); M20 produced 1 (nonempty-cursor reconnect count
1 instead of 2). The production source was restored byte-for-byte after each check. All new
tests passed against the unchanged production algorithm before mutation (2 files / 67 tests).
Restored-source verification then passed 6 files / 154 tests across stream, list, API, polling,
and progress suites.
Fresh independent review of the correction diff, including final typed URL handling, reports
Standards: 0 hard violations / 0 baseline smells; Spec: 0 code findings. The review confirms
both P2 items and all seven P3 items are addressed within the approved scope. The card remains
On Review during the correction cycle; staging acceptance remains pending.
Final correction gates passed on Node 24.20.0 / pnpm 12.4.1: `pnpm lint`,
`pnpm check-types`, `pnpm format:check`, `pnpm test` (137 files / 2112 tests),
`pnpm build`, and `pnpm verify:prod-bundle` (29 JS assets clean). The initial lint attempt
found a typed URL extraction issue in the new test; it was corrected before this successful
six-gate run. Existing jsdom notices and the Vite large-chunk advisory remained non-failing.
The source algorithm is unchanged from reviewed head `d56f6c3`; only its helper JSDoc changed.
No new browser or staging observation is claimed for this test/documentation correction.
Publication-preparation snapshot: the publisher re-fetched main at `1b1e702` and rechecked the unchanged open architecture branches. The verified correction is ready for one commit. Push, PR-body update, replies, current-head CI, and review re-request occur after this snapshot; consult the PR timeline for those external actions. Current-head approval and staging acceptance remain outstanding.
