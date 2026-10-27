import { describe, expect, it } from 'vitest'

import type { RunAction, RunStatus } from '../model/schemas'
import { runProgress, runProgressReadsLog } from './runProgress'

const RUN_ID = '11111111-1111-4111-8111-000000000000'

type Step = string | readonly [tool: string, response: unknown]

const FAILURE = { error: { type: 'LLMTimeout', message: 'the model call timed out' } }

function build(...steps: Step[]): RunAction[] {
  return steps.map((step, index) => {
    const [tool, response] = typeof step === 'string' ? [step, { ok: true }] : step
    return {
      id: `22222222-2222-4222-8222-0000000000${String(index).padStart(2, '0')}`,
      runId: RUN_ID,
      index,
      tool,
      request: {},
      response,
      responseRef: null,
      startedAt: new Date(2026, 0, 1, 0, 0, index).toISOString(),
      durationMs: 10,
    }
  })
}

function states(
  status: RunStatus,
  actions: RunAction[],
  errorCode: string | null = null,
  attempt = 1,
): string[] | null {
  const progress = runProgress({ status, errorCode, attempt }, actions)
  return progress === null ? null : progress.map((stage) => stage.state)
}

// Each `running`/`stopped` entry is the phase once the step at that position is saved. A non-failed
// `llm.repo_conventions` finishes context (ui#197), so in a two-build log from before api#168 part 6
// the bar leaves context at conventions, one row before the prompt build, in every status.
const ORDERS = [
  {
    name: 'two-build cache hit',
    diff: 'vcs.fetch_diff',
    steps: [
      'context.build',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
      'github.publish_review',
    ],
    running: ['context', 'analysis', 'analysis', 'analysis', 'analysis', 'analysis', 'analysis'],
    stopped: [
      'context',
      'analysis',
      'analysis',
      'analysis',
      'publishing',
      'publishing',
      'publishing',
    ],
  },
  {
    name: 'two-build cache miss',
    diff: 'vcs.fetch_diff',
    steps: [
      'context.build',
      'llm.call',
      'llm.call',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
      'gitlab.publish_review',
    ],
    running: [
      'context',
      'context',
      'context',
      'analysis',
      'analysis',
      'analysis',
      'analysis',
      'analysis',
      'analysis',
    ],
    stopped: [
      'context',
      'context',
      'context',
      'analysis',
      'analysis',
      'analysis',
      'publishing',
      'publishing',
      'publishing',
    ],
  },
  {
    name: 'canonical cache hit',
    diff: 'vcs.fetch_diff',
    steps: [
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
      'github.publish_review',
    ],
    running: ['analysis', 'analysis', 'analysis', 'analysis', 'analysis', 'analysis'],
    stopped: ['analysis', 'analysis', 'analysis', 'publishing', 'publishing', 'publishing'],
  },
  {
    name: 'canonical cache miss',
    diff: 'vcs.fetch_diff',
    steps: [
      'llm.call',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
      'gitlab.publish_review',
    ],
    running: ['context', 'analysis', 'analysis', 'analysis', 'analysis', 'analysis', 'analysis'],
    stopped: [
      'context',
      'analysis',
      'analysis',
      'analysis',
      'publishing',
      'publishing',
      'publishing',
    ],
  },
  {
    name: 'two-build summary-only cache miss',
    diff: ['vcs.fetch_diff', { summary_only: true }],
    steps: [
      'context.build',
      'llm.call',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
      'github.publish_review',
    ],
    running: [
      'context',
      'context',
      'analysis',
      'analysis',
      'analysis',
      'analysis',
      'analysis',
      'analysis',
    ],
    stopped: [
      'context',
      'context',
      'analysis',
      'analysis',
      'analysis',
      'publishing',
      'publishing',
      'publishing',
    ],
  },
  // After api#168 part 6 only the context stage's build stays, before conventions.
  {
    name: 'build-first cache hit',
    diff: 'vcs.fetch_diff',
    steps: [
      'context.build',
      'llm.repo_conventions',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
      'github.publish_review',
    ],
    running: ['context', 'analysis', 'analysis', 'analysis', 'analysis', 'analysis'],
    stopped: ['context', 'analysis', 'analysis', 'publishing', 'publishing', 'publishing'],
  },
  {
    name: 'build-first cache miss',
    diff: 'vcs.fetch_diff',
    steps: [
      'context.build',
      'llm.call',
      'llm.call',
      'llm.repo_conventions',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
      'gitlab.publish_review',
    ],
    running: [
      'context',
      'context',
      'context',
      'analysis',
      'analysis',
      'analysis',
      'analysis',
      'analysis',
    ],
    stopped: [
      'context',
      'context',
      'context',
      'analysis',
      'analysis',
      'publishing',
      'publishing',
      'publishing',
    ],
  },
  {
    name: 'build-first summary-only cache miss',
    diff: ['vcs.fetch_diff', { summary_only: true }],
    steps: [
      'context.build',
      'llm.call',
      'llm.repo_conventions',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
      'github.publish_review',
    ],
    running: ['context', 'context', 'analysis', 'analysis', 'analysis', 'analysis', 'analysis'],
    stopped: [
      'context',
      'context',
      'analysis',
      'analysis',
      'publishing',
      'publishing',
      'publishing',
    ],
  },
] as const

