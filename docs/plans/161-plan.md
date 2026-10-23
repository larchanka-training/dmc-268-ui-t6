# Implementation Plan: Deduplicate run-stream refreshes (#161)

## Overview and approval

Address [ui#161](https://github.com/larchanka-training/dmc-268-ui-t6/issues/161): remove overlapping run-query invalidations and combine refreshes for consecutive frames in one parsed SSE chunk. Preserve immediate step-driven journal updates, successful `vcs.fetch_diff` updates, reconnect catch-up, list refreshes, and the existing 3000 ms actions poll.

**Status: implementation and independent review complete; publication in progress. Staging acceptance remains pending deployment and authenticated access.**

## Inspected baseline

Source baseline is refreshed `origin/main` at `1b1e702558db700908cfacdaf3daf95dd78a3a9f`. The existing checkout is unrelated `fix/110-mock-rerun` at `e4a19fe6edc29af3bbf892e246adcfc2d715b6f5`; its untracked plans and `.pnpm-store/` must be preserved. Latest-main source was inspected with `git show`, including `runStreamConnect.ts`, its unit/page tests and page fixture, entity query keys, and FRONTEND_ARCHITECTURE §2.

On main, `invalidateRunQueries` invalidates `['runs', id]`, already a prefix of actions/diff/comments (and action responses), then invalidates the three nested keys again. The step path separately invalidates exact actions and, on successful fetch-diff, exact diff. Reconnect calls the same overlapping helper. Existing unit tests assert invocation counts; page tests exercise a real QueryClient and count HTTP calls.

Attempted the issue's targeted baseline command on the existing checkout; `pnpm` produced no output and was interrupted (exit 130). This is **not** a successful baseline and would not cover latest-main page tests anyway. First development task reruns it in an isolated checkout based on latest main, with the supported Node version (package requires >=22.22.0; current shell reports Node 22.18.0) and pinned pnpm.

## Architecture decisions

1. **One prefix per full-run refresh.** `run.updated`, mock `applyRunUpdated`, and reconnect invalidate `runQueryKeys.detail(runId)` once. Do not add the overlapping actions/diff/comments calls. This preserves existing descendant semantics, including cached action-response queries, and avoids editing entity query keys or hooks. Keep `invalidateRunLists` unchanged.
2. **Coalesce within each parsed chunk.** Parse and validate frames using existing boundary parsers, collect refresh targets by run ID, then flush before reading the next chunk. A full-run target subsumes exact actions/diff targets for that run; repeated step targets coalesce. Any valid update still causes list invalidation. Steps alone retain exact targeting, and successful fetch-diff still adds exact diff. No timer, debounce interval, or wait for polling is introduced.
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
- [ ] At publishing, PR describes which spy expectations changed and why, includes HTTP-count evidence and `Refs #161`, with no closing keyword.

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

- Worktree `/private/tmp/dmc-268-ui-161`, branch `fix/161-run-stream-dedupe`, base `1b1e702`.
- Runtime Node 24.20.0 / pnpm 12.4.1; reuse existing installed node_modules via an untracked symlink; no dependency changes. pnpm commands require execution outside the sandbox because the wrapper hangs inside it.
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
update, and actions three times for same-chunk step + update. Evidence is saved locally in
`/private/tmp/ui161-qa/results.jsonl` and `/private/tmp/ui161-qa/http.jsonl`; the fixture is
outside the repository and is not a product dependency. Timing numbers include its artificial
HTTP delay and are not production performance claims.

Staging Network acceptance remains pending until this change is deployed and authenticated
access is available. Record deployment SHA/run ID and separate SSE requests from polling at
that point; no staging success is claimed from local browser or component tests.

## Independent review and publication

Fresh independent standards/spec review completed with zero code findings (Standards: 0 hard violations, 0 baseline smells; Spec: 0 code findings). The only acceptance limitation is staging Network validation, which remains pending deployment and authenticated access.

The publisher fetched `origin/main` before publication; it remains `1b1e702558db700908cfacdaf3daf95dd78a3a9f`, the tested source baseline. No source rebase was needed. The user confirmed a normal ready PR and will select the reviewer. Publication status and PR link will be recorded after creation.
