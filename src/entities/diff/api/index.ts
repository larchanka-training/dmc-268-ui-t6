import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { fromPatch } from '../lib/fromPatch'
import { FileSliceQuerySchema, FileSliceSchema, RawFileDiffSchema } from '../model/schemas'
import type { FileDiff, FileSliceQuery } from '../model/schemas'

/** Keep aligned with `runQueryKeys` / FRONTEND_ARCHITECTURE §2 (no cross-entity import). */
export const diffQueryKeys = {
  diff: (runId: string) => ['runs', runId, 'diff'] as const,
  diffDisabled: () => ['runs', 'diff', null] as const,
  fileSlice: (runId: string, path: string, offset: number) =>
    ['runs', runId, 'files', path, offset] as const,
}

export const diffApi = {
  diff: { endpoint: endpoints.runs.diff, response: z.array(RawFileDiffSchema) },
  files: { endpoint: endpoints.runs.files, query: FileSliceQuerySchema, response: FileSliceSchema },
} as const

function filesEndpoint(runId: string, query: FileSliceQuery) {
  const parsed = FileSliceQuerySchema.parse(query)
  const params = new URLSearchParams({
    path: parsed.path,
    offset: String(parsed.offset),
    limit: String(parsed.limit),
  })
  return { method: 'GET' as const, path: `/runs/${runId}/files?${params.toString()}` }
}

export async function fetchRunDiff(runId: string): Promise<FileDiff[]> {
  const data = await apiClient<unknown>(endpoints.runs.diff(runId))
  const raw = z.array(RawFileDiffSchema).parse(data)
  return raw.map(fromPatch)
}

export async function fetchRunFileSlice(runId: string, query: FileSliceQuery) {
  const data = await apiClient<unknown>(filesEndpoint(runId, query))
  return FileSliceSchema.parse(data)
}

export function useRunDiff(runId: string | undefined) {
  return useQuery({
    queryKey: runId ? diffQueryKeys.diff(runId) : diffQueryKeys.diffDisabled(),
    queryFn: () => {
      if (!runId) {
        throw new Error('runId is required')
      }
      return fetchRunDiff(runId)
    },
    enabled: Boolean(runId),
    placeholderData: keepPreviousData,
  })
}