const runningStates = {
  context: ['process', 'wait', 'wait'],
  analysis: ['finish', 'process', 'wait'],
}
const failedStates = {
  context: ['error', 'wait', 'wait'],
  analysis: ['finish', 'error', 'wait'],
  publishing: ['finish', 'finish', 'error'],
}
const cancelledStates = {
  context: ['stopped', 'wait', 'wait'],
  analysis: ['finish', 'stopped', 'wait'],
  publishing: ['finish', 'finish', 'stopped'],
}

function orderSteps(order: (typeof ORDERS)[number], fetch = true): Step[] {
  return ['policy.load', ...(fetch ? [order.diff] : []), ...order.steps]
}

const HAPPY_PATH = build(
  'policy.load',
  'vcs.fetch_diff',
  'context.build',
  'llm.call',
  'llm.repo_conventions',
  'context.build',
  'llm.call',
  'llm.call',
  'llm.review_output',
  'review.postprocess',
  'github.publish_review',
)

describe('runProgress stages', () => {
  it('lists the three stages in order with the Russian labels', () => {
    const progress = runProgress({ attempt: 1, status: 'queued', errorCode: null }, [])
    expect(progress?.map((stage) => [stage.key, stage.label])).toEqual([
      ['context', 'Сбор контекста'],
      ['analysis', 'Анализ LLM'],
      ['publishing', 'Публикация'],
    ])
  })
})

describe('runProgress by status', () => {
  it.each<[RunStatus, string[] | null, string[] | null]>([
    // status, expected with an empty action list, expected with the full happy path
    ['queued', ['wait', 'wait', 'wait'], ['wait', 'wait', 'wait']],
    ['running', ['process', 'wait', 'wait'], ['finish', 'process', 'wait']],
    ['publishing', ['finish', 'finish', 'process'], ['finish', 'finish', 'process']],
    ['succeeded', ['finish', 'finish', 'finish'], ['finish', 'finish', 'finish']],
    ['failed', ['error', 'wait', 'wait'], ['finish', 'finish', 'error']],
    ['cancelled', ['stopped', 'wait', 'wait'], ['finish', 'finish', 'stopped']],
    ['skipped', null, null],
  ])('%s', (status, empty, happy) => {
    expect(states(status, [])).toEqual(empty)
    expect(states(status, HAPPY_PATH)).toEqual(happy)
  })

  it('returns null for skipped regardless of errorCode', () => {
    expect(
      runProgress({ attempt: 1, status: 'skipped', errorCode: 'draft_pr' }, HAPPY_PATH),
    ).toBeNull()
  })
})

describe('runProgress while running', () => {
  it('stays on context until context.build succeeds', () => {
    expect(states('running', build('vcs.fetch_diff'))).toEqual(['process', 'wait', 'wait'])
  })

  it('does not count the conventions llm.call (cache miss) as context done', () => {
    expect(states('running', build('vcs.fetch_diff', 'llm.call', 'llm.repo_conventions'))).toEqual([
      'process',
      'wait',
      'wait',
    ])
  })

  it('does not count the conventions llm.call as context done before llm.repo_conventions lands', () => {
    expect(states('running', build('vcs.fetch_diff', 'llm.call'))).toEqual([
      'process',
      'wait',
      'wait',
    ])
  })

  it('moves to analysis once context.build is recorded', () => {
    expect(
      states(
        'running',
        build('vcs.fetch_diff', 'llm.call', 'llm.repo_conventions', 'context.build'),
      ),
    ).toEqual(['finish', 'process', 'wait'])
  })

  it('stays on analysis through the review llm.call rows', () => {
    expect(
      states(
        'running',
        build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', 'llm.call', 'llm.call'),
      ),
    ).toEqual(['finish', 'process', 'wait'])
  })

  it('does not treat a context.build error as context done', () => {
    expect(
      states(
        'running',
        build('vcs.fetch_diff', 'llm.repo_conventions', ['context.build', FAILURE]),
      ),
    ).toEqual(['process', 'wait', 'wait'])
  })

  it('treats a null response as success, not as an error', () => {
    expect(states('running', build(['context.build', null]))).toEqual(['finish', 'process', 'wait'])
  })

  it('treats a response without an error key as success', () => {
    expect(states('running', build(['context.build', { files: 3 }]))).toEqual([
      'finish',
      'process',
      'wait',
    ])
    expect(states('running', build(['context.build', 'error']))).toEqual([
      'finish',
      'process',
      'wait',
    ])
  })
})

