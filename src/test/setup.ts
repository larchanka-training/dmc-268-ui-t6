// Vitest setup for jsdom tests. jsdom 30 provides neither `window.matchMedia`
// (needed by antd `Descriptions`/Grid via responsiveObserver) nor `ResizeObserver`
// (needed by `@rc-component/virtual-list` inside antd `Tree`). Both are stubbed here.
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

import { i18n } from '../shared/i18n'

// The suites were written against the Russian interface and assert its texts, so every test starts
// in Russian. English is the default for a real user (`getInitialLanguage`); the tests of the
// language itself switch to it on their own (`src/shared/i18n/*.test.ts`, the sidebar switch).
const TEST_LANGUAGE = 'ru'
// The dictionaries are bundled, so the switch is synchronous.
void i18n.changeLanguage(TEST_LANGUAGE)
beforeEach(() => {
  if (i18n.language !== TEST_LANGUAGE) {
    void i18n.changeLanguage(TEST_LANGUAGE)
  }
})

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
