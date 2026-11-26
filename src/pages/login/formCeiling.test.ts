import { describe, expect, it } from 'vitest'

import { insideCeiling, unionRects } from './formCeiling'

// Vitest zeroes `.css?raw`; no @types/node here, so load `fs` untyped as in LoginPage.test.tsx.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

describe('login form glass ceiling', () => {
  it('holds the hard ceiling over the note line that sticks out of the form block', () => {
    // Reduced motion at 1440: the last pixels of the 12px note are inside its line box
    // and past the children union, and measured 4.38–4.48:1 (#313).
    const block = { left: 0, top: 0, right: 340, bottom: 220 }
    const noteLine = { left: 22, top: 180, right: 343, bottom: 196 }
    const union = unionRects([block, noteLine])
    expect(insideCeiling({ x: 342, y: 188 }, union)).toBe(true)
    expect(insideCeiling({ x: 345, y: 188 }, union)).toBe(true)
    expect(insideCeiling({ x: 400, y: 188 }, union)).toBe(false)

    const shader = readFileSync('src/pages/login/HeroGlass.tsx', 'utf8')
    expect(shader).toContain('getClientRects')
    expect(shader).toContain('FORM_EDGE_PX')
    expect(shader).toContain('max(outside - TEXT_PAD, 0.0)')
  })
})
