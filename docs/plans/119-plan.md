# #119 — cancel delayed Ant Design updates on unmount

## Scope and cause

Ant Design 6.6.5 `Form.Item` debounces its error and warning lists through
`useDelayState`. Even an item without validation rules schedules two 10 ms updates for
its empty lists. Both the real forms in `antd.form.test.tsx` and `FindingFiltersBar`
(rendered by `RunDiff.filters.test.tsx`) use this component.

With `@rc-component/util` 1.13.0, unmount leaves those callbacks pending. Testing
Library's `cleanup()` unmounts React components; it cannot cancel timers that their
hooks do not clean up. A callback that runs after jsdom teardown reaches React's
`window.event` lookup and raises `ReferenceError: window is not defined`. The file
Vitest reports was active when the callback ran; it does not establish which earlier
render scheduled it.

## Change

Refresh only the existing transitive util resolution from 1.13.0 to 1.14.0 in
`pnpm-lock.yaml`, within Ant Design's declared range. The upstream hook registers
`cancelPending` as an unmount effect cleanup, covering timeout and animation-frame
updates. No new direct dependency, manifest change, test setup workaround, or error
suppression is required.

Keep the regression at the public `Form`/`Form.Item` boundary. Scoped fake timeout
APIs make the pending callback count deterministic: render must schedule work, and
unmount must cancel all of it without executing callbacks. The test restores real
timers after cleanup.

## Tasks and acceptance

1. Observe the lifecycle regression failing on 1.13.0 with two timers after unmount.
2. Apply the exact 1.14.0 resolution and verify zero timers after unmount, plus the
   existing Form and RunDiff filter tests.
3. Run all six UI gates. Keep `vite.config.ts` and `src/test/setup.ts` unchanged;
   Vitest must continue reporting unhandled errors.
4. Publish independently with `Refs #119` and an explicit dependency update line.
5. Record three consecutive successful `UI quality` attempts on the published head
   (initial run and two reruns), each without an Unhandled Errors block.

The issue remains open for the tech lead's acceptance. The author does not merge or
assign a reviewer as part of this extraction from PR #138.
