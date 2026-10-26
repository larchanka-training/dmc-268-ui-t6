import type { RunSession } from '../../../entities/run'

// Dates and durations follow the interface language; the formatting itself lives in shared/i18n.
export { formatDateTime, formatDuration } from '../../../shared/i18n'

export function runDuration(run: RunSession, now: Date): number | null {
  if (run.startedAt === null) {
    return null
  }
  const startedMs = new Date(run.startedAt).getTime()
  const endMs = run.finishedAt !== null ? new Date(run.finishedAt).getTime() : now.getTime()
  return endMs - startedMs
}
