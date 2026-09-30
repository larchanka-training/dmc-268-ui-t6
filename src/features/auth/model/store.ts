import { create } from 'zustand'

import { AuthSessionSchema, fetchMe } from '../../../entities/user'
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

let onLogoutCallback: (() => void) | null = null

export function setOnLogout(callback: () => void): void {
  onLogoutCallback = callback
}

export interface AuthState {
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean

  loginWithGitHub: () => void
  handleCallback: (code: string, state?: string | null) => Promise<void>
  loginAsMockUser: () => void
  logout: () => Promise<void>
  initAuth: () => Promise<void>
}

let isLoggingOut = false

export const useAuthStore = create<AuthState>((set) => ({
  isLoading: false,
  error: null,
  isAuthenticated: false,

  loginWithGitHub: () => {
    if (typeof window === 'undefined') return

    const redirectUri = `${window.location.origin}/auth/callback`
    if (!GITHUB_CLIENT_ID) {
      if (USE_MOCKS) {
        void import('../../../app/mocks/mockTransport').then((m) => {
          window.location.href = `${redirectUri}?code=${m.MOCK_OAUTH_CODE}`
        })
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

      if (!savedState || !state || state !== savedState) {
        setAccessToken(null)
        const errorMsg = 'Недействительный параметр безопасности state (защита от CSRF)'
        set({
          isAuthenticated: false,
          isLoading: false,
          error: errorMsg,
        })
        throw new Error(errorMsg)
      }

      // Code exchange via POST /api/auth/github/callback
      const res = await apiClient<unknown>(endpoints.auth.githubCallback(), {
        body: { code },
      })
      const parsed = AuthSessionSchema.parse(res)

      setAccessToken(parsed.accessToken)
      set({
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setAccessToken(null)
      const message = err instanceof Error ? err.message : 'Ошибка аутентификации'
      set({
        isAuthenticated: false,
        isLoading: false,
        error: message,
      })
      throw err
    }
  },

  loginAsMockUser: () => {
    if (!USE_MOCKS && import.meta.env.MODE !== 'test') return
    void import('../../../app/mocks/mockTransport').then((m) => {
      setAccessToken(m.MOCK_TOKEN)
      set({
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    })
  },

  logout: async () => {
    if (isLoggingOut) return
    isLoggingOut = true
    try {
      await apiClient(endpoints.auth.logout())
    } catch {
      // Ignore network errors on logout
    } finally {
      isLoggingOut = false
      setAccessToken(null)
      onLogoutCallback?.()
      set({
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  },

  initAuth: async () => {
    if (USE_MOCKS) {
      const { MOCK_TOKEN } = await import('../../../app/mocks/mockTransport')
      if (getAccessToken() === MOCK_TOKEN) {
        set({
          isAuthenticated: true,
          isLoading: false,
        })
        return
      }
    }

    set({ isLoading: true, error: null })
    try {
      const newToken = await refreshAccessToken()
      if (!newToken) {
        set({
          isAuthenticated: false,
          isLoading: false,
        })
        return
      }

      // FA Ф-15: fail closed — verify session via GET /api/auth/me
      await fetchMe(newToken)

      set({
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch {
      setAccessToken(null)
      set({
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
