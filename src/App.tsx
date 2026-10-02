import { useMemo } from 'react'
import { RouterProvider } from 'react-router/dom'

import { QueryProvider, UiProvider } from './app/providers'
import { createAppRouter } from './app/routes'

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
