import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { RunActionSchema, RunDetailSchema, RunSessionSchema, runProgress } from '../../entities/run'
import {
  buildWalkingRunDetail,
  currentWalkingRun,
  FAILED_RUN_ID,
  makeFailedRunActions,
  mockFailedRun,
  resetWalkingRun,
  startWalkingRun,
  WALKING_RUN_ID,
  walkingRunAt,
} from './mockRunTimeline'

// Timeline of the walking run, written out here and not read from the module under test:
// queued until 2 s, then one action every 1.5 s, publishing at 14 s, the publish row at 15.5 s
// and succeeded at 17 s. The default origin is 2026-09-18T12:00:00.000Z.
function tools(elapsedMs: number): string[] {
  return walkingRunAt(elapsedMs).actions.map((action) => action.tool)
}

afterEach(() => {
  resetWalkingRun()
})

describe('ids', () => {
  it('uses the fixture ids from the brief', () => {
    expect(WALKING_RUN_ID).toBe('11111111-1111-4111-8111-000000000011')
    expect(FAILED_RUN_ID).toBe('11111111-1111-4111-8111-000000000012')
  })
})

describe('walkingRunAt status', () => {
  it.each([
    [0, 'queued'],
    [1999, 'queued'],
    [2000, 'running'],
    [3500, 'running'],
    [13_999, 'running'],
    [14_000, 'publishing'],
    [15_500, 'publishing'],
    [16_999, 'publishing'],
    [17_000, 'succeeded'],
    [60_000, 'succeeded'],
  ])('at %i ms the run is %s', (elapsedMs, status) => {
    expect(walkingRunAt(elapsedMs).session.status).toBe(status)
  })

  it('treats a negative elapsed time as the start', () => {
    expect(walkingRunAt(-500).session.status).toBe('queued')
    expect(walkingRunAt(-500).actions).toEqual([])
  })
})

