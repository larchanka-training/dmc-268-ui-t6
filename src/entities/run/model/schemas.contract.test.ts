import { describe, expect, it } from 'vitest'

import {
  ACTIVE_RUN_STATUSES,
  RunLlmOperationSchema,
  RunStatusSchema,
  RunStepEventSchema,
  TERMINAL_RUN_STATUSES,
} from './schemas'

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

const RUN_ID = '11111111-1111-4111-8111-000000000001'
const STARTED_AT = '2026-09-18T10:00:00.000Z'

// Canonical RunStepEvent.llmOperation enum: API contracts/openapi.yaml (Refs larchanka-training/dmc-268-api-t6#227).
const API_LLM_OPERATIONS = ['conventions', 'review'] as const

describe('RunStepEvent API contract', () => {
  const baseStep = {
    runId: RUN_ID,
    tool: 'context.build',
    index: 0,
    ok: true,
    startedAt: STARTED_AT,
    durationMs: 42,
    attempt: 1,
  }

  it('parses every API llmOperation value', () => {
    expect(RunLlmOperationSchema.options).toEqual(API_LLM_OPERATIONS)
    for (const llmOperation of API_LLM_OPERATIONS) {
      const result = RunStepEventSchema.safeParse({ ...baseStep, tool: 'llm.call', llmOperation })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.llmOperation).toBe(llmOperation)
      }
    }
  })

  it('accepts a step without llmOperation when tool is not llm.call', () => {
    const result = RunStepEventSchema.safeParse(baseStep)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.llmOperation).toBeUndefined()
    }
  })
})

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
