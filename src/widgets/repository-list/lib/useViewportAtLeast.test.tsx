// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { stubViewport } from '../../../test/viewport'
import { useViewportAtLeast } from './useViewportAtLeast'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useViewportAtLeast', () => {
  it('answers on the first render, and from the exact width', () => {
    stubViewport(1365)
    expect(renderHook(() => useViewportAtLeast(1366)).result.current).toBe(false)
    stubViewport(1366)
    expect(renderHook(() => useViewportAtLeast(1366)).result.current).toBe(true)
  })

  it('follows the window across the width and lets go of the query when it unmounts', () => {
    let matches = false
    const listeners = new Set<() => void>()
    const removed = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          get matches() {
            return matches
          },
          media: query,
          addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
          removeEventListener: (_type: string, listener: () => void) => {
            removed()
            listeners.delete(listener)
          },
        }) as unknown as MediaQueryList,
    )
    const { result, unmount } = renderHook(() => useViewportAtLeast(1366))
    expect(result.current).toBe(false)

    matches = true
    act(() => {
      listeners.forEach((listener) => {
        listener()
      })
    })
    expect(result.current).toBe(true)

    unmount()
    expect(removed).toHaveBeenCalledOnce()
    expect(listeners.size).toBe(0)
  })
})
