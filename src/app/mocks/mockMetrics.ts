import type { MetricsSummary } from '../../entities/metrics'

import { mockRepositories } from './app-state'

const WORKSPACES: MetricsSummary['workspaces'] = [
  { name: 'acme', dailyBudgetUsd: 0, spentTodayUsd: 1.5, paused: false },
  { name: 'paused-team', dailyBudgetUsd: 10, spentTodayUsd: 1, paused: true },
]

function zeros(range: MetricsSummary['range']): MetricsSummary {
  return {
    range,
    runsByStatus: { succeeded: 0, failed: 0, cancelled: 0, skipped: 0 },
    pullsByVerdict: { blocking: 0, attention: 0, clean: 0, noVerdict: 0 },
    findingsBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    findingsByCategory: { security: 0, correctness: 0, performance: 0, readability: 0 },
    averageDurationMs: null,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    series: [],
    workspaces: WORKSPACES.map((workspace) => ({ ...workspace })),
  }
}

function filled(range: MetricsSummary['range']): MetricsSummary {
  const days =
    range === '30d' ? ['2026-10-01', '2026-10-15', '2026-10-27'] : ['2026-10-26', '2026-10-27']
  return {
    ...zeros(range),
    runsByStatus: { succeeded: 4, failed: 1, cancelled: 0, skipped: 1 },
    pullsByVerdict: { blocking: 1, attention: 1, clean: 2, noVerdict: 1 },
    findingsBySeverity: { critical: 1, high: 2, medium: 1, low: 0, info: 0 },
    findingsByCategory: { security: 1, correctness: 2, performance: 1, readability: 0 },
    averageDurationMs: 125000,
    tokensIn: 800,
    tokensOut: 200,
    costUsd: 3.5,
    series: days.map((day, index) => ({
      day,
      findings: { security: index, correctness: 1, performance: 0, readability: 0 },
      runCount: index + 1,
      averageDurationMs: 1000 * (index + 1),
      costUsd: index === 0 ? 0 : 1.25,
    })),
  }
}

/** `GET /metrics/summary`. An unknown repository is an empty period, not another repository's numbers. */
export function mockMetricsSummary(search: string): MetricsSummary {
  const params = new URLSearchParams(search)
  const rawRange = params.get('range')
  const range = rawRange === '30d' || rawRange === '24h' || rawRange === '7d' ? rawRange : '7d'
  const repo = params.get('repo')
  const known = repo === null || mockRepositories.some((repository) => repository.fullName === repo)
  return known ? filled(range) : zeros(range)
}
