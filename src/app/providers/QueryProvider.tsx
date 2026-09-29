import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { setOnLogout } from '../../features/auth'
import { queryClient } from './queryClient'

setOnLogout(() => {
  queryClient.clear()
})

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
