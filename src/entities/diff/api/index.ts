import { z } from 'zod'

import { endpoints } from '../../../shared/api/endpoints'
import { FileSliceQuerySchema, FileSliceSchema, RawFileDiffSchema } from '../model/schemas'

export const diffApi = {
  diff: { endpoint: endpoints.runs.diff, response: z.array(RawFileDiffSchema) },
  files: { endpoint: endpoints.runs.files, query: FileSliceQuerySchema, response: FileSliceSchema },
} as const
