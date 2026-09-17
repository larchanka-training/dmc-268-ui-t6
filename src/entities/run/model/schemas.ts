import { z } from 'zod'

export const RunStatusSchema = z.enum([
  'queued',
  'running',
  'publishing',
  'completed',
  'failed',
  'cancelled',
  'skipped',
])
export type RunStatus = z.infer<typeof RunStatusSchema>

export const TERMINAL_RUN_STATUSES = [
  'completed',
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

export const PullRequestRefSchema = z.object({
  repo: z.string(),
  number: z.int().positive(),
  title: z.string(),
  url: z.url(),
  headSha: z.string(),
})
export type PullRequestRef = z.infer<typeof PullRequestRefSchema>

export const RunSessionSchema = z
  .object({
    id: z.uuid(),
    engine: EngineSchema,
    model: z.string().nullable(),
    status: RunStatusSchema,
    startedAt: z.iso.datetime().nullable(),
    finishedAt: z.iso.datetime().nullable(),
    attempt: z.int().positive(),
    cancelRequested: z.boolean(),
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
  request: z.unknown(),
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
