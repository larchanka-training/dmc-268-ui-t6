// Vitest setup for jsdom tests. jsdom 30 provides neither `window.matchMedia`
// (needed by antd `Descriptions`/Grid via responsiveObserver) nor `ResizeObserver`
// (needed by `@rc-component/virtual-list` inside antd `Tree`). Both are stubbed here.
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

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
