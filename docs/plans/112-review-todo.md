# PR #135 review revision checklist

Follow [112-review-plan.md](112-review-plan.md). Baseline reviewed HEAD: `3a6523d`.

This is the source-freeze and publisher handoff snapshot, recorded before publication.
Unchecked external actions below belong to the publisher/coordinator handoff; the eventual
PR body, replies and CI results on PR #135 are authoritative for their completion. Do not
add a standalone journal commit just to copy those external results back here.

## Slice 1 — run progress and proof

- [x] Contract proof: previous publishing plus real failed `policy.load` stops on context; remove synthetic policy-error-only assumption (comment `4307098922`).
- [x] RED: `run.attempt` advances while log still has zero new rows; test all retry-prefix pairs and rendered widget transition (comment `4307136423`).
- [x] Prove no permanent suppression after earlier missing policy row: matching current LLM call attempt restores latest segment; stale/non-LLM/malformed metadata does not. Parse unknown request metadata with Zod `safeParse` and a positive integer attempt.
- [x] Thread `attempt` through the required public model and widget inputs; retain historical no-policy behavior and status constants.
- [x] Remove unsupported setup-error list, review-call handoff and equivalent failed-build/legacy-context branches; keep literal legacy regression test (P3.1).
- [x] Shared literal `ORDERS`: current cache hit/miss, canonical cache hit/miss and realistic current summary-only with `summary_only` response (comment `4307098925`, P3.4).
- [x] Every running prefix including empty current attempt, all stop phases and retry matrix use those orders; canonical failed-step matrix and successful prompt-build handoff remain covered (P3.2/P3.3).
- [x] Add soft initial-build failure, direct policy/GitLab mapping, unknown modern tools, full legacy status path (P3.3).
- [x] Split rendered retry and cancellation-note assertions; use production cancellation code; remove misleading metadata test titles/cases (P3.4).
- [x] Targeted RED/GREEN proof recorded; lint/type checks for changed source pass.
- [x] Fresh independent Standards/Spec checkpoint has zero findings.

## Slice 2 — architecture

- [x] Coordinator obtained authorization and posted ownership comments in #136/#137/#138/#139; links in plan. Refresh open PR list if needed.
- [x] FA §7: attempt input and policy/LLM corroboration; real failed-policy trace; missing-row limits; prompt-build handoff explanation; merged #194; tool-stage vs publishing-evidence distinction; reserved #107 fallback; backticked tool names (P3.2/P3.5).
- [x] FA §11 progress bullet agrees with §7, preserving unrelated current-main changes (P3.5).
- [x] Developer checked documentation against pinned/current API evidence and model behavior; independent review follows.

## Slice 3 — integration and publication

- [x] Reconcile original 112 plan/todo contradictions, preserve useful historical evidence, link this review round (P3.6).
- [x] Rebase on UI `main` `6f5a122`; baseline `bcfbb550`. Sole conflict preserves the new-main cancel/rerun paragraph and original PR progress heading; no unrelated change.
- [x] `pnpm lint`.
- [x] `pnpm check-types`.
- [x] `pnpm format:check`.
- [x] `pnpm test`.
- [x] `pnpm build`.
- [x] `pnpm verify:prod-bundle` after build.
- [x] Scoped browser retry transition verified; claims limited to observed behavior.
- [x] Final independent Standards and Spec review reports zero findings; source-freeze evidence complete.
- [ ] Publisher splits the cumulative rebased diff into atomic run, mocks, architecture and plan-evidence commits; hooks enabled; explicit remote lease after verifying expected `3a6523d`; pushes existing branch; no duplicate PR (P3.7).
- [ ] Existing PR body describes final behavior, real trace contract, remaining ambiguity and AC2 interpretation.
- [ ] Coordinator replies to each original inline comment `4307098922`, `4307098925`, `4307136423` with corresponding SHA and evidence; leave threads unresolved for reviewers.
- [ ] Coordinator replies to review `5563075487` P3.1–P3.7 with disposition/SHAs, final gate and CI evidence.
- [ ] PR remains ready for review, reviewer unassigned; no merge or issue closure.

## Slice 1 development proof

- Remote branch was verified as `3a6523d64b5358abe2f351275489c9fdff6e2219` before local
  rebase. Rebase on `origin/main` `6f5a122` produced baseline `bcfbb550`; the two untracked
  review-plan files were preserved. No commit, push, reply or thread resolution was performed.
- RED: before the implementation, combined model/widget run reported **4 failed / 158 passed**:
  `running`, `failed` and `cancelled` with a newly claimed attempt but zero new action rows,
  plus the rendered `attempt 1 -> 2` rerender with the prior log unchanged. The old bar inherited
  analysis/publishing instead of resetting to context. Real failed-policy rows were added as
  contract proof; they were already correctly placed and are not claimed as separate REDs.
