// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'

import { peekAuthReturnTo, saveAuthReturnTo, useAuthStore } from '../../features/auth'
import { RoutedCallbackPage } from './RoutePages'

const originalAuth = useAuthStore.getState()
const originalUrl = window.location.href

afterEach(() => {
  cleanup()
  useAuthStore.setState(originalAuth, true)
  sessionStorage.clear()
  window.history.replaceState(null, '', originalUrl)
})

it('returns an already authenticated user to repositories after a sync-access OAuth callback', async () => {
  const handleCallback = vi.fn().mockResolvedValue(undefined)
  useAuthStore.setState({ isAuthenticated: true, isInitialized: true, handleCallback })
  saveAuthReturnTo('/repositories')
  window.history.replaceState(null, '', '/auth/callback?code=new-access&state=csrf-state')
  const router = createMemoryRouter(
    [
      { path: '/auth/callback', element: <RoutedCallbackPage /> },
      { path: '/repositories', element: <h1>Подключенные репозитории</h1> },
    ],
    { initialEntries: ['/auth/callback?code=new-access&state=csrf-state'] },
  )

  render(
    <Suspense>
      <RouterProvider router={router} />
    </Suspense>,
  )

  expect(await screen.findByRole('heading', { name: 'Подключенные репозитории' })).toBeDefined()
  expect(handleCallback).toHaveBeenCalledExactlyOnceWith('new-access', 'csrf-state')
  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/repositories')
  })
  expect(peekAuthReturnTo('/runs')).toBe('/runs')
  expect(window.location.search).toBe('')
  router.dispose()
})
