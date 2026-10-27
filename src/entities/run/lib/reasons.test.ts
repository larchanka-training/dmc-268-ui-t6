import { afterEach, describe, expect, it } from 'vitest'

import { i18n } from '../../../shared/i18n'
import { en } from '../../../shared/i18n/locales/en'
import { ru } from '../../../shared/i18n/locales/ru'
import { isKnownReasonCode, REASON_CODES, reasonText } from './reasons'

const testLanguage = i18n.language

afterEach(async () => {
  await i18n.changeLanguage(testLanguage)
})

describe('reasonText', () => {
  it('reads the English text of a known code', async () => {
    await i18n.changeLanguage('en')
    expect(reasonText('llm_timeout')).toBe(
      'The model did not answer in time. You can restart the run.',
    )
    expect(reasonText('pr_closed')).toBe('The pull request is closed.')
  })

  it('reads the Russian text of a known code, as the api check-run says it', async () => {
    await i18n.changeLanguage('ru')
    expect(reasonText('llm_timeout')).toBe(
      'Модель не ответила вовремя. Прогон можно перезапустить из UI.',
    )
    expect(reasonText('policy_ignore_pattern_invalid')).toBe(
      'В блоке review-ignore недопустимая маска.',
    )
  })

  it('names an unknown code in either language', async () => {
    await i18n.changeLanguage('en')
    expect(reasonText('gitlab_forbidden')).toBe('Unknown reason: gitlab_forbidden')
    await i18n.changeLanguage('ru')
    expect(reasonText('gitlab_forbidden')).toBe('Неизвестная причина: gitlab_forbidden')
  })

  it('does not take an object member for a code', async () => {
    await i18n.changeLanguage('en')
    expect(isKnownReasonCode('constructor')).toBe(false)
    expect(reasonText('constructor')).toBe('Unknown reason: constructor')
  })
})

describe('reason dictionaries', () => {
  it('have a text for every known code and nothing else but the fallback', () => {
    const expected = [...REASON_CODES, 'unknown'].sort()
    expect(Object.keys(en.reasons).sort()).toEqual(expected)
    expect(Object.keys(ru.reasons).sort()).toEqual(expected)
  })

  it('give each code a text of its own in each language', () => {
    for (const code of REASON_CODES) {
      expect(en.reasons[code]).not.toBe(ru.reasons[code])
      expect(en.reasons[code].length).toBeGreaterThan(0)
    }
  })
})
