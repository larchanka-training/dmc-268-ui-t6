import { vi } from 'vitest'

/**
 * jsdom has no layout, and `src/test/setup.ts` answers every media query with `matches: false`, so
 * no Ant Design breakpoint (`Grid.useBreakpoint`, a column's `responsive`) ever matches: the narrowest
 * layout. This answers `(min-width: Npx)` and `(max-width: Npx)` as a window `width` px wide would,
 * and anything else as the setup does. Call it before the render (a `beforeEach`, or in a test).
 * The stub is a `vi.stubGlobal`, so `vi.restoreAllMocks()` does not undo it: the `afterEach` of
 * `src/test/setup.ts` does (`vi.unstubAllGlobals()`), and the next test sees the setup's stub again.
 */
export function stubViewport(width: number): void {
  vi.stubGlobal('matchMedia', (query: string) => {
    const min = /\(min-width:\s*(\d+(?:\.\d+)?)px\)/.exec(query)?.[1]
    const max = /\(max-width:\s*(\d+(?:\.\d+)?)px\)/.exec(query)?.[1]
    return {
      matches:
        (min !== undefined || max !== undefined) &&
        (min === undefined || width >= Number(min)) &&
        (max === undefined || width <= Number(max)),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
}
