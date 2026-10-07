import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../../shared/api/client'
import { fetchRunActions, rerunRun, runMutationErrorMessage } from './index'

vi.mock('../../../shared/api/client', () => ({
  apiClient: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public statusText: string,
      public data: unknown,
    ) {
      super(`API Error ${String(status)}`)
    }
  },
}))

import { apiClient } from '../../../shared/api/client'

describe('run api actions', () => {
  it('fetchRunActions parses a wire list', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce([
      {
        id: '33333333-3333-4333-8333-000000000001',
        runId: '11111111-1111-4111-8111-000000000004',
        index: 0,
        tool: 'get_diff',
        request: {},
        response: {},
        responseRef: null,
        startedAt: '2026-09-18T11:50:01.000Z',
        durationMs: 120,
      },
    ])
    const actions = await fetchRunActions('11111111-1111-4111-8111-000000000004')
    expect(actions).toHaveLength(1)
    expect(actions[0]?.tool).toBe('get_diff')
  })

  it('maps rerun 409 to a user-facing message', () => {
    const message = runMutationErrorMessage(
      new ApiError(409, 'Conflict', { detail: 'Active run already exists' }),
    )
    expect(message).toBe('У этого PR уже есть активный прогон или PR закрыт')
  })

  it('rerunRun parses a queued session', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-000000000099',
      engine: 'deep',
      model: 'claude-sonnet-5',
      status: 'queued',
      startedAt: null,
      finishedAt: null,
      attempt: 2,
      cancelRequested: false,
      summaryOnly: false,
      pullRequest: {
        repo: 'org/repo',
        number: 1,
        title: 'T',
        url: 'https://github.com/org/repo/pull/1',
        headSha: 'abc1234567890abc1234567890abc1234567890',
      },
      actionCount: 0,
      errorCode: null,
    })
    const session = await rerunRun('11111111-1111-4111-8111-000000000004')
    expect(session.status).toBe('queued')
  })
})
