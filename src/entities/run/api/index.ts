import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Query, QueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { ApiError, apiClient } from '../../../shared/api/client'
import { endpoints, type Endpoint } from '../../../shared/api/endpoints'
import { i18n } from '../../../shared/i18n'
import { VCS_ACCESS_NAME, type VcsProvider } from '../../../shared/model/provider'
import {
  RunActionSchema,
  RunDetailSchema,
  RunListPageSchema,
  RunListQuerySchema,
  RunSessionSchema,
  RunUpdatedEventSchema,
} from '../model/schemas'
import type {
  RunAction,
  RunDetail,
  RunListPage,
  RunListQuery,
  RunSession,
  RunStatus,
} from '../model/schemas'
import { isActive } from '../lib/status'
// Run detail parses `findings[]` with `FindingViewSchema` from `entities/review`
// (allowed cross-entity import; see FRONTEND_ARCHITECTURE §1 and `.agents/rules/frontend.md`).
import { FindingViewSchema } from '../../review'

export const runQueryKeys = {
  /** Prefix of every runs list, filtered or not: `invalidateQueries` with it reaches them all. */
  list: () => ['runs', 'list'] as const,
  listFiltered: ({ repo }: { repo?: string }) => ['runs', 'list', { repo: repo ?? null }] as const,
  detailDisabled: () => ['runs', 'detail', null] as const,
  detail: (id: string) => ['runs', id] as const,
  actions: (id: string) => ['runs', id, 'actions'] as const,
  actionResponse: (id: string, index: number) =>
    ['runs', id, 'actions', index, 'response'] as const,
  diff: (id: string) => ['runs', id, 'diff'] as const,
  comments: (id: string) => ['runs', id, 'comments'] as const,
}

export const runApi = {
  list: { endpoint: endpoints.runs.list, query: RunListQuerySchema, response: RunListPageSchema },
  detail: { endpoint: endpoints.runs.detail, response: RunDetailSchema },
  actions: { endpoint: endpoints.runs.actions, response: z.array(RunActionSchema) },
  actionResponse: { endpoint: endpoints.runs.actionResponse, response: z.unknown() },
  cancel: { endpoint: endpoints.runs.cancel, response: RunSessionSchema },
  rerun: { endpoint: endpoints.runs.rerun, response: RunSessionSchema },
  stream: { endpoint: endpoints.stream, event: RunUpdatedEventSchema },
} as const

// Fixed text by status code, never the api `detail`: it is English (or a FastAPI validation
// array on a malformed id) and must not reach the UI.
export function runMutationErrorMessage(
  error: unknown,
  action: 'rerun' | 'cancel',
  provider: VcsProvider,
): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 404:
        return i18n.t('runs.errors.mutationNotFound')
      case 409:
        if (action === 'rerun') {
          return provider === 'github'
            ? i18n.t('runs.errors.rerunConflict')
            : i18n.t('runs.errors.rerunConflictProvider', {
                accessName: VCS_ACCESS_NAME[provider],
              })
        }
        break
      case 422:
        return action === 'rerun'
          ? i18n.t('runs.errors.rerunNoRule')
          : i18n.t('runs.errors.cancelRejected')
    }
  }
  return i18n.t('runs.errors.mutationFailed')
}

export { parseRunStepEvent, parseRunUpdatedEvent, parseSseBuffer } from './runStreamParse'

/** The list path with its query. `endpoints.runs.list()` stays path-only; empty params are left out. */
export function runListEndpoint(query: RunListQuery = {}): Endpoint {
  const parsed = RunListQuerySchema.parse(query)
  const params = new URLSearchParams()
  if (parsed.status !== undefined) {
    params.set('status', parsed.status)
  }
  if (parsed.repo !== undefined) {
    params.set('repo', parsed.repo)
  }
  if (parsed.cursor !== undefined) {
    params.set('cursor', parsed.cursor)
  }
  if (parsed.limit !== undefined) {
    params.set('limit', String(parsed.limit))
  }
  const search = params.toString()
  const { method, path } = endpoints.runs.list()
  return { method, path: search === '' ? path : `${path}?${search}` }
}

export async function fetchRunList(query: RunListQuery = {}): Promise<RunListPage> {
  const data = await apiClient<unknown>(runListEndpoint(query))
  return RunListPageSchema.parse(data)
}

/**
 * A runs list whose next page is being loaded: `fetchNextPage` marks that fetch `fetchMore`. A load
 * paused for lack of network (`fetchStatus: 'paused'`) is still a page load, and an invalidation
 * would turn it into a refetch of the loaded pages; `fetchMeta` outlives the fetch, so only an
 * `idle` list is not loading.
 */
function isLoadingListPage(query: Query): boolean {
  return query.state.fetchStatus !== 'idle' && Boolean(query.state.fetchMeta?.fetchMore)
}

/** Lists with a trailing invalidation already queued; a second event of the same load adds none. */
const listsWithTrailingInvalidation = new WeakSet<Query>()

/**
 * Invalidates `query` once its page load has ended, resolved, rejected or abandoned. A plain
 * `invalidateQueries` would cancel the page in flight and refetch only the pages loaded before it.
 */
function invalidateAfterPageLoad(queryClient: QueryClient, query: Query): void {
  if (listsWithTrailingInvalidation.has(query)) {
    return
  }
  listsWithTrailingInvalidation.add(query)
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.query !== query) {
      return
    }
    if (event.type === 'removed') {
      unsubscribe()
      return
    }
    if (event.type !== 'updated' || isLoadingListPage(query)) {
      return
    }
    unsubscribe()
    listsWithTrailingInvalidation.delete(query)
    void queryClient.invalidateQueries({ queryKey: query.queryKey, exact: true })
  })
}