describe('runProgress with modern single-attempt orders', () => {
  it.each(ORDERS)('keeps every $name prefix on its literal phase', (order) => {
    const actions = build(...orderSteps(order))
    const running = ['context', 'context', 'context', ...order.running] as const
    const stopped = ['context', 'context', 'context', ...order.stopped] as const
    for (let cut = 0; cut <= actions.length; cut += 1) {
      const prefix = actions.slice(0, cut)
      const runningPhase = running[cut]
      const stoppedPhase = stopped[cut]
      if (runningPhase === undefined || stoppedPhase === undefined)
        throw new Error('Missing literal phase')
      expect(states('running', prefix), `${order.name}/${String(cut)}`).toEqual(
        runningStates[runningPhase],
      )
      expect(states('failed', prefix), `${order.name}/${String(cut)}`).toEqual(
        failedStates[stoppedPhase],
      )
      expect(
        states('cancelled', prefix, 'cancelled_by_user'),
        `${order.name}/${String(cut)}`,
      ).toEqual(cancelledStates[stoppedPhase])
    }
  })

  it.each(ORDERS)('places each failed $name step and its error on the actual phase', (order) => {
    const steps = orderSteps(order)
    const failedPhases = ['context', 'context', ...order.stopped] as const
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index]
      const tool = typeof step === 'string' ? step : step?.[0]
      if (tool === undefined) throw new Error('Missing step')
      // A failed build or conventions row never finishes context, whatever its position.
      const phase =
        tool === 'context.build' || tool === 'llm.repo_conventions'
          ? 'context'
          : failedPhases[index]
      if (phase === undefined) throw new Error('Missing literal phase')
      const progress = runProgress(
        { attempt: 1, status: 'failed', errorCode: 'step_failed' },
        build(...steps.slice(0, index), [tool, FAILURE]),
      )
      expect(
        progress?.map((stage) => stage.state),
        `${order.name}/${tool}`,
      ).toEqual(failedStates[phase])
      expect(
        progress?.filter((stage) => stage.errorCode !== null).map((stage) => stage.key),
      ).toEqual([phase])
    }
  })

  it.each(['failed', 'cancelled'] as const)(
    '%s after successful prompt context hands off before the first saved review call',
    (status) => {
      expect(
        states(
          status,
          build('policy.load', 'context.build', 'llm.repo_conventions', 'context.build'),
        ),
      ).toEqual(['finish', status === 'failed' ? 'error' : 'stopped', 'wait'])
    },
  )

  it('continues after a soft first-build failure and locates a later review failure on analysis', () => {
    const actions = build(
      'policy.load',
      'vcs.fetch_diff',
      ['context.build', FAILURE],
      'llm.call',
      'llm.repo_conventions',
      'context.build',
      ['llm.call', FAILURE],
    )
    expect(states('running', actions.slice(0, 3))).toEqual(['process', 'wait', 'wait'])
    expect(states('running', actions.slice(0, 6))).toEqual(['finish', 'process', 'wait'])
    expect(states('failed', actions, 'llm_timeout')).toEqual(['finish', 'error', 'wait'])
  })
})

