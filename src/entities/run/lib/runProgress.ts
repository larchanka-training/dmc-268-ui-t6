import { z } from 'zod'

import type { RunAction, RunSession } from '../model/schemas'
import { RUN_FETCH_DIFF_TOOL } from './runTools'

export type RunProgressStageKey = 'context' | 'analysis' | 'publishing'

export type RunProgressStageState = 'wait' | 'process' | 'finish' | 'error' | 'stopped'

export interface RunProgressStage {
  key: RunProgressStageKey
  label: string
  state: RunProgressStageState
  // Set only on the stage a failed or cancelled run stopped on.
  errorCode: string | null
}

export type RunProgress = readonly RunProgressStage[]

const STAGES: readonly { key: RunProgressStageKey; label: string }[] = [
  { key: 'context', label: 'Сбор контекста' },
  { key: 'analysis', label: 'Анализ LLM' },
  { key: 'publishing', label: 'Публикация' },
]

// Stage indexes into STAGES.
const CONTEXT = 0
const ANALYSIS = 1
const PUBLISHING = 2

// A Map, not an object literal: a tool named `constructor` must stay unknown.
const TOOL_STAGE = new Map<string, number>([
  ['policy.load', CONTEXT],
  [RUN_FETCH_DIFF_TOOL, CONTEXT],
  ['context.build', CONTEXT],
  ['llm.repo_conventions', CONTEXT],
  ['llm.call', ANALYSIS],
  ['llm.review_output', ANALYSIS],
  ['review.postprocess', ANALYSIS],
  ['engine.fallback', ANALYSIS],
  ['github.publish_review', PUBLISHING],
  ['gitlab.publish_review', PUBLISHING],
])

// The api commits the review output and the postprocess row in the same transaction as the
// switch to `publishing`, so they are evidence the attempt reached publishing.
const PUBLISHING_MARKERS = new Set([
  'llm.review_output',
  'review.postprocess',
  'github.publish_review',
  'gitlab.publish_review',
])

// A failed step is recorded as `response = { error: { type, message } }` (api run_trace).
function isFailedStep(action: RunAction): boolean {
  const { response } = action
  return typeof response === 'object' && response !== null && 'error' in response
}

const LlmCallAttemptSchema = z.object({ attempt: z.int().positive() })

// Read only the latest attempt and known tools. Policy rows delimit modern logs;
// legacy logs use stage regressions or repeated conventions rows.
function currentAttempt(actions: readonly RunAction[], runAttempt: number): RunAction[] {
  const ordered = [...actions].sort((a, b) => a.index - b.index)
  const policyIndexes = ordered.flatMap((action, index) =>
    action.tool === 'policy.load' ? [index] : [],
  )
  const latestPolicy = policyIndexes[policyIndexes.length - 1]
  if (latestPolicy !== undefined) {
    const latest = ordered.slice(latestPolicy)
    if (policyIndexes.length < runAttempt) {
      // Earlier claims can leave no policy row. A current call corroborates this
      // segment, but until then prefer context over leaking an older attempt.
      const corroborated = latest.some((action) => {
        if (action.tool !== 'llm.call') {
          return false
        }
        const request = LlmCallAttemptSchema.safeParse(action.request)
        return request.success && request.data.attempt === runAttempt
      })
      if (!corroborated) {
        return []
      }
    }
    return latest.filter((action) => TOOL_STAGE.has(action.tool))
  }
  let segment: RunAction[] = []
  let previousStage = -1
  for (const action of ordered) {
    const stage = TOOL_STAGE.get(action.tool)
    if (stage === undefined) {
      continue
    }
    const repeatsConventions =
      action.tool === 'llm.repo_conventions' &&
      segment.some((earlier) => earlier.tool === 'llm.repo_conventions')
    if (stage < previousStage || repeatsConventions) {
      segment = []
    }
    segment.push(action)
    previousStage = stage
  }
  return segment
}

function stageStates(
  status: Exclude<RunSession['status'], 'skipped'>,
  attempt: readonly RunAction[],
): RunProgressStageState[] {
  const conventionsIndex = attempt.findIndex((action) => action.tool === 'llm.repo_conventions')
  // Modern logs can have an initial build before conventions and a prompt build afterwards.
  // Historical context-build-only logs retain their immediate handoff to analysis.
  const hasPolicy = attempt.some((action) => action.tool === 'policy.load')
  const contextDone = attempt.some(
    (action, index) =>
      action.tool === 'context.build' &&
      !isFailedStep(action) &&
      (!hasPolicy || (conventionsIndex !== -1 && index > conventionsIndex)),
  )
  const reachedPublishing = attempt.some((action) => PUBLISHING_MARKERS.has(action.tool))

  switch (status) {
    case 'queued':
      return ['wait', 'wait', 'wait']
    case 'running':
      return contextDone ? ['finish', 'process', 'wait'] : ['process', 'wait', 'wait']
    case 'publishing':
      return ['finish', 'finish', 'process']
    case 'succeeded':
      return ['finish', 'finish', 'finish']
    case 'failed':
    case 'cancelled': {
      const stop = reachedPublishing ? PUBLISHING : contextDone ? ANALYSIS : CONTEXT
      const stopState = status === 'failed' ? 'error' : 'stopped'
      return STAGES.map((_, index) =>
        index < stop ? 'finish' : index === stop ? stopState : 'wait',
      )
    }
  }
}

/**
 * Whether the stage of a run in `status` is read from the action log. `queued`, `publishing` and
 * `succeeded` ignore it (and `skipped` has no bar), so those bars do not depend on the log being there.
 */
export function runProgressReadsLog(status: RunSession['status']): boolean {
  return status === 'running' || status === 'failed' || status === 'cancelled'
}

export function runProgress(
  run: Pick<RunSession, 'status' | 'errorCode' | 'attempt'>,
  actions: RunAction[],
): RunProgress | null {
  if (run.status === 'skipped') {
    return null
  }
  const attempt = currentAttempt(actions, run.attempt)
  const states = stageStates(run.status, attempt)
  return STAGES.map((stage, index) => {
    const state = states[index] ?? 'wait'
    return {
      ...stage,
      state,
      errorCode: state === 'error' || state === 'stopped' ? run.errorCode : null,
    }
  })
}
