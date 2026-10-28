import { describe, expect, it } from 'vitest'

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

describe('errorReason', () => {
  it.each(Object.entries(PLAN_REASONS))('returns the plan phrase for %s', (code, phrase) => {
    expect(errorReason(code)).toBe(phrase)
  })

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
