import { z } from 'zod'

// Contract api#554 / ADR api#552 requires snake_case confirmation_name (exception to frontend.md §4 wire camelCase rule).
export const DeleteWorkspaceRequestSchema = z.object({
  confirmation_name: z.string().min(1).max(255),
})

export type DeleteWorkspaceRequest = z.infer<typeof DeleteWorkspaceRequestSchema>
