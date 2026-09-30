import { ApiError, setMockTransport } from '../../shared/api/client'
import { RawFileDiffSchema } from '../../entities/diff'
import { RepositorySchema, UpdateRepositorySchema } from '../../entities/repository'
import { USE_MOCKS } from '../../shared/config/env'
import { z } from 'zod'
import {
  buildMockRunDetail,
  mockLegacyRunSessionPayload,
  mockRawDiffForRun,
  REVIEW_LEGACY_RUN_ID,
} from './mockRunReview'
import { mockRunsListPage } from './mockRunsList.fixture'
import { mockCurrentUser, mockRepositories, mockSummaryOnlyDiff } from './app-state'
import { SAMPLE_PATCHES } from '../../shared/fixtures/sample.patch'

function findRunSession(id: string) {
  return mockRunsListPage.items.find((run) => run.id === id)
}

export function initMockTransport(): void {
  if (!USE_MOCKS) return

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
      if (runId === REVIEW_LEGACY_RUN_ID) {
        return mockLegacyRunSessionPayload(session)
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
