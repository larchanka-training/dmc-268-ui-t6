import { useEffect, useMemo } from 'react'
import { RouterProvider } from 'react-router/dom'

import { RootErrorFallback } from './app/layouts'
import { QueryProvider, UiProvider } from './app/providers'
import { createAppRouter } from './app/routes'
import { useAuthStore } from './features/auth'
import { ErrorBoundary } from './shared/ui'

export interface AppProps {
  router?: ReturnType<typeof createAppRouter>
}

/**
 * The root error boundary stands above the providers and above this component's own hooks, so an
 * exception outside the routes shows the 500 screen instead of a blank page. An exception inside a
 * route still goes to the route's `errorElement`.
 */
export function App({ router }: AppProps = {}) {
  return (
    <ErrorBoundary fallback={<RootErrorFallback />}>
      <AppContent router={router} />
    </ErrorBoundary>
  )
}

function AppContent({ router }: AppProps) {
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
