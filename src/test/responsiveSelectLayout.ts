import { vi } from 'vitest'

/**
 * jsdom has no layout, so a `Select` with `maxTagCount="responsive"` never learns its width and
 * shows no chips at all. This gives the select 1000px and every chip 10px and lets the resize
 * observer report them: each selected value gets its chip, as in a wide select. The chips come
 * after the first render, so read them in a `waitFor`. Call it before the render (a
 * `beforeEach`); `vi.restoreAllMocks()` and `vi.unstubAllGlobals()` undo it.
 */
export function stubResponsiveSelectLayout(): void {
  class ReportingResizeObserver {
    private readonly callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }

    // Reports after the caller has registered its listener, as a real observer does.
    observe(target: Element): void {
      queueMicrotask(() => {
        this.callback([{ target } as ResizeObserverEntry], this)
      })
    }

    unobserve(): void {
      // noop
    }

    disconnect(): void {
      // noop
    }
  }

  vi.stubGlobal('ResizeObserver', ReportingResizeObserver)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(10)
}
