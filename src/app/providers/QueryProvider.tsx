import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { setOnLogout } from '../../features/auth'
import { RunStreamBridge } from './RunStreamBridge'
import { queryClient } from './queryClient'

setOnLogout(() => {
  queryClient.clear()
})

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RunStreamBridge>{children}</RunStreamBridge>
    </QueryClientProvider>
  )
}
