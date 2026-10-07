import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { ApiError, apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import {
  RunActionSchema,
  RunDetailSchema,
  RunListPageSchema,
  RunListQuerySchema,
  RunSessionSchema,
  RunUpdatedEventSchema,
} from '../model/schemas'
import type { RunAction, RunDetail, RunListPage, RunSession } from '../model/schemas'
// Run detail parses `findings[]` with `FindingViewSchema` from `entities/review`
// (allowed cross-entity import; see FRONTEND_ARCHITECTURE §1 and `.agents/rules/frontend.md`).
import { FindingViewSchema } from '../../review'

export const runQueryKeys = {
  list: () => ['runs', 'list'] as const,
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

export function runMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return 'У этого PR уже есть активный прогон или PR закрыт'
    }
    if (typeof error.data === 'object' && error.data !== null && 'detail' in error.data) {
      const detail = error.data.detail
      if (typeof detail === 'string' && detail.length > 0) {
        return detail
      }
    }
  }
  return 'Не удалось выполнить операцию'
}

export { parseRunUpdatedEvent, parseSseBuffer } from './runStreamParse'

export async function fetchRunList(): Promise<RunListPage> {
  const data = await apiClient<unknown>(endpoints.runs.list())
  return RunListPageSchema.parse(data)
}

export function useRunList() {
  return useQuery({
    queryKey: runQueryKeys.list(),
    queryFn: fetchRunList,
  })
}

export async function fetchRunDetail(id: string): Promise<RunDetail> {
  const data = await apiClient<unknown>(endpoints.runs.detail(id))
  const sanitized =
    typeof data === 'object' && data !== null && 'findings' in data && Array.isArray(data.findings)
      ? {
          ...data,
          findings: data.findings.flatMap((item) => {
            const parsed = FindingViewSchema.safeParse(item)
            return parsed.success ? [parsed.data] : []
          }),
        }
      : data
  return RunDetailSchema.parse(sanitized)
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

export function useRunActions(runId: string | undefined) {
  return useQuery({
    queryKey: runId ? runQueryKeys.actions(runId) : (['runs', 'actions', null] as const),
    queryFn: () => {
      if (!runId) {
        throw new Error('runId is required')
      }
      return fetchRunActions(runId)
    },
    enabled: Boolean(runId),
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
      queryClient.setQueryData(runQueryKeys.detail(session.id), (prev: RunDetail | undefined) =>
        prev ? { ...prev, ...session } : prev,
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
      void fetchRunDetail(session.id)
        .then((detail) => {
          queryClient.setQueryData(runQueryKeys.detail(session.id), detail)
        })
        .catch(() => {
          /* detail query refetches on mount */
        })
    },
  })
}
