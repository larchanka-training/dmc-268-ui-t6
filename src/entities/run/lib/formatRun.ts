import type { RunSession } from '../model/schemas'

// Dates and durations follow the interface language; the formatting itself lives in shared/i18n.
// Times stay in UTC. The notation is the current language's, not a fixed `YYYY-MM-DD HH:mm:ss`.
export { formatDateTime, formatDuration } from '../../../shared/i18n'

/** Milliseconds from `startedAt` to `finishedAt`, or to `now` while the run is still open. */
export function runDuration(
  run: Pick<RunSession, 'startedAt' | 'finishedAt'>,
  now: Date,
): number | null {
  if (run.startedAt === null) {
    return null
  }
  const startedMs = new Date(run.startedAt).getTime()
  const endMs = run.finishedAt !== null ? new Date(run.finishedAt).getTime() : now.getTime()
  return endMs - startedMs
}
