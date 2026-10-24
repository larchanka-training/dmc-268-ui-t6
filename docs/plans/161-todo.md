# Task List: Run-stream request deduplication (#161)

Plan: [161-plan.md](161-plan.md). Status: **PR #166 review round 1 corrections verified and independently reviewed; publication-preparation snapshot recorded; staging acceptance pending**.

- [x] User approves the saved plan before development (agent-loop planning gate).
- [x] Task 1 — in an isolated latest-main checkout, establish supported Node/pinned pnpm and record targeted baseline; add RED real-QueryClient HTTP-count regressions for one update, both same-chunk step/update orders, successful fetch-diff, run isolation, and delayed later-chunk freshness.
- [x] Task 2 — implement one detail-prefix full refresh and per-parsed-chunk target union; preserve exact step-only targeting, list behavior, reconnect/auth/watchdog, and existing 3000 ms poll. Revise intentional spy assertions and strengthen reconnect HTTP counts.
- [x] Request-correctness checkpoint — targeted tests green; mutation sanity check makes new regressions RED; existing immediate step/diff/reconnect page tests and relevant list/poll/progress tests remain green.
- [x] Coordinate doc ownership — recheck PR #109; obtain authorization for the required comment before posting it/editing its owned architecture document if it remains open. Avoid PR #155/#165 owned production files.
- [x] Task 3 — update FRONTEND_ARCHITECTURE §2 and record local browser Network evidence, count boundaries, and later-chunk freshness behavior.
- [x] Run `pnpm lint`.
- [x] Run `pnpm check-types`.
- [x] Run `pnpm format:check`.
- [x] Run `pnpm test`.
- [x] Run `pnpm build`.
- [x] Run `pnpm verify:prod-bundle` against that build.
- [ ] Validate staging Network after deployment/auth are available; record deployment SHA/run ID, one GET each per isolated status update, and chunk grouping for combined step/update (one actions refresh in one chunk, two across separate chunks), separated from initial loads and the unchanged 3-second poll. Account for reconnect resync plus overlapping replay. Keep pending if unavailable.
- [x] Independent standards/spec review reports zero code findings: 0 hard violations, 0 baseline smells, 0 spec/code findings. Staging acceptance remains pending.
- [x] Publisher prepared issue branch/commit/[PR #166](https://github.com/larchanka-training/dmc-268-ui-t6/pull/166) under repository rules; PR explains changed invalidation spy assertions and HTTP-count proof, uses `Refs #161`, and reports any staging limitation honestly.

Initial delivery evidence: supported Node 24.20.0 / pnpm 12.4.1 on isolated latest-main worktree passed 56 targeted tests. RED: 6 HTTP regressions failed on main. GREEN: 209 tests across stream/page/list/poll/progress passed. Restoring the old bridge made the same 6 regressions RED again. See the plan evidence section for counts. Lint, typecheck, format, 137 test files / 2107 tests, and production build passed. Production bundle verification passed (29 JS assets clean), and all 9 local browser scenarios passed against the production page with a disposable HTTP/SSE fixture. See plan for endpoint deltas and evidence boundaries. Initial independent review reported zero code findings; staging remains pending. The publisher verified unchanged latest main before the initial publication. Normal commit/push hooks passed. Current-head approval, staging acceptance, and merge remain outstanding; the issue stays open.

Review round 1:

- [x] P2-1 — audit open architecture edits, coordinate ownership, reserve SSE Ф-25 while #109 retains RAG Ф-24.
- [x] P2-2 — production QueryClient regressions for M4 chunk reset, M18 diff union, M19 exact other-run descendants.
- [x] P3 — document replay/staging limits; test once-per-chunk list HTTP refresh; clarify mock helper; guarantee cleanup; remove local paths; retain explicit freshness mechanism rationale.
- [x] Individually mutation-check M4/M18/M19/M11/M20: all intended regressions fail; restore production source byte-for-byte. Focused production suites pass 67 tests before mutations; broader restored-source run passes 6 files / 154 tests.
- [x] Final six gates passed on Node 24.20.0 / pnpm 12.4.1: lint, check-types, format:check, test (137 files / 2112 tests), build, verify:prod-bundle (29 JS assets clean).
- [x] Fresh independent review of final corrections: Standards 0 hard violations / 0 baseline smells; Spec 0 code findings. Card stays On Review; staging remains pending.
- [ ] Publication-preparation snapshot — commit/push, PR-body update, inline/P3 replies, CI, and re-request of the existing reviewer follow this saved snapshot; see the PR timeline for the current external state. Author does not resolve threads.
