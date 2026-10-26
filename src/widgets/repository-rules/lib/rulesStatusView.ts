import type { RulesDiagnostic } from '../../../entities/repository'
import { formatDateTime } from '../../../shared/i18n'

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
 * bound reads "более N": RULES_FORMAT_SPEC §9 forbids showing it as an exact value.
 */
export function describeDiagnosticLimit(diagnostic: RulesDiagnostic): string | null {
  if (diagnostic.limit === undefined || diagnostic.actual === undefined) {
    return null
  }
  const actual =
    diagnostic.actualIsLowerBound === true
      ? `более ${String(diagnostic.actual)}`
      : String(diagnostic.actual)
  return `допустимо ${String(diagnostic.limit)}, фактически ${actual}`
}

// RULES_FORMAT_SPEC §9: the codes under which the file could not be read at all.
const UNAVAILABLE_REASONS: Record<string, string> = {
  policy_access_denied: 'У GitHub App нет доступа к репозиторию',
  policy_revision_unavailable:
    'Ревизия default branch недоступна: GitHub не подтвердил, есть ли файл правил.',
  policy_fetch_transient: 'GitHub временно не отвечает',
  policy_rate_limited: 'GitHub ограничил число запросов',
}

/** Whether `unavailableReason` has a text of its own for the code; the generic fallback does not count. */
export function isKnownUnavailableCode(code: string): boolean {
  return Object.keys(UNAVAILABLE_REASONS).includes(code)
}

/**
 * The reason an `unavailable` status gives, by code: the server's `message` is not shown. A code
 * is looked up only where `isKnownUnavailableCode` says it is a key, so `constructor` is not.
 */
export function unavailableReason(code: string): string {
  const reason = isKnownUnavailableCode(code) ? UNAVAILABLE_REASONS[code] : undefined
  return reason ?? 'Сервер не смог прочитать файл правил'
}
