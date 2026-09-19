import type { RunSession } from '../../../entities/run'

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return '<1 с'
  }
  const totalSeconds = Math.floor(ms / 1000)
  if (ms < 60000) {
    return `${String(totalSeconds)} с`
  }
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes)} мин ${String(seconds)} с`
}

export function runDuration(run: RunSession, now: Date): number | null {
  if (run.startedAt === null) {
    return null
  }
  const startedMs = new Date(run.startedAt).getTime()
  const endMs = run.finishedAt !== null ? new Date(run.finishedAt).getTime() : now.getTime()
  return endMs - startedMs
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19)
}
