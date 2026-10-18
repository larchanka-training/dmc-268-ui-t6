# Original completed checklist: #112 — stable run progress

This records the first publication of [PR #135](https://github.com/larchanka-training/dmc-268-ui-t6/pull/135).
All original tasks, gates, publication and Project 12 `On Review` update completed; the PR became
ready for review without an assigned reviewer. The current revision is tracked separately in
[112-review-plan.md](112-review-plan.md) and [112-review-todo.md](112-review-todo.md). Historical
intermediate test results below are not claims that the revision gates have already run.

## Approval and setup

- [x] Human approves `112-plan.md`, including the three public test seams.
- [x] Human authorizes the proposed coordination comment in UI PRs #122, #109, #106.
- [x] Coordinator posts only that authorized comment in each still-open owning PR and saves links.
- [x] Select Node ≥22.22.0 and pinned pnpm, install with the lockfile preserved.
- [x] Record baseline: `pnpm test src/entities/run/lib/runProgress.test.ts`.

## Task 1: A single attempt reports the correct phase

**Description:** Make a modern run stay in context through its transitional context build
and conventions generation, and distinguish context failure from review/publishing failure.
Preserve public behavior for historical one-build logs.

**Acceptance criteria:**

- [x] Literal expected states for every prefix of modern cache hit/cache miss and canonical
      single-build orders show no backward movement while running; existing historical scenarios
      remain green (tests that encode obsolete private segmentation mechanics may be rewritten
      against the same public contract, with rationale recorded).
- [x] Failed/cancelled conventions calls and either failing context build stop on context;
      review calls stop on analysis; both provider publish tools and committed output/postprocess
      stop on publishing. Only the stopped stage carries `run.errorCode`.
- [x] Current nine-tool catalog is covered, unknown/prototype-like tools remain ignored,
      input order is sorted without mutation, and skipped/status-only semantics are preserved.

**Verification:**

- [x] Add one meaningful regression, record RED, implement minimum, record GREEN; repeat.
- [x] `pnpm test src/entities/run/lib/runProgress.test.ts`.
- [x] `pnpm lint` and `pnpm check-types`.
- [x] Fresh Standards/Spec review; fix findings before next task.

**Dependencies:** Approved plan/test seams and toolchain setup.

**Files likely touched:**

- `src/entities/run/lib/runProgress.ts`
- `src/entities/run/lib/runProgress.test.ts`

**Estimated scope:** Small: 2 files.

## Task 2: The latest attempt controls progress

**Description:** Use policy rows as reliable production boundaries. Retain legacy fallback
without treating an in-attempt conventions call as analysis or a retry. The review iteration
corrects the original setup-error assumption using required attempt input and real trace evidence.

**Acceptance criteria:**

- [x] For a retry after every first-attempt action prefix, all new-attempt prefixes start at
      context, progress monotonically within that attempt, and do not inherit old completion;
      cover cache-hit/cache-miss combinations, no-fetch snapshots and a third attempt.
- [x] Failed/cancelled current attempts with a new policy row use their own last known stage;
      a real failed `policy.load` stops on context even after old analysis or publishing. The review
      iteration covers a newly claimed attempt with zero new rows through `run.attempt`,
      not a policy-code allowlist or publish `try`.
- [x] Historical retry tests remain meaningful and green, best-effort/missing request metadata
      cannot crash or create false boundaries, and summary-only current-worker logs follow the
      same phase rules; keep sparse summary-only/status-coalescing compatibility cases.

**Verification:**

- [x] Incremental public-boundary RED → GREEN proof for boundary, cache-miss retry and pre-row failure.
- [x] `pnpm test src/entities/run/lib/runProgress.test.ts src/widgets/run-inspector/ui/RunProgressBar.test.tsx`.
- [x] Component regression checks correct state/error note; the review iteration adds required `attempt`.
- [x] `pnpm lint` and `pnpm check-types`.
- [x] Fresh Task 2 Standards/Spec review.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/entities/run/lib/runProgress.ts`
- `src/entities/run/lib/runProgress.test.ts`
- `src/widgets/run-inspector/ui/RunProgressBar.test.tsx`

**Estimated scope:** Medium: 3 files.

## Checkpoint after Tasks 1–2

- [x] Modern duplicate-build and canonical single-build matrices pass.
- [x] Retries isolate old action history; stopped stages/error notes match the API decision.
- [x] No changes to wire schemas, SSE, query polling, shared UI styles, or package dependencies.
- [x] Zero outstanding review findings.

## Task 3: The demo uses the production order

**Description:** Update walking and failed demo fixtures to include the policy boundary and
two context builds. Write literal expected times/action arrays and keep the publishing rows
atomic, so the mocked screen exposes exactly the bug the issue describes.

**Acceptance criteria:**

- [x] Walking fixture has policy → fetch → initial build → conventions LLM call → conventions
      → prompt build → review calls; failed fixture uses policy, initial/prompt builds and
      cached conventions before its failing review call. LLM request metadata uses actual
      `kind` and `attempt` semantics if present, never invents a new contract discriminator.
- [x] Every generated running prefix has the expected visible phase; output/postprocess arrive
      together with publishing; snapshots remain schema-valid with coherent indexes, ids,
      times, actionCount and final status.
- [x] Mock transport tests assert the updated literal sequence and timing end to end; preserve
      deterministic start/reset/detail behavior and the list fixture's public assertions.

**Verification:**

- [x] Incremental RED → GREEN for the changed timeline contract.
- [x] `pnpm test src/app/mocks/mockRunTimeline.test.ts src/app/mocks/mockTransport.walkingRun.test.ts src/app/mocks/mockRunsList.fixture.test.ts`.
- [x] `pnpm lint` and `pnpm check-types`.
- [x] Fresh Task 3 Standards/Spec review.

**Dependencies:** Tasks 1–2.

**Files likely touched:**

- `src/app/mocks/mockRunTimeline.ts`
- `src/app/mocks/mockRunTimeline.test.ts`
- `src/app/mocks/mockTransport.walkingRun.test.ts`
- `src/app/mocks/mockRunsList.fixture.test.ts` (only if its public timing expectations change)

**Estimated scope:** Medium: 3–4 files.

## Task 4: Documentation, gates and publication

**Description:** Explain the actual and canonical phase orders and attempt detection, then
validate the entire feature and publish a narrowly scoped reviewable PR.

**Acceptance criteria:**

- [x] Architecture §7 accurately lists conditional LLM classification, policy boundaries,
      context completion, failure placement, GitLab publication and honest legacy/pre-row
      limitations; §8 documents the updated demo. API #165/#194 decisions are referenced.
- [x] All six gates pass on the final tree. Browser phase/error-note, both-theme and 390px
      overflow checks passed; unchanged controls and the baseline Escape-focus exception are
      recorded below, without a blanket keyboard/focus pass.
- [x] Fresh independent Standards and Spec reviews report no findings, including the added
      rerun-integration timing assertions.
- [x] Publisher uses explicit staging, Conventional Commit with Refs #112, rebase on current
      main, hooks enabled, and a PR body ordered What / Why / How to verify / Refs without
      a closing keyword.

**Verification:**

- [x] Authorized ownership comments are present before shared-document edits; recheck open PRs.
- [x] `pnpm lint`.
- [x] `pnpm check-types`.
- [x] `pnpm format:check`.
- [x] `pnpm test`.
- [x] `pnpm build`.
- [x] `pnpm verify:prod-bundle` after the build.
- [x] Real browser: mock walking and failed phases, dark/light, desktop/390px; unchanged
      controls and baseline focus limitation recorded below.
- [x] Publisher includes the browser evidence and live-backend/focus limitations in the PR.
- [x] Confirm meaningful new UI regression tests go RED when the relevant behavior is removed.
- [x] Publisher opens PR and returns URL; attach PR to current chat.

**Dependencies:** Tasks 1–3 and authorized ownership comments before document edit.

**Files likely touched:**

- `docs/FRONTEND_ARCHITECTURE.md`
- `docs/plans/112-plan.md`
- `docs/plans/112-todo.md`

**Estimated scope:** Medium: 3 files plus verification/publication.

## Completion evidence

- [x] All implementation tasks and validations above completed or an explicit blocker reported.
- [x] Published PR URL recorded; issue remains open for tech-lead acceptance.
- [x] Project 12 moved #112 to `On Review`; an approving review and reviewer thread resolution
      remain separate merge prerequisites.

## Task 1 development evidence

Approval: the user replied “делай” after the plan/test-seam and coordination-comment approval
request. The coordinator posted the authorized ownership comments before development:
[PR #106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106#issuecomment-6248950937),
[PR #109](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109#issuecomment-6248951437),
[PR #122](https://github.com/larchanka-training/dmc-268-ui-t6/pull/122#issuecomment-6248952032).

- Toolchain: installed Node `v24.20.0` (meets `>=22.22.0`), Corepack-pinned pnpm `12.4.1`.
  Invoke with `PATH=/private/tmp/dmc-112-bin:/Users/qx/.nvm/versions/node/v24.20.0/bin:$PATH`,
  `COREPACK_HOME=/private/tmp/dmc-112-corepack`, then `pnpm <command>`. The temporary
  `pnpm` shim points to Corepack, keeping nested package scripts on pinned pnpm too.
  `pnpm install --frozen-lockfile` reused 500 packages; package/lock files are unchanged.
- Baseline: progress unit suite passed **73 tests** in this isolated worktree.
- RED 1: the new transitional cache-hit prefix regression failed because the first
  `context.build` advanced to analysis before conventions/prompt context (1 failure/74 tests).
  GREEN 1: require the build after conventions for policy-marked attempts (74/74).
- RED 2: terminal failure/cancellation matrix failed for `gitlab.publish_review`, which put
  the error/stopped marker on analysis (2 failures/77 tests). GREEN 2: recognize the GitLab
  publishing tool and marker (77/77).
- Added complete modern cache-hit/cache-miss and canonical prefix matrices, prompt-context
  handoff checks, and terminal checks spanning all nine emitted tools; legacy tests retained.
- Latest unit run: **81/81 passed** after formatting; `pnpm lint` and `pnpm check-types`
  passed. Changed-file Prettier check and `git diff --check` passed.
- Policy-based retry slicing and explicit conventions-call segmentation remain Task 2;
  no retry implementation or component/demo/document architecture changes in this task.

## Task 2 development evidence

- Task 1 independent reviewers reported **0 Standards findings / 0 Spec findings** before
  Task 2 began; Task 1 lint/type checks passed.
- Policy boundary RED: retry `policy.load` immediately after the previous prompt build
  inherited analysis (1 failure/82 unit tests). GREEN: sort a copy, slice from the last policy
  marker, then filter known tools (82/82). Modern attempts never use legacy stage heuristics.
- Historical synthetic experiments for a missing prompt-build trace and a policy-code-only
  failure produced intermediate RED/GREEN results, but review found their backend premise false.
  They and the corresponding branches were removed in the review iteration: prompt builds use
  `traced_step`, and a policy preparation failure records its own failed `policy.load`.
- Added four-order retry matrix: every earlier-attempt action prefix × each cache-hit/miss
  transitional/canonical new attempt × fetch/no-fetch × every new prefix, checked while
  running, failed and cancelled against literal phase tables. Third-attempt, misleading request
  metadata, all actual `request.kind` values, modern summary-only and rendered retry checks pass.
- Mutation proof: temporarily removing policy slicing makes the transitional-cache-miss retry
  matrix fail (`transitional cache miss/6 -> transitional cache hit/2, fetch=false` inherits
  analysis). The source was restored immediately after the failed run.
- Final Task 2 checks: combined progress-model and component suites **156/156**,
  `pnpm lint`, `pnpm check-types`, changed-file Prettier and `git diff --check` passed.
  No wire schema, polling/SSE, query cache, Zustand, component interface, style or dependency changes.
- Historical fallback keeps repeated-conventions and genuine phase-regression boundaries;
  old build-only review fixtures retain their handoff. The review iteration removes the
  unsupported legacy-context branch and adds required attempt/call corroboration; see its plan.

## Task 3 development evidence

- Task 2 fresh independent reviewers reported **0 Standards / 0 Spec findings**; all Task 2
  checks passed before the demo changes.
- Walking-order RED: the new literal production-order regression found missing `policy.load`
  and initial `context.build` (1 failure/54 timeline tests). GREEN: eight running rows,
  updated literal times/sequences and transport expectations (79/79 timeline+transport).
- Failed-fixture RED: updated literal sequence/count/transport expectations failed in five
  places across timeline, transport and list suites (5 failures/82). GREEN: six actions,
  cached conventions and both context builds; 15-second spacing keeps the last action at
  10:01:15 inside the unchanged 10:01:30 finish.
- Walking timeline: policy 2s; fetch 3.5s; initial build 5s; conventions call 6.5s;
  conventions 8s; prompt build 9.5s; review calls 11s/12.5s; publishing 14s with output
  and postprocess together; provider publish 15.5s; success 17s. Final action count is 11.
- `HAPPY_PATH` now uses the production policy/two-build order. Separate legacy unit cases
  remain, and LLM mock requests use actual `kind: primary`, `attempt: 1` semantics.

- Task 3 final scoped mock suites: **83/83 passed**; updated model suite also passed in
  the earlier four-suite **197/197** run. `pnpm check-types` and `pnpm lint` passed.

## Task 4 final validation and browser evidence (first publication)

- Original baseline was `c1535766faae454c8a52a91ca1b82894b43b99ea`; the original final fetch/rebase
  found it unchanged. Authorized comments in #106/#109/#122 covered the architecture edits.
- All six gates passed: lint, types, whole-tree format, **105 files / 1326 tests** (147.70s),
  production build and bundle audit (22 JS assets). The full suite initially exposed two stale
  rerun-integration timing/count assertions; after a scoped correction, their suite passed 15/15,
  the full rerun passed 1326/1326, and fresh independent Standards/Spec review reported zero findings.
- Browser checks with the mock Vite server: queued `wait/wait/wait`; conventions prefix
  `process/wait/wait`; prompt build/review `finish/process/wait`; publishing `finish/finish/process`;
  success `finish/finish/finish`. The failed fixture has six rows and `llm_timeout` on analysis.
- Light/dark at desktop and 390px: no horizontal overflow (`clientWidth = scrollWidth = 375`,
  `innerWidth = 390` with scrollbar). Stage/error text contrast minima were 4.93:1 light and
  5.74:1 dark; no browser warnings/errors were observed.
- Scope limit: mock checks do not establish live-backend coverage. An existing unrelated menu
  lost focus to BODY after Escape; controls/styles were unchanged and that issue was not fixed.
- Architecture order/timeline updates were published. Review subsequently corrected the original
  setup-error and missing-build assumptions; current behavior and evidence are in the review plan.

## Completed first publication

- Implementation `2bded4b` and publication-evidence `3a6523d` were committed and pushed with hooks
  enabled. PR #135 was created and attached, then CI passed and the PR was marked ready for review.
  Project 12 moved #112 to `On Review`; no reviewer was assigned, and the issue remained open.
- The PR body follows What / Why / How to verify / Refs, includes browser limits and uses no
  closing keyword. No dependency or lockfile changed.
- PR #134 opened after the original architecture freeze and later merged. It changed other
  sections; this review iteration rebased onto UI main `6f5a122` and preserved those additions.
  The review plan records its rebased baseline and authorized coordination with current owners.
- Original publication is complete. Remaining review fixes, final gates and publication evidence
  are tracked only in `112-review-todo.md`, avoiding stale draft/pending claims in this record.
