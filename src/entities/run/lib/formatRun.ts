import type { RunSession } from '../model/schemas'

export { formatDuration } from '../../../shared/i18n'

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
