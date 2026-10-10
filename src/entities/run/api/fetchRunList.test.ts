import { describe, expect, it, vi } from 'vitest'

import { RunListPageSchema } from '../model/schemas'
import { fetchRunList } from './index'

vi.mock('../../../shared/api/client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../../../shared/api/client'

describe('fetchRunList', () => {
  it('loads runs via HTTP and parses RunListPage', async () => {
    const listWire = RunListPageSchema.parse({
      items: [
        {
          id: '11111111-1111-4111-8111-000000000004',
          engine: 'deep',
          model: 'claude-sonnet-5',
          status: 'succeeded',
          startedAt: '2026-09-18T11:50:00.000Z',
          finishedAt: '2026-09-18T11:55:12.000Z',
          attempt: 1,
          cancelRequested: false,
          trigger: 'webhook',
          createdAt: '2026-09-18T11:00:00.000Z',
          summaryOnly: false,
          pullRequest: {
            repo: 'org/repo',
            number: 34,
            title: 'feat: skeleton',
            url: 'https://github.com/org/repo/pull/34',
            headSha: 'abcdef1234567890abcdef1234567890abcdef12',
          },
          actionCount: 10,
          errorCode: null,
        },
      ],
      nextCursor: null,
    })

    vi.mocked(apiClient).mockResolvedValueOnce(listWire)

    const page = await fetchRunList()
    expect(apiClient).toHaveBeenCalledTimes(1)
    expect(page.items).toHaveLength(1)
    expect(page.items[0]?.pullRequest.number).toBe(34)
  })
})
