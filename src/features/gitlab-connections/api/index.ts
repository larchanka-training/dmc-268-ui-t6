import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import {
  GitLabConnectRequestSchema,
  GitLabConnectResponseSchema,
  GitLabConnectionListSchema,
  GitLabDiscoveryRequestSchema,
  GitLabDiscoveryResponseSchema,
  type GitLabConnectRequest,
  type GitLabDiscoveryRequest,
} from '../model/schemas'

export const GITLAB_CONNECTIONS_QUERY_KEY = ['gitlabConnections'] as const

function id(value: string): string {
  return z.uuid().parse(value)
}

export async function discoverGitLabProjects(workspaceId: string, input: GitLabDiscoveryRequest) {
  const body = GitLabDiscoveryRequestSchema.parse(input)
  const data = await apiClient<unknown>(endpoints.gitlab.discover(id(workspaceId)), { body })
  return GitLabDiscoveryResponseSchema.parse(data)
}

export async function listGitLabConnections(workspaceId: string, signal?: AbortSignal) {
  const data = await apiClient<unknown>(endpoints.gitlab.connections(id(workspaceId)), { signal })
  return GitLabConnectionListSchema.parse(data)
}

export async function connectGitLabProject(workspaceId: string, input: GitLabConnectRequest) {
  const body = GitLabConnectRequestSchema.parse(input)
  const data = await apiClient<unknown>(endpoints.gitlab.connect(id(workspaceId)), { body })
  return GitLabConnectResponseSchema.parse(data)
}

export async function disconnectGitLabProject(
  workspaceId: string,
  installationId: string,
): Promise<void> {
  await apiClient<unknown>(endpoints.gitlab.disconnect(id(workspaceId), id(installationId)))
}

export function useGitLabConnections(workspaceId: string | null) {
  return useQuery({
    queryKey: [...GITLAB_CONNECTIONS_QUERY_KEY, workspaceId],
    queryFn: ({ signal }) => listGitLabConnections(id(workspaceId ?? ''), signal),
    enabled: workspaceId !== null,
  })
}
