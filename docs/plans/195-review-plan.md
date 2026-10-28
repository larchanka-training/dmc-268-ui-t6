# PR #195 review rounds 1–2: response plan

Sources: [UI PR #195](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195), round 1 on `34f81ce9` (one P1, six P2 threads, fifteen P3 items), and [round 2 on `39ad676`](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#pullrequestreview-5674064482) (ten additional P3 items). As checked on 2026-10-27, #195 is Draft and still has the one open P1 merge-order thread; all six P2 threads are closed. [API PR #340](https://github.com/larchanka-training/dmc-268-api-t6/pull/340) is open at `f7135aa` and supplies the `provider` field and Bitbucket endpoints. The earlier `e4cda2a` and `34f81ce9` references below describe round-1 evidence, not final contract pins. Implementation and PR replies follow test-first changes.

## Release boundary

The UI `RepositorySchema`, `RunSessionSchema` and `PullRequestRefSchema` require `provider`. The deployed API `main` contract lacks it, so merging UI first would break repository/run parsing, including GitHub. Keep #195 Draft until #340 is merged and deployed. Verify an authenticated staging `/api/repos` response includes `provider` and check run list/detail/SSE provider responses before making #195 Ready. The existing UI tolerates the API's extra field, so deploy API first. Record both deployed SHAs and successful browser checks in the PR body.

API #340 pins UI Zod provenance to `34f81ce9` in `tests/test_ui_zod_contracts.py`; after the final UI schema commit, regenerate `tests/fixtures/ui_zod_contracts.json`, update `UI_CONTRACT_COMMIT`, and add Bitbucket connection schemas to `tests/generate_ui_zod_contracts.mjs`/API contract checks. Use a clean committed UI checkout, as the generator rejects tracked changes. Coordinate the API PR update before its approval; avoid new UI schema edits afterward without repinning.

## Decisions for implementation

- Bitbucket accepts only `waitForCi=never` in API eligibility. UI must expose that limit and never submit a conflicting setting. API #340 should reject an incompatible PATCH with 422 so another client cannot silently disable reviews.
- Bitbucket publication writes comments/status but does not use `reviewEvent`. Show it as unavailable with an explanation in UI; API #340 should reject a Bitbucket PATCH that changes it to `REQUEST_CHANGES` (or explicitly document another enforceable behavior). Confirm against API code/tests before final copy.
- Keep exact `provider` parsing for the final UI contract. The alternative `.default('github')` is unnecessary if release order is enforced, and it would hide a broken API response.
- Only the displayed workspace may show its one-time hook secret. Preserve that secret across unrelated actions within the same workspace until explicit dismissal or workspace switch; do not cache or persist it. If idempotent connect returns `webhook:null`, explain how to rotate a new secret.
- Every successful mutation invalidates both Bitbucket connections and common repositories even if the user switched workspace while it ran. The epoch guard limits local state only. Queries must use the original mutation workspace for invalidation.

## Work packages and dependencies

1. **API policy and contract (#340):** provider-aware PATCH validation, Bitbucket schema snapshot coverage. This can proceed alongside UI fixes; final fixture provenance waits for the final UI commit.
2. **Settings safety:** test and constrain CI/review-event controls for Bitbucket; preserve GitHub/GitLab behavior.
3. **Boundary errors and mocks:** fixed localized error mapping, Zod fallback, backend-shaped mock errors and idempotent responses.
4. **Discovery and secret flow:** trim/freeze discovery input, accessible one-time setup, empty-workspace guidance, password autocomplete.
5. **Mutation flow:** themed named confirmation, correct binding ID, reliable invalidation, focus after connect/disconnect/rotation, accessible action names.
6. **Provider propagation:** make provider parameters required; lock in Bitbucket and GitLab copy for settings, rules, RAG, unavailable state, and rerun.
7. **Browser layout:** fix provider tag stretching and workspace Select layout; inspect both themes at 1280/390 px and keyboard focus.
8. **User docs and mockups:** align copy with UI and real limitations, update run mockup for provider column and regenerate affected screenshots.
9. **Release evidence:** rerun all gates, independent review, update PR body/checklist and record API-first staging probe before Ready/merge.

Checkpoints: after packages 2–3 run focused tests; after 4–6 rerun affected component/integration tests and the reviewer's mutation scenarios; after 7–8 run browser and docs checks; before Ready run all UI gates and coordinate API #340's fixture/tests.

## Review-point coverage

| Review point                                                                                                        | Work package        |
| ------------------------------------------------------------------------------------------------------------------- | ------------------- |
| [P1: API-first merge](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#discussion_r4386822176)          | release boundary, 9 |
| [P2: CI/review-event settings](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#discussion_r4386822199) | 1, 2, 8             |
| [P2: raw API/Zod errors](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#discussion_r4386822216)       | 3                   |
| [P2: stretched provider tag](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#discussion_r4386822233)   | 7                   |
| [P2: Select layout](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#discussion_r4386822250)            | 7                   |
| [P2: lost keyboard focus](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#discussion_r4386822258)      | 4, 5, 7             |
| [P2: surviving mutation cases](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195#discussion_r4386822272) | 2–6, 8              |
| P3 #1 PR body/browser proof; #2 modal; #3 secret display/lifetime                                                   | 9; 5; 4             |
| P3 #4 mock contract; #5 connection cursor; #6 discovery input                                                       | 3; 3; 4             |
| P3 #7 invalidation after epoch switch; #8 optional provider defaults                                                | 5; 6                |
| P3 #9 rerun copy/empty workspace; #10 rotation schema placement                                                     | 6/4; 3              |
| P3 #11 action names; #12 password autocomplete; #13 docs/mockup                                                     | 5; 4; 8             |
| P3 #14 GitLab copy tests; #15 API fixture pin/Bitbucket schemas                                                     | 6; 1/9              |

## Risks

| Risk                                                                      | Control                                                                                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| UI reaches staging before API provider DTOs                               | Keep Draft; require API #340 successful staging deploy and authenticated provider probe first.       |
| UI-only CI restriction allows another client to disable Bitbucket reviews | Add API PATCH validation in #340 and an API test.                                                    |
| One-time secret disappears or leaks across workspaces                     | Keep it in component state only, explicit lifecycle and race tests.                                  |
| Stale async mutation leaves common list outdated                          | Invalidate shared caches after server success regardless of UI epoch.                                |
| Mock/contract drift hides production errors                               | Use API-shaped `{detail:code}` and response fixtures; pin all Bitbucket Zod schemas in API #340.     |
| CSS and focus defects escape jsdom                                        | Inspect built UI in browser, both themes and widths, keyboard actions, attach sanitized screenshots. |

No other open UI PR owns either new `docs/plans/195-review-*` file. Files already in #195 remain on that PR branch. No new dependency is expected.

## Round 2: work order and acceptance

Round-2 review found no new P1/P2 code defect. Finish the ten P3 points, then resolve the branch conflict, pin the exact final UI contract in API #340, and gather API-first staging proof before changing #195 from Draft. Do not mark the PR body's rebase, approval, or staging checklist items complete until they are true on the final head.

1. **Behavioral panel fixes, test first:** while focused on “Показать ещё”, load the final discovery page and assert focus moves to the first appended result or “Найти репозитории”; assert it never falls to `body`. Add a same-tick dismiss/add test for one-time webhook cards, then make `dismissSetup` use the current state. Replace the global `React.useRef` spy with an assertion on the next-page request body, including frozen slug/token criteria. Keep the one-time secret lifecycle and workspace-switch behavior from round 1.
2. **Request validation and real errors:** reproduce an overlong workspace slug and assert a safe input-specific message before/at request validation, distinct from malformed server responses. Add mapper cases for 401, 403, a non-special 409, and ≥500; ensure no raw backend detail leaks. Align the invalid-token UI test to the API's actual `repository_inaccessible` 422 path, while retaining a safe mapping for declared `invalid_credential` if it arrives. Any change to the API's emitted error contract belongs in #340 and needs its own test.
3. **Visible status and access copy:** assert both “Webhook активен” and “Ожидает webhook” on appropriate rows. Add an inaccessible non-GitHub repository test for its aria-label. Use “Bitbucket Cloud” in the unavailable-access label, coordinated with UI PR #194 before editing its overlapping `RepositoryList.tsx`.
4. **Mock rules status:** add a connected Bitbucket repository case so the mock settings page receives a rules status and renders the normal state rather than a 404. Verify the repository ID and provider match the mock connection. UI PR #196 owns `src/app/mocks/mockRulesStatus.ts`; prefer adding the response in #195-owned `mockTransport.ts` if the transport design allows it. Otherwise wait for #196 to merge or comment there before editing its file.
5. **Focus code readability:** extract the focus handoff into a small `useFocusHandoff` hook with behavior-preserving tests for connect, disconnect, rotation, dismissal, and a missing target. Make target IDs explicit: remote Bitbucket UUID for connect, portal repository ID for existing bindings. Remove the hook-order-dependent test. Keep this after the behavioral red/green cases so the refactor has a regression net.
6. **Architecture docs:** after resolving the `docs/FRONTEND_ARCHITECTURE.md` conflict, document Bitbucket connections, one-time webhook setup, read-only settings, `modal.confirm`, focus handoff, and provider-specific status. Retain the newer main-branch “более N” changes in `rulesStatusView.ts` and its test when reconciling the rebase.
7. **Branch and release boundary:** #195 is `DIRTY`/`CONFLICTING` against `main` `2dda09a` at planning time. Rebase the implementation branch only after its uncommitted work is safely recorded; resolve the architecture-doc conflict, inspect the automatic rules-status merges, and rerun all gates on the rebased head. Then regenerate API #340's Zod fixture from a clean committed checkout of that exact final UI schema SHA and update `UI_CONTRACT_COMMIT`. API #340 must merge and deploy before #195. Probe authenticated staging `/api/repos`, `/api/runs`, `/api/runs/{id}` and SSE `run.update` for `provider`, record API/UI SHAs, then update the PR body and request final review. A rebase or code push invalidates an earlier approval.

### Round-2 P3 traceability

| Review P3                              | Planned work                                       | Evidence to retain                                                                 |
| -------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1. PR body and Draft claim             | Release boundary                                   | Truthful Draft/rebase/Task 9 status, later API-first probe and final-head approval |
| 2. Last discovery page focus           | Behavioral panel fixes                             | Keyboard-focused next-page test and browser focus check                            |
| 3. Request `ZodError`                  | Request validation                                 | Overlong slug test distinct from malformed response                                |
| 4. `dismissSetup` stale closure        | Behavioral panel fixes                             | Same-tick card insertion/dismissal test                                            |
| 5. Missing mutation assertions         | Visible status/access copy; request validation     | Both webhook labels, inaccessible Bitbucket aria-label, 401/403/409/5xx rows       |
| 6. Imaginary `invalid_credential` path | Request validation                                 | Real 422 `repository_inaccessible` UI test; optional API contract decision         |
| 7. Mock Bitbucket rules 404            | Mock rules status                                  | Settings page/transport test returns rules status                                  |
| 8. Focus maps, IDs, access name        | Focus code readability; visible status/access copy | Typed IDs, unchanged keyboard flow, Bitbucket Cloud label                          |
| 9. Architecture omissions              | Architecture docs                                  | Conflict-resolved provider/connection lifecycle section                            |
| 10. Global `useRef` spy                | Behavioral panel fixes                             | Next-page request assertion without React hook interception                        |

### File ownership and gates

UI PR #194 also edits `src/widgets/repository-list/ui/RepositoryList.tsx`; #196 edits `src/app/mocks/mockRulesStatus.ts`, `src/widgets/repository-rules/lib/rulesStatusView.ts`, and its test. Do not edit those overlapping files while their PRs remain open without a comment in the owning PR. The planning files are in #195 only. The implementation checkout contains unrelated uncommitted changes; keep those intact and use a clean rebase only when the owner has consolidated them.

Focused tests should fail for each behavioral bug before its fix. Final UI gates on the rebased head: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm verify:prod-bundle`, `pnpm --dir docs-site check-types`, and `pnpm --dir docs-site build`; rerun landing/docs screenshots only when affected UI/mockups change. Browser QA should repeat the 1280/390 light/dark tag/Select measurements and keyboard focus flows after the focus refactor. API #340's contract test and full gates must pass after the final fixture pin. Keep #195 Draft until staging proof exists, all review threads are resolved, and a new approval applies to the final head.

## Contract parity follow-up at UI `e5dfb6c` (2026-10-28)

The current API #340 integration candidate accepts a Bitbucket `apiToken` only when it has 1–4096 printable ASCII characters (`[!-~]`) in discovery, connect and credential rotation. Its webhook setup response lists five events: `repo:push`, `pullrequest:created`, `pullrequest:updated`, `pullrequest:fulfilled`, `pullrequest:rejected`. UI #195 currently checks only nonempty tokens and parses only the first three events. This means an invalid token reaches the server and a valid five-event response fails Zod parsing.

Add one test-first UI task before the final contract pin. Share one token schema across the three request shapes, with an end-of-input check that also rejects a trailing newline; preserve the 4096-character limit and existing secret handling. Expand the webhook event enum to all five API values, update the mock connect/secret-rotation responses and the API test fixture, and update the Bitbucket setup guide's event list. Keep slug validation and unrelated provider schemas outside this task. The final UI schema commit requires regenerating API #340's Zod fixture and `UI_CONTRACT_COMMIT` again.

Verification: first make boundary tests fail for a 4097-character token, whitespace/non-ASCII (including a trailing newline), and a five-event connect/secret-rotation response; then make them pass and run the affected mock tests. Run all UI gates and docs-site checks before publishing; verify the API contract fixture on the resulting clean UI SHA. No live Bitbucket claim follows from mock tests.
