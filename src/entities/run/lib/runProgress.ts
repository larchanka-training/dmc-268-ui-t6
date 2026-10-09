import type { RunAction, RunSession } from '../model/schemas'

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
  ['vcs.fetch_diff', CONTEXT],
  ['context.build', CONTEXT],
  ['llm.repo_conventions', CONTEXT],
  ['llm.call', ANALYSIS],
  ['llm.review_output', ANALYSIS],
  ['review.postprocess', ANALYSIS],
  ['engine.fallback', ANALYSIS],
  ['github.publish_review', PUBLISHING],
])

// The api commits the review output and the postprocess row in the same transaction as the
// switch to `publishing`, so they are evidence the attempt reached publishing.
const PUBLISHING_MARKERS = new Set([
  'llm.review_output',
  'review.postprocess',
  'github.publish_review',
])

// A failed step is recorded as `response = { error: { type, message } }` (api run_trace).
function isFailedStep(action: RunAction): boolean {
  const { response } = action
  return typeof response === 'object' && response !== null && 'error' in response
}

// The actions of the latest attempt, known tools only. The API gives no attempt marker per
// action, so a new attempt is detected as a stage regression: a retry goes back to context
// after the previous attempt got further.
function currentAttempt(actions: readonly RunAction[]): RunAction[] {
  const ordered = [...actions].sort((a, b) => a.index - b.index)
  let segment: RunAction[] = []
  let previousStage = -1
  for (const action of ordered) {
    const stage = TOOL_STAGE.get(action.tool)
    if (stage === undefined) {
      continue
    }
    if (stage < previousStage) {
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
  const contextDone = attempt.some(
    (action) => action.tool === 'context.build' && !isFailedStep(action),
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

export function runProgress(
  run: Pick<RunSession, 'status' | 'errorCode'>,
  actions: RunAction[],
): RunProgress | null {
  if (run.status === 'skipped') {
    return null
  }
  const states = stageStates(run.status, currentAttempt(actions))
  return STAGES.map((stage, index) => {
    const state = states[index] ?? 'wait'
    return {
      ...stage,
      state,
      errorCode: state === 'error' || state === 'stopped' ? run.errorCode : null,
    }
  })
}
