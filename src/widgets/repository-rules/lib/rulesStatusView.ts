import type { RulesDiagnostic } from '../../../entities/repository'

/** The seven characters git itself shows; the full sha stays in a tooltip. */
export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

/**
 * `2026-10-14 09:30:15`: the same text as the run header. The time is UTC and carries no label,
 * like every other time in the app; showing local time app-wide is a separate issue.
 */
export function formatCheckedAt(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19)
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

/** The limit and the actual value of a "too large" diagnostic, when the server knows both. */
export function describeDiagnosticLimit(diagnostic: RulesDiagnostic): string | null {
  if (diagnostic.limit === undefined || diagnostic.actual === undefined) {
    return null
  }
  return `допустимо ${String(diagnostic.limit)}, фактически ${String(diagnostic.actual)}`
}

// RULES_FORMAT_SPEC §9: the codes under which the file could not be read at all.
const UNAVAILABLE_REASONS: Record<string, string> = {
  policy_access_denied: 'У GitHub App нет доступа к репозиторию',
  policy_revision_unavailable: 'Закреплённая ревизия правил недоступна',
  policy_fetch_transient: 'GitHub временно не отвечает',
  policy_rate_limited: 'GitHub ограничил число запросов',
}

/** Whether `unavailableReason` has a text of its own for the code; the generic fallback does not count. */
export function isKnownUnavailableCode(code: string): boolean {
  return Object.keys(UNAVAILABLE_REASONS).includes(code)
}

/** The reason an `unavailable` status gives, by code: the server's `message` is not shown. */
export function unavailableReason(code: string): string {
  return UNAVAILABLE_REASONS[code] ?? 'Сервер не смог прочитать файл правил'
}
