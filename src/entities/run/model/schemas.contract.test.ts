import { describe, expect, it } from 'vitest'

import { ACTIVE_RUN_STATUSES, RunStatusSchema, TERMINAL_RUN_STATUSES } from './schemas'

// Canonical RunStatus enum: API contracts/openapi.yaml.
const API_RUN_STATUSES = [
  'queued',
  'running',
  'publishing',
  'succeeded',
  'failed',
  'cancelled',
  'skipped',
] as const

describe('RunStatus API contract', () => {
  it('parses every current API lifecycle state and preserves its value', () => {
    expect(RunStatusSchema.options).toEqual(API_RUN_STATUSES)
    for (const status of API_RUN_STATUSES) {
      expect(RunStatusSchema.parse(status)).toBe(status)
    }
  })

  it('partitions active and terminal statuses without legacy COMPLETED', () => {
    expect(ACTIVE_RUN_STATUSES).toEqual(['queued', 'running', 'publishing'])
    expect(TERMINAL_RUN_STATUSES).toEqual(['succeeded', 'failed', 'cancelled', 'skipped'])
    expect(RunStatusSchema.safeParse('COMPLETED').success).toBe(false)
  })
})
