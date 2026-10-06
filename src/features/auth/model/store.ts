import { create } from 'zustand'

import { AuthSessionSchema, fetchMe } from '../../../entities/user'
import {
  apiClient,
  ApiError,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
  setOnUnauthorized,
} from '../../../shared/api/client'
import { formatApiErrorMessage } from '../../../shared/api/apiErrorMessage'
import { endpoints } from '../../../shared/api/endpoints'
import { GITHUB_CLIENT_ID, isMockMode } from '../../../shared/config/env'

export const STATE_STORAGE_KEY = 'dmc_auth_oauth_state'
export const MOCK_TOKEN = 'mock_jwt_token_skvertl_dmc'

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

export interface MockAuthAdapter {
  getMockOAuthCode?: () => string
  loginAsMockUser?: () => void
  isMockToken?: (token: string | null) => boolean
}

let mockAuthAdapter: MockAuthAdapter | null = null

export function setMockAuthAdapter(adapter: MockAuthAdapter | null): void {
  mockAuthAdapter = adapter
}

function isMockOAuthCode(code: string): boolean {
  if (mockAuthAdapter?.getMockOAuthCode?.() === code) {
    return true
  }
  return isMockMode() && code.startsWith('mock_')
}

export interface AuthState {
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  isAuthenticated: boolean

  loginWithGitHub: () => void
  handleCallback: (code: string, state?: string | null) => Promise<void>
  loginAsMockUser: () => void
  logout: () => Promise<void>
  initAuth: () => Promise<void>
  markInitialized: () => void
}

let isLoggingOut = false

export function resetAuthSession(): void {
  setAccessToken(null)
  onLogoutCallback?.()
  useAuthStore.setState({
    isAuthenticated: false,
    isInitialized: true,
    isLoading: false,
    error: null,
  })
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoading: false,
  isInitialized: false,
  error: null,
  isAuthenticated: false,

  markInitialized: () => {
    set({ isInitialized: true })
  },

  loginWithGitHub: () => {
    if (typeof window === 'undefined') return

    const redirectUri = `${window.location.origin}/auth/callback`
    if (!GITHUB_CLIENT_ID) {
      const mockCode = mockAuthAdapter?.getMockOAuthCode?.()
      if (mockCode) {
        window.location.href = `${redirectUri}?code=${mockCode}`
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

      if (isMockOAuthCode(code)) {
        const res = await apiClient<unknown>(endpoints.auth.githubCallback(), {
          body: { code },
        })
        const parsed = AuthSessionSchema.parse(res)

        setAccessToken(parsed.accessToken)
        set({
          isAuthenticated: true,
          isInitialized: true,
          isLoading: false,
          error: null,
        })
        return
      }

      if (!savedState || !state || state !== savedState) {
        setAccessToken(null)
        const errorMsg = 'Недействительный параметр безопасности state (защита от CSRF)'
        set({
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
          error: errorMsg,
        })
        throw new Error(errorMsg)
      }

      const res = await apiClient<unknown>(endpoints.auth.githubCallback(), {
        body: { code },
      })
      const parsed = AuthSessionSchema.parse(res)

      setAccessToken(parsed.accessToken)
      set({
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setAccessToken(null)
      const message =
        err instanceof ApiError
          ? formatApiErrorMessage(err.status, err.statusText, err.data)
          : err instanceof Error
            ? err.message
            : 'Ошибка аутентификации'
      set({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: message,
      })
      throw err
    }
  },

  loginAsMockUser: () => {
    mockAuthAdapter?.loginAsMockUser?.()
    set({ isInitialized: true })
  },

  logout: async () => {
    if (isLoggingOut) return
    isLoggingOut = true
    const hadSession = getAccessToken() !== null || useAuthStore.getState().isAuthenticated
    try {
      if (hadSession) {
        await apiClient(endpoints.auth.logout())
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      isLoggingOut = false
      setAccessToken(null)
      onLogoutCallback?.()
      set({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: null,
      })
    }
  },

  initAuth: async () => {
    if (getAccessToken() && useAuthStore.getState().isAuthenticated) {
      set({ isInitialized: true, isLoading: false })
      return
    }

    if (mockAuthAdapter?.isMockToken?.(getAccessToken())) {
      set({
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const newToken = await refreshAccessToken()
      if (!newToken) {
        set({
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
        })
        return
      }

      if (mockAuthAdapter?.isMockToken?.(newToken)) {
        set({
          isAuthenticated: true,
          isInitialized: true,
          isLoading: false,
          error: null,
        })
        return
      }

      await fetchMe(newToken)

      set({
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      })
    } catch {
      setAccessToken(null)
      set({
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
      })
    }
  },
}))

setOnUnauthorized(() => {
  resetAuthSession()
})
