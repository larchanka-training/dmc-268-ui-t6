import { describe, expect, it } from 'vitest'

import { MetricsSummaryQuerySchema, MetricsSummarySchema } from './schemas'

const statusCounts = {
  queued: 0,
  running: 0,
  publishing: 0,
  succeeded: 2,
  failed: 1,
  cancelled: 0,
  skipped: 1,
}

const summary = {
  range: '7d',
  totals: {
    runsByStatus: statusCounts,
    pullsByVerdict: { blocking: 1, attention: 0, clean: 3, noVerdict: 2 },
    findingsBySeverity: { critical: 1, high: 4, medium: 0, low: 0, info: 0 },
    findingsByCategory: { security: 1, correctness: 2, performance: 0, readability: 1 },
    succeededAverageDurationSeconds: 125,
    tokensIn: 10,
    tokensOut: 4,
    costUsd: 1.5,
  },
  series: [
    {
      day: '2026-10-27',
      findingsByCategory: { security: 1, correctness: 0, performance: 0, readability: 0 },
      runCount: 2,
      averageDurationSeconds: 0,
      costUsd: 0.25,
    },
  ],
  workspaces: [
    { name: 'acme', dailyBudgetUsd: 0, spentTodayUsd: 1.5, paused: false },
    { name: 'paused-team', dailyBudgetUsd: 10, spentTodayUsd: 1, paused: true },
  ],
}

describe('MetricsSummarySchema', () => {
  it('parses the summary and keeps noVerdict apart from clean', () => {
    const parsed = MetricsSummarySchema.parse(summary)
    expect(parsed.totals.pullsByVerdict.clean).toBe(3)
    expect(parsed.totals.pullsByVerdict.noVerdict).toBe(2)
    expect(parsed.totals.findingsBySeverity.critical).toBe(1)
    expect(parsed.totals.findingsBySeverity.high).toBe(4)
    expect(parsed.totals.runsByStatus.queued).toBe(0)
  })

  it('accepts range 24h and strips tiles and bucketStart', () => {
    const parsed = MetricsSummarySchema.parse({
      ...summary,
      range: '24h',
      tiles: { runs: 1 },
      bucketStart: '2026-10-27T00:00:00.000Z',
    })
    expect(parsed.range).toBe('24h')
    expect(parsed).not.toHaveProperty('tiles')
    expect(parsed).not.toHaveProperty('bucketStart')
  })

  it('rejects an unknown range and a summary without totals', () => {
    expect(MetricsSummarySchema.safeParse({ ...summary, range: '1h' }).success).toBe(false)
    expect(MetricsSummarySchema.safeParse({ ...summary, totals: undefined }).success).toBe(false)
  })
})

describe('MetricsSummaryQuerySchema', () => {
  it('accepts a range without a repo', () => {
    expect(MetricsSummaryQuerySchema.parse({ range: '30d' })).toEqual({ range: '30d' })
  })

  it('accepts 24h and rejects an unknown range', () => {
    expect(MetricsSummaryQuerySchema.safeParse({ range: '24h' }).success).toBe(true)
    expect(MetricsSummaryQuerySchema.safeParse({ range: '1h' }).success).toBe(false)
  })
})
