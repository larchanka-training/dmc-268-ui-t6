# Implementation Plan: SSE run.step updates (#113)

Status: approved by the user ("ок") on 2026-10-20; Tasks 1–2 implemented; independent Task 1 reviews passed; all six final UI gates passed; Task 2 review and API snapshot work remain.

## Outcome

Validate `run.step` at the boundary and immediately refetch the matching run's
actions so its journal and progress bar update before the next polling tick.
Successful `vcs.fetch_diff` also refreshes that run's diff. Retain the existing
3-second active-run polling fallback and reconnect recovery.

Source: [UI #113](https://github.com/larchanka-training/dmc-268-ui-t6/issues/113).
The successful-diff-step addition is explicit in
[the issue comment](https://github.com/larchanka-training/dmc-268-ui-t6/issues/113#issuecomment-6277350684).
Step ordering/progress rollback are outside scope; dependency
[UI #112](https://github.com/larchanka-training/dmc-268-ui-t6/issues/112) is CLOSED
(2026-10-19 19:43:42 UTC).

## Verified starting point (2026-10-20)

- Refreshed UI `origin/main`: `ec628dd02bf0f59611e94ae6d3d742bb79472019`.
- Refreshed API `origin/main`: `2326273e6ab7fcea89d1cf3b94b88a4be66ca5e9`.
- UI main filters out every event except `run.updated`. Its five invalidations
  remain the existing contract. The action hook polls active runs every 3000 ms.
- Reconnect recovery already exists: successful connections after attempt one
  invalidate the four per-run keys for cached run IDs. Add behavioral proof of
  an active observer refetching missed actions; do not add a second resync path.
- The SSE parser is now `src/entities/run/api/runStreamParse.ts`, not the stale
  `src/app/providers/runStreamParse.ts` path mentioned in the issue.
- API main's `RunStepEvent` requires exactly the six original fields: UUID
  `runId`, free-string `tool`, nonnegative integer `index`, boolean `ok`, UTC
  date-time `startedAt` ending in `Z`, nonnegative integer `durationMs`.
  OpenAPI declares `additionalProperties: false`. Steps have no `id:` and are
  not replayed. API main does not include this component in the UI snapshot.

## Implementation base and ownership

After approval, create isolated branches from freshly fetched `origin/main`,
preferably `feat/113-run-step-event` (UI) and
`chore/113-run-step-contract` (API).
Do not base work on the current unrelated UI `fix/110-mock-rerun` or API
`fix/111-worker-portal-url` checkout. Preserve every unrelated untracked plan
and `.pnpm-store/`; especially do not touch API `docs/plans/113-*`, which belong
to a different issue.

Before editing shared files, re-read the open PR list and leave coordination
comments on the owning PRs, as AGENTS.md requires. Coordination comments were
posted on 2026-10-20 before Task 1 edits: [#155](https://github.com/larchanka-training/dmc-268-ui-t6/pull/155#issuecomment-6291844735),
[#106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106#issuecomment-6291845334),
[#109](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109#issuecomment-6291846160). Comments should state the files, six-field current-contract
scope and intended follow-up order, without private team-directory data.

| Existing work                                                                                                                    | Required coordination                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [UI #155](https://github.com/larchanka-training/dmc-268-ui-t6/pull/155), OPEN, head `3a0b8963f32294c0e4a496a71146880a43fc0b71`   | Already adds schema, parser, API export and tests, but **requires attempt** and adds optional `llmOperation`. Current API main lacks those fields. Coordinate before schema/parser/API-barrel edits; reuse its parser structure and compatible coverage, not a second competing parser. Implement current six-field support now; #155 can rebase its extension onto #113. Do not blindly cherry-pick its incompatible required-attempt schema. |
| [API #227](https://github.com/larchanka-training/dmc-268-api-t6/pull/227), OPEN, head `0efe030ca02afe029ea85d47c99b56420c0de7b9` | Paired with #155 for API #170. Extends the wire schema and changes `tests/test_openapi_contract.py`; does not yet add RunStepEvent to the generator/snapshot. Coordinate before editing that test and re-check before publishing. No #170 implementation is needed for #113.                                                                                                                                                                   |
| [UI #106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106), OPEN, base main                                         | Owns FA, stream connector/tests, run API and run schemas among other files. Comment before overlapping edits.                                                                                                                                                                                                                                                                                                                                  |
| [UI #109](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109), OPEN, base #106 branch                                  | Owns FA, stream tests, run API and run schemas. Comment there too; preserve its stacked changes when rebasing.                                                                                                                                                                                                                                                                                                                                 |

This plan is implementable against today's main without waiting for unrelated
#170 features. If #155/#227 merge first, refresh the plan's contract baseline,
reuse their merged implementation and regenerate the snapshot from that exact
UI commit. A required-attempt UI parser must not be deployed against an older
six-field backend; coordinate that future deployment separately.

## Architecture decisions

1. Keep the Zod schema and JSON-to-payload parser in `entities/run`, exposed
   through its public index. Follow existing Zod object handling and inferred
   types; ensure its generated JSON Schema matches the authoritative OpenAPI
   component. No enum for tools, invented fields, or fabricated `attempt` default.
2. In the app bridge, a valid step invalidates `runQueryKeys.actions(runId)`.
   Use an exact match so action-response children are not unnecessarily fetched.
   A successful `tool === 'vcs.fetch_diff'` also invalidates the exact diff key.
   Other runs, detail, comments and list are untouched by a step. Refetch actions
   instead of appending: the event lacks the complete `RunAction` DTO.
3. Preserve `run.updated`, keepalive, unknown-event, auth, reconnect and cursor
   behavior. Invalid JSON/schema data is a silent no-op. No-id step frames do
   not alter `Last-Event-ID`. Omit the optional duplicate-prefix optimization
   so existing exact invalidation counts stay stable.
4. Retain 3000 ms polling only while queued/running/publishing. SSE gives prompt
   updates; polling covers missing notifications or an interrupted stream.
   Hidden-tab polling behavior and terminal stop behavior stay as documented.
   Reconnect already refetches cached actions/diff because steps are not replayed.
5. Keep the API snapshot change in a small separate PR only if it remains
   missing after re-checking API #227. Add the component to both source maps,
   regenerate the full fixture from a clean committed UI checkout and update
   its pinned provenance commit. Do not hand-edit generated schemas. API PR:
   `Refs larchanka-training/dmc-268-ui-t6#113`; no closing keyword.

## Ordered tasks and checkpoints

Detailed tasks and file budgets are in [113-todo.md](113-todo.md).

- [x] Task 1: current-contract schema and parser, with red/green boundary tests.
- [x] Task 2: targeted event refresh with real cache/UI and recovery tests.
- [ ] Checkpoint: focused tests pass, current-contract fixtures drive real UI,
      existing stream invalidation/cursor tests remain green.
- [ ] Task 3: API snapshot parity and provenance, unless already delivered.
- [ ] Task 4: FA documentation, full gates and browser/staging acceptance.
- [ ] Checkpoint: all AC have evidence or an explicit access constraint; fresh
      reviews pass before publishing per agent-loop; human approves next steps.

Tasks 1-2 are sequential. API snapshot generation depends on committed UI
schema work. Documentation can be prepared after decisions settle, but shared
file edits and rebases must remain coordinated. No new dependencies expected.

## Verification and evidence

Use red/green tests before implementation. Boundary cases: real six-field
payload, free-string unknown tool, invalid UUID/JSON, missing fields, negative
or fractional integers, offset/local timestamp rather than UTC Z. Preserve
the existing Zod conventions while matching exported OpenAPI constraints.

Stream tests assert a normal step makes exactly the intended action
invalidation, successful fetch-diff adds only diff, failed fetch-diff does not,
unknown/invalid frames and ping invalidate nothing. Existing run.updated
counts stay at five. A status event with `id: 42`, followed by a valid no-id
step, must reconnect with `Last-Event-ID: 42`.

Add a jsdom integration test using the same queryClient as the stream bridge,
actual RunDetailPage/query hooks, a controllable fetch stream and deterministic
API responses. Render a running run before a step; return a new action only
after emitting the step; assert the visible journal and progress stage change
without advancing 3000 ms. Start with an empty diff, emit successful
`vcs.fetch_diff`, and assert files appear while status remains running. Mount a
second run observer or seed its fresh query and prove it does not refetch.
For reconnect, mutate the actions response during a closed stream, reconnect
without replaying a step, and assert the observed action log recovers. Keep the
fallback timer from masking recovery: freeze/disable its tick in that test and
test polling separately. A mere invalidateQueries spy is insufficient.

Run focused tests first, then all UI gates: `pnpm lint`, `pnpm check-types`,
`pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm verify:prod-bundle`.
API changes require `uv run ruff check .`, `uv run ruff format --check .`,
`uv run mypy .`, `uv run pytest`; include targeted
`uv run pytest tests/test_openapi_contract.py tests/test_ui_zod_contracts.py`.
Use TEST_DATABASE_URL for database-backed checks; report skips honestly.

Browser acceptance uses both themes at desktop and 390px. Check the journal,
progress and diff remain usable, keyboard focus and reduced motion unchanged.
On staging, record deployed UI/API SHAs, a run URL, timestamped no-id step frame
and its immediate `/actions` GET before the next 3-second tick. Open a run
before fetch-diff and observe files in running. Interrupt/reconnect the stream
and observe actions recovery. The documented host is
`https://staging-ui.dmc268-t6.axyi.ru`; authenticated browser/run permissions
have not been verified during planning. Local simulated-stream tests are not
staging evidence; if auth or permission to trigger an actual run is missing,
record the exact limitation and leave that AC pending for acceptance.

## Risks and mitigations

| Risk                                                 | Mitigation                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Duplicate #155 work or incompatible required attempt | Coordinate before edits; implement current six fields, re-check PRs before publishing; extension follows on rebase.                  |
| New backend fields arrive before UI extension        | Existing object parsing strips unknown inputs; do not consume or invent extension fields. Verify schema baseline again if PRs merge. |
| Snapshot drifts after unrelated UI schema changes    | Generate from a clean committed checkout; update both source maps and provenance pin together; run API parity tests.                 |
| Polling makes the event test pass accidentally       | Fake clock below 3000 ms; assert action/progress/diff changes and actual API request counts.                                         |
| Duplicate recovery changes alter existing counts     | Reuse current recovery; add observer coverage, not another invalidation branch.                                                      |
| Real staging access unavailable                      | Keep evidence pending with precise constraint; never label mocks or planned checks as staging verification.                          |

## Open decisions

No product decision is required to start after plan approval: retain polling,
implement today's six-field contract and include the requested diff-step
refresh. #155/#227 ownership and current head state must be rechecked before
editing. Actual staging access and deployment/run permissions remain unverified.

## Task 1 evidence (2026-10-20)

Implemented in `/private/tmp/dmc-268-ui-113`, branch `feat/113-run-step-event`,
from refreshed UI main `ec628dd02bf0f59611e94ae6d3d742bb79472019`. The original
UI checkout and all unrelated untracked plans remain untouched. API main
`2326273e6ab7fcea89d1cf3b94b88a4be66ca5e9` still declares the six-field contract;
UI #155/#106/#109 and API #227 were still open before edits.

Schema RED: `pnpm run test src/entities/run/model/schemas.test.ts` failed
with the missing RunStepEventSchema (1 failed, 30 passed); minimal schema made
all 31 tests pass. Parser RED: the focused schema/parser command failed with
`parseRunStepEvent is not a function` (1 failed, 63 passed); parser/API export
made all 64 pass. Expanded boundary/cursor/stream regression command:
`pnpm run test src/entities/run/model/schemas.test.ts src/entities/run/model/schemas.contract.test.ts src/entities/run/api/runStreamParse.test.ts src/app/providers/runStreamConnect.test.ts`
passed 123 tests across four files. Commands use Node 24.20.0 and pnpm 12.4.1;
pass script arguments directly without an extra `--` in this pnpm version.

Zod object parsing retains the repository convention of stripping unknown
fields; its generated output schema declares `additionalProperties: false`.
No attempt or llmOperation is required, consumed or fabricated. Integer and
datetime validation uses existing `z.int().nonnegative()` / `z.iso.datetime()`
conventions. Task 2 and all staging acceptance remain pending.

Task 1 additional checks: `pnpm run lint`, `pnpm run check-types`,
`pnpm run format:check`, `pnpm run build`, and `pnpm run verify:prod-bundle`
passed. After replacing an untyped Vitest asymmetric matcher with literal
`toMatchObject` assertions, focused schema/parser tests passed again (78 tests).
The build reports its existing >500 kB chunk warning; bundle verification is
green. The broad test suite was stopped at the coordinator's request so the
full-suite result is pending the Task 2/docs checkpoint; no full-suite pass is
claimed for Task 1.

## Task 2 evidence (2026-10-20)

Task 1 independent reviews returned Standards 0 / Spec 0 findings. Task 2
implements exact actions invalidation and exact diff invalidation only for
successful `vcs.fetch_diff`; run.updated, reconnect and polling remain intact.
The page integration test lives beside the app bridge
(`src/app/providers/runStreamConnect.page.test.tsx`) so imports follow FSD.

Actions dispatch RED: 1 failed / 43 passed, then GREEN 44 passed. Successful
fetch-diff RED: 1 failed / 44 passed; expanded bridge GREEN: 53 passed.
The final focused event-path command passed 163 tests across five files;
`pnpm run check-types` also passed. Details, mutation proof, browser scope and
remaining staging constraints are in [113-verification.md](113-verification.md).
FA sections 2/11 now describe current six-field steps, targeted actions/diff,
no-id/non-replay delivery, existing reconnect recovery and retained polling.

Final UI gates passed on 2026-10-20: lint, types, formatting, **1512 tests in
113 files**, production build and clean bundle verification. After these gates,
only this Markdown evidence was updated and separately format-checked.
