import { z } from 'zod'

const UuidSchema = z.uuid()
const BitbucketStatusSchema = z.enum(['awaiting_webhook', 'active'])

export const BitbucketDiscoveryRequestSchema = z.object({
  bitbucketWorkspace: z.string().min(1).max(128),
  apiToken: z.string().min(1),
  cursor: z.string().nullable().optional(),
})
export type BitbucketDiscoveryRequest = z.infer<typeof BitbucketDiscoveryRequestSchema>

export const BitbucketDiscoveredRepositorySchema = z.object({
  uuid: UuidSchema,
  workspaceSlug: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  isPrivate: z.boolean(),
  htmlUrl: z.url(),
})
export type BitbucketDiscoveredRepository = z.infer<typeof BitbucketDiscoveredRepositorySchema>

export const BitbucketDiscoveryResponseSchema = z.object({
  repositories: z.array(BitbucketDiscoveredRepositorySchema),
  nextCursor: z.string().nullable(),
})
export type BitbucketDiscoveryResponse = z.infer<typeof BitbucketDiscoveryResponseSchema>

export const BitbucketConnectRequestSchema = z.object({
  bitbucketWorkspace: z.string().min(1).max(128),
  repositorySlug: z.string().min(1).max(128),
  repositoryUuid: UuidSchema,
  apiToken: z.string().min(1),
})
export type BitbucketConnectRequest = z.infer<typeof BitbucketConnectRequestSchema>

export const BitbucketWebhookSetupSchema = z.object({
  url: z.url(),
  events: z.array(z.enum(['repo:push', 'pullrequest:created', 'pullrequest:updated'])),
  secret: z.string().min(1),
})
export type BitbucketWebhookSetup = z.infer<typeof BitbucketWebhookSetupSchema>

const connectionFields = {
  id: UuidSchema,
  repositoryId: UuidSchema,
  repositoryUuid: UuidSchema,
  workspaceSlug: z.string().min(1),
  repositorySlug: z.string().min(1),
  status: BitbucketStatusSchema,
  credentialGeneration: z.int().min(1),
}

export const BitbucketConnectResponseSchema = z.object({
  ...connectionFields,
  webhook: BitbucketWebhookSetupSchema.nullable(),
})
export type BitbucketConnectResponse = z.infer<typeof BitbucketConnectResponseSchema>

export const BitbucketConnectionItemSchema = z.object({
  ...connectionFields,
  webhookUrl: z.url(),
})
export type BitbucketConnectionItem = z.infer<typeof BitbucketConnectionItemSchema>

export const BitbucketConnectionListSchema = z.object({
  connections: z.array(BitbucketConnectionItemSchema),
  nextCursor: z.string().nullable(),
})
export type BitbucketConnectionList = z.infer<typeof BitbucketConnectionListSchema>

export const BitbucketCredentialRotateResponseSchema = z.object({
  id: UuidSchema,
  credentialGeneration: z.int().min(1),
})
