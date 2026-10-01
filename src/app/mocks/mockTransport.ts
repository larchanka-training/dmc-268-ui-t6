import { setMockAuthAdapter, useAuthStore } from '../../features/auth'
import { ApiError, setAccessToken, setMockTransport } from '../../shared/api/client'
import { USE_MOCKS } from '../../shared/config/env'
import type { Repository } from '../../entities/repository'
import { mockCurrentUser, mockRepositories } from './app-state'

export const MOCK_TOKEN = 'mock_jwt_token_skvertl_dmc'
export const MOCK_OAUTH_CODE = 'mock_code_123'

export function initMockTransport(): void {
  if (!USE_MOCKS) return

  setMockAuthAdapter({
    getMockOAuthCode: () => MOCK_OAUTH_CODE,
    loginAsMockUser: () => {
      setAccessToken(MOCK_TOKEN)
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    },
    isMockToken: (token) => token === MOCK_TOKEN,
  })

  setMockTransport((endpoint, options) => {
    if (endpoint.path === '/repos' && endpoint.method === 'GET') {
      return mockRepositories.map((r) => ({ ...r }))
    }

    if (endpoint.path.startsWith('/repos/') && endpoint.method === 'GET') {
      const id = endpoint.path.replace('/repos/', '')
      const repo = mockRepositories.find((r) => r.id === id)
      if (!repo) {
        throw new ApiError(404, 'Not Found', { message: 'Repository not found' })
      }
      return { ...repo }
    }

    if (endpoint.path.startsWith('/repos/') && endpoint.method === 'PATCH') {
      const id = endpoint.path.replace('/repos/', '')
      const index = mockRepositories.findIndex((r) => r.id === id)
      if (index === -1) {
        throw new ApiError(404, 'Not Found', { message: 'Repository not found' })
      }
      if (options.body && typeof options.body === 'object') {
        mockRepositories[index] = { ...mockRepositories[index], ...options.body } as Repository
      }
      return { ...mockRepositories[index] }
    }

    if (endpoint.path === '/auth/me' && endpoint.method === 'GET') {
      return {
        ...mockCurrentUser,
        workspaces: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'larchanka-training',
            installationId: 12345,
          },
        ],
      }
    }

    if (endpoint.path === '/auth/refresh' && endpoint.method === 'POST') {
      return {
        accessToken: 'mock_jwt_token_skvertl_dmc',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: mockCurrentUser,
      }
    }

    if (endpoint.path === '/auth/github/callback' && endpoint.method === 'POST') {
      return {
        accessToken: 'mock_jwt_token_skvertl_dmc',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: mockCurrentUser,
      }
    }

    if (endpoint.path === '/auth/logout' && endpoint.method === 'POST') {
      return null
    }

    return undefined
  })
}
