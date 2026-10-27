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

  it.each([
    'the pull request has an active run or is closed, or repository reviews are paused or unavailable',
    'Active run already exists',
  ])('maps rerun 409 to all possible causes without exposing detail: %s', (detail) => {
    const message = runMutationErrorMessage(new ApiError(409, 'Conflict', { detail }), 'rerun')
    expect(message).toBe(
      'Нельзя перезапустить ревью: у PR уже есть активный прогон, PR закрыт, ревью репозитория приостановлено или GitHub App недоступна',
    )
  })

  it.each([
    { action: 'rerun', status: 404, text: 'Прогон не найден — обновите страницу' },
    { action: 'cancel', status: 404, text: 'Прогон не найден — обновите страницу' },
    {
      action: 'cancel',
      status: 409,
      text: 'Не удалось выполнить операцию',
    },
    {
      action: 'rerun',
      status: 422,
      text: 'Нельзя перезапустить: у репозитория нет активного правила или версии промпта',
    },
    { action: 'cancel', status: 422, text: 'Сервер отклонил запрос на отмену' },
    { action: 'rerun', status: 500, text: 'Не удалось выполнить операцию' },
    { action: 'cancel', status: 503, text: 'Не удалось выполнить операцию' },
  ] as const)('maps $action $status to fixed text and never returns detail', (row) => {
    const detail = 'raw english detail'
    const message = runMutationErrorMessage(
      new ApiError(row.status, 'Error', { detail }),
      row.action,
    )
    expect(message).toBe(row.text)
  })

  it.each(['rerun', 'cancel'] as const)(
    'falls back to the generic text for a non-ApiError on %s',
    (action) => {
      expect(runMutationErrorMessage(new Error('boom'), action)).toBe(
        'Не удалось выполнить операцию',
      )
    },
  )

  it('rerunRun parses a queued session', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({
      provider: 'github',
      id: '11111111-1111-4111-8111-000000000099',
      engine: 'deep',
      model: 'claude-sonnet-5',
      status: 'queued',
      startedAt: null,
      finishedAt: null,
      attempt: 2,
      cancelRequested: false,
      trigger: 'webhook',
      createdAt: '2026-09-18T11:00:00.000Z',
      summaryOnly: false,
      pullRequest: {
        provider: 'github',
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
