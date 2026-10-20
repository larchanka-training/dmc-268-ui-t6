# Task list: SSE run.step updates (#113)

Approved by the user ("ок") on 2026-10-20; see [113-plan.md](113-plan.md).
All task acceptance criteria are additional to the repository-wide gates.

## Task 1: Validate the current wire event

**Description:** Coordinate with UI #155/#106/#109, then add/reuse the six-field
RunStepEvent schema and a safe JSON parser exposed through the run API barrel.
Use current remote API main rather than #155's required-attempt extension.

**Acceptance criteria:**

- [x] Valid real-contract data parses, including an unknown tool string; types
      are inferred from Zod, and no missing attempt value is fabricated.
- [x] Invalid JSON/UUID, missing fields, negative/fractional index/duration and
      non-UTC timestamps fail safely; exported schema mirrors current OpenAPI.
- [x] Existing run.updated parsing and SSE cursor semantics remain unchanged.

**Verification:** Red tests first, then green focused schema/parser tests;
checkpoint gates below and manual code comparison to API RunStepEvent.

**Evidence (2026-10-20):** Schema and parser RED/GREEN captured; 123 focused
boundary/cursor/stream tests passed. Full command, bases and ownership-comment
links are in [113-plan.md](113-plan.md#task-1-evidence-2026-10-20). Task 1 code
passed independent Standards/Spec reviews with 0 findings each.

**Dependencies:** User approval received; ownership comments posted before edits.

**Files likely touched (Medium, 5):**

- `src/entities/run/model/schemas.ts`
- `src/entities/run/model/schemas.test.ts`
- `src/entities/run/api/runStreamParse.ts`
- `src/entities/run/api/runStreamParse.test.ts`
- `src/entities/run/api/index.ts`

## Task 2: Refresh the observed run from step events

**Description:** Dispatch valid step frames in the app bridge to exact actions
invalidation, plus exact diff invalidation for successful vcs.fetch_diff.
Prove visible page updates and existing recovery with real query observers.

**Acceptance criteria:**

- [x] A valid step refreshes only matching-run actions; successful fetch-diff
      additionally refreshes diff. Invalid/unknown frames make no changes,
      other runs remain untouched and run.updated still has five invalidations.
- [x] Before any polling tick, a rendered running page shows the new journal
      entry and progress stage; a page opened before fetch-diff shows files
      while still running. Tests fail if step dispatch is removed.
- [x] After a gap, reconnect refreshes observed actions without a replayed step
      or polling tick; a preceding id 42 survives no-id steps as Last-Event-ID.

**Verification:** Red/green stream and page integration tests with fake time;
do not replace hooks/cache with stubs. Reuse polling tests to prove fallback
still polls active states and stops terminal states. Manually inspect both
themes when local browser is available.

**Evidence (2026-10-20):** 163 focused tests passed; removing dispatch causes
two visible page-update tests to fail, removing reconnect resync causes its
observer test to fail. Both mutations were restored. See
[113-verification.md](113-verification.md).

**Dependencies:** Task 1 reviewed; ownership comments already posted.

**Files likely touched (Medium, 3):**

- `src/app/providers/runStreamConnect.ts`
- `src/app/providers/runStreamConnect.test.ts`
- `src/app/providers/runStreamConnect.page.test.tsx` (new integration tests; app layer keeps imports downward)

## Checkpoint: Event path

- [x] Focused schema/parser/connector/page tests pass and demonstrate failure
      when event dispatch is removed, per frontend rules.
- [x] Existing reconnect, cursor, auth, keepalive and polling tests pass.
- [x] UI gates pass: `pnpm lint`, `pnpm check-types`, `pnpm format:check`,
      `pnpm test`, `pnpm build`, then `pnpm verify:prod-bundle`.
- [ ] Review the result with the human at the skill's checkpoint.

## Task 3: Keep the API snapshot in parity

**Description:** Re-check API #227 and coordinate before touching its owned
contract test. If still missing, add RunStepEvent to both snapshot maps,
generate from a clean committed UI checkout and update the provenance pin in
a separate API PR referencing UI #113. Skip duplicate implementation if merged
work already satisfies the AC, while still collecting its CI evidence.

**Acceptance criteria:**

- [ ] `runStepEvent: RunStepEvent` is covered by UI_ZOD_COMPONENTS and generator
      sources; the generated fixture matches authoritative OpenAPI fields.
- [ ] Full fixture provenance and UI_CONTRACT_COMMIT identify the exact clean
      committed UI schema checkout; no generated schema is edited by hand.
- [ ] Targeted contract tests and all four API gates are green, with any DB
      access limitation/skips explicit. PR body references UI #113.

**Verification:** First demonstrate missing map/fixture coverage, then run
`DMC_268_UI_DIR=<clean committed UI checkout> node tests/generate_ui_zod_contracts.mjs`
with the repository-supported Node runtime. Run
`uv run pytest tests/test_openapi_contract.py tests/test_ui_zod_contracts.py`,
`uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy .`,
`uv run pytest` (TEST_DATABASE_URL for DB-backed tests). Inspect provenance.

**Dependencies:** Committed Task 1 UI schema; API #227 coordination; fresh
separate API branch from origin/main. Not dependent on #170 extension merging.

**Files likely touched (Medium, 4; API repository only):**

- `tests/test_openapi_contract.py`
- `tests/generate_ui_zod_contracts.mjs`
- `tests/fixtures/ui_zod_contracts.json`
- `tests/test_ui_zod_contracts.py`

## Task 4: Document and verify acceptance

**Description:** Update FA sections 2 and 11 for real run.step behavior and
retained polling, then verify the production path and publish reviewable work
under agent-loop after reviews/gates. Capture real staging evidence when access
and deployment allow; do not substitute test output for staging observation.

**Acceptance criteria:**

- [x] FA table, bridge and polling prose accurately describe current schema,
      targeted actions/diff, no-id non-replay events and existing reconnect
      refetch; the obsolete claim that API lacks step events is removed.
- [ ] All six UI gates and all four API gates are green for changed repos;
      both-theme desktop/390px browser checks cover journal/progress/diff.
- [ ] Staging records deployed SHAs, frame/request timing, early diff display
      and reconnect recovery, or exact access/deployment constraints with AC
      left pending. Review/publish checklist follows repository rules.

**Verification:** Search FA for stale run.step/api#97 claims; full gates;
browser checks; authenticated staging Network inspection before a polling
tick. Rebase main, fresh independent standards/spec reviews, approving review
on current head and resolved review threads before merge. Tech lead closes
the issue after AC acceptance; no closing keyword or Development-panel link.

**Dependencies:** Tasks 1-3, comments on FA-owning UI #106/#109, staging access
for staging AC. No additional dependencies expected.

**Files likely touched (Medium, up to 4):**

- `docs/FRONTEND_ARCHITECTURE.md`
- `docs/plans/113-plan.md` (implementation status/evidence only)
- `docs/plans/113-todo.md` (completed checkboxes/evidence only)
- Optional `docs/plans/113-verification.md` for actual concise evidence

## Checkpoint: Complete

- [ ] Every issue AC has evidence; unmet staging AC remains explicitly pending.
- [ ] Required repository gates and review loop pass; no unrelated files staged.
- [ ] PR descriptions use What / Why / How to verify / Refs, current diff only;
      attach every created PR to the chat and update board status as authorized.
- [ ] Human review/checkpoint completed. No merge or issue closure is inferred.
