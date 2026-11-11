import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Dither } from './Dither'

// Size of the section behind the canvas, CSS px: jsdom lays nothing out, so it is stubbed.
const HOST_W = 800
const HOST_H = 400

// jsdom has no matchMedia of its own; keep whatever is there to put it back.
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')

function setReducedMotion(reduce: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

/** An observer that never reports the section as visible: the wave would wait for it forever. */
const observe = vi.fn()
class HiddenObserver {
  observe = observe
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

/** Pixel data of every painted frame, RGBA. */
let frames: Uint8ClampedArray[] = []

beforeEach(() => {
  frames = []
  observe.mockClear()
  vi.stubGlobal('IntersectionObserver', HiddenObserver)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => HOST_W,
  })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => HOST_H,
  })
  // jsdom has no 2D canvas: a minimal context records every painted frame.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        createImageData: (w: number, h: number) =>
          ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }) as ImageData,
        putImageData: (img: ImageData) => {
          frames.push(img.data.slice())
        },
      }) as unknown as CanvasRenderingContext2D,
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
  Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight')
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia)
  else Reflect.deleteProperty(window, 'matchMedia')
})

/** Number of lit pixels (alpha above zero) in a painted frame. */
function lit(frame: Uint8ClampedArray | undefined): number {
  if (!frame) return 0
  let count = 0
  for (let i = 3; i < frame.length; i += 4) if ((frame[i] ?? 0) > 0) count++
  return count
}

function renderInHost(style?: Record<string, string>) {
  return render(
    <div style={style}>
      <Dither />
    </div>,
  )
}

/** Distinct `r,g,b` colors of the lit pixels in a frame. */
function colorsOf(frame: Uint8ClampedArray | undefined): string[] {
  const data = frame ?? new Uint8ClampedArray()
  const colors = new Set<string>()
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) > 0) colors.add([data[i], data[i + 1], data[i + 2]].join(','))
  }
  return [...colors].sort()
}

describe('Dither', () => {
  it('draws the final field at once with reduced motion, without waiting for the section', () => {
    setReducedMotion(true)

    renderInHost()

    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(observe).not.toHaveBeenCalled()
    expect(frames).toHaveLength(1)
    expect(lit(frames[0])).toBeGreaterThan(0)
  })

  it('takes its colors from the --glow and --blue custom properties', () => {
    setReducedMotion(true)

    renderInHost({ '--glow': '#ff0000', '--blue': '#00ff00' })

    const colors = colorsOf(frames[0])
    expect(colors).toContain('0,255,0')
    for (const color of colors) expect(['255,0,0', '0,255,0']).toContain(color)
  })

  it('falls back to the --glow and --blue values when the stylesheet is not loaded', () => {
    setReducedMotion(true)

    renderInHost()

    const colors = colorsOf(frames[0])
    expect(colors).toContain('37,99,235')
    for (const color of colors) expect(['96,165,250', '37,99,235']).toContain(color)
  })

  it('keeps the field empty until the section comes into view when motion is allowed', () => {
    setReducedMotion(false)

    renderInHost()

    expect(observe).toHaveBeenCalledTimes(1)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(frames).toHaveLength(1)
    expect(lit(frames[0])).toBe(0)
  })

  it('grows the field as a wave once the section comes into view', () => {
    setReducedMotion(false)
    // Секция сразу видна: наблюдатель сообщает пересечение при подписке.
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe = () => {
          this.callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          )
        }
        unobserve = vi.fn()
        disconnect = vi.fn()
        takeRecords = () => []
      },
    )
    const ticks: FrameRequestCallback[] = []
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => ticks.push(callback)),
    )
    const step = (now: number) => {
      ticks.shift()?.(now)
    }

    renderInHost()
    step(0)
    step(250)
    step(10_000)

    // Пустой стартовый кадр, затем частичный, затем итог; волна не повторяется.
    const [start, first, middle, end] = frames.map(lit)
    expect(start).toBe(0)
    expect(first).toBe(0)
    expect(middle).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(middle ?? 0)
    expect(ticks).toHaveLength(0)
  })
})
