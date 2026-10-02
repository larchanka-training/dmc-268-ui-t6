import { useEffect, useMemo } from 'react'
import { RouterProvider } from 'react-router/dom'

import { QueryProvider, UiProvider } from './app/providers'
import { createAppRouter } from './app/routes'
import { useAuthStore } from './features/auth'

export interface AppProps {
  router?: ReturnType<typeof createAppRouter>
}

export function App({ router }: AppProps = {}) {
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const initAuth = useAuthStore((state) => state.initAuth)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')) {
      return
    }
    if (!isInitialized) {
      void initAuth()
    }
  }, [isInitialized, initAuth])

  const activeRouter = useMemo(() => router ?? createAppRouter(), [router])

  return (
    <UiProvider>
      <QueryProvider>
        <RouterProvider router={activeRouter} />
      </QueryProvider>
    </UiProvider>
  )
}

export default App
