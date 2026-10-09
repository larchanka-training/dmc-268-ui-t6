import { describe, expect, it } from 'vitest'

import type { FindingView, ReviewComment } from '../../../entities/review'
import { mergeFindings } from './mergeFindings'

const finding: FindingView = {
  id: '66666666-6666-4666-8666-000000000001',
  file: 'src/a.ts',
  oldLine: null,
  newLine: 2,
  endLine: null,
  side: 'RIGHT',
  severity: 'high',
  category: 'security',
  title: 'From the run',
  body: 'Finding body',
  suggestion: null,
  confidence: 0.9,
  ruleName: null,
}

function makeComment(overrides: Partial<ReviewComment>): ReviewComment {
  return {
    id: '66666666-6666-4666-8666-000000000002',
    file: 'src/a.ts',
    oldLine: null,
    newLine: 3,
    endLine: null,
    body: 'Comment body',
    ruleName: 'no-console',
    severity: 'medium',
    category: 'readability',
    title: 'From a comment',
    createdAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  }
}

describe('mergeFindings', () => {
  it('returns the findings as they are when there are no comments', () => {
    const findings = [finding]
    expect(mergeFindings(findings, [])).toBe(findings)
  })

  it('appends comments as findings after the run findings', () => {
    const merged = mergeFindings([finding], [makeComment({})])

    expect(merged.map((item) => item.title)).toEqual(['From the run', 'From a comment'])
    expect(merged[1]).toMatchObject({
      id: '66666666-6666-4666-8666-000000000002',
      file: 'src/a.ts',
      newLine: 3,
      ruleName: 'no-console',
      side: 'RIGHT',
      suggestion: null,
    })
  })

  it('keeps the finding when a comment has the same id', () => {
    const merged = mergeFindings([finding], [makeComment({ id: finding.id, title: 'Duplicate' })])

    expect(merged).toEqual([finding])
  })
})
