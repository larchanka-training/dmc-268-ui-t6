import { useMemo } from 'react'
import { RouterProvider } from 'react-router'

import { QueryProvider, UiProvider } from './app/providers'
import { createAppRouter } from './app/routes'
import { USE_MOCKS } from './shared/config/env'

if (USE_MOCKS) {
  void import('./app/mocks/mockTransport').then((m) => {
    m.initMockTransport()
  })
}

export interface AppProps {
  router?: ReturnType<typeof createAppRouter>
}

export function App({ router }: AppProps = {}) {
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
