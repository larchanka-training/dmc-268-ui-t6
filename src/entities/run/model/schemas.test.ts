import { describe, expect, it } from 'vitest'

import { RunActionSchema, RunListPageSchema, RunSessionSchema } from './schemas'

const UUID = '0f3b2c1e-6a1d-4c8b-9e2f-1a2b3c4d5e6f'
const ISO = '2026-09-18T10:00:00.000Z'

const pullRequest = {
  repo: 'org/repo',
  number: 42,
  title: 'Add feature',
  url: 'https://github.com/org/repo/pull/42',
  headSha: 'abc123',
}

const runSession = {
  id: UUID,
  engine: 'fast',
  model: 'gpt-5',
  status: 'running',
  startedAt: ISO,
  finishedAt: null,
  attempt: 1,
  cancelRequested: false,
  pullRequest,
  actionCount: 0,
  errorCode: null,
}

describe('RunSessionSchema', () => {
  it('accepts a valid RunSession with status running and finishedAt null', () => {
    expect(RunSessionSchema.safeParse(runSession).success).toBe(true)
  })

  it('rejects status succeeded (not part of the 7-value enum)', () => {
    expect(RunSessionSchema.safeParse({ ...runSession, status: 'succeeded' }).success).toBe(false)
  })

  it('rejects finishedAt set while status is running', () => {
    expect(RunSessionSchema.safeParse({ ...runSession, finishedAt: ISO }).success).toBe(false)
  })

  it('accepts finishedAt set while status is completed', () => {
    expect(
      RunSessionSchema.safeParse({ ...runSession, status: 'completed', finishedAt: ISO }).success,
    ).toBe(true)
  })

  it('rejects engine value agent', () => {
    expect(RunSessionSchema.safeParse({ ...runSession, engine: 'agent' }).success).toBe(false)
  })
})

describe('RunActionSchema', () => {
  it('accepts a valid RunAction with response null and responseRef set', () => {
    const runAction = {
      id: UUID,
      runId: UUID,
      index: 0,
      tool: 'lint',
      request: { path: 'src/a.ts' },
      response: null,
      responseRef: 'blob://run-actions/0',
      startedAt: ISO,
      durationMs: 120,
    }
    expect(RunActionSchema.safeParse(runAction).success).toBe(true)
  })

  it('rejects a RunAction with sessionId instead of runId', () => {
    const runAction = {
      id: UUID,
      sessionId: UUID,
      index: 0,
      tool: 'lint',
      request: {},
      response: null,
      responseRef: null,
      startedAt: ISO,
      durationMs: 1,
    }
    const result = RunActionSchema.safeParse(runAction)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['runId'])
    }
  })
})

describe('RunListPageSchema', () => {
  it('accepts an empty page with nextCursor null', () => {
    expect(RunListPageSchema.safeParse({ items: [], nextCursor: null }).success).toBe(true)
  })
})
