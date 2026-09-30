import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { RepositorySchema, UpdateRepositorySchema } from '../model/schemas'
import type { Repository, UpdateRepositoryInput } from '../model/schemas'

export const REPOSITORIES_QUERY_KEY = ['repos'] as const

export const repoApi = {
  list: { endpoint: endpoints.repos.list, response: z.array(RepositorySchema) },
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

export async function fetchRepository(id: string): Promise<Repository> {
  const data = await apiClient<unknown>(endpoints.repos.detail(id))
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

export function useRepositories() {
  return useQuery({
    queryKey: REPOSITORIES_QUERY_KEY,
    queryFn: fetchRepositories,
  })
}

export interface UpdateRepositoryVariables {
  id: string
  patch: UpdateRepositoryInput
}

export function useUpdateRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, patch }: UpdateRepositoryVariables) => updateRepository(id, patch),
    onMutate: async ({ id, patch }) => {
      // 1. Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: REPOSITORIES_QUERY_KEY })

      // 2. Snapshot current repositories
      const previous = queryClient.getQueryData<Repository[]>(REPOSITORIES_QUERY_KEY)

      // 3. Optimistically update targeted repository
      if (previous) {
        queryClient.setQueryData<Repository[]>(
          REPOSITORIES_QUERY_KEY,
          previous.map((repo) => (repo.id === id ? { ...repo, ...patch } : repo)),
        )
      }

      const previousRepo = previous?.find((r) => r.id === id)
      return { previous, previousRepo, id }
    },
    onError: (_err, { id }, context) => {
      // Roll back the modified row (or full snapshot)
      const previousRepo = context?.previousRepo
      if (previousRepo) {
        queryClient.setQueryData<Repository[]>(REPOSITORIES_QUERY_KEY, (old = []) =>
          old.map((repo) => (repo.id === id ? previousRepo : repo)),
        )
      } else if (context?.previous) {
        queryClient.setQueryData<Repository[]>(REPOSITORIES_QUERY_KEY, context.previous)
      }
    },
    onSuccess: (updated) => {
      // Update cache with confirmed server response
      queryClient.setQueryData<Repository[]>(REPOSITORIES_QUERY_KEY, (old = []) =>
        old.map((repo) => (repo.id === updated.id ? updated : repo)),
      )
    },
    onSettled: () => {
      // Revalidate to maintain server cache consistency
      void queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    },
  })
}
