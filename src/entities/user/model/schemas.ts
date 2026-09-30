import { z } from 'zod'

import { RefreshResponseSchema } from '../../../shared/api/schemas'

export const UserSchema = z.object({
  id: z.number().int(),
  login: z.string().min(1),
  name: z.string().nullable(),
  avatarUrl: z.url().nullable(),
})
export type User = z.infer<typeof UserSchema>

export const WorkspaceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  installationId: z.number().int(),
})
export type Workspace = z.infer<typeof WorkspaceSchema>

export const MeSchema = UserSchema.extend({
  workspaces: z.array(WorkspaceSchema),
})
export type Me = z.infer<typeof MeSchema>

export const AuthSessionSchema = RefreshResponseSchema.extend({
  user: UserSchema,
})
export type AuthSession = z.infer<typeof AuthSessionSchema>
