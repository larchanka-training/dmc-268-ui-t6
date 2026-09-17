import type { RunSession, RunStatus } from '../model/schemas'
import { ACTIVE_RUN_STATUSES, TERMINAL_RUN_STATUSES } from '../model/schemas'

export function isTerminal(status: RunStatus): boolean {
  return TERMINAL_RUN_STATUSES.some((s) => s === status)
}

export function isActive(status: RunStatus): boolean {
  return ACTIVE_RUN_STATUSES.some((s) => s === status)
}

export const STALE_RUNNING_MS = 10 * 60 * 1000

export function isStaleRunning(
  run: Pick<RunSession, 'status' | 'startedAt' | 'finishedAt'>,
  now: Date,
): boolean {
  if (run.status !== 'running' || run.finishedAt !== null || run.startedAt === null) {
    return false
  }
  return now.getTime() - new Date(run.startedAt).getTime() > STALE_RUNNING_MS
}

export function statusColor(
  status: RunStatus,
): 'default' | 'processing' | 'blue' | 'success' | 'error' | 'warning' {
  switch (status) {
    case 'queued':
      return 'default'
    case 'running':
      return 'processing'
    case 'publishing':
      return 'blue'
    case 'completed':
      return 'success'
    case 'failed':
      return 'error'
    case 'cancelled':
      return 'warning'
    case 'skipped':
      return 'default'
  }
}
