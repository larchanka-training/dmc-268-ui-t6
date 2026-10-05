import { describe, expect, it } from 'vitest'

import { findingAnchorLine, findingLineRangeLabel } from '../lib/findingAnchor'
import { reviewCommentToFinding } from '../lib/reviewCommentToFinding'
import { CategorySchema, FindingViewSchema, ReviewCommentSchema, SeveritySchema } from './schemas'

// Canonical values: api contracts/openapi.yaml (Severity, Category). D6 anchor mapping:
// api docs/PIPELINE_SPEC.md §10 — a finding `start_line`..`line` reaches the API as
// `newLine = start_line ?? line`, `endLine = start_line == null ? null : line` on the RIGHT side,
// and the UI draws `[newLine ?? oldLine, endLine ?? newLine ?? oldLine]`.
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info']
const CATEGORIES = ['security', 'correctness', 'performance', 'readability']
const UUID = '0f3b2c1e-6a1d-4c8b-9e2f-1a2b3c4d5e6f'

const ANCHORS = [
  { name: 'one line 42', wire: { newLine: 42, endLine: null }, range: [42, 42], label: 'L42' },
  { name: 'range 10–14', wire: { newLine: 10, endLine: 14 }, range: [10, 14], label: 'L10–14' },
]

function findingFields(anchor: { newLine: number; endLine: number | null }) {
  return {
    id: UUID,
    file: 'src/review.ts',
    oldLine: null,
    ...anchor,
    body: 'The issue is anchored on the new side of this diff.',
    ruleName: null,
    severity: 'high',
    category: 'correctness',
    title: 'Review finding',
  }
}

function reviewComment(anchor: { newLine: number; endLine: number | null }) {
  return { ...findingFields(anchor), createdAt: '2026-09-18T10:00:00.000Z' }
}

describe('Finding → ReviewComment contract (D6)', () => {
  it.each(ANCHORS)('a published comment keeps the $name anchor', ({ wire, range, label }) => {
    const finding = reviewCommentToFinding(ReviewCommentSchema.parse(reviewComment(wire)))

    expect(finding).toMatchObject({ file: 'src/review.ts', oldLine: null, side: 'RIGHT', ...wire })
    const anchor = findingAnchorLine(finding)
    expect([anchor.newLine, anchor.endLine]).toEqual(range)
    expect(findingLineRangeLabel(finding)).toBe(label)
  })

  it.each(ANCHORS)('a run detail finding keeps the $name anchor', ({ wire, range, label }) => {
    const finding = FindingViewSchema.parse({
      ...findingFields(wire),
      side: 'RIGHT',
      suggestion: null,
      confidence: 0.9,
    })

    const anchor = findingAnchorLine(finding)
    expect([anchor.newLine, anchor.endLine]).toEqual(range)
    expect(findingLineRangeLabel(finding)).toBe(label)
  })

  it('carries every API severity and category value unchanged', () => {
    expect(SeveritySchema.options).toEqual(SEVERITIES)
    expect(CategorySchema.options).toEqual(CATEGORIES)

    for (const severity of SEVERITIES) {
      for (const category of CATEGORIES) {
        const comment = ReviewCommentSchema.parse({
          ...reviewComment({ newLine: 42, endLine: null }),
          severity,
          category,
        })
        expect(reviewCommentToFinding(comment)).toMatchObject({ severity, category })
      }
    }
  })
})
