import { z } from 'zod'

import { RawFileDiffSchema } from '../../entities/diff'
import { makeDuoActions } from '../../entities/run/lib/duoActions.fixture'
import {
  RepositorySchema,
  UpdateRepositorySchema,
  type Repository,
} from '../../entities/repository'
import { setMockAuthAdapter, useAuthStore } from '../../features/auth'
import {
  ApiError,
  setAccessToken,
  setMockTransport,
  type MockTransportHandler,
} from '../../shared/api/client'
import { USE_MOCKS } from '../../shared/config/env'
import { SAMPLE_FILE_A_LINES, SAMPLE_PATCHES } from '../../shared/fixtures/sample.patch'
import {
  mockCurrentUser,
  mockRepositories,
  mockReviewComments,
  mockSummaryOnlyDiff,
} from './app-state'
import { mockRunsListPage } from './mockRunsList.fixture'
import { buildMockRunDetail, mockRawDiffForRun } from './mockRunReview'

export const MOCK_TOKEN = 'mock_jwt_token_skvertl_dmc'
export const MOCK_OAUTH_CODE = 'mock_code_123'

// Working copy of the fixture: PATCH edits stay here, `mockRepositories` is never written.
let repositories: Repository[] = structuredClone(mockRepositories)

function findRunSession(id: string) {
  return mockRunsListPage.items.find((run) => run.id === id)
}

function handleMockTransport(
  endpoint: Parameters<MockTransportHandler>[0],
  options: Parameters<MockTransportHandler>[1],
): unknown {
  if (endpoint.path === '/repos' && endpoint.method === 'GET') {
    return repositories.map((r) => ({ ...r }))
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
    const repo = repositories.find((r) => r.id === id)
    if (!repo) {
      throw new ApiError(404, 'Not Found', { message: 'Repository not found' })
    }
    return { ...repo }
  }

  if (endpoint.path.startsWith('/repos/') && endpoint.method === 'PATCH') {
    const id = endpoint.path.replace('/repos/', '')
    const index = repositories.findIndex((r) => r.id === id)
    if (index === -1) {
      throw new ApiError(404, 'Not Found', { message: 'Repository not found' })
    }
    if (options.body && typeof options.body === 'object') {
      const patch = UpdateRepositorySchema.parse(options.body)
      repositories[index] = RepositorySchema.parse({
        ...repositories[index],
        ...patch,
      })
    }
    return { ...repositories[index] }
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

  const runActionsMatch = /^\/runs\/([^/]+)\/actions$/.exec(endpoint.path)
  if (runActionsMatch && endpoint.method === 'GET') {
    const runId = runActionsMatch[1]
    if (!runId || !findRunSession(runId)) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    return makeDuoActions(runId)
  }

  const actionResponseMatch = /^\/runs\/([^/]+)\/actions\/(\d+)\/response$/.exec(endpoint.path)
  if (actionResponseMatch && endpoint.method === 'GET') {
    const runId = actionResponseMatch[1]
    if (!runId || !findRunSession(runId)) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    return {
      path: 'src/file3.ts',
      startLine: 1,
      totalLines: 340,
      content: 'loaded blob response',
    }
  }

  const runCommentsMatch = /^\/runs\/([^/]+)\/comments$/.exec(endpoint.path)
  if (runCommentsMatch && endpoint.method === 'GET') {
    const runId = runCommentsMatch[1]
    if (!runId || !findRunSession(runId)) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    return mockReviewComments.map((comment) => ({ ...comment }))
  }

  const runFilesMatch = /^\/runs\/([^/]+)\/files\?(.+)$/.exec(endpoint.path)
  if (runFilesMatch && endpoint.method === 'GET') {
    const runId = runFilesMatch[1]
    const query = runFilesMatch[2]
    if (!runId || !query || !findRunSession(runId)) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    const params = new URLSearchParams(query)
    const offset = Number(params.get('offset') ?? '0')
    const limit = Number(params.get('limit') ?? '200')
    const lines = SAMPLE_FILE_A_LINES.slice(offset, offset + limit)
    return {
      path: params.get('path') ?? 'src/a.ts',
      startLine: offset + 1,
      lines,
      totalLines: SAMPLE_FILE_A_LINES.length,
      nextOffset: offset + limit < SAMPLE_FILE_A_LINES.length ? offset + limit : null,
    }
  }

  const runCancelMatch = /^\/runs\/([^/]+)\/cancel$/.exec(endpoint.path)
  if (runCancelMatch && endpoint.method === 'POST') {
    const runId = runCancelMatch[1]
    const session = runId ? findRunSession(runId) : undefined
    if (!session) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    if (session.status === 'queued') {
      return { ...session, status: 'cancelled' as const, cancelRequested: true }
    }
    return { ...session, cancelRequested: true }
  }

  const runRerunMatch = /^\/runs\/([^/]+)\/rerun$/.exec(endpoint.path)
  if (runRerunMatch && endpoint.method === 'POST') {
    const runId = runRerunMatch[1]
    const session = runId ? findRunSession(runId) : undefined
    if (!session) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    const activeSibling = mockRunsListPage.items.find(
      (item) =>
        item.id !== session.id &&
        item.pullRequest.number === session.pullRequest.number &&
        (item.status === 'queued' || item.status === 'running' || item.status === 'publishing'),
    )
    if (activeSibling) {
      throw new ApiError(409, 'Conflict', { detail: 'Active run already exists' })
    }
    return {
      ...session,
      id: '11111111-1111-4111-8111-000000000099',
      status: 'queued' as const,
      startedAt: null,
      finishedAt: null,
      attempt: session.attempt + 1,
      cancelRequested: false,
    }
  }

  return undefined
}

export function initMockTransport(): void {
  if (!USE_MOCKS) return

  repositories = structuredClone(mockRepositories)

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

  setMockTransport(handleMockTransport)
}

/** Runs `overlay` first; falls back to the default mock handler (for tests). */
export function withMockTransportOverlay(overlay: MockTransportHandler): void {
  if (!USE_MOCKS) return
  initMockTransport()
  setMockTransport((endpoint, options) => {
    const overridden = overlay(endpoint, options)
    if (overridden !== undefined) {
      return overridden
    }
    return handleMockTransport(endpoint, options)
  })
}
