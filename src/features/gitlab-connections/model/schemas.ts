import { z } from 'zod'

// Portal contract for api#375, camelCase like the other workspace APIs. The GitLab
// endpoints may still be absent on staging: callers mock this shape and parse it here.

export const GitLabTokenSchema = z
  .string()
  .min(1)
  .max(4096)
  .regex(/^[\x21-\x7E]+$/)

const GitLabConnectionStatusSchema = z.enum(['awaiting_webhook', 'active'])

export const GitLabDiscoveryRequestSchema = z.object({
  token: GitLabTokenSchema,
})
export type GitLabDiscoveryRequest = z.infer<typeof GitLabDiscoveryRequestSchema>

export const GitLabDiscoveredProjectSchema = z.object({
  projectId: z.int().positive(),
  pathWithNamespace: z.string().min(1).max(512),
  name: z.string().min(1),
  webUrl: z.url(),
})
export type GitLabDiscoveredProject = z.infer<typeof GitLabDiscoveredProjectSchema>

export const GitLabDiscoveryResponseSchema = z.object({
  projects: z.array(GitLabDiscoveredProjectSchema),
})
export type GitLabDiscoveryResponse = z.infer<typeof GitLabDiscoveryResponseSchema>

export const GitLabConnectRequestSchema = z.object({
  token: GitLabTokenSchema,
  projectId: z.int().positive(),
})
export type GitLabConnectRequest = z.infer<typeof GitLabConnectRequestSchema>

export const GitLabWebhookSetupSchema = z.object({
  url: z.url(),
  secret: z.string().min(1),
})
export type GitLabWebhookSetup = z.infer<typeof GitLabWebhookSetupSchema>

const connectionFields = {
  id: z.uuid(),
  repositoryId: z.uuid(),
  projectId: z.int().positive(),
  pathWithNamespace: z.string().min(1).max(512),
  status: GitLabConnectionStatusSchema,
  webhookUrl: z.url(),
}

export const GitLabConnectionItemSchema = z.object(connectionFields)
export type GitLabConnectionItem = z.infer<typeof GitLabConnectionItemSchema>

export const GitLabConnectionListSchema = z.object({
  connections: z.array(GitLabConnectionItemSchema),
})
export type GitLabConnectionList = z.infer<typeof GitLabConnectionListSchema>

// `webhook` is present only when GitLab did not create the hook. The secret is not
// part of the connection list: a later GET cannot bring it back.
export const GitLabConnectResponseSchema = z.object({
  ...connectionFields,
  webhook: GitLabWebhookSetupSchema.nullable(),
})
export type GitLabConnectResponse = z.infer<typeof GitLabConnectResponseSchema>
