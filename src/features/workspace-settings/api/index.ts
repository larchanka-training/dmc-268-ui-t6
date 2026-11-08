import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { AUTH_ME_QUERY_KEY } from '../../../entities/user'
import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { DeleteWorkspaceRequestSchema, type DeleteWorkspaceRequest } from '../model/schemas'

export const DELETE_WORKSPACE_MUTATION_KEY = ['workspaces', 'delete'] as const

function id(value: string): string {
  return z.uuid().parse(value)
}

export type DeleteWorkspaceInput = DeleteWorkspaceRequest

export async function deleteWorkspace(
  workspaceId: string,
  input: DeleteWorkspaceInput,
): Promise<void> {
  const payload = DeleteWorkspaceRequestSchema.parse(input)
  await apiClient<unknown>(endpoints.workspaces.delete(id(workspaceId)), {
    body: payload,
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: DELETE_WORKSPACE_MUTATION_KEY,
    mutationFn: ({
      workspaceId,
      confirmationName,
    }: {
      workspaceId: string
      confirmationName: string
    }) => deleteWorkspace(workspaceId, { confirmation_name: confirmationName }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    },
  })
}