/**
 * Invalidates every runs list (`runQueryKeys.list()` prefix). A list that is loading a page is not
 * cancelled: the plain `cancelRefetch: false` would join the fetch in flight and its success would
 * clear `isInvalidated`, losing the event. Such a list is invalidated once, after the page has
 * landed, however many events arrive meanwhile.
 */
export function invalidateRunLists(queryClient: QueryClient): void {
  const loading = queryClient
    .getQueryCache()
    .findAll({ queryKey: runQueryKeys.list() })
    .filter(isLoadingListPage)
  for (const query of loading) {
    invalidateAfterPageLoad(queryClient, query)
  }
  void queryClient.invalidateQueries({
    queryKey: runQueryKeys.list(),
    ...(loading.length > 0 && { predicate: (query: Query) => !loading.includes(query) }),
  })
}

/** Runs per request of the list; sent explicitly, the api default is larger. */
export const RUN_LIST_PAGE_SIZE = 20

/** The runs list, one page per request. `repo` limits it to one repository. */
export function useRunList({ repo }: { repo?: string } = {}) {
  return useInfiniteQuery({
    queryKey: runQueryKeys.listFiltered({ repo }),
    queryFn: ({ pageParam }) =>
      fetchRunList({ repo, cursor: pageParam ?? undefined, limit: RUN_LIST_PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
}

/**
 * `RunDetail` plus `droppedFindings`: how many `findings[]` entries failed the format check and
 * were dropped. Client-only (the api has no such field), so it stays out of `RunDetailSchema`;
 * `severityCounts` still counts those findings, which is why the header shows the number.
 */
export type LoadedRunDetail = RunDetail & { droppedFindings: number }

export async function fetchRunDetail(id: string): Promise<LoadedRunDetail> {
  const data = await apiClient<unknown>(endpoints.runs.detail(id))
  let droppedFindings = 0
  const sanitized =
    typeof data === 'object' && data !== null && 'findings' in data && Array.isArray(data.findings)
      ? {
          ...data,
          findings: data.findings.flatMap((item) => {
            const parsed = FindingViewSchema.safeParse(item)
            if (!parsed.success) {
              droppedFindings += 1
              return []
            }
            return [parsed.data]
          }),
        }
      : data
  const detail = RunDetailSchema.parse(sanitized)
  if (droppedFindings > 0) {
    console.warn('fetchRunDetail: dropped invalid findings', {
      runId: id,
      dropped: droppedFindings,
    })
  }
  return { ...detail, droppedFindings }
}

export function useRunDetail(runId: string | undefined) {
  return useQuery({
    queryKey: runId ? runQueryKeys.detail(runId) : runQueryKeys.detailDisabled(),
    queryFn: () => {
      if (!runId) {
        throw new Error('runId is required')
      }
      return fetchRunDetail(runId)
    },
    enabled: Boolean(runId),
  })
}

export async function fetchRunActions(id: string): Promise<RunAction[]> {
  const data = await apiClient<unknown>(endpoints.runs.actions(id))
  return z.array(RunActionSchema).parse(data)
}

/** How often the action log is refetched while the run is active (queued, running, publishing). */
export const RUN_ACTIONS_POLL_MS = 3000

export function useRunActions(runId: string | undefined, status?: RunStatus) {
  return useQuery({
    queryKey: runId ? runQueryKeys.actions(runId) : (['runs', 'actions', null] as const),
    queryFn: () => {
      if (!runId) {
        throw new Error('runId is required')
      }
      return fetchRunActions(runId)
    },
    enabled: Boolean(runId),
    // Unknown status (detail not loaded yet) does not poll: the first fetch and the stream
    // invalidation cover it; a terminal run's log never changes again.
    refetchInterval: status && isActive(status) ? RUN_ACTIONS_POLL_MS : false,
  })
}

export async function fetchRunActionResponse(runId: string, index: number): Promise<unknown> {
  const data = await apiClient<unknown>(endpoints.runs.actionResponse(runId, index))
  return runApi.actionResponse.response.parse(data)
}

export function useRunActionResponse(runId: string | undefined, index: number | null) {
  return useQuery({
    queryKey:
      runId && index !== null
        ? runQueryKeys.actionResponse(runId, index)
        : (['runs', 'actions', 'response', null] as const),
    queryFn: () => {
      if (!runId || index === null) {
        throw new Error('runId and index are required')
      }
      return fetchRunActionResponse(runId, index)
    },
    enabled: Boolean(runId) && index !== null,
  })
}

export async function cancelRun(id: string): Promise<RunSession> {
  const data = await apiClient<unknown>(endpoints.runs.cancel(id))
  return RunSessionSchema.parse(data)
}

export async function rerunRun(id: string): Promise<RunSession> {
  const data = await apiClient<unknown>(endpoints.runs.rerun(id))
  return RunSessionSchema.parse(data)
}

export function useCancelRun(runId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!runId) {
        throw new Error('runId is required')
      }
      return cancelRun(runId)
    },
    onSuccess: (session) => {
      // The api session's `pullRequest` has no author/headRef/baseRef; keep the detail's own
      // until the refetch below lands.
      queryClient.setQueryData(
        runQueryKeys.detail(session.id),
        (prev: LoadedRunDetail | undefined) =>
          prev ? { ...prev, ...session, pullRequest: prev.pullRequest } : prev,
      )
      void queryClient.invalidateQueries({ queryKey: runQueryKeys.detail(session.id) })
      void queryClient.invalidateQueries({ queryKey: runQueryKeys.list() })
    },
  })
}

export function useRerunRun(runId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!runId) {
        throw new Error('runId is required')
      }
      return rerunRun(runId)
    },
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: runQueryKeys.list() })
      void queryClient.invalidateQueries({ queryKey: runQueryKeys.detail(session.id) })
    },
  })
}
