import { z } from 'zod'

// File import, not the review barrel: api `tests/generate_ui_zod_contracts.mjs`
// loads this module in Node ESM, which does not resolve directory imports.
import { FindingViewSchema } from '../../review/model/schemas'

export const RunStatusSchema = z.enum([
  'queued',
  'running',
  'publishing',
  'succeeded',
  'failed',
  'cancelled',
  'skipped',
])
export type RunStatus = z.infer<typeof RunStatusSchema>

export const TERMINAL_RUN_STATUSES = [
  'succeeded',
  'failed',
  'cancelled',
  'skipped',
] as const satisfies readonly RunStatus[]

export const ACTIVE_RUN_STATUSES = [
  'queued',
  'running',
  'publishing',
] as const satisfies readonly RunStatus[]

export const EngineSchema = z.enum(['fast', 'deep'])
export type Engine = z.infer<typeof EngineSchema>

// Who created the Run (api PIPELINE_SPEC §12). Only `webhook` and `rerun` are written today;
// `manual` and `dry_run` are reserved by the same enum.
export const RunTriggerSchema = z.enum(['webhook', 'manual', 'rerun', 'dry_run'])
export type RunTrigger = z.infer<typeof RunTriggerSchema>

export const PullRequestRefSchema = z.object({
  repo: z.string(),
  number: z.int().positive(),
  title: z.string(),
  url: z.url(),
  headSha: z.string(),
  author: z.string().nullable().optional(),
  headRef: z.string().nullable().optional(),
  baseRef: z.string().nullable().optional(),
})
export type PullRequestRef = z.infer<typeof PullRequestRefSchema>

export const RunSessionSchema = z
  .object({
    id: z.uuid(),
    engine: EngineSchema,
    model: z.string().nullable(),
    status: RunStatusSchema,
    trigger: RunTriggerSchema,
    createdAt: z.iso.datetime(),
    startedAt: z.iso.datetime().nullable(),
    finishedAt: z.iso.datetime().nullable(),
    attempt: z.int().nonnegative(),
    cancelRequested: z.boolean(),
    summaryOnly: z.boolean(),
    pullRequest: PullRequestRefSchema,
    actionCount: z.int().nonnegative(),
    errorCode: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    const isTerminal = TERMINAL_RUN_STATUSES.some((status) => status === value.status)
    if (value.finishedAt !== null && !isTerminal) {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: 'finishedAt set requires status to be terminal',
      })
    }
  })
export type RunSession = z.infer<typeof RunSessionSchema>

export const RunActionSchema = z.object({
  id: z.uuid(),
  runId: z.uuid(),
  index: z.int().nonnegative(),
  tool: z.string(),
  request: z.record(z.string(), z.unknown()),
  response: z.unknown().nullable(),
  responseRef: z.string().nullable(),
  startedAt: z.iso.datetime(),
  durationMs: z.int().nonnegative(),
})
export type RunAction = z.infer<typeof RunActionSchema>

export const RunListPageSchema = z.object({
  items: z.array(RunSessionSchema),
  nextCursor: z.string().nullable(),
})
export type RunListPage = z.infer<typeof RunListPageSchema>

export const RunUpdatedEventSchema = z.object({
  runId: z.uuid(),
  status: RunStatusSchema,
})
export type RunUpdatedEvent = z.infer<typeof RunUpdatedEventSchema>

export const RunListQuerySchema = z.object({
  status: RunStatusSchema.optional(),
  repo: z.string().optional(),
  cursor: z.string().optional(),
})
export type RunListQuery = z.infer<typeof RunListQuerySchema>

export const VerdictSchema = z.enum(['blocking', 'attention', 'clean'])
export type Verdict = z.infer<typeof VerdictSchema>

export const EffortSchema = z.enum(['none', 'small', 'medium', 'large'])
export type Effort = z.infer<typeof EffortSchema>

export const ReviewSummarySchema = z.object({
  problem: z.string(),
  doneWell: z.string(),
  effort: EffortSchema,
})
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>

export const SeverityCountsSchema = z.object({
  critical: z.int().nonnegative(),
  high: z.int().nonnegative(),
  medium: z.int().nonnegative(),
  low: z.int().nonnegative(),
  info: z.int().nonnegative(),
})
export type SeverityCounts = z.infer<typeof SeverityCountsSchema>

export const RunBudgetSchema = z.object({
  tokensIn: z.int().nonnegative(),
  tokensOut: z.int().nonnegative(),
  costUsd: z.number().nonnegative(),
  tokenLimit: z.int().nonnegative(),
  costLimitUsd: z.number().nonnegative(),
})
export type RunBudget = z.infer<typeof RunBudgetSchema>

/** RunSession plus review fields; all five are required, as in the contract. */
export const RunDetailSchema = RunSessionSchema.extend({
  findings: z.array(FindingViewSchema),
  summary: ReviewSummarySchema.nullable(),
  verdict: VerdictSchema.nullable(),
  severityCounts: SeverityCountsSchema,
  budget: RunBudgetSchema.nullable(),
})
export type RunDetail = z.infer<typeof RunDetailSchema>
