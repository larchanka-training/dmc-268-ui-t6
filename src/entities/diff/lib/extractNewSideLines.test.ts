import { describe, expect, it } from 'vitest'

import { fromPatch } from './fromPatch'
import { extractNewSideLines } from './extractNewSideLines'
import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'

describe('extractNewSideLines', () => {
  it('returns an empty list when the range extends beyond loaded hunks', () => {
    const file = fromPatch(SAMPLE_PATCH_A)
    expect(extractNewSideLines(file, 2, 500)).toEqual([])
  })
})
