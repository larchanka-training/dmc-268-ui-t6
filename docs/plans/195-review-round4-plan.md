# UI PR #195: round 4 review plan

Source: [round-4 review](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#pullrequestreview-5683870877) on UI `c581bf660837c3a7d03101c3740f946282a752b1`. The [new P2](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#discussion_r4401496909) blocks connection with a pasted token that has trailing whitespace. The rules-status P2 is closed. The [P1 release-order thread](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#discussion_r4401495943) stays open until API deployment and a staging probe.

## Decisions and order

1. Fix token entry first. Trim at the UI boundary for discovery, connect and credential rotation; freeze the normalized discovery criterion for pagination. Treat an empty trimmed value as missing and an invalid nonempty value as a token-input error before the API call. Keep malformed **response** `ZodError` mapped to its existing response-format message. Do not echo token text in a toast or log.
2. Close the remaining behavioral P3s test first: capture discovery focus before disabling its trigger; test final and intermediate pages with delayed responses and lost browser focus; cover missing/disabled focus targets and the exact 128-character workspace boundary. Add the missing Bitbucket no-access aria-label assertion in `RepositoryList.test.tsx` without editing `RepositoryList.tsx` (owned by open UI #194).
3. Simplify the token regex to `$` and remove the incorrect JavaScript-anchor comment. Node confirms `/^[\x21-\x7E]+$/.test('abc\n')` is false without `m`. Preserve the 1–4096 printable-ASCII contract, including a trailing-newline regression. The API contract check should verify equivalent accepted characters for all three request schemas, rather than compare the different literal spellings `[\x21-\x7E]` and `[!-~]`.
4. Correct reconnect semantics. API #356 requests a new read on reactivation but retains the last stored status: GET returns that status until the worker saves a new one. The mock test currently expects a second `pending`; change it to check the retained status, and clarify the initial-connect versus reconnect cases in docs. `docs/FRONTEND_ARCHITECTURE.md` is also edited by open UI #194: coordinate there before changing it, per AGENTS.md; do independent tasks while that coordination is pending.
5. Run UI gates and browser QA, then publish a normal commit to #195 without rewriting its history. Fix the stale CI sentence in the PR body. Keep #195 Draft and the P1 thread open. API #340 remote head `f60202bae2d31dda23e5d0c70f429ac6d3030bfe` already contains #356's rules-status and secure-client code, its Zod fixture records UI `c581bf6`, and `tests/test_ui_zod_contracts.py` pins that SHA. After the final UI schema SHA exists, repin the generated fixture and `UI_CONTRACT_COMMIT` in the **current** #340 candidate, and add token-pattern parity in `tests/test_openapi_contract.py`. Stacked #356 is dirty against the new base; do not merge or repin its old branch. The local `feat/333-bitbucket-cloud` worktree `/private/tmp/pr340-review-comments` is on old `7ec6073` with uncommitted work, and `/private/tmp/pr340-round4-integrated` is detached on `f8b0981` with 175 changes. Coordinate with their owner before any API edit; use a clean checkout at the published #340 head after the owner integrates its work. API #340 must merge and deploy before #195 can be Ready. Probe authenticated `/api/repos`, `/api/runs`, `/api/runs/{id}`, SSE `run.update` for `provider`, and Bitbucket `rules-status` one minute after connect; record both deployed SHAs.

## Checkpoints

- After tasks 1–2: focused UI tests and a Chrome mock pass for trailing-space token and delayed discovery focus.
- After tasks 3–4: schema/mock/docs tests and an independent Standards/Spec review of the diff.
- Before publish: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm verify:prod-bundle`; docs-site checks when docs change. Then CI on the pushed UI head and API contract tests on its exact pin.

## Boundaries

- No new dependency is expected.
- Open UI #194 owns `src/widgets/repository-list/ui/RepositoryList.tsx` and `docs/FRONTEND_ARCHITECTURE.md`; do not edit either without a coordination comment there. The aria-label test file is not in #194's diff.
- API #340 is being updated separately. Its published head already includes the relevant #356 changes; only the final UI SHA/pattern check remains for this review round. Confirm its current head and ownership before any API fixture edit; an API change is complete only when its own checks pass on the repinned head.
- The new P2 can be fixed and published independently of the #194 overlap and the API-first staging gate.
