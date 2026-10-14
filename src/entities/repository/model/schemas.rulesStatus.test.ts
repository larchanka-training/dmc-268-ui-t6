import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { RulesDiagnosticSchema, RulesStatusSchema } from './schemas'

const SHA = '0123456789abcdef0123456789abcdef01234567'
const CHECKED_AT = '2026-10-14T09:30:00.000Z'

const diagnostic = {
  code: 'policy_ignore_pattern_invalid',
  message: 'Недопустимая маска',
  line: 14,
  column: 3,
  retryable: false,
}

const common = { branch: 'main', path: '.review/rules.md', checkedAt: CHECKED_AT, sha: SHA }

const present = {
  ...common,
  status: 'present' as const,
  text: '# Rules',
  ignoreMasks: ['dist/**'],
  diagnostics: [],
}
const missing = { ...common, status: 'missing' as const, defaultsVersion: '2026-10-01' }
const invalid = {
  ...common,
  status: 'invalid' as const,
  text: null,
  diagnostics: [diagnostic],
}
const unavailable = {
  ...common,
  status: 'unavailable' as const,
  sha: null,
  diagnostics: [{ ...diagnostic, code: 'policy_access_denied', line: null, column: null }],
}

describe('RulesStatusSchema', () => {
  it.each([
    ['present', present],
    ['missing', missing],
    ['invalid', invalid],
    ['unavailable', unavailable],
  ])('parses the %s variant', (status, body) => {
    const parsed = RulesStatusSchema.parse(body)

    expect(parsed.status).toBe(status)
    expect(parsed).toEqual(body)
  })

  it('accepts an empty file text in a present status', () => {
    expect(RulesStatusSchema.safeParse({ ...present, text: '', ignoreMasks: [] }).success).toBe(
      true,
    )
  })

  it('rejects an unknown status', () => {
    expect(RulesStatusSchema.safeParse({ ...missing, status: 'deleted' }).success).toBe(false)
  })

  it('rejects a variant that lacks its own members', () => {
    expect(RulesStatusSchema.safeParse({ ...common, status: 'present' }).success).toBe(false)
    expect(RulesStatusSchema.safeParse({ ...common, status: 'missing' }).success).toBe(false)
  })

  it('rejects a sha that is not 40 hex digits', () => {
    expect(RulesStatusSchema.safeParse({ ...present, sha: 'abc123' }).success).toBe(false)
    expect(RulesStatusSchema.safeParse({ ...present, sha: SHA.toUpperCase() }).success).toBe(false)
  })

  it('allows a null sha only in unavailable', () => {
    expect(RulesStatusSchema.safeParse({ ...present, sha: null }).success).toBe(false)
    expect(RulesStatusSchema.safeParse({ ...missing, sha: null }).success).toBe(false)
    expect(RulesStatusSchema.safeParse({ ...invalid, sha: null }).success).toBe(false)
    expect(RulesStatusSchema.safeParse({ ...unavailable, sha: null }).success).toBe(true)
  })

  it('requires at least one diagnostic in invalid and unavailable', () => {
    expect(RulesStatusSchema.safeParse({ ...invalid, diagnostics: [] }).success).toBe(false)
    expect(RulesStatusSchema.safeParse({ ...unavailable, diagnostics: [] }).success).toBe(false)
  })

  it('takes a null text only in invalid', () => {
    expect(RulesStatusSchema.safeParse({ ...present, text: null }).success).toBe(false)
    expect(RulesStatusSchema.safeParse(invalid).success).toBe(true)
  })

  it('rejects an empty branch and a checkedAt that is not an ISO date-time', () => {
    expect(RulesStatusSchema.safeParse({ ...present, branch: '' }).success).toBe(false)
    expect(RulesStatusSchema.safeParse({ ...present, checkedAt: 'yesterday' }).success).toBe(false)
  })

  it('keeps the objects non-strict: unknown members are stripped, not rejected', () => {
    expect(RulesStatusSchema.parse({ ...missing, somethingNew: 1 })).toEqual(missing)
  })

  it('stays representable as JSON Schema', () => {
    expect(() => z.toJSONSchema(RulesStatusSchema)).not.toThrow()
    expect(() => z.toJSONSchema(RulesDiagnosticSchema)).not.toThrow()
  })
})

describe('RulesDiagnosticSchema', () => {
  it('takes the optional limit, actual and patternIndex', () => {
    const full = { ...diagnostic, limit: 65536, actual: 85000, patternIndex: 2 }

    expect(RulesDiagnosticSchema.parse(full)).toEqual(full)
  })

  it('takes null line and column but not a missing retryable', () => {
    expect(
      RulesDiagnosticSchema.safeParse({ ...diagnostic, line: null, column: null }).success,
    ).toBe(true)
    expect(RulesDiagnosticSchema.safeParse({ ...diagnostic, retryable: undefined }).success).toBe(
      false,
    )
  })

  it('rejects a fractional line', () => {
    expect(RulesDiagnosticSchema.safeParse({ ...diagnostic, line: 1.5 }).success).toBe(false)
  })
})
