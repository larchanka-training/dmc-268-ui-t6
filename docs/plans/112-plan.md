# Original implementation plan: #112 — stable run progress for the API action order

Refs: [UI #112](https://github.com/larchanka-training/dmc-268-ui-t6/issues/112),
[API #165 decision](https://github.com/larchanka-training/dmc-268-api-t6/issues/165#issuecomment-6239860269),
[API PR #194](https://github.com/larchanka-training/dmc-268-api-t6/pull/194).

## Recorded state

The original implementation and publication completed: [PR #135](https://github.com/larchanka-training/dmc-268-ui-t6/pull/135)
was committed and pushed, all six gates and CI passed (1326 tests), the PR was marked ready
for review, and Project 12 moved #112 to `On Review`. No reviewer was assigned; the issue
remained open for tech-lead acceptance. API PR #194 is merged.

This file records the approved original scope and its corrections. The current review iteration,
remaining work and validation evidence live in [112-review-plan.md](112-review-plan.md) and
[112-review-todo.md](112-review-todo.md). Original RED/GREEN evidence is in [112-todo.md](112-todo.md).

## Overview

Keep the three-stage run progress monotonic within each attempt for both the temporary
API order containing two `context.build` rows and the canonical order containing one.
On failure or cancellation, mark the stage where the current attempt stopped, rather
than inheriting context or publishing completion from an older attempt. Update the demo
and the architecture documentation to exercise the same order as production.

Original planning baseline: UI `origin/main` `c1535766faae454c8a52a91ca1b82894b43b99ea`.
Worktree: `/private/tmp/dmc-268-ui-112`; branch: `fix/112-run-progress-order`.
The separate existing UI checkout and its untracked `.pnpm-store/` were preserved.

## Evidence and architecture decisions

- The API #165 answer is authoritative for this change; PR #194 documents existing
  behavior and is now merged. No backend code change is part of this UI feature.
- Current order: `policy.load → [vcs.fetch_diff] → context.build → [llm.call conventions…]
→ llm.repo_conventions → context.build → llm.call review… → llm.review_output,
review.postprocess → github|gitlab.publish_review`. The optional fetch disappears
  on retries with a stored diff. Conventions calls disappear on a cache hit.
- API #168 part 6 will remove the first context build. The UI must also support
  `policy.load → [vcs.fetch_diff] → [conventions calls] → llm.repo_conventions →
context.build → review calls…`. Keep behavior for historical logs without policy rows.
- `policy.load` is the production attempt boundary. Sort a copy by action index;
  slice at the latest policy row and never split that segment merely because an LLM
  conventions call is followed by another context tool. Keep a bounded legacy fallback
  for logs with no policy marker: repeated conventions rows and genuine returns from
  review/publishing to context remain useful. Successful context-build-only historical fixtures
  continue to advance to analysis; do not require a marker absent from old logs.
- Conventions calls stay in context; modern analysis requires the successful prompt build
  after `llm.repo_conventions`. `request.kind` is
  `primary|retry|repair|fallback`, not the purpose of the call; do not use it as a stage.
- Running completion requires the prompt context build after conventions for modern
  logs, not the temporary first build. A successful post-conventions context build may
  advance the running bar immediately, preserving the existing canonical-order behavior.
- Terminal stop classification uses publishing evidence, then successful prompt-build
  completion, otherwise context. A failed prompt build cannot borrow the temporary first build. Successful prompt build followed by a stop before
  review retains the existing analysis handoff. `llm.review_output` and
  `review.postprocess` are publishing evidence because they commit with that transition.
- Cover `policy.load` as context and `gitlab.publish_review` as publishing, including
  the publishing marker set. The implemented API catalog contains nine tools.
  `engine.fallback` is reserved for api#107; recognizing it does not establish a production trace.
- Review correction: policy preparation runs inside `traced_step`; a genuine preparation failure
  has a failed `policy.load` row. The original setup-code override and synthetic best-effort
  prompt-build behavior were removed. A trace-write failure instead maps to `internal_error`.
- Review correction: `runProgress` and `RunProgressBar` require `RunSession.attempt`. Fewer policy
  rows than the claimed attempt mean an empty current segment unless an actual current-attempt
  `llm.call` in the latest policy segment corroborates it. Validate that request metadata through
  Zod. Earlier missing policy rows and a call-free/lost-call prefix remain ambiguous; see §7 of
  the architecture and the review plan. No timestamp or publish `request.try` is an identity.
- No new dependency, API contract change, Zustand state, or component styling is needed.
  Keep all derived progress in `entities/run`; no imports against the FSD direction.

## Approved public test seams

1. `runProgress(run, actions)` and `runProgressReadsLog(status)` return values.
2. `walkingRunAt(elapsedMs)` / `makeFailedRunActions()` snapshots and mock transport
   responses. Expectations use literal action sequences and times, not production constants.
3. `RunProgressBar` rendered stage states and error note, using the existing component test
   boundary. CSS, keyboard, and theme behavior are verified in a real browser, not jsdom.

## Ordered tasks

1. **Task 1 — Correct a single attempt.** Add failing prefix and terminal-stop tests
   for modern cache-hit/cache-miss orders; implement phase-aware classification and modern
   context completion. Cover all nine emitted tools and historical one-build behavior.
2. **Task 2 — Isolate retries.** Add failing tests for retry after each action prefix,
   including no-fetch retries, multiple retries and failed conventions calls; the review round
   adds the zero-row prefix, real failed-policy rows and attempt-gap corroboration.
3. **Task 3 — Align demo timeline.** Add failing literal timeline and transport tests,
   update walking and failed fixtures to include policy and both context builds, and verify
   the visible bar at every running prefix. Keep output/postprocess atomic with publishing.
4. **Task 4 — Document and validate.** After ownership coordination, update architecture
   §7, its limitations, and §8 demo sequence/times. Run all gates, browser checks and fresh
   independent two-axis review, then publish through the pull-request skill.

Details, acceptance criteria, dependencies, files, and commands are in `112-todo.md`.
The original tasks used incremental RED → GREEN and independent review before moving on.
The review plan controls the remaining iteration and its final gates.

## Checkpoints

- After Tasks 1–2: prefix matrix covers modern and historical logs, reliable policy
  boundaries prevent old attempt leakage, terminal stage/error placement is correct.
- After Task 3: demo API and pure snapshots agree; no running-prefix regression;
  `running → succeeded` without observed publishing still renders all stages done.
- Before publishing: all six frontend gates green, browser check in light/dark at
  desktop and 390px, fresh review has zero Standards/Spec findings, todo complete.
  Publishing opens a PR; merge approval and issue closure remain with the team workflow.

## Documentation ownership and approval gate

At original planning, these three open PRs owned `docs/FRONTEND_ARCHITECTURE.md`:

- [UI PR #122](https://github.com/larchanka-training/dmc-268-ui-t6/pull/122): query-navigation
  paragraphs near old lines 394–430; no direct overlap with the progress subsection.
- [UI PR #109](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109): repository/rules
  settings, API contracts, source inventory, and related mock docs; no progress-rule replacement.
- [UI PR #106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106): similar repository
  settings/contracts additions and mock-source prose; no progress-rule replacement.

The planned §7 progress changes and §8 timeline updates are narrowly scoped, but the repo rule
is file-wide: never edit a file owned by another open PR without a comment there.
The user approved the plan, test seams and comments with “делай”. The coordinator posted
the authorized comments in all three PRs; links and setup/TDD evidence are in `112-todo.md`.

Authorized and posted comment for all three PRs:

> Координация по #112: в отдельной ветке `fix/112-run-progress-order` планируется правка
> `docs/FRONTEND_ARCHITECTURE.md` — §7 «Прогресс-бар» (порядок tool, границы попытки,
> ошибки и ограничения) и §8 (актуальная последовательность и время мок-прогона),
> согласно ответу api#165. Разделы настроек репозитория и фильтров не меняются.
> Перед публикацией PR проверим пересечение изменений и актуальность относительно `main`.

The original approval gate was satisfied and no source file changed during planning.
The review plan records the additional authorized ownership comments for this iteration.

## Risks and mitigations

| Risk                                                | Impact | Mitigation                                                                            |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| Conventions and review share `llm.call`             | High   | Classify inside the latest attempt; prefix tests before conventions lands             |
| Temporary duplicate build falsely completes context | High   | Modern completion waits for post-conventions prompt build; test both build failures   |
| Legacy logs have no reliable boundary               | Medium | Preserve historical observable behavior and document limited fallback                 |
| Retry before any new trace row                      | Medium | Required attempt plus policy count/call corroboration; document missing-row ambiguity |
| API #168 removes temporary row                      | Medium | Canonical single-build tests remain green                                             |
| Demo action-count/time assertions drift             | Medium | Update snapshot and mock-transport literal expectations together                      |
| Shared architecture file in open PRs                | Medium | Authorized coordination comments before edits; narrowly scoped diff and rebase        |
| Local toolchain differs from repo requirement       | Medium | Used installed Node 24.20.0 with pinned pnpm 12.4.1; preserve the lockfile            |

## Validation scope

The original completed gates and browser evidence are recorded in `112-todo.md`; current revision
checks belong in `112-review-todo.md`. Browser checks use mock data and do not establish live-backend
coverage. An unrelated existing Escape-dismissal focus issue was observed and was not fixed here.
