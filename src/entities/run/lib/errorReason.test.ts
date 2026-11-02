import { describe, expect, it } from 'vitest'

import { i18n } from '../../../shared/i18n'
import { errorReason } from './errorReason'

// The table in docs/plans/186-plan.md. Expected phrases are copied from there, not from the map.
const PLAN_REASONS: Readonly<Record<string, string>> = {
  budget_paused: 'Дневной бюджет исчерпан, ревью на паузе.',
  budget_exceeded: 'Превышен лимит стоимости прогона.',
  deadline_exceeded: 'Прогон не уложился в лимит времени.',
  llm_context_overflow: 'PR не помещается в контекст модели.',
  llm_rate_limited: 'Провайдер модели ограничил частоту запросов. Перезапустите прогон позже.',
  verification_budget_exceeded: 'Бюджета недостаточно для обязательной проверки.',
  verification_deadline_exceeded: 'Недостаточно времени для обязательной проверки.',
  verification_context_overflow: 'Обязательные данные проверки не помещаются в контекст.',
  publication_payload_too_large: 'Результат превышает лимит публикации VCS.',
}

const ENGLISH_REASONS: Readonly<Record<string, string>> = {
  budget_paused: 'The daily budget is used up, reviews are paused.',
  budget_exceeded: 'The run hit its spending limit. Split the pull request.',
  deadline_exceeded: 'The run took too long. Restart it.',
  llm_context_overflow: 'The change does not fit in the model context. Split the pull request.',
  llm_rate_limited: 'The model provider limited the request rate. Restart the run later.',
  verification_budget_exceeded: 'The budget is not enough for the required check.',
  verification_deadline_exceeded: 'There is not enough time for the required check.',
  verification_context_overflow: 'The data the check needs does not fit in the context.',
  publication_payload_too_large: 'The result is over the publication limit of the code host.',
}

describe('errorReason', () => {
  it.each(Object.entries(PLAN_REASONS))('returns the plan phrase for %s', (code, phrase) => {
    expect(errorReason(code)).toBe(phrase)
  })

  it.each(Object.entries(ENGLISH_REASONS))(
    'returns the English phrase for %s',
    async (code, phrase) => {
      await i18n.changeLanguage('en')
      expect(errorReason(code)).toBe(phrase)
    },
  )

  it.each([
    'queue_lost',
    'llm_timeout',
    '',
    'constructor',
    'policy_access_denied',
    'policy_rate_limited',
  ])('returns null for %j', (code) => {
    expect(errorReason(code)).toBeNull()
  })

  it('does not throw for an unknown code', () => {
    expect(() => errorReason('not_a_real_code')).not.toThrow()
  })
})
