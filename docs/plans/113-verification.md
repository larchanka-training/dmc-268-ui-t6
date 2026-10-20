# UI #113 verification — 2026-10-20

## Contract and ownership

- UI worktree `/private/tmp/dmc-268-ui-113`, branch `feat/113-run-step-event`,
  base `ec628dd02bf0f59611e94ae6d3d742bb79472019`.
- API main `2326273e6ab7fcea89d1cf3b94b88a4be66ca5e9` still has the six-field
  RunStepEvent. UI #155 and API #227 extensions were open before implementation.
  No attempt/llmOperation is required or fabricated. Zod uses the existing
  unknown-field stripping convention; exported output is closed.
- Coordination comments were posted before shared edits:
  [#155](https://github.com/larchanka-training/dmc-268-ui-t6/pull/155#issuecomment-6291844735),
  [#106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106#issuecomment-6291845334),
  [#109](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109#issuecomment-6291846160).
- User approved the plan with “ок” on 2026-10-20. Task 1 independent reviews:
  Standards 0 / Spec 0 findings. Task 2 independent reviews pending.

## RED/GREEN and behavioral coverage

Node 24.20.0, pnpm 12.4.1. Pass script arguments directly, without extra `--`.

- Schema RED: 1 failed / 30 passed; minimal six-field schema GREEN: 31 passed.
- Parser/export RED: 1 failed / 63 passed; safe parsing/export GREEN: 64 passed.
- Step actions dispatch RED: 1 failed / 43 passed; minimal dispatch GREEN: 44 passed.
- Successful fetch-diff RED: 1 failed / 44 passed; expanded bridge GREEN: 53 passed.
- Final focused command: `pnpm run test src/app/providers/runStreamConnect.page.test.tsx src/app/providers/runStreamConnect.test.ts src/pages/runs/RunDetailPage.progress.test.tsx src/entities/run/model/schemas.test.ts src/entities/run/api/runStreamParse.test.ts`.
  Result: **163 passed across five files**. `pnpm run check-types` passed.

The page tests use the production singleton QueryClient, real page/hooks and
schema parsing, a controlled fetch stream, and deterministic HTTP responses.
The journal and analysis stage change at elapsed fake time 0 ms, before a 3 s
poll. A page initially receiving an empty diff shows a file after successful
fetch-diff at 0 ms, while status stays running. Another run's real actions
observer and the matching action-response child observer keep their original
one GET and remain fresh; detail/comments/diff are not refetched by a normal
step. The bridge assertions preserve five run.updated invalidations, exact
actions/diff keys, invalid/unknown no-op handling and Last-Event-ID 42 after a
valid six-field no-id step.

Reconnect coverage suppresses polling with Query's documented unfocused mode:
3 s elapses with exactly one initial actions GET. The stream closes, the
actions response changes without any replay frame, and reconnect causes a
real observed actions GET and visible journal/stage recovery. One extra
millisecond flushes Query notifications scheduled by the reconnect timer.
Existing active/terminal polling tests remain green separately.

Mutation proof, with implementation automatically restored afterwards:

- Temporarily disabling only run.step dispatch makes **both immediate page
  tests fail**, while reconnect coverage still passes (2 failed / 1 passed).
- Temporarily disabling existing reconnect resync makes **the recovery test
  fail** (1 failed / 2 skipped). A polling tick cannot mask the missing resync.

## UI gates

All six final UI gates passed on the stabilized implementation:

- `pnpm run lint`
- `pnpm run check-types`
- `pnpm run format:check`
- `pnpm run test`: **1512 tests passed across 113 files**, 66.85 s
- `pnpm run build`
- `pnpm run verify:prod-bundle`: clean production assets

The test run includes jsdom's existing unimplemented pseudo-style, navigation
and canvas notices; no test failed or skipped. Build retains its >500 kB chunk
warning. Final logs are `/private/tmp/dmc-268-ui-113-final-<gate>.log`
(`format-check`, `check-types`, `verify-prod-bundle` use hyphens).
After this run, only Markdown gate evidence was updated; its formatting was
checked separately.

## Browser and staging scope

Coordinator checked the local mock build on Node 24 with `VITE_USE_MOCKS=1`:
`http://127.0.0.1:53113/runs/11111111-1111-4111-8111-000000000002`.
Desktop 1265 px and mobile 390 px were checked in light and dark themes.
Desktop document clientWidth/scrollWidth were 1265/1265; mobile document
clientWidth/scrollWidth were 375/375 (390 px viewport includes the scrollbar).
Journal, progress and diff rendered; Tab from search reached Unified with a
visible native outline; browser logs contained no warnings/errors. No CSS or
components changed, and this is not an exhaustive contrast/reduced-motion audit.
Mocks use the existing mock event path; production bridge timing is established
by the real-hook integration tests above, not by this visual smoke check.

**Staging acceptance remains pending:**
`https://staging-ui.dmc268-t6.axyi.ru` opened `/login` without an authenticated
session, and this branch is not deployed. There is no deployed UI/API SHA pair,
timestamped live no-id step/immediate actions GET, early-diff observation or
live reconnect trace for this change yet. Collect those Network observations
after deployment with an authorized session and run. No simulated stream or
mock result is counted as staging evidence.

API snapshot parity/provenance is a separate Task 3, pending a clean committed
UI schema checkout. No merge or issue closure is inferred.
