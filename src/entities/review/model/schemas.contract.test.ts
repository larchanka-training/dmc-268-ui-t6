import { describe, expect, it } from 'vitest'

import { CategorySchema, ReviewCommentSchema, SeveritySchema } from './schemas'

// Canonical values and D6 anchor mapping: API contracts/openapi.yaml (ReviewComment)
// and review/schemas/review-output.schema.json (ReviewFinding).
const UUID = '0f3b2c1e-6a1d-4c8b-9e2f-1a2b3c4d5e6f'
const CREATED_AT = '2026-09-18T10:00:00.000Z'
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const
const CATEGORIES = ['security', 'correctness', 'performance', 'readability'] as const

interface FindingAnchor {
  path: string
  start_line: number | null
  line: number
  severity: (typeof SEVERITIES)[number]
  category: (typeof CATEGORIES)[number]
}

function publishedComment(finding: FindingAnchor) {
  return {
    id: UUID,
    file: finding.path,
    oldLine: null,
    newLine: finding.start_line ?? finding.line,
    endLine: finding.start_line === null ? null : finding.line,
    body: 'The issue is anchored on the new side of this diff.',
    ruleName: null,
    severity: finding.severity,
    category: finding.category,
    title: 'Review finding',
    createdAt: CREATED_AT,
  }
}

describe('Finding to ReviewComment contract', () => {
  it.each([
    { start_line: null, line: 17, newLine: 17, endLine: null },
    { start_line: 13, line: 17, newLine: 13, endLine: 17 },
  ])('preserves new-side anchor $start_line..$line', (anchor) => {
    const finding: FindingAnchor = {
      path: 'src/review.ts',
      start_line: anchor.start_line,
      line: anchor.line,
      severity: 'high',
      category: 'correctness',
    }

    const parsed = ReviewCommentSchema.parse(publishedComment(finding))

    expect(parsed.file).toBe(finding.path)
    expect(parsed.oldLine).toBeNull()
    expect(parsed.newLine).toBe(anchor.newLine)
    expect(parsed.endLine).toBe(anchor.endLine)
    expect(parsed.severity).toBe(finding.severity)
    expect(parsed.category).toBe(finding.category)
  })

  it('accepts the API severity and category domains without changing their values', () => {
    expect(SeveritySchema.options).toEqual(SEVERITIES)
    expect(CategorySchema.options).toEqual(CATEGORIES)

    for (const severity of SEVERITIES) {
      for (const category of CATEGORIES) {
        const finding: FindingAnchor = {
          path: 'src/review.ts',
          start_line: null,
          line: 17,
          severity,
          category,
        }
        const parsed = ReviewCommentSchema.parse(publishedComment(finding))
        expect(parsed.severity).toBe(severity)
        expect(parsed.category).toBe(category)
      }
    }
  })
})
