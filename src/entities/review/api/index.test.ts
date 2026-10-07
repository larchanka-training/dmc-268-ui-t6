import { describe, expect, it } from 'vitest'

import { runQueryKeys } from '../../run'
import { reviewQueryKeys } from './index'

describe('reviewApi query keys', () => {
  it('uses the same comments cache key shape as runQueryKeys (FRONTEND_ARCHITECTURE §2)', () => {
    const runId = '11111111-1111-4111-8111-000000000004'
    expect(reviewQueryKeys.comments(runId)).toEqual(runQueryKeys.comments(runId))
  })
})