// api#168 part 6 (#130 F3) stops writing the prompt read's `context.build` after
// `llm.repo_conventions`; the context stage's build before conventions stays (ui#197).
describe('runProgress with one context.build per attempt', () => {
  const ONE_BUILD = build(
    'policy.load',
    'vcs.fetch_diff',
    'context.build',
    'llm.call',
    'llm.repo_conventions',
    'llm.call',
  )
  const TWO_BUILDS = build(
    'policy.load',
    'vcs.fetch_diff',
    'context.build',
    'llm.call',
    'llm.repo_conventions',
    'context.build',
    'llm.call',
  )

  it('finishes context at llm.repo_conventions while running', () => {
    expect(states('running', ONE_BUILD.slice(0, 4))).toEqual(['process', 'wait', 'wait'])
    expect(states('running', ONE_BUILD.slice(0, 5))).toEqual(['finish', 'process', 'wait'])
    expect(states('running', ONE_BUILD)).toEqual(['finish', 'process', 'wait'])
  })

  it.each([
    ['after the review call', ONE_BUILD],
    [
      'with a failed review call',
      build('policy.load', 'vcs.fetch_diff', 'context.build', 'llm.call', 'llm.repo_conventions', [
        'llm.call',
        FAILURE,
      ]),
    ],
    // The `llm.call` row lands when the call returns, so conventions can be the last saved row.
    ['during the review call', ONE_BUILD.slice(0, 5)],
  ])('puts a failure %s and its errorCode on analysis', (_, actions) => {
    const progress = runProgress(
      { attempt: 1, status: 'failed', errorCode: 'llm_timeout' },
      actions,
    )
    expect(progress?.map((stage) => stage.state)).toEqual(['finish', 'error', 'wait'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, 'llm_timeout', null])
  })

  it('stops a cancellation after conventions on analysis', () => {
    expect(states('cancelled', ONE_BUILD.slice(0, 5), 'cancelled_by_user')).toEqual([
      'finish',
      'stopped',
      'wait',
    ])
    expect(states('cancelled', ONE_BUILD, 'cancelled_by_user')).toEqual([
      'finish',
      'stopped',
      'wait',
    ])
  })

  it.each([
    ['a failed context.build', build('policy.load', 'vcs.fetch_diff', ['context.build', FAILURE])],
    [
      'no llm.repo_conventions',
      build('policy.load', 'vcs.fetch_diff', 'context.build', 'llm.call'),
    ],
    [
      'a failed llm.repo_conventions',
      build('policy.load', 'vcs.fetch_diff', 'context.build', 'llm.call', [
        'llm.repo_conventions',
        FAILURE,
      ]),
    ],
  ])('keeps a run with %s on context', (_, actions) => {
    expect(states('running', actions)).toEqual(['process', 'wait', 'wait'])
    const progress = runProgress(
      { attempt: 1, status: 'failed', errorCode: 'context_failed' },
      actions,
    )
    expect(progress?.map((stage) => stage.state)).toEqual(['error', 'wait', 'wait'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual(['context_failed', null, null])
    expect(states('cancelled', actions)).toEqual(['stopped', 'wait', 'wait'])
  })

  // A failed stage build is recorded as `{error}` and the review goes on (PIPELINE_SPEC §2); with
  // no prompt build after it, conventions alone must move the bar on.
  it('moves past a failed stage build once llm.repo_conventions succeeds', () => {
    const softFailure = build(
      'policy.load',
      'vcs.fetch_diff',
      ['context.build', FAILURE],
      'llm.call',
      'llm.repo_conventions',
      'llm.call',
    )
    expect(states('running', softFailure.slice(0, 4))).toEqual(['process', 'wait', 'wait'])
    expect(states('running', softFailure.slice(0, 5))).toEqual(['finish', 'process', 'wait'])
    expect(states('running', softFailure)).toEqual(['finish', 'process', 'wait'])
    const progress = runProgress(
      { attempt: 1, status: 'failed', errorCode: 'llm_timeout' },
      build(
        'policy.load',
        'vcs.fetch_diff',
        ['context.build', FAILURE],
        'llm.call',
        'llm.repo_conventions',
        ['llm.call', FAILURE],
      ),
    )
    expect(progress?.map((stage) => stage.state)).toEqual(['finish', 'error', 'wait'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, 'llm_timeout', null])
  })

  it('does not finish context from the conventions of an earlier attempt', () => {
    const actions = build(
      'policy.load',
      'vcs.fetch_diff',
      'context.build',
      'llm.repo_conventions',
      ['llm.call', FAILURE],
      'policy.load',
      'context.build',
    )
    expect(states('running', actions, null, 2)).toEqual(['process', 'wait', 'wait'])
    expect(states('failed', actions, 'llm_timeout', 2)).toEqual(['error', 'wait', 'wait'])
    expect(states('cancelled', actions, 'cancelled_by_user', 2)).toEqual([
      'stopped',
      'wait',
      'wait',
    ])
  })

  it.each<[RunStatus, string[] | null]>([
    ['queued', ['wait', 'wait', 'wait']],
    ['running', ['finish', 'process', 'wait']],
    ['publishing', ['finish', 'finish', 'process']],
    ['succeeded', ['finish', 'finish', 'finish']],
    ['failed', ['finish', 'error', 'wait']],
    ['cancelled', ['finish', 'stopped', 'wait']],
    ['skipped', null],
  ])('keeps a two-build log from before the change as it was for %s', (status, expected) => {
    expect(states(status, TWO_BUILDS)).toEqual(expected)
  })

  it('keeps a failed prompt build of a two-build log on context', () => {
    const actions = build(
      'policy.load',
      'vcs.fetch_diff',
      'context.build',
      'llm.repo_conventions',
      ['context.build', FAILURE],
    )
    expect(states('running', actions)).toEqual(['process', 'wait', 'wait'])
    expect(states('failed', actions, 'context_failed')).toEqual(['error', 'wait', 'wait'])
    expect(states('cancelled', actions)).toEqual(['stopped', 'wait', 'wait'])
  })

  it('keeps the build handoff of a log without policy.load', () => {
    const conventionsOnly = build('vcs.fetch_diff', 'llm.call', 'llm.repo_conventions')
    expect(states('running', conventionsOnly)).toEqual(['process', 'wait', 'wait'])
    expect(states('failed', conventionsOnly, 'x')).toEqual(['error', 'wait', 'wait'])
    expect(states('cancelled', conventionsOnly)).toEqual(['stopped', 'wait', 'wait'])
    const buildOnly = build('vcs.fetch_diff', 'context.build')
    expect(states('running', buildOnly)).toEqual(['finish', 'process', 'wait'])
    expect(states('failed', buildOnly, 'x')).toEqual(['finish', 'error', 'wait'])
    expect(states('cancelled', buildOnly)).toEqual(['finish', 'stopped', 'wait'])
  })
})

describe('runProgress with policy-marked retries', () => {
  it.each(['running', 'failed', 'cancelled'] as const)(
    '%s starts a newly claimed attempt in context before its first saved row',
    (status) => {
      const actions = build(
        'policy.load',
        'llm.repo_conventions',
        'context.build',
        'llm.call',
        'llm.review_output',
        'github.publish_review',
      )
      expect(states(status, actions, null, 2)).toEqual([
        status === 'running' ? 'process' : status === 'failed' ? 'error' : 'stopped',
        'wait',
        'wait',
      ])
    },
  )

  it.each(['llm.call', 'github.publish_review'])(
    'records a real policy failure after previous %s on context',
    (tail) => {
      const actions = build('policy.load', 'llm.repo_conventions', 'context.build', tail, [
        'policy.load',
        { error: { type: 'PolicyRateLimited', message: 'policy fetch limited' } },
      ])
      expect(states('failed', actions, 'policy_rate_limited', 2)).toEqual(['error', 'wait', 'wait'])
    },
  )

  it.each(['running', 'failed', 'cancelled'] as const)(
    '%s recovers a latest segment after a historical missing policy row using the current LLM attempt',
    (status) => {
      const actions = build('policy.load', 'llm.repo_conventions', 'context.build', 'llm.call').map(
        (action) => ({
          ...action,
          request: action.tool === 'llm.call' ? { attempt: 2, kind: 'primary' } : {},
        }),
      )
      expect(states(status, actions, null, 2)).toEqual([
        'finish',
        status === 'running' ? 'process' : status === 'failed' ? 'error' : 'stopped',
        'wait',
      ])
    },
  )

  it.each([
    { name: 'missing', request: {} },
    { name: 'stale', request: { attempt: 1 } },
    { name: 'string', request: { attempt: '2' } },
    { name: 'fractional', request: { attempt: 2.5 } },
    { name: 'negative', request: { attempt: -2 } },
    { name: 'zero', request: { attempt: 0 } },
    { name: 'null', request: { attempt: null } },
    { name: 'future', request: { attempt: 3 } },
    { name: 'unrelated try', request: { try: 2 } },
  ])('does not let $name call metadata expose a stale completed segment', ({ request }) => {
    const actions = build(
      'policy.load',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
    ).map((action) => ({
      ...action,
      request: action.tool === 'llm.call' ? request : {},
    }))
    expect(states('running', actions, null, 2)).toEqual(['process', 'wait', 'wait'])
    expect(states('failed', actions, 'retry_failed', 2)).toEqual(['error', 'wait', 'wait'])
    expect(states('cancelled', actions, 'cancelled_by_user', 2)).toEqual([
      'stopped',
      'wait',
      'wait',
    ])
  })

  it.each(['context.build', 'llm.repo_conventions', 'constructor', 'foo.bar'])(
    'does not corroborate the current attempt from %s request metadata',
    (tool) => {
      const actions = build(
        'policy.load',
        'llm.repo_conventions',
        'context.build',
        'llm.call',
        'llm.review_output',
        tool,
      ).map((action) => ({
        ...action,
        request: action.tool === tool ? { attempt: 2 } : {},
      }))
      expect(states('failed', actions, 'retry_failed', 2)).toEqual(['error', 'wait', 'wait'])
    },
  )

  it('does not borrow a matching call before the latest policy boundary', () => {
    const actions = build(
      'policy.load',
      'llm.call',
      'policy.load',
      'llm.repo_conventions',
      'context.build',
      'llm.review_output',
    ).map((action) => ({
      ...action,
      request: action.tool === 'llm.call' ? { attempt: 3 } : {},
    }))
    expect(states('failed', actions, 'retry_failed', 3)).toEqual(['error', 'wait', 'wait'])
  })

  it('delays a call-free cache-hit segment after a missing policy row until corroboration', () => {
    const actions = build('policy.load', 'llm.repo_conventions', 'context.build')
    expect(states('running', actions, null, 2)).toEqual(['process', 'wait', 'wait'])
    const withCall = build('policy.load', 'llm.repo_conventions', 'context.build', 'llm.call').map(
      (action) => ({
        ...action,
        request: action.tool === 'llm.call' ? { attempt: 2 } : {},
      }),
    )
    expect(states('running', withCall, null, 2)).toEqual(['finish', 'process', 'wait'])
  })

  it.each(ORDERS)('isolates every retry prefix after every $name prefix', (first) => {
    const firstTools = orderSteps(first)
    for (let cut = 1; cut <= firstTools.length; cut += 1) {
      for (const next of ORDERS) {
        for (const fetch of [false, true]) {
          const tools = orderSteps(next, fetch)
          const running = [
            'context',
            ...(fetch ? (['context'] as const) : []),
            ...next.running,
          ] as const
          const stopped = [
            'context',
            ...(fetch ? (['context'] as const) : []),
            ...next.stopped,
          ] as const
          for (let nextCut = 0; nextCut <= tools.length; nextCut += 1) {
            const actions = build(...firstTools.slice(0, cut), ...tools.slice(0, nextCut))
            const message = `${first.name}/${String(cut)} -> ${next.name}/${String(nextCut)}, fetch=${String(fetch)}`
            const runningStage = nextCut === 0 ? 'context' : running[nextCut - 1]
            const stoppedStage = nextCut === 0 ? 'context' : stopped[nextCut - 1]
            if (runningStage === undefined || stoppedStage === undefined) {
              throw new Error('Missing literal phase expectation')
            }
            expect(states('running', actions, null, 2), message).toEqual(
              runningStates[runningStage],
            )
            expect(states('failed', actions, 'retry_failed', 2), message).toEqual(
              failedStates[stoppedStage],
            )
            expect(states('cancelled', actions, 'cancelled_by_user', 2), message).toEqual(
              cancelledStates[stoppedStage],
            )
          }
        }
      }
    }
  })

  it('keeps a third cache-miss attempt in context without inheriting earlier prompt builds', () => {
    const actions = build(
      'policy.load',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'policy.load',
      'context.build',
      'llm.call',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
      'github.publish_review',
      'policy.load',
      'context.build',
      ['llm.call', FAILURE],
    )
    expect(states('running', actions)).toEqual(['process', 'wait', 'wait'])
    expect(states('failed', actions, 'llm_timeout')).toEqual(['error', 'wait', 'wait'])
    expect(states('cancelled', actions)).toEqual(['stopped', 'wait', 'wait'])
  })

  it('sorts policy boundaries by index without mutating the supplied log', () => {
    const shuffled = build(
      'policy.load',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'policy.load',
      'context.build',
      'llm.call',
    ).reverse()
    expect(states('running', shuffled, null, 2)).toEqual(['process', 'wait', 'wait'])
    expect(states('failed', shuffled, 'llm_timeout', 2)).toEqual(['error', 'wait', 'wait'])
    expect(shuffled.map((action) => action.index)).toEqual([6, 5, 4, 3, 2, 1, 0])
  })

  it('restarts context at policy.load even when the previous attempt ended in context tools', () => {
    const actions = build('policy.load', 'llm.repo_conventions', 'context.build', 'policy.load')
    expect(states('running', actions)).toEqual(['process', 'wait', 'wait'])
    expect(states('failed', actions, 'interrupted')).toEqual(['error', 'wait', 'wait'])
  })
})

describe('runProgress historical compatibility', () => {
  const legacy = build(
    'vcs.fetch_diff',
    'llm.call',
    'llm.repo_conventions',
    'context.build',
    'llm.call',
    'llm.review_output',
    'review.postprocess',
    'github.publish_review',
  )

  it.each<[RunStatus, string[] | null]>([
    ['queued', ['wait', 'wait', 'wait']],
    ['running', ['finish', 'process', 'wait']],
    ['publishing', ['finish', 'finish', 'process']],
    ['succeeded', ['finish', 'finish', 'finish']],
    ['failed', ['finish', 'finish', 'error']],
    ['cancelled', ['finish', 'finish', 'stopped']],
    ['skipped', null],
  ])('retains the full no-policy legacy path for %s despite attempt number', (status, expected) => {
    expect(states(status, legacy, null, 3)).toEqual(expected)
  })

  it('keeps the legacy build-only review handoff', () => {
    expect(
      states('failed', build('context.build', ['llm.call', FAILURE]), 'llm_timeout', 3),
    ).toEqual(['finish', 'error', 'wait'])
  })
})

describe('runProgress across retries', () => {
  it('after a context error: back to context, then done again with a good context.build', () => {
    const afterError = build(
      'vcs.fetch_diff',
      'llm.repo_conventions',
      ['context.build', FAILURE],
      'llm.repo_conventions',
    )
    expect(states('running', afterError)).toEqual(['process', 'wait', 'wait'])
    const recovered = build(
      'vcs.fetch_diff',
      'llm.repo_conventions',
      ['context.build', FAILURE],
      'llm.repo_conventions',
      'context.build',
    )
    expect(states('running', recovered)).toEqual(['finish', 'process', 'wait'])
  })

  it('after an analysis error: the old attempt stages are not shown as done', () => {
    const retried = build(
      'vcs.fetch_diff',
      'llm.repo_conventions',
      'context.build',
      ['llm.call', FAILURE],
      'llm.repo_conventions',
    )
    expect(states('running', retried)).toEqual(['process', 'wait', 'wait'])
    expect(states('running', retried.slice(0, 4))).toEqual(['finish', 'process', 'wait'])
  })

  it('after an analysis error: the new attempt reaching context.build moves on again', () => {
    const retried = build(
      'vcs.fetch_diff',
      'llm.repo_conventions',
      'context.build',
      ['llm.call', FAILURE],
      'llm.repo_conventions',
      'context.build',
    )
    expect(states('running', retried)).toEqual(['finish', 'process', 'wait'])
  })

  it('a retry without vcs.fetch_diff (snapshot existed) behaves the same', () => {
    const first = build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', [
      'llm.call',
      FAILURE,
    ])
    const withoutFetch = (...tools: string[]): RunAction[] => [
      ...first,
      ...build(...tools).map((a, i) => ({ ...a, index: first.length + i })),
    ]
    expect(states('running', withoutFetch('llm.repo_conventions'))).toEqual([
      'process',
      'wait',
      'wait',
    ])
    expect(states('running', withoutFetch('llm.repo_conventions', 'context.build'))).toEqual([
      'finish',
      'process',
      'wait',
    ])
  })

  it('after a publish error: a new attempt does not inherit reached-publishing', () => {
    const retried = build(
      'vcs.fetch_diff',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
      ['github.publish_review', FAILURE],
      'llm.repo_conventions',
    )
    expect(states('running', retried)).toEqual(['process', 'wait', 'wait'])
    expect(states('failed', retried, 'llm_timeout')).toEqual(['error', 'wait', 'wait'])
  })

  it('reads actions by index, not by array position', () => {
    const ordered = build(
      'vcs.fetch_diff',
      'llm.repo_conventions',
      'context.build',
      ['llm.call', FAILURE],
      'llm.repo_conventions',
    )
    const shuffled = [ordered[4], ordered[1], ordered[3], ordered[0], ordered[2]].filter(
      (a): a is RunAction => a !== undefined,
    )
    expect(states('running', shuffled)).toEqual(states('running', ordered))
    expect(states('running', shuffled)).toEqual(['process', 'wait', 'wait'])
  })
})

