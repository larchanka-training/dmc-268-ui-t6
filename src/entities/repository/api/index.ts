import { z } from 'zod'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { ConnectRepositorySchema, RepositorySchema, UpdateRepositorySchema } from '../model/schemas'
import type { ConnectRepositoryInput, Repository, UpdateRepositoryInput } from '../model/schemas'

export const repoApi = {
  list: { endpoint: endpoints.repos.list, response: z.array(RepositorySchema) },
  connect: {
    endpoint: endpoints.repos.connect,
    input: ConnectRepositorySchema,
    response: RepositorySchema,
  },
  detail: { endpoint: endpoints.repos.detail, response: RepositorySchema },
  update: {
    endpoint: endpoints.repos.update,
    input: UpdateRepositorySchema,
    response: RepositorySchema,
  },
} as const

export async function fetchRepositories(): Promise<Repository[]> {
  const data = await apiClient<unknown>(endpoints.repos.list())
  return z.array(RepositorySchema).parse(data)
}

export async function connectRepository(input: ConnectRepositoryInput): Promise<Repository> {
  const validated = ConnectRepositorySchema.parse(input)
  const data = await apiClient<unknown>(endpoints.repos.connect(), {
    body: validated,
  })
  return RepositorySchema.parse(data)
}

export async function updateRepository(
  id: string,
  input: UpdateRepositoryInput,
): Promise<Repository> {
  const validated = UpdateRepositorySchema.parse(input)
  const data = await apiClient<unknown>(endpoints.repos.update(id), {
    body: validated,
  })
  return RepositorySchema.parse(data)
}

export async function fetchRepository(id: string): Promise<Repository> {
  const data = await apiClient<unknown>(endpoints.repos.detail(id))
  return RepositorySchema.parse(data)
}
