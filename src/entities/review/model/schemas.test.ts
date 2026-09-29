import { describe, expect, it } from 'vitest'

import { FindingViewSchema, ReviewCommentSchema } from './schemas'

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

const findingView = {
  id: UUID,
  file: 'src/a.ts',
  oldLine: null,
  newLine: 12,
  endLine: null,
  side: 'RIGHT',
  severity: 'medium',
  category: 'readability',
  title: 'Remove console.log',
  body: 'Avoid console statements in production code.',
  suggestion: null,
  confidence: 0.9,
  ruleName: 'no-console',
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

describe('FindingViewSchema', () => {
  it('accepts a full FindingView literal', () => {
    expect(FindingViewSchema.safeParse(findingView).success).toBe(true)
  })

  it('accepts a finding with a drop-in suggestion', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, suggestion: 'log(message)' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.suggestion).toBe('log(message)')
    }
  })

  it('accepts a finding with confidence at the lower bound', () => {
    expect(FindingViewSchema.safeParse({ ...findingView, confidence: 0 }).success).toBe(true)
  })

  it('accepts a finding with confidence at the upper bound', () => {
    expect(FindingViewSchema.safeParse({ ...findingView, confidence: 1 }).success).toBe(true)
  })

  it('rejects a finding with confidence above 1', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, confidence: 1.5 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confidence'])
    }
  })

  it('rejects a finding with confidence below 0', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, confidence: -0.1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confidence'])
    }
  })

  it('rejects a finding with both oldLine and newLine null', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, oldLine: null, newLine: null })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['newLine'])
    }
  })

  it('accepts a LEFT-side finding anchored only on oldLine', () => {
    expect(
      FindingViewSchema.safeParse({ ...findingView, side: 'LEFT', oldLine: 12, newLine: null })
        .success,
    ).toBe(true)
  })

  it('rejects an unknown side value', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, side: 'MIDDLE' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['side'])
    }
  })

  it('rejects a finding missing side', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, side: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['side'])
    }
  })

  it('rejects a finding missing suggestion', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, suggestion: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['suggestion'])
    }
  })

  it('rejects a finding missing confidence', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, confidence: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confidence'])
    }
  })

  it('rejects oldLine 0 — contract sets minimum 1', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, side: 'LEFT', oldLine: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['oldLine'])
    }
  })

  it('rejects newLine 0 — contract sets minimum 1', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, newLine: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['newLine'])
    }
  })

  it('rejects endLine 0 — contract sets minimum 1', () => {
    const result = FindingViewSchema.safeParse({ ...findingView, endLine: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['endLine'])
    }
  })
})
