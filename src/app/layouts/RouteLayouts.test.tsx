// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { lazy, Suspense, type FC } from 'react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../features/auth'
import { UiProvider } from '../providers'
import { PageFallback, ProtectedLayout } from './RouteLayouts'

const originalAuth = useAuthStore.getState()

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  useAuthStore.setState(originalAuth, true)
})

function elapse(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

it('waits behind the late page loader while the session is checked, not behind an instant spinner', () => {
  useAuthStore.setState({ isAuthenticated: false, isLoading: true, isInitialized: false })
  const router = createMemoryRouter(
    [
      {
        element: <ProtectedLayout />,
        children: [{ path: '/repositories', element: <h1>Репозитории</h1> }],
      },
    ],
    { initialEntries: ['/repositories'] },
  )

  const { container } = render(
    <UiProvider>
      <RouterProvider router={router} />
    </UiProvider>,
  )

  // A fast check never shows a ring; a slow one shows it, from the window's centre layer.
  expect(container.querySelector('.ant-spin')).toBeNull()
  expect(screen.queryByTestId('page-loader')).toBeNull()
  elapse(299)
  expect(screen.queryByTestId('page-loader')).toBeNull()
  elapse(1)
  elapse(16)
  expect(screen.getByTestId('page-loader').dataset.state).toBe('shown')

  // The session is ready: the page appears at once and the ring fades out over it, two frames later.
  act(() => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })
  })
  expect(screen.getByRole('heading', { name: 'Репозитории' })).toBeDefined()
  expect(screen.getByTestId('page-loader').dataset.state).toBe('shown')
  elapse(16)
  elapse(16)
  expect(screen.getByTestId('page-loader').dataset.state).toBe('hidden')
  elapse(200)
  expect(screen.queryByTestId('page-loader')).toBeNull()
  router.dispose()
})

const NeverLoadedPage = lazy(() => new Promise<{ default: FC }>(() => undefined))

it('keeps one 300 ms wait when the session check hands over to the Suspense fallback of a page', () => {
  useAuthStore.setState({ isAuthenticated: false, isLoading: true, isInitialized: false })
  const router = createMemoryRouter(
    [
      {
        element: <ProtectedLayout />,
        children: [
          {
            element: (
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            ),
            children: [{ path: '/repositories', element: <NeverLoadedPage /> }],
          },
        ],
      },
    ],
    { initialEntries: ['/repositories'] },
  )

  render(
    <UiProvider>
      <RouterProvider router={router} />
    </UiProvider>,
  )

  elapse(200)
  // The session is ready and the page chunk is still loading: both markers are in one commit.
  act(() => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })
  })
  elapse(99)
  expect(screen.queryByTestId('page-loader')).toBeNull()
  elapse(1)
  expect(screen.getAllByTestId('page-loader')).toHaveLength(1)
  router.dispose()
})
