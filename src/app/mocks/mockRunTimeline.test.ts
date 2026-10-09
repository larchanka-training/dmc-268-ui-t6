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
// queued until 2 s, then one action every 1.5 s, publishing at 11 s, the publish row at 12.5 s
// and succeeded at 14 s. The default origin is 2026-09-18T12:00:00.000Z.
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
    [10_999, 'running'],
    [11_000, 'publishing'],
    [12_500, 'publishing'],
    [13_999, 'publishing'],
    [14_000, 'succeeded'],
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
  it.each<[number, string[]]>([
    [0, []],
    [1999, []],
    [2000, ['vcs.fetch_diff']],
    [3499, ['vcs.fetch_diff']],
    [3500, ['vcs.fetch_diff', 'llm.call']],
    [5000, ['vcs.fetch_diff', 'llm.call', 'llm.repo_conventions']],
    [6500, ['vcs.fetch_diff', 'llm.call', 'llm.repo_conventions', 'context.build']],
    [8000, ['vcs.fetch_diff', 'llm.call', 'llm.repo_conventions', 'context.build', 'llm.call']],
    [
      9500,
      [
        'vcs.fetch_diff',
        'llm.call',
        'llm.repo_conventions',
        'context.build',
        'llm.call',
        'llm.call',
      ],
    ],
    [
      10_999,
      [
        'vcs.fetch_diff',
        'llm.call',
        'llm.repo_conventions',
        'context.build',
        'llm.call',
        'llm.call',
      ],
    ],
    [
      11_000,
      [
        'vcs.fetch_diff',
        'llm.call',
        'llm.repo_conventions',
        'context.build',
        'llm.call',
        'llm.call',
        'llm.review_output',
        'review.postprocess',
      ],
    ],
    [
      12_499,
      [
        'vcs.fetch_diff',
        'llm.call',
        'llm.repo_conventions',
        'context.build',
        'llm.call',
        'llm.call',
        'llm.review_output',
        'review.postprocess',
      ],
    ],
    [
      12_500,
      [
        'vcs.fetch_diff',
        'llm.call',
        'llm.repo_conventions',
        'context.build',
        'llm.call',
        'llm.call',
        'llm.review_output',
        'review.postprocess',
        'github.publish_review',
      ],
    ],
    [
      14_000,
      [
        'vcs.fetch_diff',
        'llm.call',
        'llm.repo_conventions',
        'context.build',
        'llm.call',
        'llm.call',
        'llm.review_output',
        'review.postprocess',
        'github.publish_review',
      ],
    ],
  ])('at %i ms the log holds exactly these tools', (elapsedMs, expected) => {
    expect(tools(elapsedMs)).toEqual(expected)
  })

  it('indexes the actions from 0 and gives each a unique id', () => {
    const { actions } = walkingRunAt(14_000)
    expect(actions.map((action) => action.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(new Set(actions.map((action) => action.id)).size).toBe(9)
    expect(actions.every((action) => action.runId === WALKING_RUN_ID)).toBe(true)
  })

  it('starts each action at its moment on the timeline', () => {
    const { actions } = walkingRunAt(14_000)
    expect(actions.map((action) => action.startedAt)).toEqual([
      '2026-09-18T12:00:02.000Z',
      '2026-09-18T12:00:03.500Z',
      '2026-09-18T12:00:05.000Z',
      '2026-09-18T12:00:06.500Z',
      '2026-09-18T12:00:08.000Z',
      '2026-09-18T12:00:09.500Z',
      '2026-09-18T12:00:11.000Z',
      '2026-09-18T12:00:11.000Z',
      '2026-09-18T12:00:12.500Z',
    ])
  })

  it('records no failed step on the happy path', () => {
    const { actions } = walkingRunAt(14_000)
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
    expect(walkingRunAt(13_999).session.finishedAt).toBeNull()
    expect(walkingRunAt(14_000).session.finishedAt).toBe('2026-09-18T12:00:14.000Z')
    expect(walkingRunAt(14_000).session.startedAt).toBe('2026-09-18T12:00:02.000Z')
  })

  it('counts its actions, runs on the first attempt and carries no error', () => {
    for (const elapsedMs of [0, 2000, 6500, 11_000, 12_500, 14_000]) {
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
    const { session, actions } = walkingRunAt(14_000, origin)
    expect(session.startedAt).toBe('2026-10-01T00:00:02.000Z')
    expect(session.finishedAt).toBe('2026-10-01T00:00:14.000Z')
    expect(actions[0]?.startedAt).toBe('2026-10-01T00:00:02.000Z')
  })

  it('validates against the contract at every moment, and the log only grows', () => {
    let previous: string[] = []
    for (let elapsedMs = 0; elapsedMs <= 16_000; elapsedMs += 250) {
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
    [5000, ['process', 'wait', 'wait']],
    [6500, ['finish', 'process', 'wait']],
    [9500, ['finish', 'process', 'wait']],
    [11_000, ['finish', 'finish', 'process']],
    [12_500, ['finish', 'finish', 'process']],
    [14_000, ['finish', 'finish', 'finish']],
  ])('at %i ms the bar is %j', (elapsedMs, expected) => {
    const { session, actions } = walkingRunAt(elapsedMs)
    expect(runProgress(session, actions)?.map((stage) => stage.state)).toEqual(expected)
  })
})

describe('buildWalkingRunDetail', () => {
  it('has no findings until the run has succeeded', () => {
    for (const elapsedMs of [0, 2000, 11_000, 12_500]) {
      const detail = buildWalkingRunDetail(walkingRunAt(elapsedMs).session)
      expect(RunDetailSchema.safeParse(detail).success).toBe(true)
      expect(detail.id).toBe(WALKING_RUN_ID)
      expect(detail.findings).toEqual([])
      expect(detail.verdict).toBeNull()
    }
  })

  it('carries the demo findings once succeeded', () => {
    const detail = buildWalkingRunDetail(walkingRunAt(14_000).session)
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
    expect(currentWalkingRun(21_000).session.status).toBe('publishing')
    expect(currentWalkingRun(21_000).actions).toHaveLength(8)
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
    expect(mockFailedRun.actionCount).toBe(4)
  })

  it('records the pipeline up to a failed llm.call', () => {
    const actions = makeFailedRunActions()
    expect(z.array(RunActionSchema).safeParse(actions).success).toBe(true)
    expect(actions.map((action) => action.tool)).toEqual([
      'vcs.fetch_diff',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
    ])
    expect(actions.map((action) => action.index)).toEqual([0, 1, 2, 3])
    expect(actions.every((action) => action.runId === FAILED_RUN_ID)).toBe(true)
    expect(actions[3]?.response).toMatchObject({ error: { type: expect.any(String) as string } })
    expect(actions[2]?.response).not.toHaveProperty('error')
  })

  it('shows the bar failed on analysis', () => {
    const progress = runProgress(mockFailedRun, makeFailedRunActions())
    expect(progress?.map((stage) => stage.state)).toEqual(['finish', 'error', 'wait'])
    expect(progress?.map((stage) => stage.errorCode)).toEqual([null, 'llm_timeout', null])
  })
})
