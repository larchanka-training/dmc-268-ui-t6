import { describe, expect, it } from 'vitest'

import {
  RulesSimulationAcceptedSchema,
  RulesSimulationInputSchema,
  RulesSimulationSchema,
} from './schemas'

const ID = '5a5a5a5a-5a5a-4a5a-8a5a-000000000001'

const finding = {
  path: 'src/app.py',
  line: 3,
  startLine: 2,
  severity: 'high',
  category: 'security',
  title: 'SQL built from user input',
  body: 'Use a parameterized query.',
  suggestion: null,
  confidence: 0.82,
  ruleName: '.review/rules.md',
}

const succeeded = {
  id: ID,
  status: 'succeeded',
  findings: [finding],
  tokensIn: 1200,
  tokensOut: 300,
  costUsd: 0.0042,
}

describe('RulesSimulationSchema', () => {
  it.each([
    { id: ID, status: 'queued' },
    { id: ID, status: 'running' },
    succeeded,
    { ...succeeded, findings: [] },
    { id: ID, status: 'failed', errorCode: 'deadline_exceeded', costUsd: 0 },
  ])('parses a $status simulation', (simulation) => {
    expect(RulesSimulationSchema.parse(simulation)).toEqual(simulation)
  })

  it('keeps a finding with no rule and no start line', () => {
    const parsed = RulesSimulationSchema.parse({
      ...succeeded,
      findings: [{ ...finding, ruleName: null, startLine: null, suggestion: 'x = 1' }],
    })
    expect(parsed.status === 'succeeded' && parsed.findings[0]?.ruleName).toBeNull()
  })

  it.each([
    ['a succeeded one without findings', { ...succeeded, findings: undefined }],
    ['a confidence above 1', { ...succeeded, findings: [{ ...finding, confidence: 1.2 }] }],
    ['an unknown severity', { ...succeeded, findings: [{ ...finding, severity: 'blocker' }] }],
    ['a line below 1', { ...succeeded, findings: [{ ...finding, line: 0 }] }],
    ['a negative cost', { ...succeeded, costUsd: -1 }],
    ['a failed one without an error code', { id: ID, status: 'failed', costUsd: 0 }],
    ['an unknown status', { id: ID, status: 'cancelled' }],
    ['an id that is not a uuid', { id: 'sim-1', status: 'queued' }],
  ])('refuses %s', (_name, simulation) => {
    expect(RulesSimulationSchema.safeParse(simulation).success).toBe(false)
  })
})

describe('RulesSimulationAcceptedSchema', () => {
  it('takes the queued answer of the POST', () => {
    expect(RulesSimulationAcceptedSchema.parse({ id: ID, status: 'queued' })).toEqual({
      id: ID,
      status: 'queued',
    })
  })

  it('refuses an answer that is not queued', () => {
    expect(RulesSimulationAcceptedSchema.safeParse({ id: ID, status: 'running' }).success).toBe(
      false,
    )
  })
})

describe('RulesSimulationInputSchema', () => {
  it('takes code or a diff, a path, the content and the rules text, which may be empty', () => {
    const input = { mode: 'diff', path: '', content: '@@ -1 +1 @@\n-a\n+b', rulesMd: '' }
    expect(RulesSimulationInputSchema.parse(input)).toEqual(input)
  })

  it('refuses another mode', () => {
    expect(
      RulesSimulationInputSchema.safeParse({ mode: 'file', path: 'a', content: 'b', rulesMd: '' })
        .success,
    ).toBe(false)
  })
})
