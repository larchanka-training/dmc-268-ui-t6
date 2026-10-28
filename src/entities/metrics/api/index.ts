import { useQuery } from '@tanstack/react-query'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { MetricsSummaryQuerySchema, MetricsSummarySchema } from '../model/schemas'
import type { MetricsSummary, MetricsSummaryQuery } from '../model/schemas'

export const metricsQueryKeys = {
  summary: (query: MetricsSummaryQuery) =>
    ['metrics', 'summary', { range: query.range, repo: query.repo ?? null }] as const,
}

export function metricsSummaryEndpoint(query: MetricsSummaryQuery) {
  const parsed = MetricsSummaryQuerySchema.parse(query)
  const params = new URLSearchParams()
  params.set('range', parsed.range)
  if (parsed.repo !== undefined) {
    params.set('repo', parsed.repo)
  }
  return {
    method: 'GET' as const,
    path: `${endpoints.metrics.summary().path}?${params.toString()}`,
  }
}

export async function fetchMetricsSummary(query: MetricsSummaryQuery): Promise<MetricsSummary> {
  const data = await apiClient<unknown>(metricsSummaryEndpoint(query))
  return MetricsSummarySchema.parse(data)
}

export function useMetricsSummary(query: MetricsSummaryQuery) {
  return useQuery({
    queryKey: metricsQueryKeys.summary(query),
    queryFn: () => fetchMetricsSummary(query),
  })
}
