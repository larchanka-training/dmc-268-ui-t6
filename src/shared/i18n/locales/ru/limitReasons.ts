/**
 * The nine limit codes of ui#186, word for word from `_ERROR_TEXTS` in
 * `app/modules/reviews/application/check_runs.py`, except `publication_payload_too_large`, which
 * comes from PIPELINE_SPEC §6. The Reason row and the progress bar keep `reasonText` (the full
 * dictionary). This map is the Russian phrase of the limit alert and of the runs list.
 * A code is looked up only where it is a key of the map, so `constructor` is not.
 */
const LIMIT_REASONS = {
  budget_paused: 'Дневной бюджет исчерпан, ревью на паузе.',
  budget_exceeded: 'Превышен лимит стоимости прогона.',
  deadline_exceeded: 'Прогон не уложился в лимит времени.',
  llm_context_overflow: 'PR не помещается в контекст модели.',
  llm_rate_limited: 'Провайдер модели ограничил частоту запросов. Перезапустите прогон позже.',
  verification_budget_exceeded: 'Бюджета недостаточно для обязательной проверки.',
  verification_deadline_exceeded: 'Недостаточно времени для обязательной проверки.',
  verification_context_overflow: 'Обязательные данные проверки не помещаются в контекст.',
  publication_payload_too_large: 'Результат превышает лимит публикации VCS.',
} as const

/** The Russian phrase of a known limit code, or null when this map has none. Never throws. */
export function errorReason(code: string): string | null {
  if (Object.keys(LIMIT_REASONS).includes(code)) {
    return LIMIT_REASONS[code as keyof typeof LIMIT_REASONS]
  }
  return null
}
