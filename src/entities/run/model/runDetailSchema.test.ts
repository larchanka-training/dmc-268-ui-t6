import { describe, expect, it } from 'vitest'

import { RunDetailSchema, RunSessionSchema } from '../model/schemas'

const runSession = {
  id: '11111111-1111-4111-8111-000000000002',
  engine: 'deep',
  model: 'claude-sonnet-5',
  status: 'running',
  startedAt: '2026-09-18T11:20:00.000Z',
  finishedAt: null,
  attempt: 1,
  cancelRequested: false,
  summaryOnly: false,
  pullRequest: {
    repo: 'org/repo',
    number: 32,
    title: 'Title',
    url: 'https://github.com/org/repo/pull/32',
    headSha: 'abc1234567890abc1234567890abc1234567890',
  },
  actionCount: 12,
  errorCode: null,
}

const reviewFields = {
  findings: [],
  summary: null,
  verdict: null,
  severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  budget: null,
}

describe('RunDetailSchema', () => {
  it('accepts a running run: nullable review fields are null, counts are zeros', () => {
    expect(RunDetailSchema.safeParse({ ...runSession, ...reviewFields }).success).toBe(true)
  })

  it('accepts a full run detail payload', () => {
    const result = RunDetailSchema.safeParse({
      ...runSession,
      status: 'succeeded',
      finishedAt: '2026-09-18T12:00:00.000Z',
      findings: [],
      summary: null,
      verdict: 'clean',
      severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 1 },
      budget: null,
    })
    expect(result.success).toBe(true)
  })

  it.each(Object.keys(reviewFields))('rejects a payload without %s', (field) => {
    const payload = Object.fromEntries(
      Object.entries({ ...runSession, ...reviewFields }).filter(([key]) => key !== field),
    )
    const result = RunDetailSchema.safeParse(payload)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual([field])
    }
  })

  it('rejects null severityCounts — the contract requires counts', () => {
    const result = RunDetailSchema.safeParse({
      ...runSession,
      ...reviewFields,
      severityCounts: null,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['severityCounts'])
    }
  })

  it('RunSessionSchema still parses without review fields', () => {
    expect(RunSessionSchema.safeParse(runSession).success).toBe(true)
  })
})
