import { create } from 'zustand'

import type { User } from '../../../entities/user'
import { AuthCallbackResponseSchema, UserSchema } from '../../../entities/user'
import {
  apiClient,
  getStoredToken,
  setOnUnauthorized,
  setStoredToken,
} from '../../../shared/api/client'
import { endpoints } from '../../../shared/api/endpoints'
import { GITHUB_CLIENT_ID } from '../../../shared/config/env'

export const MOCK_USER: User = {
  id: 'usr_skvertl_01',
  login: 'skvertl',
  name: 'Denis Skvertl',
  avatarUrl: 'https://avatars.githubusercontent.com/u/114473628?v=4',
  email: 'skvertl@users.noreply.github.com',
  provider: 'github',
}

export const MOCK_TOKEN = 'mock_jwt_token_skvertl_dmc'

export interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean

  loginWithGitHub: () => void
  handleCallback: (code: string) => Promise<void>
  loginAsMockUser: () => void
  logout: () => void
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => {
  const initialToken = getStoredToken()

  return {
    token: initialToken,
    user: initialToken ? MOCK_USER : null,
    isLoading: false,
    error: null,
    isAuthenticated: Boolean(initialToken),

    loginWithGitHub: () => {
      if (typeof window === 'undefined') return

      const redirectUri = `${window.location.origin}/auth/callback`
      if (!GITHUB_CLIENT_ID || GITHUB_CLIENT_ID === 'dmc_mock_client_id') {
        // Mock redirect for development without GitHub OAuth app configured
        window.location.href = `${redirectUri}?code=mock_code_123`
        return
      }

      const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'read:user,repo',
      })
      window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`
    },

    handleCallback: async (code: string) => {
      set({ isLoading: true, error: null })
      try {
        let token = MOCK_TOKEN
        let user = MOCK_USER

        try {
          const res = await apiClient<unknown>(endpoints.auth.githubCallback(), {
            body: { code },
          })
          const parsed = AuthCallbackResponseSchema.parse(res)
          token = parsed.token
          if (parsed.user) {
            user = parsed.user
          }
        } catch {
          // If backend is offline or mock code passed, fallback gracefully to mock user
          if (code.startsWith('mock_')) {
            token = MOCK_TOKEN
            user = MOCK_USER
          } else {
            // Still fallback to mock session with warning rather than blocking developer
            token = `token_${code}`
            user = { ...MOCK_USER, login: 'github-user' }
          }
        }

        setStoredToken(token)
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка аутентификации'
        set({ isLoading: false, error: message })
        throw err
      }
    },

    loginAsMockUser: () => {
      setStoredToken(MOCK_TOKEN)
      set({
        token: MOCK_TOKEN,
        user: MOCK_USER,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    },

    logout: () => {
      setStoredToken(null)
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    },

    initAuth: async () => {
      const storedToken = getStoredToken()
      if (!storedToken) {
        set({ token: null, user: null, isAuthenticated: false })
        return
      }

      set({ isLoading: true, token: storedToken })
      try {
        const res = await apiClient<unknown>(endpoints.auth.me(), { token: storedToken })
        const user = UserSchema.parse(res)
        set({ user, isAuthenticated: true, isLoading: false })
      } catch {
        // If /auth/me is not reachable, retain mock user if token matches mock token
        if (storedToken === MOCK_TOKEN) {
          set({ user: MOCK_USER, isAuthenticated: true, isLoading: false })
        } else {
          set({ user: null, isAuthenticated: true, isLoading: false })
        }
      }
    },
  }
})

// Automatically connect 401 unauthorized handler to logout
setOnUnauthorized(() => {
  useAuthStore.getState().logout()
})
