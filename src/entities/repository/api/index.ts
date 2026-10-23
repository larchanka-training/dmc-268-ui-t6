import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { RepositorySchema, RulesStatusSchema, UpdateRepositorySchema } from '../model/schemas'
import type { Repository, RulesStatus, UpdateRepositoryInput } from '../model/schemas'

export const REPOSITORIES_QUERY_KEY = ['repos'] as const
export const UPDATE_REPOSITORY_MUTATION_KEY = ['updateRepo'] as const
// Deliberately not under `['repos']`: the update mutation cancels and invalidates that prefix, and
// would cancel and refetch the rules status on every settings save.
export const REPO_RULES_STATUS_QUERY_KEY = ['repoRulesStatus'] as const

export function repoRulesStatusQueryKey(id: string) {
  return [...REPO_RULES_STATUS_QUERY_KEY, id] as const
}

export const repoApi = {
  list: { endpoint: endpoints.repos.list, response: z.array(RepositorySchema) },
  detail: { endpoint: endpoints.repos.detail, response: RepositorySchema },
  update: {
    endpoint: endpoints.repos.update,
    input: UpdateRepositorySchema,
    response: RepositorySchema,
  },
  rulesStatus: { endpoint: endpoints.repos.rulesStatus, response: RulesStatusSchema },
} as const

export async function fetchRepositories(signal?: AbortSignal): Promise<Repository[]> {
  const data = await apiClient<unknown>(endpoints.repos.list(), { signal })
  return z.array(RepositorySchema).parse(data)
}

export async function fetchRepository(id: string): Promise<Repository> {
  const data = await apiClient<unknown>(endpoints.repos.detail(id))
  return RepositorySchema.parse(data)
}

export async function fetchRepositoryRulesStatus(
  id: string,
  signal?: AbortSignal,
): Promise<RulesStatus> {
  const data = await apiClient<unknown>(endpoints.repos.rulesStatus(id), { signal })
  return RulesStatusSchema.parse(data)
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
    queryFn: ({ signal }) => fetchRepositories(signal),
    refetchOnWindowFocus: 'always',
  })
}

/**
 * One repository of the list. It reads the list cache (the same key as `useRepositories`), so
 * the optimistic update and the rollback of `useUpdateRepository` reach it; a query of its own
 * would show stale values after a save. `data` is `undefined` while loading and when the list
 * has no such repository: tell them apart by `isPending`.
 *
 * Opening the page always asks again (`refetchOnMount`), even when the cached list is still
 * fresh: a settings form is built once from this value, so it must be the current one. While
 * that request runs `isFetching` is true on the first render.
 */
export function useRepository(id: string) {
  return useQuery({
    queryKey: REPOSITORIES_QUERY_KEY,
    queryFn: ({ signal }) => fetchRepositories(signal),
    refetchOnWindowFocus: 'always',
    refetchOnMount: 'always',
    select: (repositories) => repositories.find((repo) => repo.id === id),
  })
}

/** How often a `pending` rules status is asked again: the worker reads the file in seconds. */
export const RULES_STATUS_PENDING_POLL_MS = 3000

/**
 * Status of `.review/rules.md` of one repository. The answer is kept only while someone shows it
 * (`gcTime: 0`): reopening the page starts empty, so an old sha never stands for the current one
 * while the new request runs. A visit also always asks again (`refetchOnMount`), and there is no
 * placeholder, so the answer for another repository is never shown either. `data` is `undefined`
 * while loading.
 *
 * While the last answer is `pending` (the file is not read yet) it asks again every
 * `RULES_STATUS_PENDING_POLL_MS`, and stops with the first result. A request that fails keeps the
 * last answer, so a polling that began goes on until a result or the page is left.
 */
