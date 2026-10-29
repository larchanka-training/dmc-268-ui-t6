import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { formatDateTime, formatDuration, runDuration } from './formatRun'

const runnerZone = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'Asia/Tokyo'
})
afterAll(() => {
  if (runnerZone === undefined) {
    delete process.env.TZ
  } else {
    process.env.TZ = runnerZone
  }
})

const run = {
  startedAt: '2026-09-18T11:50:00.000Z',
  finishedAt: '2026-09-18T11:55:12.000Z',
}

describe('runDuration', () => {
  it('returns null when the run has not started', () => {
    expect(runDuration({ startedAt: null, finishedAt: null }, new Date())).toBeNull()
  })

  it('measures from the start to the finish', () => {
    expect(runDuration(run, new Date('2026-09-18T12:00:00.000Z'))).toBe(5 * 60 * 1000 + 12 * 1000)
  })

  it('measures an open run until now', () => {
    expect(
      runDuration(
        { startedAt: run.startedAt, finishedAt: null },
        new Date('2026-09-18T11:50:05.000Z'),
      ),
    ).toBe(5000)
  })
})

describe('formatRun', () => {
  it('keeps the Russian duration texts', () => {
    expect(formatDuration(400)).toBe('<1 с')
    expect(formatDuration(19_000)).toBe('19 с')
    expect(formatDuration(125_000)).toBe('2 мин 5 с')
  })

  it('writes the time in UTC using the Russian notation', () => {
    expect(formatDateTime('2026-09-18T11:50:00.000Z')).toBe('18.09.2026, 11:50:00')
  })
})
