# #128 — Run-page loading and regression coverage

Scope and public test seams approved on 2026-10-23.
Sources: [issue #128](https://github.com/larchanka-training/dmc-268-ui-t6/issues/128),
[PR #165](https://github.com/larchanka-training/dmc-268-ui-t6/pull/165), and its
[round-one handover review](https://github.com/larchanka-training/dmc-268-ui-t6/pull/165#discussion_r4363312107).
Execution and verification results: [128-todo.md](128-todo.md).

## Architecture and behavior

- `RunDetailPage` returns the existing shared `PageLoading` marker only while the
  initial run query is loading. The single `PageLoaderHost` in `UiProvider` owns
  the existing 300 ms delay, viewport centering, fade and reduced-motion behavior.
  No page timer, second host or global loader state-machine change is needed.
- Session, lazy route and initial run-data markers represent one continuous page
  wait. Handover before 300 ms preserves the original delay; handover after the
  host appears preserves the same shown DOM host while run data remains pending.
- Success, error and navigation release the wait. Cached refetches keep content
  visible. Existing error, not-found, missing-id and section-loading output stays.
  A cold offline query is paused with no data and currently shows the not-found
  branch; changing that pre-existing UX is outside #128.
- `DESIGN_SYSTEM.md` §7 states that the PageLoader ring is decorative (`aria-hidden`)
  and does not announce loading; §8's whole-page loading rule remains intact.
- Center continuity refers to the pending route-to-data handover. After content
  appears, a classic scrollbar can reduce the viewport width and shift the same
  fading host by about 7 px. This existing host behavior is unchanged.
- Regression coverage connects ProgressSteps titles and small root to their CSS,
  pins both themes' danger-primary hover/press to §7 literals, and connects UserMenu
  avatar/compact classes to their stylesheet. Production colors and avatar CSS stay.

## Public test boundaries

- `src/app/runDetailLoading.page.test.tsx` composes the real app loader host, router
  Suspense and RunDetailPage with TanStack Query and deferred API transport. Its
  placement in `app` keeps imports downward; it does not inspect loader counters.
- `src/pages/runs/RunDetailPage.empty.test.tsx` exercises the existing no-data output
  through the real offline-paused query and restores the public `onlineManager`.
- Rendered ProgressSteps exposes title classes/state and the actual
  `.ant-steps.ant-steps-small` root; existing stylesheet assertions remain.
- Public theme construction and resolved Ant Design tokens are compared with
  independent literals: dark `#fa8a8a` / `#e06060`, light `#c52020` / `#b01c1c`.
- Rendered UserMenu in both modes plus real CSS declarations establish rule
  attachment. jsdom does not establish geometry; browser evidence does.

## Verification and delivery

1. Keep the product change minimal and retain existing section-loading regressions.
2. Verify exact 299/300 ms timing, no flash for a fast response, both handover
   timings, settlement/navigation cleanup and cached refetch behavior.
3. Observe an already shown handover immediately and every 16 ms through at least
   1000 ms. Observe fast-run ring absence every 16 ms before and after settlement.
   Prove each named test rejects its corresponding timing mutation.
4. Record independent title-class, small-size, avatar-flex and palette mutation
   failures, then restore every production mutation before verification.
5. Use the browser method/results recorded in PR #165: cold direct run navigation,
   real HTTP client with mocks off, schema-valid HTTP stand-ins, run response held
   for 1200 ms, controlled lazy chunk, per-frame host identity/state/center sampling.
   Distinguish pending handover from content/fade and do not claim a cold sub-300 ms
   browser wait when that precondition was not established.
6. Run lint, typecheck, formatting, tests, a mocks-off production build, then bundle
   verification on the restored tree. Finish independent review before publication;
   rebase and current-head approval remain required before merge. Use `Refs #128`,
   with no closing keyword or Development-panel link.

No dependency, API contract, store, route or production mock-transport changes.
