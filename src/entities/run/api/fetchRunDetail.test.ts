import { describe, expect, it, vi } from 'vitest'

import { fetchRunDetail } from './index'
import { RunDetailSchema } from '../model/schemas'

vi.mock('../../../shared/api/client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../../../shared/api/client'

describe('fetchRunDetail', () => {
  it('parses a legacy RunSession wire payload with defaults', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-000000000002',
      engine: 'deep',
      model: 'claude-sonnet-5',
      status: 'running',
      startedAt: '2026-09-18T11:20:00.000Z',
      finishedAt: null,
      attempt: 1,
      cancelRequested: false,
      summaryOnly: false,
      pullRequest: {
        repo: 'org/repo',
        number: 32,
        title: 'Title',
        url: 'https://github.com/org/repo/pull/32',
        headSha: 'abc1234567890abc1234567890abc1234567890',
      },
      actionCount: 12,
      errorCode: null,
    })

    const run = await fetchRunDetail('11111111-1111-4111-8111-000000000002')
    expect(RunDetailSchema.safeParse(run).success).toBe(true)
    expect(run.findings).toEqual([])
    expect(run.verdict).toBeNull()
  })
})
