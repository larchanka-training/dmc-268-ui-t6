// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAccessToken, setAccessToken, setMockTransport } from '../../../shared/api/client'
import { STATE_STORAGE_KEY, setMockAuthAdapter, setOnLogout, useAuthStore } from './store'

describe('useAuthStore', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    sessionStorage.clear()
    setAccessToken(null)
    setMockTransport(null)
    setMockAuthAdapter(null)
    useAuthStore.setState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    sessionStorage.clear()
    setAccessToken(null)
    setMockTransport(null)
    setMockAuthAdapter(null)
  })

  it('handleCallback verifies state and creates session on successful exchange', async () => {
    sessionStorage.setItem(STATE_STORAGE_KEY, 'expected_random_state')

    const authSession = {
      accessToken: 'access_jwt_backend',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 114473628,
        login: 'skvertl',
        name: 'Denis Skvertl',
        avatarUrl: null,
      },
    }

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(authSession), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    globalThis.fetch = mockFetch

    await useAuthStore.getState().handleCallback('valid_oauth_code', 'expected_random_state')

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(getAccessToken()).toBe('access_jwt_backend')
    expect(sessionStorage.getItem(STATE_STORAGE_KEY)).toBeNull()
  })

  it('handleCallback with mismatched state rejects without making network request', async () => {
    sessionStorage.setItem(STATE_STORAGE_KEY, 'good_state')

    const mockFetch = vi.fn()
    globalThis.fetch = mockFetch

    await expect(useAuthStore.getState().handleCallback('valid_code', 'bad_state')).rejects.toThrow(
      /защита от CSRF/i,
    )

    expect(mockFetch).not.toHaveBeenCalled()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
  })

  it('handleCallback without saved state in sessionStorage rejects (login CSRF protection)', async () => {
    sessionStorage.clear()

    const mockFetch = vi.fn()
    globalThis.fetch = mockFetch

    await expect(
      useAuthStore.getState().handleCallback('attacker_code', 'attacker_state'),
    ).rejects.toThrow(/защита от CSRF/i)

    expect(mockFetch).not.toHaveBeenCalled()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
  })

  it('handleCallback fails closed on backend error without creating session', async () => {
    sessionStorage.setItem(STATE_STORAGE_KEY, 'valid_state')

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Code invalid or expired' }), {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'content-type': 'application/json' },
      }),
    )

    await expect(
      useAuthStore.getState().handleCallback('expired_code', 'valid_state'),
    ).rejects.toThrow()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
  })

  it('logout calls POST /api/auth/logout, clears token and invokes onLogout callback', async () => {
    const onLogout = vi.fn()
    setOnLogout(onLogout)
    setAccessToken('active_token')
    useAuthStore.setState({
      isAuthenticated: true,
    })

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    )
    globalThis.fetch = mockFetch

    await useAuthStore.getState().logout()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({ method: 'POST' }),
    )

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
    expect(onLogout).toHaveBeenCalled()
  })

  it('logout calls POST /api/auth/logout even when in-memory token is null to clear server cookie', async () => {
    setAccessToken(null)
    useAuthStore.setState({
      isAuthenticated: false,
    })

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    )
    globalThis.fetch = mockFetch

    await useAuthStore.getState().logout()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('initAuth sets isAuthenticated: true when refresh and GET /api/auth/me succeed', async () => {
    const mockUser = {
      id: 114473628,
      login: 'skvertl',
      name: 'Denis',
      avatarUrl: null,
      workspaces: [],
    }

    const mockFetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/auth/refresh')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: 'new_token_123',
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
          new Response(JSON.stringify(mockUser), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    globalThis.fetch = mockFetch

    await useAuthStore.getState().initAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(getAccessToken()).toBe('new_token_123')
  })

  it('initAuth fails closed when refresh succeeds but GET /api/auth/me returns 500', async () => {
    const mockFetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/auth/refresh')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: 'new_token_123',
              tokenType: 'Bearer',
              expiresIn: 900,
              user: {
                id: 114473628,
                login: 'skvertl',
                name: 'Denis',
                avatarUrl: null,
              },
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        )
      }
      if (urlStr.includes('/auth/me')) {
        return Promise.resolve(new Response('Server error', { status: 500 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    globalThis.fetch = mockFetch

    await useAuthStore.getState().initAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
  })

  it('initAuth fails closed when refresh succeeds but GET /api/auth/me returns schema-invalid response without workspaces', async () => {
    const mockFetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/auth/refresh')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: 'new_token_123',
              tokenType: 'Bearer',
              expiresIn: 900,
              user: {
                id: 114473628,
                login: 'skvertl',
                name: 'Denis',
                avatarUrl: null,
              },
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        )
      }
      if (urlStr.includes('/auth/me')) {
        // Missing required 'workspaces' array per MeSchema
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 114473628,
              login: 'skvertl',
              name: 'Denis',
              avatarUrl: null,
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    globalThis.fetch = mockFetch

    await useAuthStore.getState().initAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
  })

  it('initAuth in mock mode with mock token restores session without network fetch', async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy

    const LOCAL_MOCK_TOKEN = 'mock_jwt_token_local_test'
    setMockAuthAdapter({
      isMockToken: (t) => t === LOCAL_MOCK_TOKEN,
    })

    // Pre-set token in memory
    setAccessToken(LOCAL_MOCK_TOKEN)

    await useAuthStore.getState().initAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(getAccessToken()).toBe(LOCAL_MOCK_TOKEN)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('initAuth leaves session unauthenticated when refresh fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('No cookie', {
        status: 401,
        statusText: 'Unauthorized',
      }),
    )

    await useAuthStore.getState().initAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
  })
})
