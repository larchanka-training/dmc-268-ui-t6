// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { stubViewport } from './viewport'

// The consumers call `vi.restoreAllMocks()` after each test; the stub must not depend on it.
afterEach(() => {
  vi.restoreAllMocks()
})

// The two tests run in this order: the second one finds out what the first one left behind.
describe('stubViewport', () => {
  it('answers a width query as a window of that width would', () => {
    stubViewport(1400)

    expect(window.matchMedia('(min-width: 1366px)').matches).toBe(true)
    expect(window.matchMedia('(min-width: 1401px)').matches).toBe(false)
    expect(window.matchMedia('(max-width: 1399px)').matches).toBe(false)
  })

  it('is undone after the test: a test that does not stub sees the default matchMedia again', () => {
    expect(window.matchMedia('(min-width: 1366px)').matches).toBe(false)
    expect(window.matchMedia('(min-width: 1px)').matches).toBe(false)
  })
})
