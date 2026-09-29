import { z } from 'zod'

export const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().min(1),
})

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>
