import { z } from 'zod'

import { endpoints } from '../../../shared/api/endpoints'
import { ReviewCommentSchema } from '../model/schemas'

export const reviewApi = {
  comments: { endpoint: endpoints.runs.comments, response: z.array(ReviewCommentSchema) },
} as const
