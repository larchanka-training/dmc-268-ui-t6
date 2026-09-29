import { create } from 'zustand'

import type { User, Workspace } from '../../../entities/user'
import { AuthSessionSchema, MeSchema } from '../../../entities/user'
import {
  apiClient,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
  setOnUnauthorized,
} from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { GITHUB_CLIENT_ID, USE_MOCKS } from '../../../shared/config/env'

export const STATE_STORAGE_KEY = 'dmc_auth_oauth_state'

export function generateRandomState(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const MOCK_USER: User = {
  id: 114473628,
  login: 'skvertl',
  name: 'Denis Skvertl',
  avatarUrl: 'https://avatars.githubusercontent.com/u/114473628?v=4',
}

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'larchanka-training',
    installationId: 12345,
  },
]

export const MOCK_TOKEN = 'mock_jwt_token_skvertl_dmc'

export interface AuthState {
  token: string | null
  user: User | null
  workspaces: Workspace[]
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean

  loginWithGitHub: () => void
  handleCallback: (code: string, state?: string | null) => Promise<void>
  loginAsMockUser: () => void
  logout: () => Promise<void>
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  workspaces: [],
  isLoading: false,
  error: null,
  isAuthenticated: false,

  loginWithGitHub: () => {
    if (typeof window === 'undefined') return

    const redirectUri = `${window.location.origin}/auth/callback`
    if (!GITHUB_CLIENT_ID) {
      if (USE_MOCKS) {
        window.location.href = `${redirectUri}?code=mock_code_123`
      } else {
        set({ error: 'Вход не настроен (VITE_GITHUB_CLIENT_ID)' })
      }
      return
    }

    const state = generateRandomState()
    try {
      sessionStorage.setItem(STATE_STORAGE_KEY, state)
    } catch {
      // Ignore sessionStorage errors
    }

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      state,
    })
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`
  },

  handleCallback: async (code: string, state?: string | null) => {
    set({ isLoading: true, error: null })
    try {
      let savedState: string | null = null
      try {
        savedState = sessionStorage.getItem(STATE_STORAGE_KEY)
        sessionStorage.removeItem(STATE_STORAGE_KEY)
      } catch {
        // Ignore storage errors
      }

      // If mock mode is enabled and mock code is passed without real client ID
      if (USE_MOCKS && code.startsWith('mock_')) {
        setAccessToken(MOCK_TOKEN)
        set({
          token: MOCK_TOKEN,
          user: MOCK_USER,
          workspaces: MOCK_WORKSPACES,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
        return
      }

      if (!savedState || !state || state !== savedState) {
        setAccessToken(null)
        set({
          token: null,
          user: null,
          workspaces: [],
          isAuthenticated: false,
          isLoading: false,
          error: 'Недействительный параметр безопасности state (защита от CSRF)',
        })
        throw new Error('Invalid OAuth state parameter')
      }

      // Real code exchange via POST /api/auth/github/callback
      const res = await apiClient<unknown>(endpoints.auth.githubCallback(), {
        body: { code },
      })
      const parsed = AuthSessionSchema.parse(res)

      setAccessToken(parsed.accessToken)
      set({
        token: parsed.accessToken,
        user: parsed.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setAccessToken(null)
      const message = err instanceof Error ? err.message : 'Ошибка аутентификации'
      set({
        token: null,
        user: null,
        workspaces: [],
        isAuthenticated: false,
        isLoading: false,
        error: message,
      })
      throw err
    }
  },

  loginAsMockUser: () => {
    if (!USE_MOCKS && import.meta.env.MODE !== 'test') return
    setAccessToken(MOCK_TOKEN)
    set({
      token: MOCK_TOKEN,
      user: MOCK_USER,
      workspaces: MOCK_WORKSPACES,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    })
  },

  logout: async () => {
    try {
      await apiClient(endpoints.auth.logout())
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null)
      set({
        token: null,
        user: null,
        workspaces: [],
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  },

  initAuth: async () => {
    // If mock mode is explicitly on and mock user is in memory
    if (USE_MOCKS && getAccessToken() === MOCK_TOKEN) {
      set({
        token: MOCK_TOKEN,
        user: MOCK_USER,
        workspaces: MOCK_WORKSPACES,
        isAuthenticated: true,
        isLoading: false,
      })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const newToken = await refreshAccessToken()
      if (!newToken) {
        set({
          token: null,
          user: null,
          workspaces: [],
          isAuthenticated: false,
          isLoading: false,
        })
        return
      }

      const res = await apiClient<unknown>(endpoints.auth.me(), { token: newToken })
      const me = MeSchema.parse(res)
      set({
        token: newToken,
        user: {
          id: me.id,
          login: me.login,
          name: me.name,
          avatarUrl: me.avatarUrl,
        },
        workspaces: me.workspaces,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch {
      setAccessToken(null)
      set({
        token: null,
        user: null,
        workspaces: [],
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },
}))

// Automatically connect 401 unauthorized handler to logout
setOnUnauthorized(() => {
  void useAuthStore.getState().logout()
})
