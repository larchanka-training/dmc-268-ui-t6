import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import {
  RunActionSchema,
  RunDetailSchema,
  RunListPageSchema,
  RunListQuerySchema,
  RunSessionSchema,
  RunUpdatedEventSchema,
} from '../model/schemas'
import type { RunDetail, RunListPage } from '../model/schemas'

export const runQueryKeys = {
  list: () => ['runs', 'list'] as const,
  detail: (id: string) => ['runs', id] as const,
  actions: (id: string) => ['runs', id, 'actions'] as const,
  diff: (id: string) => ['runs', id, 'diff'] as const,
}

export const runApi = {
  list: { endpoint: endpoints.runs.list, query: RunListQuerySchema, response: RunListPageSchema },
  detail: { endpoint: endpoints.runs.detail, response: RunDetailSchema },
  actions: { endpoint: endpoints.runs.actions, response: z.array(RunActionSchema) },
  actionResponse: { endpoint: endpoints.runs.actionResponse, response: z.unknown() },
  cancel: { endpoint: endpoints.runs.cancel, response: RunSessionSchema },
  stream: { endpoint: endpoints.stream, event: RunUpdatedEventSchema },
} as const

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
  return RunDetailSchema.parse(data)
}

export function useRunDetail(runId: string | undefined) {
  return useQuery({
    queryKey: runId ? runQueryKeys.detail(runId) : runQueryKeys.list(),
    queryFn: () => {
      if (!runId) {
        throw new Error('runId is required')
      }
      return fetchRunDetail(runId)
    },
    enabled: Boolean(runId),
  })
}
