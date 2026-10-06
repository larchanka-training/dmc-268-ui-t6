import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { ReviewCommentSchema } from '../model/schemas'
import type { ReviewComment } from '../model/schemas'

/** Keep aligned with `runQueryKeys.comments` / FRONTEND_ARCHITECTURE §2 (no cross-entity import). */
export const reviewQueryKeys = {
  comments: (runId: string) => ['runs', runId, 'comments'] as const,
}

export const reviewApi = {
  comments: { endpoint: endpoints.runs.comments, response: z.array(ReviewCommentSchema) },
} as const

export async function fetchRunComments(runId: string): Promise<ReviewComment[]> {
  const data = await apiClient<unknown>(endpoints.runs.comments(runId))
  return reviewApi.comments.response.parse(data)
}

export function useRunComments(runId: string | undefined) {
  return useQuery({
    queryKey: runId ? reviewQueryKeys.comments(runId) : (['runs', 'comments', null] as const),
    queryFn: () => {
      if (!runId) {
        throw new Error('runId is required')
      }
      return fetchRunComments(runId)
    },
    enabled: Boolean(runId),
  })
}
