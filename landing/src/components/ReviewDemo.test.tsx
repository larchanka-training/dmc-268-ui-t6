import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ReviewDemo } from './ReviewDemo'

// Last step of the timeline, in ms: by then the verdict is shown.
const TIMELINE_END_MS = 1100

// jsdom has no matchMedia of its own; keep whatever is there to put it back.
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')

/** The system answers `reduce` (or not) to the reduced motion query. */
function setReducedMotion(reduce: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

/** Every observed element reports that it is inside the viewport at once. */
class VisibleObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element): void {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

function stage(): string | null {
  return document.querySelector('[data-stage]')?.getAttribute('data-stage') ?? null
}

function elapse(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IntersectionObserver', VisibleObserver)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia)
  else Reflect.deleteProperty(window, 'matchMedia')
})

describe('ReviewDemo', () => {
  it('shows the final stage at once with reduced motion, without a scroll', () => {
    setReducedMotion(true)

    render(<ReviewDemo />)

    expect(stage()).toBe('5')
  })

  it('waits for the first scroll even when the window is in view', () => {
    setReducedMotion(false)

    render(<ReviewDemo />)
    elapse(TIMELINE_END_MS * 2)

    expect(stage()).toBe('0')
  })

  it('plays the timeline to the verdict after the first scroll', () => {
    setReducedMotion(false)

    render(<ReviewDemo />)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(stage()).toBe('0')
    elapse(TIMELINE_END_MS)

    expect(stage()).toBe('5')
  })

  it('plays without waiting for a scroll when the page opens already scrolled', () => {
    setReducedMotion(false)
    vi.stubGlobal('scrollY', 300)

    render(<ReviewDemo />)
    elapse(TIMELINE_END_MS)

    expect(stage()).toBe('5')
  })
})
