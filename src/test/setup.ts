// Vitest setup for jsdom tests. jsdom 30 provides neither `window.matchMedia`
// (needed by antd `Descriptions`/Grid via responsiveObserver) nor `ResizeObserver`
// (needed by `@rc-component/virtual-list` inside antd `Tree`). Both are stubbed here.
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, vi } from 'vitest'

// The only wait budget of the suite: antd-heavy pages render far slower than the 1000 ms
// default of `waitFor`/`findBy*` on a slow or busy machine. Do not pass `{ timeout }` to a
// single wait; `testTimeout` in `vite.config.ts` is sized from this value.
configure({ asyncUtilTimeout: 15_000 })

afterEach(() => {
  cleanup()
  // A `vi.stubGlobal` of a test (`stubViewport`) does not reach the next test, which starts from
  // the stubs set up below.
  vi.unstubAllGlobals()
})

// Every antd `Form.Item` debounces its error and warning lists with a 10 ms `setTimeout`
// (antd/lib/form/hooks/useDebounce.js, `useDelayState` of @rc-component/util) that unmount does
// not cancel. Fired after the jsdom teardown, its `setState` throws
// `ReferenceError: window is not defined`. Node runs timers of one delay in the order they were
// set, so a 10 ms timer set after the last `cleanup()` resolves only once all of them have run.
// Registered in the setup file, this hook runs after the `afterAll` hooks of the test file.
// Real timers first: under fake timers left installed by a file, this wait would never resolve.
afterAll(async () => {
  vi.useRealTimers()
  await new Promise((resolve) => {
    setTimeout(resolve, 10)
  })
})

class ResizeObserverStub {
  observe(): void {
    // noop
  }
  unobserve(): void {
    // noop
  }
  disconnect(): void {
    // noop
  }
}

if (typeof window !== 'undefined') {
  window.ResizeObserver = ResizeObserverStub
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
