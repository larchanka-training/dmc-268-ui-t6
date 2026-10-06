import { describe, expect, it } from 'vitest'

import { RunDetailSchema } from '../../entities/run'

import {
  REVIEW_ATTENTION_RUN_ID,
  REVIEW_CLEAN_RUN_ID,
  buildMockRunDetail,
  mockVerdictVariantRuns,
} from './mockRunReview'
import { mockRunsListPage } from './mockRunsList.fixture'

describe('mockRunReview verdict variants', () => {
  it('builds attention and clean run details for mock list runs', () => {
    const attention = mockVerdictVariantRuns.find((run) => run.id === REVIEW_ATTENTION_RUN_ID)
    const clean = mockVerdictVariantRuns.find((run) => run.id === REVIEW_CLEAN_RUN_ID)
    if (!attention || !clean) {
      throw new Error('verdict demo runs missing')
    }

    const attentionDetail = buildMockRunDetail(attention)
    const cleanDetail = buildMockRunDetail(clean)

    expect(RunDetailSchema.safeParse(attentionDetail).success).toBe(true)
    expect(attentionDetail.verdict).toBe('attention')
    expect(RunDetailSchema.safeParse(cleanDetail).success).toBe(true)
    expect(cleanDetail.verdict).toBe('clean')
  })
})

describe('buildMockRunDetail', () => {
  const runs = new Map(
    [...mockRunsListPage.items, ...mockVerdictVariantRuns].map((run) => [run.id, run]),
  )

  it.each([...runs])('builds a contract-valid run detail for %s', (_id, run) => {
    expect(RunDetailSchema.safeParse(buildMockRunDetail(run)).success).toBe(true)
  })
})
