import { z } from 'zod'

import { endpoints } from '../../../shared/api/endpoints'
import {
  RunActionSchema,
  RunListPageSchema,
  RunListQuerySchema,
  RunSessionSchema,
  RunUpdatedEventSchema,
} from '../model/schemas'

export const runApi = {
  list: { endpoint: endpoints.runs.list, query: RunListQuerySchema, response: RunListPageSchema },
  detail: { endpoint: endpoints.runs.detail, response: RunSessionSchema },
  actions: { endpoint: endpoints.runs.actions, response: z.array(RunActionSchema) },
  actionResponse: { endpoint: endpoints.runs.actionResponse, response: z.unknown() },
  cancel: { endpoint: endpoints.runs.cancel, response: RunSessionSchema },
  stream: { endpoint: endpoints.stream, event: RunUpdatedEventSchema },
} as const
