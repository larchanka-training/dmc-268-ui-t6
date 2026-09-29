// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAccessToken, setAccessToken } from '../../../shared/api/client'
import { STATE_STORAGE_KEY, useAuthStore } from './store'

describe('useAuthStore', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    sessionStorage.clear()
    setAccessToken(null)
    useAuthStore.setState({
      token: null,
      user: null,
      workspaces: [],
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
    expect(state.token).toBe('access_jwt_backend')
    expect(getAccessToken()).toBe('access_jwt_backend')
    expect(state.user?.login).toBe('skvertl')
    expect(sessionStorage.getItem(STATE_STORAGE_KEY)).toBeNull()
  })

  it('handleCallback with mismatched state rejects without making network request', async () => {
    sessionStorage.setItem(STATE_STORAGE_KEY, 'good_state')

    const mockFetch = vi.fn()
    globalThis.fetch = mockFetch

    await expect(useAuthStore.getState().handleCallback('valid_code', 'bad_state')).rejects.toThrow(
      'Invalid OAuth state parameter',
    )

    expect(mockFetch).not.toHaveBeenCalled()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(getAccessToken()).toBeNull()
  })

  it('handleCallback without saved state in sessionStorage rejects (login CSRF protection)', async () => {
    sessionStorage.clear()

    const mockFetch = vi.fn()
    globalThis.fetch = mockFetch

    await expect(
      useAuthStore.getState().handleCallback('attacker_code', 'attacker_state'),
    ).rejects.toThrow('Invalid OAuth state parameter')

    expect(mockFetch).not.toHaveBeenCalled()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
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
    expect(state.token).toBeNull()
    expect(getAccessToken()).toBeNull()
  })

  it('logout calls POST /api/auth/logout and clears in-memory session', async () => {
    setAccessToken('active_token')
    useAuthStore.setState({
      token: 'active_token',
      isAuthenticated: true,
      user: { id: 1, login: 'user', name: null, avatarUrl: null },
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
    expect(state.token).toBeNull()
    expect(getAccessToken()).toBeNull()
  })

  it('initAuth restores user and workspaces when refresh succeeds', async () => {
    const mockFetch = vi
      .fn()
      // POST /auth/refresh returns 200
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'new_token_123' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      // GET /auth/me returns 200
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 114473628,
            login: 'skvertl',
            name: 'Denis',
            avatarUrl: null,
            workspaces: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'team-6',
                installationId: 999,
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
    globalThis.fetch = mockFetch

    await useAuthStore.getState().initAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('new_token_123')
    expect(state.user?.login).toBe('skvertl')
    expect(state.workspaces).toHaveLength(1)
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
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })
})
