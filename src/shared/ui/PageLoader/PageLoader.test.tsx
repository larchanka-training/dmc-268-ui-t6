// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { StrictMode, type JSX } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DesignSystemProvider } from '../theme/DesignSystemProvider'
import { RV_MOTION_FADE_MS, RV_PAGE_LOADER_DELAY_MS } from '../theme/motion'
import { PageLoaderHost, PageLoading } from './PageLoader'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

const originalMatchMedia = window.matchMedia.bind(window)

// One animation frame of the fake clock.
const FRAME_MS = 16

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  window.matchMedia = originalMatchMedia
})

/** The system asks to reduce motion, so the provider turns Ant Design motion off. */
function reduceMotion(): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

/** The host with one marker per key: a new key is a new marker, a missing one is unmounted. */
function Screen(props: { markers: string[] }): JSX.Element {
  return (
    <DesignSystemProvider mode="dark">
      <PageLoaderHost />
      {props.markers.map((key) => (
        <PageLoading key={key} />
      ))}
    </DesignSystemProvider>
  )
}

function elapse(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function rings(): HTMLElement[] {
  return screen.queryAllByTestId('page-loader')
}

function ring(): HTMLElement {
  const [only, ...rest] = rings()
  if (only === undefined || rest.length > 0) {
    throw new Error(`expected one ring, found ${String(rings().length)}`)
  }
  return only
}

/** Renders the host with the markers and waits long enough for the ring to be fully shown. */
function showRing(markers: string[] = ['page']): ReturnType<typeof render> {
  const view = render(<Screen markers={markers} />)
  elapse(RV_PAGE_LOADER_DELAY_MS)
  elapse(FRAME_MS)
  expect(ring().dataset.state).toBe('shown')
  return view
}

describe('PageLoading', () => {
  it('renders nothing itself', () => {
    const { container } = render(<PageLoading />)
    expect(container.innerHTML).toBe('')
  })
})

describe('PageLoaderHost timeline', () => {
  it('shows no ring before the wait has lasted 300 ms', () => {
    render(<Screen markers={['page']} />)
    expect(rings()).toHaveLength(0)
    elapse(RV_PAGE_LOADER_DELAY_MS - 1)
    expect(rings()).toHaveLength(0)
  })

  it('mounts the ring after 300 ms hidden and fades it in on the next frame', () => {
    render(<Screen markers={['page']} />)
    elapse(RV_PAGE_LOADER_DELAY_MS)
    // The ring starts at opacity 0: the shown state arrives after it is in the DOM.
    expect(ring().dataset.state).toBe('hidden')
    elapse(FRAME_MS)
    expect(ring().dataset.state).toBe('shown')
  })

  it('never renders a ring for a page that is ready before 300 ms', () => {
    const { rerender } = render(<Screen markers={['page']} />)
    elapse(RV_PAGE_LOADER_DELAY_MS - 100)
    rerender(<Screen markers={[]} />)
    elapse(RV_PAGE_LOADER_DELAY_MS * 3)
    expect(rings()).toHaveLength(0)
  })

  it('restarts the 300 ms count when the wait begins again', () => {
    const { rerender } = render(<Screen markers={['page']} />)
    elapse(RV_PAGE_LOADER_DELAY_MS - 100)
    rerender(<Screen markers={[]} />)
    elapse(500)
    rerender(<Screen markers={['page']} />)
    elapse(RV_PAGE_LOADER_DELAY_MS - 1)
    expect(rings()).toHaveLength(0)
    elapse(1)
    expect(rings()).toHaveLength(1)
  })

  it('fades out when the marker unmounts and removes the ring after 200 ms', () => {
    const { rerender } = showRing()
    rerender(<Screen markers={[]} />)
    expect(ring().dataset.state).toBe('hidden')
    elapse(RV_MOTION_FADE_MS - 1)
    expect(rings()).toHaveLength(1)
    elapse(1)
    expect(rings()).toHaveLength(0)
  })

  it('removes the ring at once when Ant Design motion is off', () => {
    reduceMotion()
    const { rerender } = render(<Screen markers={['page']} />)
    elapse(RV_PAGE_LOADER_DELAY_MS - 1)
    expect(rings()).toHaveLength(0)
    // No fade-in either: the ring is shown in the frame it appears in.
    elapse(1)
    expect(ring().dataset.state).toBe('shown')
    rerender(<Screen markers={[]} />)
    elapse(0)
    expect(rings()).toHaveLength(0)
  })

  it('keeps the ring and fades it back in when a marker registers during the fade-out', () => {
    const { rerender } = showRing()
    const before = ring()
    rerender(<Screen markers={[]} />)
    elapse(RV_MOTION_FADE_MS / 2)
    expect(ring().dataset.state).toBe('hidden')
    rerender(<Screen markers={['again']} />)
    expect(ring().dataset.state).toBe('shown')
    elapse(RV_MOTION_FADE_MS * 5)
    expect(ring()).toBe(before)
    expect(ring().dataset.state).toBe('shown')
  })

  it('does not blink when a marker hands over to another in the same commit before the ring', () => {
    const { rerender } = render(<Screen markers={['layout']} />)
    elapse(200)
    // `ProtectedLayout` gives way to the Suspense fallback of the shell in one commit.
    rerender(<Screen markers={['shell']} />)
    elapse(RV_PAGE_LOADER_DELAY_MS - 200 - 1)
    expect(rings()).toHaveLength(0)
    elapse(1)
    expect(rings()).toHaveLength(1)
  })

  it('does not blink when a marker hands over to another in the same commit with the ring up', () => {
    const { rerender } = showRing(['layout'])
    const before = ring()
    rerender(<Screen markers={['shell']} />)
    expect(ring()).toBe(before)
    expect(ring().dataset.state).toBe('shown')
    elapse(RV_MOTION_FADE_MS * 5)
    expect(ring()).toBe(before)
    expect(ring().dataset.state).toBe('shown')
  })

  it('keeps one ring for several markers and fades out after the last one', () => {
    const { rerender } = showRing(['one', 'two'])
    rerender(<Screen markers={['two']} />)
    expect(ring().dataset.state).toBe('shown')
    elapse(RV_MOTION_FADE_MS * 5)
    expect(ring().dataset.state).toBe('shown')
    rerender(<Screen markers={[]} />)
    elapse(RV_MOTION_FADE_MS)
    expect(rings()).toHaveLength(0)
  })

  it('leaves the registry empty after an unmount under StrictMode double mounting', () => {
    const { rerender } = render(
      <StrictMode>
        <Screen markers={['page']} />
      </StrictMode>,
    )
    rerender(
      <StrictMode>
        <Screen markers={[]} />
      </StrictMode>,
    )
    // A marker leaked by the double mount would still count as waiting and bring the ring up.
    elapse(RV_PAGE_LOADER_DELAY_MS * 3)
    expect(rings()).toHaveLength(0)
  })

  it('shows the ring once for a marker mounted twice under StrictMode', () => {
    render(
      <StrictMode>
        <Screen markers={['page']} />
      </StrictMode>,
    )
    elapse(RV_PAGE_LOADER_DELAY_MS)
    elapse(FRAME_MS)
    expect(rings()).toHaveLength(1)
    expect(ring().dataset.state).toBe('shown')
  })

  it('leaves the registry empty after the host itself unmounts and mounts again', () => {
    const first = render(<Screen markers={['page']} />)
    first.unmount()
    render(<Screen markers={[]} />)
    elapse(RV_PAGE_LOADER_DELAY_MS * 3)
    expect(rings()).toHaveLength(0)
  })
})

describe('PageLoaderHost ring', () => {
  it('is a decorative ring with no role or live region of its own', () => {
    showRing()
    expect(screen.queryByRole('status')).toBeNull()
    expect(ring().querySelector('[aria-hidden="true"][data-size="lg"]')).not.toBeNull()
  })
})

describe('PageLoader.module.css', () => {
  const css = readFileSync('src/shared/ui/PageLoader/PageLoader.module.css', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')

  function declarations(selector: string): string {
    const start = css.indexOf(`${selector} {`)
    expect(start, selector).toBeGreaterThanOrEqual(0)
    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  }

  it('centres the ring in the window, above the sidebar, and never takes a click', () => {
    const layer = declarations('.layer')
    expect(layer).toContain('position: fixed;')
    expect(layer).toContain('inset: 0;')
    expect(layer).toContain('display: grid;')
    expect(layer).toContain('place-items: center;')
    expect(layer).toContain('z-index: 1;')
    expect(layer).toContain('pointer-events: none;')
  })

  it('fades the opacity with the tokens of the design system, not with an animation', () => {
    expect(declarations('.layer')).toContain('opacity: 0;')
    expect(declarations('.layer')).toContain(
      'transition: opacity var(--rv-motion-fade) var(--rv-ease);',
    )
    expect(declarations(".layer[data-state='shown']")).toContain('opacity: 1;')
    expect(css).not.toContain('animation')
  })

  it('drops the transition under reduced motion', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{ \.layer \{ transition: none; \} \}/,
    )
  })
})
