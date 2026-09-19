import { describe, expect, it } from 'vitest'

import { ReviewCommentSchema } from './schemas'

const UUID = '0f3b2c1e-6a1d-4c8b-9e2f-1a2b3c4d5e6f'
const ISO = '2026-09-18T10:00:00.000Z'

const reviewComment = {
  id: UUID,
  file: 'src/a.ts',
  oldLine: null,
  newLine: 12,
  endLine: null,
  body: 'Avoid console statements in production code.',
  ruleName: 'no-console',
  severity: 'medium',
  category: 'readability',
  title: 'Remove console.log',
  createdAt: ISO,
}

describe('ReviewCommentSchema', () => {
  it('accepts a comment with oldLine null and newLine set', () => {
    expect(ReviewCommentSchema.safeParse(reviewComment).success).toBe(true)
  })

  it('rejects a comment with both oldLine and newLine null', () => {
    const result = ReviewCommentSchema.safeParse({ ...reviewComment, oldLine: null, newLine: null })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['newLine'])
    }
  })

  it('rejects an unknown severity value', () => {
    expect(ReviewCommentSchema.safeParse({ ...reviewComment, severity: 'blocker' }).success).toBe(
      false,
    )
  })

  it('rejects an unknown category value', () => {
    expect(ReviewCommentSchema.safeParse({ ...reviewComment, category: 'style' }).success).toBe(
      false,
    )
  })
})