// The api runs the conventions step on every claim and writes exactly one `llm.repo_conventions`
// row per call (process_run.py `prepare()`, conventions_unit_of_work.py), so a second one in the
// same list is a new attempt even when no stage went backwards.
describe('runProgress with a repeated llm.repo_conventions', () => {
  const lostLease = (...rest: Step[]): RunAction[] =>
    build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', ...rest)

  it('failed in the new attempt context: error on context, not on analysis', () => {
    const actions = lostLease('llm.repo_conventions', ['context.build', FAILURE])
    const progress = runProgress(
      { attempt: 1, status: 'failed', errorCode: 'context_failed' },
      actions,
    )
    expect(progress?.map((stage) => stage.state)).toEqual(['error', 'wait', 'wait'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual(['context_failed', null, null])
  })

  it('cancelled right after the new attempt started: stopped on context', () => {
    const progress = runProgress(
      { attempt: 1, status: 'cancelled', errorCode: 'cancelled_by_user' },
      lostLease('llm.repo_conventions'),
    )
    expect(progress?.map((stage) => stage.state)).toEqual(['stopped', 'wait', 'wait'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual(['cancelled_by_user', null, null])
  })

  it('running right after the new attempt started: working on context', () => {
    expect(states('running', lostLease('llm.repo_conventions'))).toEqual([
      'process',
      'wait',
      'wait',
    ])
  })

  it('running once the new attempt built its context: on to analysis', () => {
    expect(states('running', lostLease('llm.repo_conventions', 'context.build'))).toEqual([
      'finish',
      'process',
      'wait',
    ])
  })

  it('failed after the new attempt got to analysis: error on analysis', () => {
    const actions = lostLease('llm.repo_conventions', 'context.build', ['llm.call', FAILURE])
    expect(states('failed', actions, 'llm_timeout')).toEqual(['finish', 'error', 'wait'])
  })

  it('a third attempt cuts again', () => {
    const actions = lostLease('llm.repo_conventions', 'context.build', 'llm.repo_conventions')
    expect(states('running', actions)).toEqual(['process', 'wait', 'wait'])
  })

  it('keeps the cache-miss order of one attempt as one attempt', () => {
    const actions = build('vcs.fetch_diff', 'llm.call', 'llm.repo_conventions', 'context.build')
    expect(states('running', actions)).toEqual(['finish', 'process', 'wait'])
  })
})

describe('runProgress with summary-only runs', () => {
  const summaryOnly = build('vcs.fetch_diff', 'llm.review_output', 'review.postprocess')

  it('shows publishing while publishing', () => {
    expect(states('publishing', summaryOnly)).toEqual(['finish', 'finish', 'process'])
  })

  it('shows all done when succeeded', () => {
    expect(states('succeeded', [...summaryOnly, ...build('github.publish_review')])).toEqual([
      'finish',
      'finish',
      'finish',
    ])
    expect(states('succeeded', summaryOnly)).toEqual(['finish', 'finish', 'finish'])
  })
})

describe('runProgress ignores unknown tools', () => {
  it.each(['foo.bar', 'constructor', 'toString', '__proto__'])(
    'ignores %s inside the latest policy segment at every phase',
    (unknown) => {
      for (const order of ORDERS) {
        const steps = orderSteps(order)
        for (let cut = 1; cut <= steps.length; cut += 1) {
          const prefix = steps.slice(0, cut)
          const runningPhase = (['context', 'context', ...order.running] as const)[cut - 1]
          const stoppedPhase = (['context', 'context', ...order.stopped] as const)[cut - 1]
          if (runningPhase === undefined || stoppedPhase === undefined) {
            throw new Error('Missing literal phase')
          }
          for (let position = 0; position <= prefix.length; position += 1) {
            const injected = build(...prefix.slice(0, position), unknown, ...prefix.slice(position))
            expect(states('running', injected)).toEqual(runningStates[runningPhase])
            expect(states('failed', injected)).toEqual(failedStates[stoppedPhase])
            expect(states('cancelled', injected)).toEqual(cancelledStates[stoppedPhase])
          }
        }
      }
    },
  )

  // A retry after an analysis error: the unknown tool must not hide the stage regression.
  const base: Step[] = [
    'vcs.fetch_diff',
    'llm.repo_conventions',
    'context.build',
    'llm.call',
    ['llm.call', FAILURE],
    'llm.repo_conventions',
  ]

  it('an unknown tool anywhere in the list changes nothing', () => {
    const plain = build(...base)
    expect(states('running', plain)).toEqual(['process', 'wait', 'wait'])
    for (let position = 0; position <= base.length; position += 1) {
      const withUnknown = build(...base.slice(0, position), 'foo.bar', ...base.slice(position))
      for (const status of ['queued', 'running', 'publishing', 'succeeded', 'failed'] as const) {
        expect(states(status, withUnknown, 'x')).toEqual(states(status, plain, 'x'))
      }
    }
  })

  it('an unknown tool does not split an attempt', () => {
    // fetch_diff (context) -> foo.bar -> context.build: still one attempt, context done.
    expect(states('running', build('vcs.fetch_diff', 'foo.bar', 'context.build'))).toEqual([
      'finish',
      'process',
      'wait',
    ])
    // llm.call -> foo.bar -> llm.call: analysis rows stay one segment around the unknown tool.
    expect(states('running', build('context.build', 'llm.call', 'foo.bar', 'llm.call'))).toEqual([
      'finish',
      'process',
      'wait',
    ])
  })

  it('a known-tool-looking name from the Object prototype is unknown', () => {
    expect(states('running', build('constructor', 'toString', '__proto__'))).toEqual([
      'process',
      'wait',
      'wait',
    ])
  })

  it('an unknown-only list behaves like an empty list', () => {
    expect(states('running', build('foo.bar'))).toEqual(states('running', []))
    expect(states('failed', build('foo.bar'))).toEqual(states('failed', []))
  })
})

describe('runProgress tool-to-stage map', () => {
  // The stage of a tool is observable through attempt splitting: a tool of a lower stage than the
  // previous known tool starts a new attempt and drops the earlier, successful context.build
  // (-> process/wait/wait). A tool of the same or a higher stage keeps it (-> finish/process/wait).
  // The tool's own response is an error, so a context.build under test never marks context done.
  it.each<[tool: string, afterPublishRow: string[], afterLlmCall: string[]]>([
    ['policy.load', ['process', 'wait', 'wait'], ['process', 'wait', 'wait']],
    ['vcs.fetch_diff', ['process', 'wait', 'wait'], ['process', 'wait', 'wait']],
    ['context.build', ['process', 'wait', 'wait'], ['process', 'wait', 'wait']],
    ['llm.repo_conventions', ['process', 'wait', 'wait'], ['process', 'wait', 'wait']],
    ['llm.call', ['process', 'wait', 'wait'], ['finish', 'process', 'wait']],
    ['llm.review_output', ['process', 'wait', 'wait'], ['finish', 'process', 'wait']],
    ['review.postprocess', ['process', 'wait', 'wait'], ['finish', 'process', 'wait']],
    ['engine.fallback', ['process', 'wait', 'wait'], ['finish', 'process', 'wait']],
    ['github.publish_review', ['finish', 'process', 'wait'], ['finish', 'process', 'wait']],
    ['gitlab.publish_review', ['finish', 'process', 'wait'], ['finish', 'process', 'wait']],
    ['foo.bar', ['finish', 'process', 'wait'], ['finish', 'process', 'wait']],
  ])('%s', (tool, afterPublishRow, afterLlmCall) => {
    expect(
      states('running', build('context.build', 'github.publish_review', [tool, FAILURE])),
    ).toEqual(afterPublishRow)
    expect(states('running', build('context.build', 'llm.call', [tool, FAILURE]))).toEqual(
      afterLlmCall,
    )
  })
})

describe('runProgress on failure and cancellation', () => {
  it('failed with an llm.call error after context.build stops on analysis', () => {
    const actions = build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', [
      'llm.call',
      FAILURE,
    ])
    const progress = runProgress(
      { attempt: 1, status: 'failed', errorCode: 'llm_timeout' },
      actions,
    )
    expect(progress?.map((stage) => stage.state)).toEqual(['finish', 'error', 'wait'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, 'llm_timeout', null])
  })

  it('failed with a github.publish_review error stops on publishing', () => {
    const actions = build(
      'vcs.fetch_diff',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
      ['github.publish_review', FAILURE],
    )
    const progress = runProgress(
      { attempt: 1, status: 'failed', errorCode: 'github_forbidden' },
      actions,
    )
    expect(progress?.map((stage) => stage.state)).toEqual(['finish', 'finish', 'error'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, null, 'github_forbidden'])
  })

  it('failed with no actions stops on context', () => {
    const progress = runProgress({ attempt: 1, status: 'failed', errorCode: 'queue_lost' }, [])
    expect(progress?.map((stage) => stage.state)).toEqual(['error', 'wait', 'wait'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual(['queue_lost', null, null])
  })

  it('failed on the conventions llm.call (before context.build) stops on context', () => {
    const actions = build('vcs.fetch_diff', ['llm.call', FAILURE])
    expect(states('failed', actions, 'llm_timeout')).toEqual(['error', 'wait', 'wait'])
  })

  it('failed with a context.build error stops on context', () => {
    const actions = build('vcs.fetch_diff', 'llm.repo_conventions', ['context.build', FAILURE])
    expect(states('failed', actions, 'context_failed')).toEqual(['error', 'wait', 'wait'])
  })

  it.each(['llm.review_output', 'review.postprocess', 'github.publish_review'])(
    'failed with %s alone (after context.build) stops on publishing',
    (tool) => {
      const actions = build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', tool)
      expect(states('failed', actions, 'publish_failed')).toEqual(['finish', 'finish', 'error'])
    },
  )

  it('failed keeps a null errorCode as null', () => {
    const progress = runProgress({ attempt: 1, status: 'failed', errorCode: null }, [])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, null, null])
  })

  it('cancelled from queued (no actions) stops on context', () => {
    const progress = runProgress({ attempt: 1, status: 'cancelled', errorCode: null }, [])
    expect(progress?.map((stage) => stage.state)).toEqual(['stopped', 'wait', 'wait'])
  })

  it('cancelled while publishing stops on publishing and carries the errorCode', () => {
    const actions = build(
      'vcs.fetch_diff',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
      'llm.review_output',
      'review.postprocess',
    )
    const progress = runProgress(
      { attempt: 1, status: 'cancelled', errorCode: 'cancelled_by_user' },
      actions,
    )
    expect(progress?.map((stage) => stage.state)).toEqual(['finish', 'finish', 'stopped'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, null, 'cancelled_by_user'])
  })

  it('cancelled during analysis stops on analysis', () => {
    const actions = build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', 'llm.call')
    expect(states('cancelled', actions)).toEqual(['finish', 'stopped', 'wait'])
  })

  it('attaches no errorCode to non-failed statuses', () => {
    for (const status of ['queued', 'running', 'publishing', 'succeeded'] as const) {
      const progress = runProgress({ attempt: 1, status, errorCode: 'leftover' }, HAPPY_PATH)
      expect(progress?.map((stage) => stage.errorCode)).toEqual([null, null, null])
    }
  })
})

describe('runProgress purity', () => {
  it('does not mutate the actions array', () => {
    const actions = build('vcs.fetch_diff', 'context.build', 'llm.call')
    const reversed = [...actions].reverse()
    const before = reversed.map((a) => a.index)
    runProgress({ attempt: 1, status: 'running', errorCode: null }, reversed)
    expect(reversed.map((a) => a.index)).toEqual(before)
  })
})

describe('runProgressReadsLog', () => {
  it.each<[RunStatus, boolean]>([
    ['queued', false],
    ['running', true],
    ['publishing', false],
    ['succeeded', false],
    ['failed', true],
    ['cancelled', true],
    ['skipped', false],
  ])('%s: %s', (status, expected) => {
    expect(runProgressReadsLog(status)).toBe(expected)
  })

  // The helper and the model must not drift apart: a status reads the log exactly when some log
  // changes what `runProgress` returns for it.
  it.each<RunStatus>([
    'queued',
    'running',
    'publishing',
    'succeeded',
    'failed',
    'cancelled',
    'skipped',
  ])('agrees with runProgress for %s', (status) => {
    const logs: RunAction[][] = [
      [],
      build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build'),
      build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', ['llm.call', FAILURE]),
      HAPPY_PATH,
    ]
    const outputs = logs.map((log) =>
      JSON.stringify(runProgress({ attempt: 1, status, errorCode: 'x' }, log)),
    )
    expect(new Set(outputs).size > 1).toBe(runProgressReadsLog(status))
  })
})
