// @vitest-environment jsdom
import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HeroGlass } from './HeroGlass'

// The suite replaces the matchMedia stub of src/test/setup.ts; keep it to put it back.
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')

/** Canvases whose WebGL context was lost (cleanup closes it for good, as in a browser). */
let lost: Set<HTMLCanvasElement>

/** A WebGL context that accepts every call; only `loseContext` is recorded. */
function fakeGl(canvas: HTMLCanvasElement): WebGLRenderingContext {
  const loseContext = { loseContext: () => lost.add(canvas) }
  const gl = {
    getExtension: (name: string) => (name === 'WEBGL_lose_context' ? loseContext : null),
    getProgramParameter: () => true,
    getShaderParameter: () => true,
  }
  return new Proxy(gl, {
    get: (target, key) => (key in target ? target[key as keyof typeof target] : () => ({})),
  }) as unknown as WebGLRenderingContext
}

beforeEach(() => {
  lost = new Set()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return fakeGl(this) as unknown as RenderingContext
  } as typeof HTMLCanvasElement.prototype.getContext)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia)
  else Reflect.deleteProperty(window, 'matchMedia')
})

describe('HeroGlass', () => {
  it('keeps one live canvas under StrictMode and leaves none after unmount', () => {
    const view = render(
      <StrictMode>
        <HeroGlass textSelector="#login-form" />
      </StrictMode>,
    )
    const wrap = view.container.querySelector('div[aria-hidden="true"]')
    if (!wrap) throw new Error('no wrapper')
    const live = () => {
      const canvases = wrap.querySelectorAll('canvas')
      expect(canvases).toHaveLength(1)
      // A canvas shared between effect runs keeps the context the first cleanup lost: a white hero.
      expect([...canvases].some((canvas) => lost.has(canvas))).toBe(false)
    }

    // StrictMode has already run the effect, its cleanup and the effect again.
    live()

    // A new prop runs the cleanup and the effect once more.
    view.rerender(
      <StrictMode>
        <HeroGlass textSelector="#other-text" />
      </StrictMode>,
    )
    live()

    view.unmount()
    expect(wrap.querySelectorAll('canvas')).toHaveLength(0)
  })
})
