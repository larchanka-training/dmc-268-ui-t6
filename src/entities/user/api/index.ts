import { useQuery } from '@tanstack/react-query'

import { apiClient } from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { MeSchema, type Me } from '../model/schemas'

export const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const

export async function fetchMe(token?: string | null): Promise<Me> {
  const res = await apiClient<unknown>(endpoints.auth.me(), token ? { token } : undefined)
  return MeSchema.parse(res)
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: () => fetchMe(),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
