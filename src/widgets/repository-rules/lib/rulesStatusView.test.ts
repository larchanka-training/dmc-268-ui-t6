import { describe, expect, it } from 'vitest'

import type { RulesDiagnostic } from '../../../entities/repository'
import {
  describeDiagnosticLimit,
  describeDiagnosticLocation,
  formatCheckedAt,
  isKnownUnavailableCode,
  shortSha,
  unavailableReason,
} from './rulesStatusView'

const base: RulesDiagnostic = {
  code: 'policy_ignore_pattern_invalid',
  message: 'm',
  line: null,
  column: null,
  retryable: false,
}

describe('shortSha', () => {
  it('keeps the first seven characters', () => {
    expect(shortSha('0123456789abcdef0123456789abcdef01234567')).toBe('0123456')
  })
})

describe('formatCheckedAt', () => {
  it('prints the UTC date and time to the second, with no zone label', () => {
    expect(formatCheckedAt('2026-10-14T09:30:15.123Z')).toBe('2026-10-14 09:30:15')
  })
})

describe('describeDiagnosticLocation', () => {
  it('gives line and column, line alone, or nothing', () => {
    expect(describeDiagnosticLocation({ ...base, line: 14, column: 5 })).toBe('14:5')
    expect(describeDiagnosticLocation({ ...base, line: 14 })).toBe('14')
    expect(describeDiagnosticLocation(base)).toBeNull()
    expect(describeDiagnosticLocation({ ...base, column: 5 })).toBeNull()
  })
})

describe('describeDiagnosticLimit', () => {
  it('names the limit and the actual value when the server gave both', () => {
    expect(describeDiagnosticLimit({ ...base, limit: 65536, actual: 85000 })).toBe(
      'допустимо 65536, фактически 85000',
    )
  })

  it('says nothing when either is missing', () => {
    expect(describeDiagnosticLimit({ ...base, limit: 65536 })).toBeNull()
    expect(describeDiagnosticLimit({ ...base, actual: 85000 })).toBeNull()
    expect(describeDiagnosticLimit(base)).toBeNull()
  })
})

describe('unavailableReason', () => {
  it.each([
    ['policy_access_denied', 'У GitHub App нет доступа к репозиторию'],
    ['policy_revision_unavailable', 'Закреплённая ревизия правил недоступна'],
    ['policy_fetch_transient', 'GitHub временно не отвечает'],
    ['policy_rate_limited', 'GitHub ограничил число запросов'],
  ])('explains %s in Russian', (code, reason) => {
    expect(unavailableReason(code)).toBe(reason)
  })

  it('falls back to a general reason for a code it does not know', () => {
    expect(unavailableReason('something_new')).toBe('Сервер не смог прочитать файл правил')
  })

  it('falls back for a code that is a property of every object, not a reason text', () => {
    for (const code of ['constructor', 'toString', '__proto__']) {
      expect(unavailableReason(code), code).toBe('Сервер не смог прочитать файл правил')
    }
  })
})

describe('isKnownUnavailableCode', () => {
  it.each([
    'policy_access_denied',
    'policy_revision_unavailable',
    'policy_fetch_transient',
    'policy_rate_limited',
  ])('knows %s', (code) => {
    expect(isKnownUnavailableCode(code)).toBe(true)
  })

  it('does not know a new code', () => {
    expect(isKnownUnavailableCode('something_new')).toBe(false)
  })
})
