// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'

import { peekAuthReturnTo, useAuthStore } from '../../features/auth'
import { ProtectedLayout } from './RouteLayouts'
import { RoutedCallbackPage } from './RoutePages'

const originalAuth = useAuthStore.getState()
const originalUrl = window.location.href

afterEach(() => {
  cleanup()
  useAuthStore.setState(originalAuth, true)
  sessionStorage.clear()
  window.history.replaceState(null, '', originalUrl)
})

// A run page with every filter set: two files (one with a space and a Cyrillic letter), two
// severity groups and a Cyrillic query, as `writeFindingFilters` serialises them.
const FILTERED_RUN_URL =
  '/runs/11111111-1111-4111-8111-000000000004?tab=x&file=src%2Fa.ts&file=docs%2F%D0%B0+b.md&severity=critical&severity=info&q=%D0%BE%D1%88%D0%B8%D0%B1%D0%BA%D0%B0'

it('a filtered run URL survives the login redirect and the OAuth return', async () => {
  const handleCallback = vi.fn().mockResolvedValue(undefined)
  useAuthStore.setState({
    isAuthenticated: false,
    isLoading: false,
    isInitialized: true,
    handleCallback,
  })
  const router = createMemoryRouter(
    [
      {
        element: <ProtectedLayout />,
        children: [{ path: '/runs/:runId', element: <h1>Страница прогона</h1> }],
      },
      { path: '/login', element: <h1>Вход</h1> },
      { path: '/auth/callback', element: <RoutedCallbackPage /> },
    ],
    { initialEntries: [FILTERED_RUN_URL] },
  )

  render(
    <Suspense>
      <RouterProvider router={router} />
    </Suspense>,
  )

  // 1. the protected route sends the visitor to /login and remembers the whole URL
  expect(await screen.findByRole('heading', { name: 'Вход' })).toBeDefined()
  expect(router.state.location.pathname).toBe('/login')
  expect(peekAuthReturnTo('/repositories')).toBe(FILTERED_RUN_URL)

  // 2. the OAuth callback succeeds and returns to the very same URL, filters included
  window.history.replaceState(null, '', '/auth/callback?code=new-access&state=csrf-state')
  useAuthStore.setState({ isAuthenticated: true })
  await router.navigate('/auth/callback?code=new-access&state=csrf-state')

  expect(await screen.findByRole('heading', { name: 'Страница прогона' })).toBeDefined()
  await waitFor(() => {
    expect(router.state.location.pathname + router.state.location.search).toBe(FILTERED_RUN_URL)
  })
  expect(peekAuthReturnTo('/repositories')).toBe('/repositories')
  router.dispose()
})
