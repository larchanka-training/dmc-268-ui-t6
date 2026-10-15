# Task list: #105 — сообщение конфликта повторного запуска

Refs: [larchanka-training/dmc-268-ui-t6#105](https://github.com/larchanka-training/dmc-268-ui-t6/issues/105).
Design, copy, baseline and ownership: [105-plan.md](105-plan.md).

## Before development

- [x] Issue, UI rules, planning/TDD skills and relevant code inspected.
- [x] Current API main confirms shared 409 detail without a reason discriminator.
- [x] Open PR ownership inspected: `src/entities/run/api/index.ts` overlaps PR #107.
- [x] User approves plan, exact Russian copy and public test seam.
- [x] User authorizes the saved coordination comment; sent to PR #107 before editing its file.
- [x] Refresh UI main and create `fix/105-rerun-conflict-message` from it; preserve the old branch and `.pnpm-store/`.

## Task 1: Correct rerun 409 message through TDD

**Description:** Change the existing status mapper for rerun conflicts while
preserving every other action/status message. Do not infer the reason from detail.

**Acceptance criteria:**

- [x] Rerun 409 returns exactly: «Нельзя перезапустить ревью: у PR уже есть активный прогон, PR закрыт, ревью репозитория приостановлено или GitHub App недоступна».
- [x] The expected string is a test literal; current backend detail and unrelated English detail both produce it without exposing raw detail.
- [x] Cancel 409 retains «У этого PR уже есть активный прогон или PR закрыт»; existing 404/422/unknown-error behavior for both actions remains covered and unchanged.

**Verification:** Capture a failing targeted test before implementation, then run
`pnpm test src/entities/run/api/fetchRunActions.test.ts` after each small vertical
slice. Keep tests at the exported mapper boundary. The task is complete only
after all six frontend gates pass at the next checkpoint.

**Dependencies:** Approved plan, authorized ownership comment, main-based branch.

**Files likely touched:**

- `src/entities/run/api/index.ts`
- `src/entities/run/api/fetchRunActions.test.ts`
- `src/widgets/run-inspector/ui/RunControls.test.tsx` (dependent integration literal)

**Estimated scope:** Small, mapper and two test files.

- [x] Task 1 complete (format gate's preexisting local-store limitation recorded below).
- [x] Checkpoint: literal copy, detail independence and cancel/status regressions pass.

## Task 2: Verify, review and publish

**Description:** Record actual verification and obtain zero independent review
findings, then publish the focused change as a pull request.

**Acceptance criteria:**

- [x] All frontend gates run; repository checks pass with preexisting local-store formatting limitation reported exactly, without modifying unrelated files.
- [x] Fresh Standards and Spec reviews report zero findings; resolve findings and repeat review when needed.
- [x] Publisher rechecks ownership/current main, rebases if needed, commits with normal hooks, pushes and opens a PR using `What` / `Why` / `How to verify` / `Refs` and `Refs #105`, without closing the issue or linking the Development panel.

**Verification:** Execute commands below, inspect final diff/status, preserve
`.pnpm-store/`, record RED/GREEN and gate evidence here, return and attach the PR
URL. Browser checklist is mandatory under frontend rules §3b: verify the rerun
409 toast on desktop/390px in both themes, including keyboard/focus, computed
contrast, no horizontal overflow and reduced motion.

**Dependencies:** Task 1.

**Files likely touched:** `docs/plans/105-plan.md`, `docs/plans/105-todo.md`.

**Estimated scope:** Small documentation and publication checkpoint.

- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check` (temporary external ignore for preexisting store; raw failure recorded below)
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm verify:prod-bundle` after build
- [x] Browser checklist (desktop/390px, both themes).
- [x] Standards review: zero findings.
- [x] Spec review: zero findings.
- [x] Update plan/todo to reflect actual implementation and validation.
- [x] Recheck current main and ownership; rebase before requesting review.
- [x] Readiness/reviewer checkpoint: user chose ready PR and will assign reviewer later; create ready PR without `--reviewer`.
- [x] Commit/push/PR complete with hooks, issue references and no unrelated files.
- [x] PR URL attached and returned to the coordinating agent for the user.
- [x] Task 2 complete.

## Evidence

Development on 2026-10-15:

- Baseline: refreshed `origin/main@24af7b75e6c20a6526a9cf31955aa220c1fde87b`;
  created `fix/105-rerun-conflict-message`, preserving the previous branch.
- Ownership rechecked: PR #107 owns `src/entities/run/api/index.ts`; authorized
  [coordination comment](https://github.com/larchanka-training/dmc-268-ui-t6/pull/107#issuecomment-6193119135)
  precedes edits. No other changed file overlaps an open PR.
- Tool runtime: Node v24.20.0 and pnpm v12.4.1. Default shell Node v22.18.0 is
  below the repository minimum. The private registry timed out during pnpm's
  dependency verification; `pnpm --registry=https://registry.npmjs.org install --frozen-lockfile`
  installed exact locked dependencies without tracked changes.
- RED: targeted test failed with 2 expected copy mismatches and 9 passing tests
  before changing the mapper. GREEN: 11 tests passed after the minimal mapper
  change; final entity regression set passed 13/13 after adding cancel 409 and
  both-action non-ApiError coverage.
- Initial full suite: 1185 passed, 1 failed (101 files), revealing the stale rerun
  toast literal in `RunControls.test.tsx:89`. Updating only that literal made all
  6 widget tests pass; final full suite passes 1186/1186 tests in 101 files.
  Existing jsdom warnings mention getComputedStyle, canvas and navigation.
- After the dependent test literal changed, its ESLint and Prettier checks pass;
  no production code changed after the successful build/bundle gates.
- Gates: lint, check-types, build, verify:prod-bundle pass. Build warns about an
  existing chunk above 500 kB; bundle gate confirms 22 clean asset files.
- Raw `pnpm format:check` fails only on these preexisting untracked files:
  `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791563001124/package.json`,
  `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791633279571/package.json`,
  `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791633279572/package.json`,
  `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791633279576/package.json`, and
  `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791633279581/package.json`.
  `pnpm format:check --ignore-path /private/tmp/ui-105-prettierignore` passes;
  that temporary file copies `.prettierignore` and adds `.pnpm-store/`.
  No store contents or repository ignore files were changed.
- No commit, push or PR publication performed by the development agent.
- Final independent Standards and Spec reviews report zero findings on the
  mapper and both regression test files, including the dependent widget literal.
- Browser QA: the actual run page with a mocked rerun HTTP 409 passes at
  1440px and 390px in light and dark themes. Tab + Enter sends one POST per
  scenario; the full Russian toast appears without raw detail, wraps to four
  lines on mobile, and produces no horizontal overflow. Focus remains on the
  32px rerun control with its visible 2px theme ring. Computed toast contrast is
  18.72:1 (light) and 16.35:1 (dark); reduced motion is enabled. No runtime
  errors occur; the expected HTTP 409 resource message is the only console
  error. Temporary browser evidence is stored outside the repository under
  `/private/tmp/ui-105-browser-results.json` and
  `/private/tmp/ui-105-{light,dark}-{1440,390}.png`.
- Before publication, remote main remains
  `24af7b75e6c20a6526a9cf31955aa220c1fde87b`, the branch base. Ownership is
  unchanged: only PR #107 overlaps the mapper, covered by the comment above.
- Published ready-for-review [PR #108](https://github.com/larchanka-training/dmc-268-ui-t6/pull/108)
  from `fix/105-rerun-conflict-message`; attached to the chat. The user will
  assign the reviewer. Implementation commit `8337433` passed normal
  pre-commit (ESLint and Prettier) and pre-push (types and lint) hooks. The
  approved source hashes are unchanged. The preexisting `.pnpm-store/`
  remains untracked; no unrelated files or dependencies were committed.
