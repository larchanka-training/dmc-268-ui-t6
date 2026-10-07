import { describe, expect, it } from 'vitest'

import { acceptanceProbe } from './acceptanceProbe'

// Probe for #66 AC 1: a failing test the required `UI quality` check must block. Do not merge.
describe('acceptanceProbe', () => {
  it('fails on purpose', () => {
    expect(acceptanceProbe()).toBe(2)
  })
})
