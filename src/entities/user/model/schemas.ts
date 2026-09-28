import { z } from 'zod'

export const UserSchema = z.object({
  id: z.number().int(),
  login: z.string().min(1),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof UserSchema>

export const WorkspaceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  installationId: z.number().int(),
})
export type Workspace = z.infer<typeof WorkspaceSchema>

export const MeSchema = z.object({
  id: z.number().int(),
  login: z.string().min(1),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  workspaces: z.array(WorkspaceSchema),
})
export type Me = z.infer<typeof MeSchema>

export const AuthSessionSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().min(1),
  user: UserSchema,
})
export type AuthSession = z.infer<typeof AuthSessionSchema>
