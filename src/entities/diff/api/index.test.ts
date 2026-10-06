import { describe, expect, it } from 'vitest'

import { SAMPLE_PATCHES } from '../../../shared/fixtures/sample.patch'
import { runQueryKeys } from '../../run/api'
import { diffApi, diffQueryKeys } from './index'

describe('diffApi', () => {
  it('parses the sample raw file diffs', () => {
    expect(diffApi.diff.response.safeParse(SAMPLE_PATCHES).success).toBe(true)
  })

  it('accepts a summary-only diff response with patch: null', () => {
    expect(diffApi.diff.response.safeParse([{ filename: 'src/big.ts', patch: null }]).success).toBe(
      true,
    )
  })

  it('uses the same diff cache key shape as runQueryKeys.diff (FRONTEND_ARCHITECTURE §2)', () => {
    const runId = '11111111-1111-4111-8111-000000000004'
    expect(diffQueryKeys.diff(runId)).toEqual(runQueryKeys.diff(runId))
  })

  it('applies default offset/limit to a file slice query', () => {
    expect(diffApi.files.query.parse({ path: 'a' })).toEqual({
      path: 'a',
      offset: 0,
      limit: 200,
    })
  })
})
