# #119 — implementation and verification

- [x] Reproduce the public Form.Item lifecycle failure on util 1.13.0: two pending
      timers remain after unmount instead of zero.
- [x] Refresh only the transitive util resolution to 1.14.0 and retain the lifecycle
      regression; no changes to the manifest, global setup, or error handling.
- [x] Verify lifecycle, existing Form, and RunDiff filter tests on 1.14.0: 3 files,
      56 tests passed; unmount leaves zero timers.
- [ ] Pass `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`,
      `pnpm build`, and `pnpm verify:prod-bundle`.
- [x] Complete independent Standards and Spec reviews: both report zero findings.

Publication evidence belongs in the separate PR body: `Refs #119`, the dependency
update and root cause, plus links to three consecutive successful `UI quality`
attempts on its exact published head (initial run and two reruns), each without an
Unhandled Errors block.

Current-head approval and merge remain the reviewer's and tech lead's actions.
