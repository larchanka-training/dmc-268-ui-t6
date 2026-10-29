import type { limitReasons as en } from '../en/limitReasons'
import type { Translation } from '../types'

/**
 * Word for word from `_ERROR_TEXTS` in `app/modules/reviews/application/check_runs.py`, except
 * `publication_payload_too_large`, which comes from PIPELINE_SPEC §6.
 */
export const limitReasons: Translation<typeof en> = {
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
