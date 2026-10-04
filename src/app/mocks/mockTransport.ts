import { z } from 'zod'

import { RawFileDiffSchema } from '../../entities/diff'
import { RepositorySchema, UpdateRepositorySchema } from '../../entities/repository'
import { setMockAuthAdapter, useAuthStore } from '../../features/auth'
import { ApiError, setAccessToken, setMockTransport } from '../../shared/api/client'
import { USE_MOCKS } from '../../shared/config/env'
import { SAMPLE_PATCHES } from '../../shared/fixtures/sample.patch'
import { mockCurrentUser, mockRepositories, mockSummaryOnlyDiff } from './app-state'
import { mockRunsListPage } from './mockRunsList.fixture'
import { buildMockRunDetail, mockRawDiffForRun } from './mockRunReview'

export const MOCK_TOKEN = 'mock_jwt_token_skvertl_dmc'
export const MOCK_OAUTH_CODE = 'mock_code_123'

function findRunSession(id: string) {
  return mockRunsListPage.items.find((run) => run.id === id)
}

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

    if (endpoint.path === '/runs' && endpoint.method === 'GET') {
      return {
        items: mockRunsListPage.items.map((run) => ({
          ...run,
          pullRequest: { ...run.pullRequest },
        })),
        nextCursor: mockRunsListPage.nextCursor,
      }
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
        const patch = UpdateRepositorySchema.parse(options.body)
        mockRepositories[index] = RepositorySchema.parse({
          ...mockRepositories[index],
          ...patch,
        })
      }
      return { ...mockRepositories[index] }
    }

    const runDetailMatch = /^\/runs\/([^/]+)$/.exec(endpoint.path)
    if (runDetailMatch && endpoint.method === 'GET') {
      const runId = runDetailMatch[1]
      if (!runId) {
        throw new ApiError(404, 'Not Found', { message: 'Run not found' })
      }
      const session = findRunSession(runId)
      if (!session) {
        throw new ApiError(404, 'Not Found', { message: 'Run not found' })
      }
      return buildMockRunDetail(session)
    }

    const runDiffMatch = /^\/runs\/([^/]+)\/diff$/.exec(endpoint.path)
    if (runDiffMatch && endpoint.method === 'GET') {
      const runId = runDiffMatch[1]
      if (!runId) {
        throw new ApiError(404, 'Not Found', { message: 'Run not found' })
      }
      const session = findRunSession(runId)
      if (!session) {
        throw new ApiError(404, 'Not Found', { message: 'Run not found' })
      }
      const raw = mockRawDiffForRun(
        runId,
        SAMPLE_PATCHES.map(({ filename, patch }) => ({ filename, patch })),
        mockSummaryOnlyDiff,
      )
      return z.array(RawFileDiffSchema).parse(raw)
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
        accessToken: MOCK_TOKEN,
        tokenType: 'Bearer',
        expiresIn: 900,
        user: mockCurrentUser,
      }
    }

    if (endpoint.path === '/auth/github/callback' && endpoint.method === 'POST') {
      return {
        accessToken: MOCK_TOKEN,
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
