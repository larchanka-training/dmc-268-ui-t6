import { describe, expect, it } from 'vitest'

import type { RunAction, RunStatus } from '../model/schemas'
import { runProgress } from './runProgress'

const RUN_ID = '11111111-1111-4111-8111-000000000000'

type Step = string | [tool: string, response: unknown]

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
): string[] | null {
  const progress = runProgress({ status, errorCode }, actions)
  return progress === null ? null : progress.map((stage) => stage.state)
}

const HAPPY_PATH = build(
  'vcs.fetch_diff',
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
    const progress = runProgress({ status: 'queued', errorCode: null }, [])
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
    expect(runProgress({ status: 'skipped', errorCode: 'draft_pr' }, HAPPY_PATH)).toBeNull()
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
    const progress = runProgress({ status: 'failed', errorCode: 'context_failed' }, actions)
    expect(progress?.map((stage) => stage.state)).toEqual(['error', 'wait', 'wait'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual(['context_failed', null, null])
  })

  it('cancelled right after the new attempt started: stopped on context', () => {
    const progress = runProgress(
      { status: 'cancelled', errorCode: 'cancelled_by_user' },
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
    ['vcs.fetch_diff', ['process', 'wait', 'wait'], ['process', 'wait', 'wait']],
    ['context.build', ['process', 'wait', 'wait'], ['process', 'wait', 'wait']],
    ['llm.repo_conventions', ['process', 'wait', 'wait'], ['process', 'wait', 'wait']],
    ['llm.call', ['process', 'wait', 'wait'], ['finish', 'process', 'wait']],
    ['llm.review_output', ['process', 'wait', 'wait'], ['finish', 'process', 'wait']],
    ['review.postprocess', ['process', 'wait', 'wait'], ['finish', 'process', 'wait']],
    ['engine.fallback', ['process', 'wait', 'wait'], ['finish', 'process', 'wait']],
    ['github.publish_review', ['finish', 'process', 'wait'], ['finish', 'process', 'wait']],
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
    const progress = runProgress({ status: 'failed', errorCode: 'llm_timeout' }, actions)
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
    const progress = runProgress({ status: 'failed', errorCode: 'github_forbidden' }, actions)
    expect(progress?.map((stage) => stage.state)).toEqual(['finish', 'finish', 'error'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, null, 'github_forbidden'])
  })

  it('failed with no actions stops on context', () => {
    const progress = runProgress({ status: 'failed', errorCode: 'queue_lost' }, [])
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
    const progress = runProgress({ status: 'failed', errorCode: null }, [])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, null, null])
  })

  it('cancelled from queued (no actions) stops on context', () => {
    const progress = runProgress({ status: 'cancelled', errorCode: null }, [])
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
    const progress = runProgress({ status: 'cancelled', errorCode: 'cancelled_by_user' }, actions)
    expect(progress?.map((stage) => stage.state)).toEqual(['finish', 'finish', 'stopped'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, null, 'cancelled_by_user'])
  })

  it('cancelled during analysis stops on analysis', () => {
    const actions = build('vcs.fetch_diff', 'llm.repo_conventions', 'context.build', 'llm.call')
    expect(states('cancelled', actions)).toEqual(['finish', 'stopped', 'wait'])
  })

  it('attaches no errorCode to non-failed statuses', () => {
    for (const status of ['queued', 'running', 'publishing', 'succeeded'] as const) {
      const progress = runProgress({ status, errorCode: 'leftover' }, HAPPY_PATH)
      expect(progress?.map((stage) => stage.errorCode)).toEqual([null, null, null])
    }
  })
})

describe('runProgress purity', () => {
  it('does not mutate the actions array', () => {
    const actions = build('vcs.fetch_diff', 'context.build', 'llm.call')
    const reversed = [...actions].reverse()
    const before = reversed.map((a) => a.index)
    runProgress({ status: 'running', errorCode: null }, reversed)
    expect(reversed.map((a) => a.index)).toEqual(before)
  })
})
