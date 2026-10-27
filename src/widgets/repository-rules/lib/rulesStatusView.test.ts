import { afterEach, describe, expect, it } from 'vitest'

import type { RulesDiagnostic } from '../../../entities/repository'
import { i18n } from '../../../shared/i18n'
import {
  describeDiagnosticLimit,
  describeDiagnosticLocation,
  diagnosticText,
  formatCheckedAt,
  isKnownDiagnosticCode,
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
    expect(formatCheckedAt('2026-10-14T09:30:15.123Z')).toBe('14.10.2026, 09:30:15')
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
      'допустимо 65\u00a0536, фактически 85\u00a0000',
    )
  })

  it('says the actual value is more than given when it is a lower bound', () => {
    expect(
      describeDiagnosticLimit({ ...base, limit: 65536, actual: 69632, actualIsLowerBound: true }),
    ).toBe('допустимо 65\u00a0536, фактически более 69\u00a0632')
    expect(
      describeDiagnosticLimit({ ...base, limit: 65536, actual: 85000, actualIsLowerBound: false }),
    ).toBe('допустимо 65\u00a0536, фактически 85\u00a0000')
  })

  it('groups the digits in the notation of the language', () => {
    void i18n.changeLanguage('en')
    try {
      expect(describeDiagnosticLimit({ ...base, limit: 65536, actual: 85000 })).toBe(
        'allowed 65,536, actual 85,000',
      )
    } finally {
      void i18n.changeLanguage('ru')
    }
  })

  it('says nothing when either is missing', () => {
    expect(describeDiagnosticLimit({ ...base, limit: 65536 })).toBeNull()
    expect(describeDiagnosticLimit({ ...base, actual: 85000 })).toBeNull()
    expect(describeDiagnosticLimit(base)).toBeNull()
  })
})

describe('unavailableReason', () => {
  it('requires an explicit provider at the helper boundary', () => {
    expectTypeOf<Parameters<typeof unavailableReason>>().toEqualTypeOf<[string, VcsProvider]>()
  })

  it('names Bitbucket for provider access and transient failures', () => {
    expect(unavailableReason('policy_access_denied', 'bitbucket')).toBe(
      'У Bitbucket Cloud нет доступа к репозиторию',
    )
    expect(unavailableReason('policy_rate_limited', 'bitbucket')).toBe(
      'Bitbucket Cloud ограничил число запросов',
    )
    expect(unavailableReason('policy_fetch_transient', 'bitbucket')).toBe(
      'Bitbucket Cloud временно не отвечает',
    )
    expect(unavailableReason('policy_revision_unavailable', 'bitbucket')).toBe(
      'Ревизия default branch недоступна: Bitbucket Cloud не подтвердил, есть ли файл правил.',
    )
  })

  it('keeps GitLab wording for the same unavailable reasons', () => {
    expect(unavailableReason('policy_access_denied', 'gitlab')).toBe(
      'У GitLab нет доступа к репозиторию',
    )
    expect(unavailableReason('policy_rate_limited', 'gitlab')).toBe(
      'GitLab ограничил число запросов',
    )
    expect(unavailableReason('policy_fetch_transient', 'gitlab')).toBe(
      'GitLab временно не отвечает',
    )
    expect(unavailableReason('policy_revision_unavailable', 'gitlab')).toBe(
      'Ревизия default branch недоступна: GitLab не подтвердил, есть ли файл правил.',
    )
  })
  it.each([
    ['policy_access_denied', 'У GitHub App нет доступа к репозиторию'],
    [
      'policy_revision_unavailable',
      'Ревизия default branch недоступна: GitHub не подтвердил, есть ли файл правил.',
    ],
    ['policy_fetch_transient', 'GitHub временно не отвечает'],
    ['policy_rate_limited', 'GitHub ограничил число запросов'],
  ])('explains %s in Russian', (code, reason) => {
    expect(unavailableReason(code, 'github')).toBe(reason)
  })

  it('falls back to a general reason for a code it does not know', () => {
    expect(unavailableReason('something_new', 'github')).toBe(
      'Сервер не смог прочитать файл правил',
    )
  })

  it('shows the server message for a code it does not know', () => {
    expect(unavailableReason('something_new', 'GitHub is down.')).toBe('GitHub is down.')
  })

  it('reads a known code from the dictionary, not from the server message', () => {
    expect(unavailableReason('policy_fetch_transient', 'Could not read.')).toBe(
      'GitHub временно не отвечает',
    )
  })

  it('falls back for a code that is a property of every object, not a reason text', () => {
    for (const code of ['constructor', 'toString', '__proto__']) {
      expect(unavailableReason(code, 'github'), code).toBe('Сервер не смог прочитать файл правил')
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

describe('diagnosticText', () => {
  const testLanguage = i18n.language

  afterEach(async () => {
    await i18n.changeLanguage(testLanguage)
  })

  it('reads a known code from the dictionary in Russian', () => {
    expect(diagnosticText({ ...base, message: 'The review-ignore block...' })).toBe(
      'В блоке review-ignore недопустимая маска.',
    )
  })

  it('reads a known code from the dictionary in English', async () => {
    await i18n.changeLanguage('en')
    expect(diagnosticText(base)).toBe('The review-ignore block has a mask that is not allowed.')
  })

  it('says a review will not run with a too large file, as the api settings page does', async () => {
    const tooLarge = { ...base, code: 'policy_document_too_large' }
    expect(diagnosticText(tooLarge)).toBe(
      'Документ правил превышает 64 КиБ. Ревью с ним не выполнится; уменьшите документ.',
    )
    await i18n.changeLanguage('en')
    expect(diagnosticText(tooLarge)).toBe(
      'The rules document is over 64 KiB. A review will not run with it; make the document smaller.',
    )
  })

  it('shows the server message for a code it does not know', () => {
    const unknown = { ...base, code: 'policy_new_rule', message: 'A new rule failed.' }
    expect(diagnosticText(unknown)).toBe('A new rule failed.')
    expect(isKnownDiagnosticCode('policy_new_rule')).toBe(false)
  })

  it('does not take an object member for a code', () => {
    for (const code of ['constructor', 'toString', '__proto__']) {
      expect(diagnosticText({ ...base, code, message: 'server' }), code).toBe('server')
    }
  })
})
