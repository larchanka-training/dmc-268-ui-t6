import { z } from 'zod'

export const RepositoryEngineSchema = z.enum(['fast', 'deep'])
export type RepositoryEngine = z.infer<typeof RepositoryEngineSchema>

export const RepositorySchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  url: z.string(),
  defaultBranch: z.string().default('main'),
  enabled: z.boolean().default(true),
  defaultEngine: RepositoryEngineSchema.default('fast'),
  waitForCi: z.boolean().default(true),
  maxComments: z.int().min(1).max(50).default(10),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type Repository = z.infer<typeof RepositorySchema>

export const ConnectRepositorySchema = z.object({
  fullName: z
    .string()
    .min(1, 'Repository name is required')
    .regex(/^[^/\s]+\/[^/\s]+$/, 'Must be in owner/repo format, e.g. organization/repository'),
  defaultBranch: z.string().default('main'),
  defaultEngine: RepositoryEngineSchema.default('fast'),
  waitForCi: z.boolean().default(true),
  maxComments: z.int().min(1).max(50).default(10),
})
export type ConnectRepositoryInput = z.input<typeof ConnectRepositorySchema>
export type ConnectRepositoryOutput = z.output<typeof ConnectRepositorySchema>

export const UpdateRepositorySchema = z.object({
  enabled: z.boolean().optional(),
  defaultBranch: z.string().optional(),
  defaultEngine: RepositoryEngineSchema.optional(),
  waitForCi: z.boolean().optional(),
  maxComments: z.int().min(1).max(50).optional(),
})
export type UpdateRepositoryInput = z.infer<typeof UpdateRepositorySchema>
