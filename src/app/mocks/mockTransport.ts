import { setMockTransport } from '../../shared/api/client'
import { USE_MOCKS } from '../../shared/config/env'
import { mockCurrentUser, mockRepositories } from './app-state'

export function initMockTransport(): void {
  if (!USE_MOCKS) return

  setMockTransport((endpoint, options) => {
    if (endpoint.path === '/repos' && endpoint.method === 'GET') {
      return mockRepositories
    }

    if (endpoint.path.startsWith('/repos/') && endpoint.method === 'GET') {
      const id = endpoint.path.replace('/repos/', '')
      return mockRepositories.find((r) => r.id === id) ?? null
    }

    if (endpoint.path.startsWith('/repos/') && endpoint.method === 'PATCH') {
      const id = endpoint.path.replace('/repos/', '')
      const repo = mockRepositories.find((r) => r.id === id)
      if (repo && options.body && typeof options.body === 'object') {
        Object.assign(repo, options.body)
        return repo
      }
      return repo ?? null
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
