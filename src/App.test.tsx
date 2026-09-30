// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { createRoutes } from './app/routes'
import { useAuthStore } from './features/auth'
import { setAccessToken } from './shared/api/client'

describe('App root integration and protected routes', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    window.history.pushState({}, '', '/')
    setAccessToken(null)
    useAuthStore.setState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
    globalThis.fetch = originalFetch
    setAccessToken(null)
    window.history.pushState({}, '', '/')
  })

  it('redirects to /login and does not render repositories when refresh fails', async () => {
    // Mock refresh returning 401
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized',
      }),
    )

    render(<App />)

    await waitFor(
      () => {
        expect(screen.getByText('AI Code Reviewer')).toBeDefined()
        expect(screen.getByRole('button', { name: /войти через github/i })).toBeDefined()
        // Repositories page content must NOT be rendered
        expect(screen.queryByText('Подключенные репозитории')).toBeNull()
      },
      { timeout: 5000 },
    )
  })

  it('renders repositories when authenticated and navigates to /login after logout', async () => {
    window.history.pushState({}, '', '/repositories')
    const mockUser = {
      id: 114473628,
      login: 'skvertl',
      name: 'Denis',
      avatarUrl: null,
    }

    const mockRepo = {
      id: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
      fullName: 'larchanka-training/dmc-268-ui-t6',
      url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }

    // First: refresh returns 200, me returns 200, repos returns 200
    globalThis.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/auth/refresh')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: 'valid_jwt',
              tokenType: 'Bearer',
              expiresIn: 900,
              user: mockUser,
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        )
      }
      if (urlStr.includes('/auth/me')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ...mockUser,
              workspaces: [
                { id: '123e4567-e89b-12d3-a456-426614174000', name: 'ws', installationId: 1 },
              ],
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        )
      }
      if (urlStr.includes('/repos')) {
        return Promise.resolve(
          new Response(JSON.stringify([mockRepo]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      if (urlStr.includes('/auth/logout')) {
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    render(<App />)

    await waitFor(
      () => {
        expect(screen.getByText('Подключенные репозитории')).toBeDefined()
        expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
      },
      { timeout: 5000 },
    )

    // Now trigger logout
    await act(async () => {
      await useAuthStore.getState().logout()
    })

    await waitFor(
      () => {
        // User is at login screen
        expect(screen.getByRole('button', { name: /войти через github/i })).toBeDefined()
        // Repositories content is unmounted
        expect(screen.queryByText('Подключенные репозитории')).toBeNull()
      },
      { timeout: 5000 },
    )
  })

  it('recovers via refresh when GET /api/repos returns 401 and keeps user in cabinet', async () => {
    window.history.pushState({}, '', '/repositories')
    const mockUser = {
      id: 114473628,
      login: 'skvertl',
      name: 'Denis',
      avatarUrl: null,
    }

    const mockRepo = {
      id: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
      fullName: 'larchanka-training/dmc-268-ui-t6',
      url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }

    let reposCallCount = 0
    let refreshCallCount = 0

    globalThis.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/auth/refresh')) {
        refreshCallCount++
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: `jwt_token_version_${refreshCallCount.toString()}`,
              tokenType: 'Bearer',
              expiresIn: 900,
              user: mockUser,
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        )
      }
      if (urlStr.includes('/auth/me')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ...mockUser,
              workspaces: [
                { id: '123e4567-e89b-12d3-a456-426614174000', name: 'ws', installationId: 1 },
              ],
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        )
      }
      if (urlStr.includes('/repos')) {
        reposCallCount++
        // First repos request fails with 401 Unauthorized
        if (reposCallCount === 1) {
          return Promise.resolve(
            new Response('Unauthorized', {
              status: 401,
              statusText: 'Unauthorized',
            }),
          )
        }
        // Retried repos request returns data
        return Promise.resolve(
          new Response(JSON.stringify([mockRepo]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    render(<App />)

    // Wait for repositories list to be displayed after transparent refresh recovery
    await waitFor(
      () => {
        expect(screen.getByText('Подключенные репозитории')).toBeDefined()
        expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
      },
      { timeout: 5000 },
    )

    // User is in cabinet and not redirected to login
    expect(screen.queryByRole('button', { name: /войти через github/i })).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(reposCallCount).toBe(2)
  })

  it('preserves sidebar collapsed state across page navigation', async () => {
    window.history.pushState({}, '', '/repositories')
    const mockUser = {
      id: 114473628,
      login: 'skvertl',
      name: 'Denis',
      avatarUrl: null,
      workspaces: [],
    }
    const mockRepo = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      fullName: 'larchanka-training/dmc-268-ui-t6',
      url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }

    globalThis.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/auth/refresh')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: 'jwt_token_valid',
              tokenType: 'Bearer',
              expiresIn: 900,
              user: mockUser,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
      }
      if (urlStr.includes('/auth/me')) {
        return Promise.resolve(
          new Response(JSON.stringify(mockUser), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      if (urlStr.includes('/repos')) {
        return Promise.resolve(
          new Response(JSON.stringify([mockRepo]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    const router = createMemoryRouter(createRoutes(), {
      initialEntries: ['/repositories'],
    })

    render(<App router={router} />)

    // Wait for repositories page to load
    await waitFor(() => {
      expect(screen.getByText('Подключенные репозитории')).toBeDefined()
    })

    // Initially menu is expanded, collapse button has aria-label "Свернуть меню"
    const collapseBtn = screen.getByRole('button', { name: 'Свернуть меню' })
    fireEvent.click(collapseBtn)

    // Menu is collapsed, button becomes "Развернуть меню"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Развернуть меню' })).toBeDefined()
    })

    // Click on "Прогоны" in the sidebar menu
    const runsMenuItem = screen.getByText('Прогоны')
    fireEvent.click(runsMenuItem)

    // Wait for RunsPage to render
    await waitFor(() => {
      expect(screen.getByText('Инспектор прогонов AI Review')).toBeDefined()
    })

    // Verify sidebar remains collapsed
    expect(screen.getByRole('button', { name: 'Развернуть меню' })).toBeDefined()
  })

  it('renders error alert in CallbackPage and stays unauthenticated when state parameter is invalid', async () => {
    sessionStorage.clear()
    window.history.pushState({}, '', '/auth/callback?code=some_oauth_code&state=mismatched_state')

    render(<App />)

    await waitFor(
      () => {
        expect(screen.getByText('Ошибка авторизации')).toBeDefined()
        expect(
          screen.getByText(/Недействительный параметр безопасности state \(защита от CSRF\)/i),
        ).toBeDefined()
      },
      { timeout: 5000 },
    )

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(screen.queryByText('Подключенные репозитории')).toBeNull()
  })

  it('does not display mock runs on /runs when USE_MOCKS is not active', async () => {
    const mockUser = {
      id: 114473628,
      login: 'skvertl',
      name: 'Denis',
      avatarUrl: null,
      workspaces: [],
    }

    globalThis.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/auth/refresh')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: 'jwt_token_valid',
              tokenType: 'Bearer',
              expiresIn: 900,
              user: mockUser,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
      }
      if (urlStr.includes('/auth/me')) {
        return Promise.resolve(
          new Response(JSON.stringify(mockUser), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    const router = createMemoryRouter(createRoutes(), {
      initialEntries: ['/runs'],
    })

    render(<App router={router} />)

    await waitFor(
      () => {
        expect(screen.getByText('Инспектор прогонов AI Review')).toBeDefined()
        expect(screen.getByText('Нет доступных прогонов для инспекции')).toBeDefined()
      },
      { timeout: 5000 },
    )

    expect(screen.queryByText(/feat: add login flow/i)).toBeNull()
  })
})
