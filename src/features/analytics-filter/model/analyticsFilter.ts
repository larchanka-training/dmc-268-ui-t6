import { z } from 'zod'

/** Periods the page offers. `24h` stays in the API enum and is not a control. */
export const ANALYTICS_RANGES = ['7d', '30d'] as const
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]

export interface AnalyticsFilter {
  range: AnalyticsRange
  repo?: string
}

const RANGE_PARAM = 'range'
const REPO_PARAM = 'repo'

const RangeParamSchema = z.enum(ANALYTICS_RANGES)
const RepoParamSchema = z.string().min(1).max(512)

export function parseAnalyticsFilter(params: URLSearchParams): AnalyticsFilter {
  const range = RangeParamSchema.safeParse(params.get(RANGE_PARAM))
  const repo = RepoParamSchema.safeParse(params.get(REPO_PARAM))
  return {
    range: range.success ? range.data : '7d',
    ...(repo.success ? { repo: repo.data } : {}),
  }
}

/** Replaces `range` and `repo`. Every other param is kept. An empty repo removes that param. */
export function writeAnalyticsFilter(
  prev: URLSearchParams,
  next: AnalyticsFilter,
): URLSearchParams {
  const params = new URLSearchParams(prev)
  params.delete(RANGE_PARAM)
  params.delete(REPO_PARAM)
  params.set(RANGE_PARAM, next.range)
  if (next.repo !== undefined && next.repo !== '') {
    params.set(REPO_PARAM, next.repo)
  }
  return params
}
