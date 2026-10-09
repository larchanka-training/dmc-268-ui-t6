import type { RunAction, RunDetail, RunSession } from '../../entities/run'
import { MOCK_NOW } from './app-state'
import { buildMockRunDetail, REVIEW_DEMO_RUN_ID } from './mockRunReview'

export const WALKING_RUN_ID = '11111111-1111-4111-8111-000000000011'
export const FAILED_RUN_ID = '11111111-1111-4111-8111-000000000012'

const REPO = 'larchanka-training/dmc-268-ui-t6'
const WALKING_PR = 41
const FAILED_PR = 42

// Timeline of the walking run, in ms from its start: queued, then one action every step while
// running, then `publishing` (the api commits `llm.review_output` and `review.postprocess` in the
// same transaction as that switch), the publish row one step later and `succeeded` one more later.
const QUEUED_MS = 2000
const STEP_MS = 1500

function pullRequestUrl(number: number): string {
  return `https://github.com/${REPO}/pull/${String(number)}`
}

interface PipelineStep {
  tool: string
  request: Record<string, unknown>
  response: unknown
}

interface TimelineStep extends PipelineStep {
  at: number
}

const RUNNING_STEPS: readonly PipelineStep[] = [
  { tool: 'vcs.fetch_diff', request: { repo: REPO, number: WALKING_PR }, response: { files: 2 } },
  {
    tool: 'llm.call',
    request: { purpose: 'repo_conventions' },
    response: { tokensIn: 820, tokensOut: 140 },
  },
  { tool: 'llm.repo_conventions', request: { repo: REPO }, response: { cached: false } },
  { tool: 'context.build', request: { files: 2 }, response: { files: 2, tokens: 4200 } },
  {
    tool: 'llm.call',
    request: { purpose: 'review', file: 'src/a.ts' },
    response: { tokensIn: 5100, tokensOut: 900 },
  },
  {
    tool: 'llm.call',
    request: { purpose: 'review', file: 'README.md' },
    response: { tokensIn: 2300, tokensOut: 310 },
  },
]
const PUBLISHING_AT_MS = QUEUED_MS + RUNNING_STEPS.length * STEP_MS
const PUBLISH_ROW_AT_MS = PUBLISHING_AT_MS + STEP_MS
const SUCCEEDED_AT_MS = PUBLISH_ROW_AT_MS + STEP_MS

const DEFAULT_ORIGIN_MS = Date.parse(MOCK_NOW)

const WALKING_STEPS: readonly TimelineStep[] = [
  ...RUNNING_STEPS.map((step, index) => ({ ...step, at: QUEUED_MS + index * STEP_MS })),
  { at: PUBLISHING_AT_MS, tool: 'llm.review_output', request: {}, response: { findings: 8 } },
  {
    at: PUBLISHING_AT_MS,
    tool: 'review.postprocess',
    request: {},
    response: { kept: 8, dropped: 0 },
  },
  {
    at: PUBLISH_ROW_AT_MS,
    tool: 'github.publish_review',
    request: { repo: REPO, number: WALKING_PR, comments: 3 },
    response: { reviewId: 987654 },
  },
]

function walkingStatus(elapsedMs: number): RunSession['status'] {
  if (elapsedMs < QUEUED_MS) {
    return 'queued'
  }
  if (elapsedMs < PUBLISHING_AT_MS) {
    return 'running'
  }
  if (elapsedMs < SUCCEEDED_AT_MS) {
    return 'publishing'
  }
  return 'succeeded'
}

export interface WalkingRunSnapshot {
  session: RunSession
  actions: RunAction[]
}

/**
 * The walking run `elapsedMs` after its start: the session and the action log at that moment.
 * Pure; `originMs` is the instant the timeline started at, which the timestamps are shifted to.
 */
