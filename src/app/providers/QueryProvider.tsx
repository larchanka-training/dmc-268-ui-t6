import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { setOnAuthMeHydrated, setOnLogout } from '../../features/auth'
import { AUTH_ME_QUERY_KEY } from '../../entities/user'
import { RunStreamBridge } from './RunStreamBridge'
import { queryClient } from './queryClient'

setOnLogout(() => {
  queryClient.clear()
})

setOnAuthMeHydrated((me) => {
  queryClient.setQueryData(AUTH_ME_QUERY_KEY, me)
})

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RunStreamBridge>{children}</RunStreamBridge>
    </QueryClientProvider>
  )
}
