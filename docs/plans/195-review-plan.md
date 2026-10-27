# PR #195 review round 1: response plan

Source: [UI PR #195](https://github.com/larchanka-training/dmc-268-ui-t6/pull/195), review on `34f81ce9` (one P1, six P2 threads, fifteen P3 items). The branch is currently Draft. [API PR #340](https://github.com/larchanka-training/dmc-268-api-t6/pull/340) at `e4cda2a` is open and supplies the `provider` field and Bitbucket endpoints. This plan covers every review point; implementation and PR replies follow after test-first changes.

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
