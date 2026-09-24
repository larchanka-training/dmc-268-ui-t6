import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string(),
  login: z.string().min(1),
  name: z.string().nullable().default(null),
  avatarUrl: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  provider: z.string().default('github'),
})
export type User = z.infer<typeof UserSchema>

export const AuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenType: z.string().default('Bearer'),
  expiresIn: z.int().optional(),
})
export type AuthTokens = z.infer<typeof AuthTokensSchema>

export const AuthCallbackResponseSchema = z.object({
  token: z.string().min(1),
  user: UserSchema.optional(),
})
export type AuthCallbackResponse = z.infer<typeof AuthCallbackResponseSchema>
