import type { RunListPage, RunSession } from '../../entities/run'

import { mockRunSessions, mockSummaryOnlyRun } from './app-state'
import { mockVerdictVariantRuns } from './mockRunReview'
import { mockFailedRun, walkingRunAt } from './mockRunTimeline'

const API_REPO = 'larchanka-training/dmc-268-api-t6'
const API_RUN_COUNT = 25
const API_FIRST_PR = 140

const API_RUN_TOPICS = [
  'feat: add rate limiting',
  'fix: close the db session on cancel',
  'refactor: split the webhook handler',
  'feat: paginate the runs list',
  'chore: bump the fastapi pin',
] as const

// Mostly succeeded, the other terminal statuses now and then. Never an active one: the active
// runs of the list have one pull request each (see the fixture test).
const API_RUN_OUTCOMES = [
  'succeeded',
  'succeeded',
  'failed',
  'succeeded',
  'cancelled',
  'succeeded',
  'skipped',
] as const

const API_FIRST_CREATED_AT = Date.parse('2026-09-17T18:00:00.000Z')
const MINUTE_MS = 60_000

/** The i-th finished run of the api repository; 0 is the newest, as the api lists them. */
function apiRepoRun(i: number): RunSession {
  const number = API_FIRST_PR - i
  const outcome = API_RUN_OUTCOMES[i % API_RUN_OUTCOMES.length] ?? 'succeeded'
  const createdAt = API_FIRST_CREATED_AT - i * 90 * MINUTE_MS
  const startedAt = createdAt + MINUTE_MS
  const finishedAt = outcome === 'skipped' ? startedAt : startedAt + 5 * MINUTE_MS
  return {
    // `…0100` and up: the ids below it belong to the other fixture runs, `…0099` to the rerun mock.
    id: `11111111-1111-4111-8111-${String(100 + i).padStart(12, '0')}`,
    engine: i % 2 === 0 ? 'fast' : 'deep',
    model: outcome === 'skipped' ? null : 'claude-sonnet-5',
    status: outcome,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    attempt: 1,
    cancelRequested: outcome === 'cancelled',
    trigger: i % 4 === 3 ? 'rerun' : 'webhook',
    createdAt: new Date(createdAt).toISOString(),
    summaryOnly: false,
    pullRequest: {
      repo: API_REPO,
      number,
      title: `${API_RUN_TOPICS[i % API_RUN_TOPICS.length] ?? 'chore: housekeeping'} (#${String(number)})`,
      url: `https://github.com/${API_REPO}/pull/${String(number)}`,
      headSha: i.toString(16).padStart(2, '0').repeat(20),
    },
    actionCount: outcome === 'skipped' ? 1 : 12 + i,
    errorCode:
      outcome === 'failed' ? 'llm_timeout' : outcome === 'skipped' ? 'no_reviewable_changes' : null,
  }
}

/**
 * Wire payload for `GET /api/runs` (used by mock transport and fixture tests). It is the whole
 * list: the mock transport cuts it into pages. The infra repository has no run on purpose, so the
 * filtered list can be empty.
 */
export const mockRunsListPage: RunListPage = {
  items: [
    ...mockRunSessions,
    mockSummaryOnlyRun,
    ...mockVerdictVariantRuns,
    // The walking run is listed as it is before it starts; the transport serves its live status.
    walkingRunAt(0).session,
    mockFailedRun,
    ...Array.from({ length: API_RUN_COUNT }, (_, i) => apiRepoRun(i)),
  ],
  nextCursor: null,
}
