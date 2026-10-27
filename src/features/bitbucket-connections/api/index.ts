import { useInfiniteQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import {
  BitbucketConnectRequestSchema,
  BitbucketConnectResponseSchema,
  BitbucketConnectionListSchema,
  BitbucketCredentialRotateResponseSchema,
  BitbucketDiscoveryRequestSchema,
  BitbucketDiscoveryResponseSchema,
  BitbucketWebhookSetupSchema,
  type BitbucketConnectRequest,
  type BitbucketDiscoveryRequest,
} from '../model/schemas'

export const BITBUCKET_CONNECTIONS_QUERY_KEY = ['bitbucketConnections'] as const

function id(value: string): string {
  return z.uuid().parse(value)
}

export async function discoverBitbucketRepositories(
  workspaceId: string,
  input: BitbucketDiscoveryRequest,
) {
  const body = BitbucketDiscoveryRequestSchema.parse(input)
  const data = await apiClient<unknown>(endpoints.bitbucket.discover(id(workspaceId)), { body })
  return BitbucketDiscoveryResponseSchema.parse(data)
}

export async function listBitbucketConnections(workspaceId: string, cursor?: string | null) {
  const data = await apiClient<unknown>(endpoints.bitbucket.connections(id(workspaceId), cursor))
  return BitbucketConnectionListSchema.parse(data)
}

export async function connectBitbucketRepository(
  workspaceId: string,
  input: BitbucketConnectRequest,
) {
  const body = BitbucketConnectRequestSchema.parse(input)
  const data = await apiClient<unknown>(endpoints.bitbucket.connect(id(workspaceId)), { body })
  return BitbucketConnectResponseSchema.parse(data)
}

export async function disconnectBitbucketRepository(
  workspaceId: string,
  installationId: string,
  repositoryId: string,
): Promise<void> {
  await apiClient<unknown>(
    endpoints.bitbucket.disconnect(id(workspaceId), id(installationId), id(repositoryId)),
  )
}

export async function rotateBitbucketCredential(
  workspaceId: string,
  installationId: string,
  apiToken: string,
) {
  const body = z.object({ apiToken: z.string().min(1) }).parse({ apiToken })
  const data = await apiClient<unknown>(
    endpoints.bitbucket.rotateCredential(id(workspaceId), id(installationId)),
    { body },
  )
  return BitbucketCredentialRotateResponseSchema.parse(data)
}

export async function rotateBitbucketWebhookSecret(
  workspaceId: string,
  installationId: string,
  repositoryId: string,
) {
  const data = await apiClient<unknown>(
    endpoints.bitbucket.rotateWebhookSecret(id(workspaceId), id(installationId), id(repositoryId)),
  )
  return BitbucketWebhookSetupSchema.parse(data)
}

export function useBitbucketConnections(workspaceId: string | null) {
  return useInfiniteQuery({
    queryKey: [...BITBUCKET_CONNECTIONS_QUERY_KEY, workspaceId],
    queryFn: ({ pageParam }) => listBitbucketConnections(id(workspaceId ?? ''), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: workspaceId !== null,
  })
}
