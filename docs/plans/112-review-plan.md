# PR #135: review revision plan

Refs: [UI #112](https://github.com/larchanka-training/dmc-268-ui-t6/issues/112),
[PR #135](https://github.com/larchanka-training/dmc-268-ui-t6/pull/135).

This continues the approved #112 plan and public test seams. The user requested all PR
comments to be addressed; no new product behavior or backend modification is proposed.
The coordinator delegates implementation, reviews the result independently, then delegates
publishing into the existing PR. Do not create another PR or resolve reviewer threads.

## Verified baseline

- Branch/worktree: `fix/112-run-progress-order`, `/private/tmp/dmc-268-ui-112`.
- Reviewed HEAD: `3a6523d64b5358abe2f351275489c9fdff6e2219`; clean before this plan.
- Original PR base / merge-base: `c1535766faae454c8a52a91ca1b82894b43b99ea`.
- Fetched UI `origin/main`: `6f5a122ebccf2b85bb12587a1d50be404477b2cb`.
- Fetched API `origin/main`: `dabb12c6d568da394a9ddc2fbe3bb3b4403803b7`.
- Nonempty review: REST ID `5563075487`, node `PRR_kwDOUOEIjs8AAAABS5XLnw`.
  The other review `5563112613` has no summary body and one inline thread.
- All three review threads are unresolved. Their original comments are mapped below.

Rebased on UI `main` `6f5a122` before implementation; resulting review baseline is
`bcfbb550545244766bcc982866fc0643da95145c`. The sole architecture conflict preserved the
new main cancel/rerun paragraph and the PR progress heading. No new architecture prose
was introduced during Slice 1. Preserve unrelated changes on later refreshes.
Refresh main and open-PR ownership again if they change during this round.

## Backend facts and attempt-gap design

Source inspection is read-only at the API SHA above:

- `run_lifecycle_store.py:166-185`: claim increments `Run.attempt` and clears errors.
- `review_context_stage.py:257-266`: checkpoint and input lookup precede `policy.load`;
  policy preparation itself is inside `traced_step`.
- `run_trace.py:92-123`: both success and failure rows are saved after the step finishes;
  policy failures therefore have their own failed `policy.load` row. A trace-write failure
  instead becomes `internal_error` through `run_failures.py:113-121`.
- `run_failures.py:45-57`: `internal_error` is retryable. `reconcile_runs.py:76-94`
  requeues expired claimed attempts below the cap. Therefore an earlier claimed attempt
  can genuinely leave no policy row: policy-row count is not universally equal to attempt.
- `llm.py:120-147`: a call request has an integer `attempt`; the gateway trace is best-effort
  (`infrastructure/llm/gateway.py:572-580`). This can corroborate a segment, but cannot be
  required for all traces or substitute for policy boundaries.
- `review_context_stage.py:351-371`: a non-policy failure of the temporary first build is
  recorded and swallowed; prompt construction still follows conventions.
- `PIPELINE_SPEC.md` §2: summary-only uses the same current order, with real model calls.
  `summary_only: true` belongs in the `vcs.fetch_diff` response; the temporary context row
  can also report summary-only. `engine.fallback` is a reserved #107 phase, not old production.

Extend the existing public `runProgress` input with `RunSession.attempt` and require it
through `RunProgressBar` rather than silently omitting it on the production render path.
`RunInspector` already forwards a complete session. Preserve all no-policy historical
semantics and statuses that ignore the log.

For modern logs, prevent prior-attempt progress while the newly claimed attempt has no
saved `policy.load`: with fewer policy rows than `run.attempt`, default conservatively to
an empty current segment. Do not permanently suppress genuine new work after an earlier
missing row: a valid current-attempt `llm.call.request.attempt` in the latest policy segment
corroborates that segment despite a count deficit. Only an actual LLM-call record can
corroborate; unrelated request fields, malformed numbers, and calls before the latest policy
boundary must not. The developer may improve this small algorithm if backed by real trace
evidence and equivalent tests. Do not invent timestamps, new wire fields, or server changes.
`RunAction.request` is unknown external input: read corroborating metadata through a small
Zod schema with a positive integer `attempt` and `safeParse`, using existing repo conventions.
Add missing, malformed, fractional, negative and unrelated-tool metadata cases; no casts that
silently trust the request shape.

Document the remaining indistinguishability explicitly: after historical missing policy rows,
before a corroborating current call (or if its best-effort row is lost), a fresh segment and
stale segment can be indistinguishable. The conservative context state may delay analysis;
do not claim universal exact recovery. A cached call-free prefix cannot repair that deficit.

## Comment mapping and dispositions

| Comment / review section                     | Disposition, proof and reply                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `4307098922`, thread `PRRT_kwDOUOEIjs6tqncc` | Accept: remove `POLICY_SETUP_ERRORS`, `policySetupFailure`, synthetic policy-code-only tests and false FA explanation. Add previous analysis/publishing plus a real failed `policy.load`, `failed/policy_rate_limited`, yielding `error, wait, wait`, including rendered error placement. Reply with implementation SHA and backend trace explanation.                                                                                                                                                                   |
| `4307098925`, thread `PRRT_kwDOUOEIjs6tqnce` | Accept: replace call-free summary-only fixture with current cache-miss order and real `summary_only` response. Put it in shared literal order fixtures so every prefix, each stopped phase and the retry matrix cover it. Reply with test SHA and complete-prefix coverage.                                                                                                                                                                                                                                              |
| `4307136423`, thread `PRRT_kwDOUOEIjs6tqtJC` | Accept symptom, refine proposed count rule using the deficit caveat above. Add zero-new-row prefix to all retry combinations and a rendered `attempt 1 -> 2` rerender before policy completion; exercise failed/cancelled too. Add missing-old-row recovery with real current LLM attempt and stale/malformed metadata rejection. Reply with SHA, normal-path fix and honest residual ambiguity.                                                                                                                         |
| Review `5563075487`, P3.1                    | Remove `reviewCall`, `failedBuild` and `hasReviewContext` branches plus unsupported synthetic scenarios. Keep a literal legacy regression case demonstrating the old outcome. Modern phase follows successful post-conventions prompt build; failures are exercised at real positions. Remove false best-effort-build prose.                                                                                                                                                                                             |
| Review `5563075487`, P3.2                    | Keep successful prompt-build handoff to analysis, including failed/cancelled before first recorded review call. Explain once in FA §7 and PR body: LLM call rows appear after call completion, so stopping during a call leaves the successful prompt build last. Note this AC2 interpretation for human acceptance, without blocking repair.                                                                                                                                                                            |
| Review `5563075487`, P3.3                    | Add soft first-build failure followed by successful prompt build and failed review; canonical per-step failure matrix; direct tool mapping rows for `policy.load` and `gitlab.publish_review`; full historical happy-path status table; unknown/prototype tools inside a policy-marked segment.                                                                                                                                                                                                                          |
| Review `5563075487`, P3.4                    | Use one literal `ORDERS` fixture for current/cache-hit/cache-miss/canonical/summary-only prefix and retry loops. Name current and canonical scenarios accurately. Replace metadata-only titles with behavior assertions that can fail under a plausible regression. Split widget reset and cancelled-note tests; use real cancellation code such as `cancelled_by_user`, not `cancelled/llm_timeout`.                                                                                                                    |
| Review `5563075487`, P3.5                    | Restore concise latest-attempt/known-tools comment, wrap it, and correct FA §7/§11: #194 merged, distinguish static tool classification from publishing evidence, reserve `engine.fallback` for #107, consistently backtick tool names, document attempt-gap handling and limitations. Preserve unrelated sections from current main.                                                                                                                                                                                    |
| Review `5563075487`, P3.6                    | Reconcile original plan/todo as historical evidence with a clear final prior-publication state: #194 merged; wrong task heading; board complete; final suite passed; publisher already committed/pushed; PR ready, not draft. Remove contradictory present-tense status claims without erasing useful RED/GREEN evidence. Link this revision plan.                                                                                                                                                                       |
| Review `5563075487`, P3.7                    | Publisher may split the cumulative rebased PR diff into atomic `fix(run)`, `fix(mocks)`, `docs(architecture)` and `docs(plans)` commits. This satisfies the requested logical history during the already-required rebase. No additional mock production change is necessary. Before publishing, verify the remote is still `3a6523d64b5358abe2f351275489c9fdff6e2219`; use an explicit lease for that SHA, and preserve any other-author updates if discovered. Explain the final commit structure in the summary reply. |

The coordinator replies in every inline thread using its original comment ID; reviewers own
thread resolution. The coordinator also posts one concise review-summary reply covering P3.1–P3.7, relevant
SHAs, gates, and the remaining attempt-identity limit. The publisher updates the existing PR body around
the final behavior and the AC2 interpretation; do not assign a reviewer, merge, or close #112.

## Ordered implementation slices

1. **Modern attempt correctness and regression proof (medium).** First write RED tests for
   the real policy failure, zero-row retry, and missing-old-policy recovery. Simplify the
   unsupported branches, thread attempt through the widget, unify literal order fixtures,
   and cover all requested current/canonical/legacy/unknown-tool/failure cases. Likely files:
   `runProgress.ts`, `runProgress.test.ts`, `RunProgressBar.tsx`, `RunProgressBar.test.tsx`.
   Acceptance: all three P2 regressions proven; no legacy observable regression; full prefix
   and retry matrix includes empty current attempts and summary-only.
2. **Documentation corrections (small; ownership prerequisite below).** Update only FA §7
   and the related progress bullet in §11, plus PR-body wording during publication.
   Acceptance: backend facts match inspected main and ambiguity is explicit; tool mapping
   and publishing evidence are distinct; no stale #194 or best-effort-build claim remains.
3. **Evidence and publication (small).** Clean original plan/todo status, complete the new
   todo, run all six frontend gates, browser smoke check the visible retry transition, get
   fresh independent Standards/Spec review, then publish atomic commits to PR #135 and
   reply to all mapped comments. Acceptance: clean worktree, green gates/CI, no findings,
   all comments addressed with SHA or justified disposition; no threads self-resolved.

Each implementation slice runs RED -> GREEN at public seams and a fresh review checkpoint.
No dependencies, schema changes, styling changes, backend edits or new architecture are needed.

## Shared-file ownership prerequisite

As of planning, open PRs #106/#109/#122 still own `docs/FRONTEND_ARCHITECTURE.md`; prior
authorized coordination comments cover #112 edits there. #134 is merged (13:26:06Z).
New open PRs #136/#137/#138/#139 also own that document. The user explicitly authorized
the proposed coordination comment and the coordinator posted all four successfully:

- [#136 coordination](https://github.com/larchanka-training/dmc-268-ui-t6/pull/136#issuecomment-6250521205).
- [#137 coordination](https://github.com/larchanka-training/dmc-268-ui-t6/pull/137#issuecomment-6250522591).
- [#138 coordination](https://github.com/larchanka-training/dmc-268-ui-t6/pull/138#issuecomment-6250523199).
- [#139 coordination](https://github.com/larchanka-training/dmc-268-ui-t6/pull/139#issuecomment-6250523851).

The shared-document prerequisite is satisfied; no additional permission gate remains.

Draft for each new owner:

> Координация по замечаниям к PR #135 (ui#112): обновим только §7 «Прогресс-бар» и связанную
> строку §11 `docs/FRONTEND_ARCHITECTURE.md`: граница попытки `run.attempt`/`policy.load`,
> фактическая трассировка API и ограничения. Перед push сверим `main` и пересечения;
> ваши разделы не меняем.

Refresh ownership if another PR opens before architecture edits.

## Validation

Use pnpm only; no dependency changes. Toolchain from the existing worktree:
`PATH=/private/tmp/dmc-112-bin:/Users/qx/.nvm/versions/node/v24.20.0/bin:$PATH`,
`COREPACK_HOME=/private/tmp/dmc-112-corepack`, pnpm 12.4.1.

Targeted tests first, then final gates: `pnpm lint`, `pnpm check-types`, `pnpm format:check`,
`pnpm test`, `pnpm build`, `pnpm verify:prod-bundle` (after build). Record RED and GREEN
results and literal counterexamples. Re-run after rebase and material fixes. Browser checks
are scoped to visible state behavior, both themes, desktop/390px; do not claim baseline focus
issues fixed or live backend coverage from mock tests.
