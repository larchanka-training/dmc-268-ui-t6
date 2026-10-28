import { z } from 'zod'

export const MetricsRangeSchema = z.enum(['24h', '7d', '30d'])
export type MetricsRange = z.infer<typeof MetricsRangeSchema>

const CountSchema = z.int().nonnegative()

const RunsByStatusSchema = z.object({
  succeeded: CountSchema,
  failed: CountSchema,
  cancelled: CountSchema,
  skipped: CountSchema,
})

const PullsByVerdictSchema = z.object({
  blocking: CountSchema,
  attention: CountSchema,
  clean: CountSchema,
  noVerdict: CountSchema,
})

const FindingsBySeveritySchema = z.object({
  critical: CountSchema,
  high: CountSchema,
  medium: CountSchema,
  low: CountSchema,
  info: CountSchema,
})

const FindingsByCategorySchema = z.object({
  security: CountSchema,
  correctness: CountSchema,
  performance: CountSchema,
  readability: CountSchema,
})

const SeriesPointSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  findings: FindingsByCategorySchema,
  runCount: CountSchema,
  averageDurationMs: z.number().nonnegative(),
  costUsd: z.number().nonnegative(),
})

const WorkspaceBudgetSchema = z.object({
  name: z.string().min(1),
  dailyBudgetUsd: z.number().nonnegative(),
  spentTodayUsd: z.number().nonnegative(),
  paused: z.boolean(),
})

/** Proposed summary for api#310 part 3. Names are a proposal until that part leaves `planned`. */
export const MetricsSummarySchema = z.object({
  range: MetricsRangeSchema,
  runsByStatus: RunsByStatusSchema,
  pullsByVerdict: PullsByVerdictSchema,
  findingsBySeverity: FindingsBySeveritySchema,
  findingsByCategory: FindingsByCategorySchema,
  averageDurationMs: z.number().nonnegative().nullable(),
  tokensIn: CountSchema,
  tokensOut: CountSchema,
  costUsd: z.number().nonnegative(),
  series: z.array(SeriesPointSchema),
  workspaces: z.array(WorkspaceBudgetSchema),
})
export type MetricsSummary = z.infer<typeof MetricsSummarySchema>

export const MetricsSummaryQuerySchema = z.object({
  range: MetricsRangeSchema,
  repo: z.string().min(1).max(512).optional(),
})
export type MetricsSummaryQuery = z.infer<typeof MetricsSummaryQuerySchema>