describe('walkingRunAt actions', () => {
  it('matches the production policy, transitional context and conventions order', () => {
    expect(tools(17_000)).toEqual([
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
    ])
    const { session, actions } = walkingRunAt(5000)
    expect(runProgress(session, actions)?.map((stage) => stage.state)).toEqual([
      'process',
      'wait',
      'wait',
    ])
  })

  const expectedTools = [
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
  ]

  it.each<[number, number]>([
    [0, 0],
    [1999, 0],
    [2000, 1],
    [3499, 1],
    [3500, 2],
    [4999, 2],
    [5000, 3],
    [6500, 4],
    [8000, 5],
    [9499, 5],
    [9500, 6],
    [11_000, 7],
    [12_500, 8],
    [13_999, 8],
    [14_000, 10],
    [15_499, 10],
    [15_500, 11],
    [17_000, 11],
  ])(
    'at %i ms the log holds exactly %i actions from the literal production sequence',
    (elapsedMs, count) => {
      expect(tools(elapsedMs)).toEqual(expectedTools.slice(0, count))
    },
  )

  it('indexes the actions from 0 and gives each a unique id', () => {
    const { actions } = walkingRunAt(17_000)
    expect(actions.map((action) => action.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(new Set(actions.map((action) => action.id)).size).toBe(11)
    expect(actions.every((action) => action.runId === WALKING_RUN_ID)).toBe(true)
  })

  it('starts each action at its moment on the timeline', () => {
    const { actions } = walkingRunAt(17_000)
    expect(actions.map((action) => action.startedAt)).toEqual([
      '2026-09-18T12:00:02.000Z',
      '2026-09-18T12:00:03.500Z',
      '2026-09-18T12:00:05.000Z',
      '2026-09-18T12:00:06.500Z',
      '2026-09-18T12:00:08.000Z',
      '2026-09-18T12:00:09.500Z',
      '2026-09-18T12:00:11.000Z',
      '2026-09-18T12:00:12.500Z',
      '2026-09-18T12:00:14.000Z',
      '2026-09-18T12:00:14.000Z',
      '2026-09-18T12:00:15.500Z',
    ])
  })

  it('uses real LLM request metadata without using it to distinguish the call purpose', () => {
    const { actions } = walkingRunAt(17_000)
    expect(
      actions.filter((action) => action.tool === 'llm.call').map((action) => action.request),
    ).toEqual([
      { kind: 'primary', attempt: 1 },
      { kind: 'primary', attempt: 1 },
      { kind: 'primary', attempt: 1 },
    ])
  })

  it('records no failed step on the happy path', () => {
    const { actions } = walkingRunAt(17_000)
    expect(
      actions.some(
        (action) =>
          typeof action.response === 'object' &&
          action.response !== null &&
          'error' in action.response,
      ),
    ).toBe(false)
  })
})

describe('walkingRunAt session', () => {
  it('has no start and no finish while queued', () => {
    const { session } = walkingRunAt(1999)
    expect(session.startedAt).toBeNull()
    expect(session.finishedAt).toBeNull()
    expect(session.actionCount).toBe(0)
  })

  it('starts at 2 s and finishes only when succeeded', () => {
    expect(walkingRunAt(2000).session.startedAt).toBe('2026-09-18T12:00:02.000Z')
    expect(walkingRunAt(2000).session.finishedAt).toBeNull()
    expect(walkingRunAt(16_999).session.finishedAt).toBeNull()
    expect(walkingRunAt(17_000).session.finishedAt).toBe('2026-09-18T12:00:17.000Z')
    expect(walkingRunAt(17_000).session.startedAt).toBe('2026-09-18T12:00:02.000Z')
  })

  it('counts its actions, runs on the first attempt and carries no error', () => {
    for (const elapsedMs of [0, 2000, 6500, 14_000, 15_500, 17_000]) {
      const { session, actions } = walkingRunAt(elapsedMs)
      expect(session.id).toBe(WALKING_RUN_ID)
      expect(session.actionCount).toBe(actions.length)
      expect(session.attempt).toBe(1)
      expect(session.errorCode).toBeNull()
      expect(session.summaryOnly).toBe(false)
    }
  })

  it('shifts the whole timeline to the given origin', () => {
    const origin = Date.parse('2026-10-01T00:00:00.000Z')
    const { session, actions } = walkingRunAt(17_000, origin)
    expect(session.startedAt).toBe('2026-10-01T00:00:02.000Z')
    expect(session.finishedAt).toBe('2026-10-01T00:00:17.000Z')
    expect(session.createdAt).toBe('2026-10-01T00:00:00.000Z')
    expect(actions[0]?.startedAt).toBe('2026-10-01T00:00:02.000Z')
  })

  it('is created by a webhook at the start of the timeline, never after it started', () => {
    for (const elapsedMs of [0, 1999, 2000, 6500, 14_000, 17_000]) {
      const { session } = walkingRunAt(elapsedMs)
      expect(session.trigger).toBe('webhook')
      expect(session.createdAt).toBe('2026-09-18T12:00:00.000Z')
      if (session.startedAt !== null) {
        expect(Date.parse(session.createdAt)).toBeLessThanOrEqual(Date.parse(session.startedAt))
      }
    }
  })

  it('validates against the contract at every moment, and the log only grows', () => {
    let previous: string[] = []
    for (let elapsedMs = 0; elapsedMs <= 19_000; elapsedMs += 250) {
      const { session, actions } = walkingRunAt(elapsedMs)
      expect(RunSessionSchema.safeParse(session).success).toBe(true)
      expect(z.array(RunActionSchema).safeParse(actions).success).toBe(true)
      const ids = actions.map((action) => action.id)
      expect(ids.slice(0, previous.length)).toEqual(previous)
      previous = ids
    }
  })
})

describe('walkingRunAt on the progress bar', () => {
  it.each<[number, string[]]>([
    [0, ['wait', 'wait', 'wait']],
    [2000, ['process', 'wait', 'wait']],
    [3500, ['process', 'wait', 'wait']],
    [5000, ['process', 'wait', 'wait']],
    [6500, ['process', 'wait', 'wait']],
    [8000, ['process', 'wait', 'wait']],
    [9499, ['process', 'wait', 'wait']],
    [9500, ['finish', 'process', 'wait']],
    [11_000, ['finish', 'process', 'wait']],
    [12_500, ['finish', 'process', 'wait']],
    [14_000, ['finish', 'finish', 'process']],
    [15_500, ['finish', 'finish', 'process']],
    [17_000, ['finish', 'finish', 'finish']],
  ])('at %i ms the bar is %j', (elapsedMs, expected) => {
    const { session, actions } = walkingRunAt(elapsedMs)
    expect(runProgress(session, actions)?.map((stage) => stage.state)).toEqual(expected)
  })
})

describe('buildWalkingRunDetail', () => {
  it('has no findings until the run has succeeded', () => {
    for (const elapsedMs of [0, 2000, 14_000, 15_500]) {
      const detail = buildWalkingRunDetail(walkingRunAt(elapsedMs).session)
      expect(RunDetailSchema.safeParse(detail).success).toBe(true)
      expect(detail.id).toBe(WALKING_RUN_ID)
      expect(detail.findings).toEqual([])
      expect(detail.verdict).toBeNull()
    }
  })

  it('carries the demo findings once succeeded', () => {
    const detail = buildWalkingRunDetail(walkingRunAt(17_000).session)
    expect(RunDetailSchema.safeParse(detail).success).toBe(true)
    expect(detail.id).toBe(WALKING_RUN_ID)
    expect(detail.status).toBe('succeeded')
    expect(detail.findings).toHaveLength(8)
    expect(detail.verdict).toBe('blocking')
  })
})

describe('the walking clock', () => {
  it('shows a queued run until it is started', () => {
    expect(currentWalkingRun(1_000_000).session.status).toBe('queued')
    expect(currentWalkingRun(1_000_000).actions).toEqual([])
  })

  it('counts from the first start and ignores a second one', () => {
    startWalkingRun(10_000)
    startWalkingRun(50_000)
    expect(currentWalkingRun(11_999).session.status).toBe('queued')
    expect(currentWalkingRun(12_000).session.status).toBe('running')
    expect(currentWalkingRun(12_000).actions).toHaveLength(1)
    expect(currentWalkingRun(24_000).session.status).toBe('publishing')
    expect(currentWalkingRun(24_000).actions).toHaveLength(10)
    expect(currentWalkingRun(1_000_000).session.status).toBe('succeeded')
  })

  it('anchors the timestamps at the moment of the start', () => {
    startWalkingRun(Date.parse('2026-10-01T00:00:00.000Z'))
    const { session } = currentWalkingRun(Date.parse('2026-10-01T00:00:02.000Z'))
    expect(session.startedAt).toBe('2026-10-01T00:00:02.000Z')
  })

  it('starts over after a reset', () => {
    startWalkingRun(0)
    expect(currentWalkingRun(20_000).session.status).toBe('succeeded')
    resetWalkingRun()
    expect(currentWalkingRun(20_000).session.status).toBe('queued')
  })
})

describe('the static failed run', () => {
  it('is a failed run with the llm_timeout code', () => {
    expect(RunSessionSchema.safeParse(mockFailedRun).success).toBe(true)
    expect(mockFailedRun.id).toBe(FAILED_RUN_ID)
    expect(mockFailedRun.status).toBe('failed')
    expect(mockFailedRun.errorCode).toBe('llm_timeout')
    expect(mockFailedRun.finishedAt).not.toBeNull()
    expect(mockFailedRun.attempt).toBe(1)
    expect(mockFailedRun.actionCount).toBe(6)
  })

  it('is created by a webhook a minute before it started, like the other mock runs', () => {
    expect(mockFailedRun.trigger).toBe('webhook')
    expect(mockFailedRun.createdAt).toBe('2026-09-18T09:59:00.000Z')
    expect(Date.parse(mockFailedRun.createdAt)).toBeLessThanOrEqual(
      Date.parse(mockFailedRun.startedAt ?? ''),
    )
  })

  it('records the production pipeline and coherent timing up to a failed review call', () => {
    const actions = makeFailedRunActions()
    expect(z.array(RunActionSchema).safeParse(actions).success).toBe(true)
    expect(actions.map((action) => action.tool)).toEqual([
      'policy.load',
      'vcs.fetch_diff',
      'context.build',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
    ])
    expect(actions.map((action) => action.index)).toEqual([0, 1, 2, 3, 4, 5])
    expect(actions.map((action) => action.startedAt)).toEqual([
      '2026-09-18T10:00:00.000Z',
      '2026-09-18T10:00:15.000Z',
      '2026-09-18T10:00:30.000Z',
      '2026-09-18T10:00:45.000Z',
      '2026-09-18T10:01:00.000Z',
      '2026-09-18T10:01:15.000Z',
    ])
    expect(new Set(actions.map((action) => action.id)).size).toBe(6)
    expect(actions.every((action) => action.runId === FAILED_RUN_ID)).toBe(true)
    expect(actions[3]?.response).toEqual({ cached: true })
    expect(actions[5]?.response).toEqual({
      error: { type: 'LLMTimeout', message: 'the model call timed out' },
    })
    expect(actions[5]?.request).toEqual({ kind: 'primary', attempt: 1 })
    expect(actions[2]?.response).not.toHaveProperty('error')
    expect(actions[4]?.response).not.toHaveProperty('error')
    for (const action of actions) {
      expect(Date.parse(action.startedAt) + action.durationMs).toBeLessThanOrEqual(
        Date.parse(mockFailedRun.finishedAt ?? ''),
      )
    }
  })

  it('shows the bar failed on analysis', () => {
    const progress = runProgress(mockFailedRun, makeFailedRunActions())
    expect(progress?.map((stage) => stage.state)).toEqual(['finish', 'error', 'wait'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, 'llm_timeout', null])
  })
})
