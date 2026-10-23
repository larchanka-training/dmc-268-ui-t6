# Task List: Run-stream request deduplication (#161)

Plan: [161-plan.md](161-plan.md). Status: **published as ready PR #166; staging acceptance pending**.

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
- [ ] Validate staging Network after deployment/auth are available; record deployment SHA/run ID and one GET each per status change, separated from the unchanged 3-second poll. Keep pending if unavailable.
- [x] Independent standards/spec review reports zero code findings: 0 hard violations, 0 baseline smells, 0 spec/code findings. Staging acceptance remains pending.
- [x] Publisher prepared issue branch/commit/[PR #166](https://github.com/larchanka-training/dmc-268-ui-t6/pull/166) under repository rules; PR explains changed invalidation spy assertions and HTTP-count proof, uses `Refs #161`, and reports any staging limitation honestly.

Baseline: supported Node 24.20.0 / pnpm 12.4.1 on isolated latest-main worktree passed 56 targeted tests. RED: 6 HTTP regressions failed on main. GREEN: 209 tests across stream/page/list/poll/progress passed. Restoring the old bridge made the same 6 regressions RED again. See the plan evidence section for counts. Lint, typecheck, format, 137 test files / 2107 tests, and production build passed. Production bundle verification passed (29 JS assets clean), and all 9 local browser scenarios passed against the production page with a disposable HTTP/SSE fixture. See plan for endpoint deltas and evidence paths. Independent review is complete with zero code findings; staging remains pending. The publisher verified unchanged latest main before publishing. Ready PR #166 has no reviewer assigned; the user will choose the reviewer. Normal commit/push hooks passed. GitHub CI was running when this record was written, so the card remains In Progress until green CI. Current-head approval, staging acceptance, and merge remain outstanding; the issue stays open.