export function useRepositoryRulesStatus(id: string) {
  return useQuery({
    queryKey: repoRulesStatusQueryKey(id),
    queryFn: ({ signal }) => fetchRepositoryRulesStatus(id, signal),
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? RULES_STATUS_PENDING_POLL_MS : false,
    refetchOnMount: 'always',
    gcTime: 0,
  })
}

export interface UpdateRepositoryVariables {
  id: string
  patch: UpdateRepositoryInput
}

/**
 * The fields an update of `patch` writes: those of the patch, and `ragIndex` with `ragEnabled`, as
 * the server sets the two together.
 */
function patchedFields(patch: UpdateRepositoryInput): (keyof Repository)[] {
  const fields: (keyof Repository)[] = Object.keys(patch) as (keyof UpdateRepositoryInput)[]
  if ('ragEnabled' in patch) {
    fields.push('ragIndex')
  }
  return fields
}

export function useUpdateRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: UPDATE_REPOSITORY_MUTATION_KEY,
    mutationFn: ({ id, patch }: UpdateRepositoryVariables) => updateRepository(id, patch),
    onMutate: async ({ id, patch }) => {
      // 1. Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: REPOSITORIES_QUERY_KEY })

      // 2. Snapshot current repositories
      const previous = queryClient.getQueryData<Repository[]>(REPOSITORIES_QUERY_KEY)

      // 3. Optimistically update targeted repository. The cached `enabled` is the served value,
      //    `enabled AND installationAvailable` (api PR #156): where the GitHub App has no access
      //    a stored choice is write-only and never shown, so the merge keeps it off there.
      if (previous) {
        queryClient.setQueryData<Repository[]>(
          REPOSITORIES_QUERY_KEY,
          previous.map((repo) =>
            repo.id === id
              ? {
                  ...repo,
                  ...patch,
                  enabled: (patch.enabled ?? repo.enabled) && repo.installationAvailable,
                }
              : repo,
          ),
        )
      }

      const previousRepo = previous?.find((r) => r.id === id)
      return { previous, previousRepo, id }
    },
    onError: (_err, { id, patch }, context) => {
      // Roll back only the fields of the failed patch (or the full snapshot). Another update of
      // the same repository may have succeeded since the snapshot (a RAG switch-on while a
      // settings save runs), and restoring the whole row would undo it. The snapshot holds the
      // served `enabled`, so a patched `enabled` comes back as it was shown; `ragIndex` comes back
      // with `ragEnabled`, as the server sets the two together.
      const previousRepo = context?.previousRepo
      if (previousRepo) {
        const rolledBack = Object.fromEntries(
          patchedFields(patch).map((field) => [field, previousRepo[field]]),
        )
        queryClient.setQueryData<Repository[]>(REPOSITORIES_QUERY_KEY, (old = []) =>
          old.map((repo) => (repo.id === id ? { ...repo, ...rolledBack } : repo)),
        )
      } else if (context?.previous) {
        queryClient.setQueryData<Repository[]>(REPOSITORIES_QUERY_KEY, context.previous)
      }
    },
    onSuccess: (updated, { id, patch }) => {
      // Write only the fields of the patch, as the server answered them (the served `enabled`
      // included); `ragIndex` comes with `ragEnabled`, as the server sets the two together. The
      // answer is the row at the time of this update: another update of the same repository may
      // have succeeded since (a RAG switch-on while a settings save runs), and the whole row would
      // undo it. The other fields come with the refetch of `onSettled`; the caller still gets the
      // whole row.
      const merged = Object.fromEntries(
        patchedFields(patch).map((field) => [field, updated[field]]),
      )
      queryClient.setQueryData<Repository[]>(REPOSITORIES_QUERY_KEY, (old = []) =>
        old.map((repo) => (repo.id === id ? { ...repo, ...merged } : repo)),
      )
    },
    onSettled: () => {
      // Invalidate queries only when all concurrent mutations have settled
      if (queryClient.isMutating({ mutationKey: UPDATE_REPOSITORY_MUTATION_KEY }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
      }
    },
  })
}
