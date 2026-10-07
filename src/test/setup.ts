// Vitest setup for jsdom tests. jsdom 30 provides neither `window.matchMedia`
// (needed by antd `Descriptions`/Grid via responsiveObserver) nor `ResizeObserver`
// (needed by `@rc-component/virtual-list` inside antd `Tree`). Both are stubbed here.
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// The only wait budget of the suite: antd-heavy pages render far slower than the 1000 ms
// default of `waitFor`/`findBy*` on a slow or busy machine. Do not pass `{ timeout }` to a
// single wait; `testTimeout` in `vite.config.ts` is sized from this value.
configure({ asyncUtilTimeout: 15_000 })

afterEach(() => {
  cleanup()
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