- GREEN model checkpoint: **131/131 tests passed**. The required attempt input, conservative
  policy-count deficit and Zod-validated current LLM-call corroboration replace the unsupported
  setup-code override. Removed review-call/failed-build/legacy-context branches. Final combined
  model/widget validation passed **173/173 tests** across two files (91.83s). `pnpm check-types`
  passed; full `pnpm lint` passed (ESLint and Stylelint).
- `ORDERS` is shared by complete running/stopped prefix and retry Cartesian matrices, including
  zero current rows. The summary-only order includes both real conventions/review calls and a
  literal `vcs.fetch_diff.response.summary_only: true`. Per-step failures cover all five current
  and canonical paths. Historical no-policy status/build-only paths, soft initial-build failure,
  direct policy/GitLab mapping, and modern unknown/prototype tools remain observable tests.
- Corroboration cases exercise valid current attempt recovery despite a missing historical
  policy row; missing/stale/future/noninteger/negative/zero/null/unrelated metadata, non-LLM
  requests and matching calls before the latest policy boundary cannot expose stale progress.
  A call-free cache-hit prefix remains conservatively on context until corroborated.
- The rendered cancellation note uses `cancelled_by_user` and is tested independently of the
  zero-row retry transition. The real failed `policy.load` after previous publishing carries
  `policy_rate_limited` exactly once on context.
- Retained the modern known-tool filter as an explicit boundary. After simplifying terminal
  handling, removing that filter alone is observationally equivalent for unknown tools; no
  implementation-coupled assertion or misleading mutation claim was added for it.

- First independent Slice 1 review: Spec reported zero findings; Standards found one P3:
  the new unknown-tool matrix used the same function to derive its expected output. Replaced
  that expectation with literal `ORDERS` phases and literal status tables, then froze the
  patch for Standards re-review. The complete pure progress suite again passed **131/131**
  (5.94s); production/widget files were unchanged by this review fix. Changed-test ESLint passed;
  the earlier full lint run also passed. Fresh Standards re-review
  reported zero remaining findings, with the earlier zero-finding Spec result unchanged.

## Slice 2 documentation proof

- Updated only architecture §7 and its related §11 progress bullet. Required `attempt`,
  policy-count deficit/current-call corroboration and the unresolved missing-row ambiguity match
  the implemented model. The static legacy tool map is distinct from publishing evidence;
  `engine.fallback` is reserved for api#107, #194 is merged, and no prompt-build best-effort
  claim or setup-code override remains.
- Inspected API source at `dabb12c6` explicitly. Its relevant context, lifecycle, trace, LLM,
  failure and reconciler code plus `PIPELINE_SPEC.md` are unchanged at current API origin/main
  `6f2b88bf`. Policy errors are traced before rethrow; only gateway call tracing is best-effort.
  Successful prompt-build handoff explains a stop before the completed LLM-call row exists.
- Original plan/todo now distinguish completed first publication from this review iteration;
  corrected #194, Task 3 review heading, board completion, final 1326-test suite, pushed commits
  and ready-for-review state. Useful original RED/GREEN evidence remains; unsupported synthetic
  assumptions are explicitly superseded rather than represented as current behavior.
- Coordinator completed CUA checks against a disposable `.proof/` browser harness importing the
  actual bar and design-system provider with literal fixtures. In light/dark at 1280px and 390px,
  old attempt 1 showed `finish/process/wait`; attempt 2 with the same five old actions showed
  `process/wait/wait`; new policy plus initial build stayed `process/wait/wait`; new prompt build
  returned `finish/process/wait`. At 390px each state had `clientWidth = scrollWidth = 390`.
  Browser warning/error logs were empty. This proves rendered component behavior with local
  literal data, not live-backend delivery. `.proof/` was removed before final global gates and
  was never staged.

## Final source-freeze validation and handoff

- All six gates passed with Node 24.20.0 and pinned pnpm 12.4.1: `pnpm lint`,
  `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`, and
  `pnpm verify:prod-bundle` against that build. Full suite: **105 files / 1342 tests**,
  **75.43s**. Production audit: **22 JavaScript assets clean**. Test output includes the
  existing jsdom canvas notices; the build reports the existing large-chunk advisory.
- Fresh independent Standards and Spec reviews of the final source and documentation
  both reported **zero findings**. The browser evidence above covers the actual component
  in both themes at desktop and 390px; no live-backend coverage is claimed.
- Publisher rechecked remote `main` as `6f5a122ebccf2b85bb12587a1d50be404477b2cb` and
  PR branch as `3a6523d64b5358abe2f351275489c9fdff6e2219` before history reconstruction.
  The authorized handoff preserves the complete final file tree and groups the cumulative
  diff into run behavior/tests, mock timelines/tests, architecture, and plan evidence.
  Hooks remain enabled; pushing requires the explicit expected remote lease.
- After publication, the coordinator owns the three inline replies and the review-summary
  reply, citing the final SHAs and CI. Reviewer threads remain open for their authors;
  PR #135 stays ready, without assigning a reviewer, merging, or closing #112.
