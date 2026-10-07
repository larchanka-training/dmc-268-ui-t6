import { describe, expect, it } from 'vitest'

import { refractorForDiffView } from './refractorForDiffView'

describe('refractorForDiffView', () => {
  it('returns an array of HAST nodes for react-diff-view createRoot', () => {
    const nodes = refractorForDiffView.highlight('const x = 1', 'typescript')
    expect(Array.isArray(nodes)).toBe(true)
    expect(nodes.length).toBeGreaterThan(0)
  })
})
