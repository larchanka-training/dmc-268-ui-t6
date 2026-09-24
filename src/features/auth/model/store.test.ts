// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH_TOKEN_KEY } from '../../../shared/api/client'
import { MOCK_TOKEN, MOCK_USER, useAuthStore } from './store'

describe('useAuthStore', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    localStorage.clear()
  })

  it('logs in as mock user and updates state and localStorage', () => {
    useAuthStore.getState().loginAsMockUser()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe(MOCK_TOKEN)
    expect(state.user?.login).toBe('skvertl')
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe(MOCK_TOKEN)
  })

  it('logs out and clears state and localStorage', () => {
    useAuthStore.getState().loginAsMockUser()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
  })

  it('handleCallback parses response and updates auth state', async () => {
    const callbackResponse = {
      token: 'jwt_from_backend',
      user: {
        id: 'usr_api_1',
        login: 'backend_user',
        name: 'Backend User',
        avatarUrl: null,
        email: 'api@example.com',
        provider: 'github',
      },
    }

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(callbackResponse), {
        status: 200,
        statusText: 'OK',
      }),
    )

    await useAuthStore.getState().handleCallback('valid_oauth_code')
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('jwt_from_backend')
    expect(state.user?.login).toBe('backend_user')
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('jwt_from_backend')
  })

  it('handleCallback falls back to mock user on mock code', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    await useAuthStore.getState().handleCallback('mock_code_123')
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe(MOCK_TOKEN)
    expect(state.user?.login).toBe(MOCK_USER.login)
  })

  it('initAuth restores user profile when token is present', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'stored_token')
    const profile = {
      id: 'usr_me',
      login: 'my_login',
      name: 'My Name',
      avatarUrl: null,
      email: null,
      provider: 'github',
    }

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(profile), {
        status: 200,
        statusText: 'OK',
      }),
    )

    await useAuthStore.getState().initAuth()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.login).toBe('my_login')
  })
})
