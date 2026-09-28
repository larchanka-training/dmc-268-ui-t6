import { z } from 'zod'

export const RepositoryEngineSchema = z.enum(['fast', 'deep'])
export type RepositoryEngine = z.infer<typeof RepositoryEngineSchema>

export const WaitForCiSchema = z.enum(['auto', 'always', 'never'])
export type WaitForCi = z.infer<typeof WaitForCiSchema>

export const ReviewEventSchema = z.enum(['COMMENT', 'REQUEST_CHANGES'])
export type ReviewEvent = z.infer<typeof ReviewEventSchema>

export const RepositorySchema = z.object({
  id: z.uuid(),
  fullName: z.string().min(1),
  url: z.url(),
  defaultBranch: z.string().min(1),
  enabled: z.boolean(),
  defaultEngine: RepositoryEngineSchema,
  waitForCi: WaitForCiSchema,
  maxComments: z.number().int().min(1).max(10),
  reviewEvent: ReviewEventSchema,
})
export type Repository = z.infer<typeof RepositorySchema>

export const UpdateRepositorySchema = z.object({
  enabled: z.boolean().optional(),
  defaultEngine: RepositoryEngineSchema.optional(),
  waitForCi: WaitForCiSchema.optional(),
  maxComments: z.number().int().min(1).max(10).optional(),
  reviewEvent: ReviewEventSchema.optional(),
})
export type UpdateRepositoryInput = z.infer<typeof UpdateRepositorySchema>
