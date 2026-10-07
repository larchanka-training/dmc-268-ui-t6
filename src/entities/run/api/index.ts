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

// Fixed text by status code, never the api `detail`: it is English (or a FastAPI validation
// array on a malformed id) and must not reach the UI.
export function runMutationErrorMessage(error: unknown, action: 'rerun' | 'cancel'): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 404:
        return 'Прогон не найден — обновите страницу'
      case 409:
        return 'У этого PR уже есть активный прогон или PR закрыт'
      case 422:
        return action === 'rerun'
          ? 'Нельзя перезапустить: у репозитория нет активного правила или версии промпта'
          : 'Сервер отклонил запрос на отмену'
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
