import type { ParseKeys } from 'i18next'

import type { RulesDiagnostic } from '../../../entities/repository'
import { isKnownReasonCode } from '../../../entities/run'
import { formatDateTime, formatNumber, i18n } from '../../../shared/i18n'

/** The seven characters git itself shows; the full sha stays in a tooltip. */
export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

/**
 * The same text as the run header, in the notation of the current language. The time is UTC and
 * carries no label, like every other time in the app; showing local time app-wide is a separate
 * issue.
 */
export function formatCheckedAt(iso: string): string {
  return formatDateTime(iso)
}

/** `line:column`, `line`, or null when the server gave no line. */
export function describeDiagnosticLocation(diagnostic: RulesDiagnostic): string | null {
  if (diagnostic.line === null) {
    return null
  }
  return diagnostic.column === null
    ? String(diagnostic.line)
    : `${String(diagnostic.line)}:${String(diagnostic.column)}`
}

/**
 * The limit and the actual value of a "too large" diagnostic, when the server knows both. A lower
 * bound reads "more than N": RULES_FORMAT_SPEC §9 forbids showing it as an exact value.
 */
export function describeDiagnosticLimit(diagnostic: RulesDiagnostic): string | null {
  if (diagnostic.limit === undefined || diagnostic.actual === undefined) {
    return null
  }
  return i18n.t(diagnostic.actualIsLowerBound === true ? 'rules.limitLowerBound' : 'rules.limit', {
    limit: formatNumber(diagnostic.limit),
    actual: formatNumber(diagnostic.actual),
  })
}

// RULES_FORMAT_SPEC §9: the codes under which the file could not be read at all.
const UNAVAILABLE_REASONS = {
  policy_access_denied: 'rules.reasons.policy_access_denied',
  policy_revision_unavailable: 'rules.reasons.policy_revision_unavailable',
  policy_fetch_transient: 'rules.reasons.policy_fetch_transient',
  policy_rate_limited: 'rules.reasons.policy_rate_limited',
} as const satisfies Record<string, ParseKeys>

/** Whether `unavailableReason` has a text of its own for the code; the generic fallback does not count. */
export function isKnownUnavailableCode(code: string): code is keyof typeof UNAVAILABLE_REASONS {
  return Object.keys(UNAVAILABLE_REASONS).includes(code)
}

/**
 * The reason an `unavailable` status gives, by code. The server `message` (English) is shown only
 * for a code this build does not know yet, and the general reason when there is none. A code is
 * looked up only where `isKnownUnavailableCode` says it is a key, so `constructor` is not.
 */
export function unavailableReason(code: string, message = ''): string {
  if (isKnownUnavailableCode(code)) {
    return i18n.t(UNAVAILABLE_REASONS[code])
  }
  return message !== '' ? message : i18n.t('rules.reasons.fallback')
}

// The settings page shows no run: these codes have a text of their own here.
const STATUS_TEXTS = {
  policy_document_too_large: 'rules.statusTexts.policy_document_too_large',
} as const satisfies Record<string, ParseKeys>

function hasStatusText(code: string): code is keyof typeof STATUS_TEXTS {
  return Object.keys(STATUS_TEXTS).includes(code)
}

/**
 * What a diagnostic says, in the interface language. The text comes from the dictionaries by
 * `code`; the server `message` (English) is shown only for a code this build does not know yet.
 * The position, the limit and the mask are shown next to it from their own fields.
 */
export function diagnosticText(diagnostic: RulesDiagnostic): string {
  const { code } = diagnostic
  if (hasStatusText(code)) {
    return i18n.t(STATUS_TEXTS[code])
  }
  return isKnownReasonCode(code) ? i18n.t(`reasons.${code}`) : diagnostic.message
}

/** Whether `diagnosticText` comes from the dictionaries, so the mask is shown apart. */
export function isKnownDiagnosticCode(code: string): boolean {
  return hasStatusText(code) || isKnownReasonCode(code)
}