export function walkingRunAt(
  elapsedMs: number,
  originMs: number = DEFAULT_ORIGIN_MS,
): WalkingRunSnapshot {
  const status = walkingStatus(elapsedMs)
  const actions: RunAction[] = WALKING_STEPS.filter((step) => step.at <= elapsedMs).map(
    (step, index) => ({
      id: `44444444-4444-4444-8444-0000000011${String(index).padStart(2, '0')}`,
      runId: WALKING_RUN_ID,
      index,
      tool: step.tool,
      request: step.request,
      response: step.response,
      responseRef: null,
      startedAt: new Date(originMs + step.at).toISOString(),
      durationMs: 400,
    }),
  )
  const session: RunSession = {
    id: WALKING_RUN_ID,
    engine: 'deep',
    model: 'claude-sonnet-5',
    status,
    startedAt: status === 'queued' ? null : new Date(originMs + QUEUED_MS).toISOString(),
    finishedAt: status === 'succeeded' ? new Date(originMs + SUCCEEDED_AT_MS).toISOString() : null,
    attempt: 1,
    cancelRequested: false,
    summaryOnly: false,
    pullRequest: {
      repo: REPO,
      number: WALKING_PR,
      title: 'feat: live run progress demo',
      url: pullRequestUrl(WALKING_PR),
      headSha: 'cccc4141cccc4141cccc4141cccc4141cccc4141',
    },
    actionCount: actions.length,
    errorCode: null,
  }
  return { session, actions }
}

let startedAtMs: number | null = null

/** Starts the walking clock; a second call keeps the first start. */
export function startWalkingRun(nowMs: number = Date.now()): void {
  startedAtMs ??= nowMs
}

/** Puts the walking run back before its start (`initMockTransport` does it, so tests start clean). */
export function resetWalkingRun(): void {
  startedAtMs = null
}

/** The walking run right now: queued until `startWalkingRun` was called. */
export function currentWalkingRun(nowMs: number = Date.now()): WalkingRunSnapshot {
  return startedAtMs === null ? walkingRunAt(0) : walkingRunAt(nowMs - startedAtMs, startedAtMs)
}

/** The run detail: the demo review once succeeded, an empty one before. */
export function buildWalkingRunDetail(session: RunSession): RunDetail {
  if (session.status !== 'succeeded') {
    return buildMockRunDetail(session)
  }
  return { ...buildMockRunDetail({ ...session, id: REVIEW_DEMO_RUN_ID }), id: session.id }
}

export const mockFailedRun: RunSession = {
  id: FAILED_RUN_ID,
  engine: 'deep',
  model: 'claude-sonnet-5',
  status: 'failed',
  startedAt: '2026-09-18T10:00:00.000Z',
  finishedAt: '2026-09-18T10:01:30.000Z',
  attempt: 1,
  cancelRequested: false,
  summaryOnly: false,
  pullRequest: {
    repo: REPO,
    number: FAILED_PR,
    title: 'fix: retry the review on a model timeout',
    url: pullRequestUrl(FAILED_PR),
    headSha: 'dddd4242dddd4242dddd4242dddd4242dddd4242',
  },
  actionCount: 4,
  errorCode: 'llm_timeout',
}

/** A failed step is recorded as `response = { error: { type, message } }` (api run_trace). */
export function makeFailedRunActions(): RunAction[] {
  const steps: PipelineStep[] = [
    { tool: 'vcs.fetch_diff', request: { repo: REPO, number: FAILED_PR }, response: { files: 2 } },
    { tool: 'llm.repo_conventions', request: { repo: REPO }, response: { cached: true } },
    { tool: 'context.build', request: { files: 2 }, response: { files: 2, tokens: 3900 } },
    {
      tool: 'llm.call',
      request: { purpose: 'review', file: 'src/a.ts' },
      response: { error: { type: 'LLMTimeout', message: 'the model call timed out' } },
    },
  ]
  const startedAt = Date.parse('2026-09-18T10:00:00.000Z')
  return steps.map((step, index) => ({
    id: `44444444-4444-4444-8444-0000000012${String(index).padStart(2, '0')}`,
    runId: FAILED_RUN_ID,
    index,
    tool: step.tool,
    request: step.request,
    response: step.response,
    responseRef: null,
    startedAt: new Date(startedAt + index * 20_000).toISOString(),
    durationMs: 400,
  }))
}
