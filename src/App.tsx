import { RouterProvider } from 'react-router'

import { QueryProvider, UiProvider } from './app/providers'
import { createAppRouter } from './app/routes'

const router = createAppRouter()

export function App() {
  return (
    <UiProvider>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </UiProvider>
  )
}

export default App
