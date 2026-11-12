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

function setHostSize(width: number, height: number): void {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => width,
  })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => height,
  })
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
  setHostSize(HOST_W, HOST_H)
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

/** The final field, as reduced motion draws it at once; the frame log is left empty. */
function fullField(): Uint8ClampedArray | undefined {
  setReducedMotion(true)
  const view = renderInHost()
  const frame = frames.at(-1)
  view.unmount()
  frames = []
  return frame
}

/** A section that is in view from the start: the observer reports it on subscribe. */
class VisibleObserver {
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
}

/** Animation frames run by hand: `step` runs the oldest pending one. */
function manualFrames() {
  const ticks: FrameRequestCallback[] = []
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => ticks.push(callback)),
  )
  const step = (now: number) => {
    ticks.shift()?.(now)
  }
  return { ticks, step }
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

/** Lit pixels in a block of canvas cells (CELL = 4 px, so 800×400 is 200×100 cells). */
function litIn(frame: Uint8ClampedArray | undefined, x0: number, y0: number, size: number): number {
  const width = HOST_W / 4
  let count = 0
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) if ((frame?.[(y * width + x) * 4 + 3] ?? 0) > 0) count++
  }
  return count
}

describe('Dither', () => {
  it('grows the fields from the bottom-left and top-right corners and keeps the centre and edges empty', () => {
    setReducedMotion(true)

    renderInHost()

    const frame = frames[0]
    // Литералы по спецификации: поля у нижнего левого и верхнего правого углов, центр пуст.
    expect(litIn(frame, 34, 76, 8)).toBeGreaterThan(0)
    expect(litIn(frame, 158, 16, 8)).toBeGreaterThan(0)
    expect(litIn(frame, 96, 46, 8)).toBe(0)
    // У каждого края плотность падает до нуля: середины четырёх сторон пусты.
    expect(litIn(frame, 96, 0, 4)).toBe(0)
    expect(litIn(frame, 96, 96, 4)).toBe(0)
    expect(litIn(frame, 0, 48, 4)).toBe(0)
    expect(litIn(frame, 196, 48, 4)).toBe(0)
    // Два других угла тоже пусты: полей там нет.
    expect(litIn(frame, 0, 0, 8)).toBe(0)
    expect(litIn(frame, 192, 92, 8)).toBe(0)
  })

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

  it('grows the field as a wave once the section comes into view, up to the full field', () => {
    const full = fullField()
    setReducedMotion(false)
    vi.stubGlobal('IntersectionObserver', VisibleObserver)
    const { ticks, step } = manualFrames()

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
    expect(end).toBe(lit(full))
    expect(frames.at(-1)).toEqual(full)
    expect(ticks).toHaveLength(0)
  })

  it('draws the final field at once without IntersectionObserver', () => {
    const full = fullField()
    setReducedMotion(false)
    vi.stubGlobal('IntersectionObserver', undefined)

    renderInHost()

    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(frames).toHaveLength(1)
    expect(frames[0]).toEqual(full)
  })

  it('rebuilds the field on resize and shows the final field without replaying the wave', () => {
    setHostSize(HOST_W / 2, HOST_H)
    const resized = fullField()
    setHostSize(HOST_W, HOST_H)
    setReducedMotion(false)
    vi.stubGlobal('IntersectionObserver', VisibleObserver)
    const resizes: ResizeObserverCallback[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizes.push(callback)
        }
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
    const { ticks, step } = manualFrames()
    const resize = () => {
      for (const callback of resizes) callback([], {} as ResizeObserver)
    }

    renderInHost()
    // The first report comes on subscribe and changes nothing.
    resize()
    step(0)
    step(10_000)
    const played = frames.length
    setHostSize(HOST_W / 2, HOST_H)
    resize()
    resize()
    // Two reports in one frame make one rebuild.
    expect(ticks).toHaveLength(1)
    while (ticks.length > 0) step(20_000)

    const after = frames.slice(played)
    expect(after.length).toBeGreaterThan(0)
    for (const frame of after) expect(frame).toEqual(resized)
  })
})
