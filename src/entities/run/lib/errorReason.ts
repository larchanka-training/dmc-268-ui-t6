import { i18n } from '../../../shared/i18n'

/** Limit codes that have their own alert phrase, apart from the full `reasons` dictionary. */
const LIMIT_REASON_CODES = [
  'budget_paused',
  'budget_exceeded',
  'deadline_exceeded',
  'llm_context_overflow',
  'llm_rate_limited',
  'verification_budget_exceeded',
  'verification_deadline_exceeded',
  'verification_context_overflow',
  'publication_payload_too_large',
] as const

type LimitReasonCode = (typeof LIMIT_REASON_CODES)[number]

/** A code is accepted only as one of the nine keys, so `constructor` is not. */
function isLimitReasonCode(code: string): code is LimitReasonCode {
  return LIMIT_REASON_CODES.some((known) => known === code)
}

/** The limit phrase in the interface language, or null when this set has none. Never throws. */
export function errorReason(code: string): string | null {
  if (!isLimitReasonCode(code)) {
    return null
  }
  return i18n.t(`limitReasons.${code}`)
}
