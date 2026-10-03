import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { fromPatch } from '../lib/fromPatch'
import { FileSliceQuerySchema, FileSliceSchema, RawFileDiffSchema } from '../model/schemas'
import type { FileDiff } from '../model/schemas'

export const diffApi = {
  diff: { endpoint: endpoints.runs.diff, response: z.array(RawFileDiffSchema) },
  files: { endpoint: endpoints.runs.files, query: FileSliceQuerySchema, response: FileSliceSchema },
} as const

export async function fetchRunDiff(runId: string): Promise<FileDiff[]> {
  const data = await apiClient<unknown>(endpoints.runs.diff(runId))
  const raw = z.array(RawFileDiffSchema).parse(data)
  return raw.map(fromPatch)
}

export function useRunDiff(runId: string | undefined) {
  return useQuery({
    queryKey: runId ? (['runs', runId, 'diff'] as const) : (['runs'] as const),
    queryFn: () => {
      if (!runId) {
        throw new Error('runId is required')
      }
      return fetchRunDiff(runId)
    },
    enabled: Boolean(runId),
  })
}
