import { describe, expect, it } from 'vitest'

import { SAMPLE_PATCHES } from '../../../shared/fixtures/sample.patch'
import { diffApi } from './index'

describe('diffApi', () => {
  it('parses the sample raw file diffs', () => {
    expect(diffApi.diff.response.safeParse(SAMPLE_PATCHES).success).toBe(true)
  })

  it('applies default offset/limit to a file slice query', () => {
    expect(diffApi.files.query.parse({ path: 'a' })).toEqual({
      path: 'a',
      offset: 0,
      limit: 200,
    })
  })
})
