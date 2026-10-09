import { describe, expect, it } from 'vitest'

import { RunListPageSchema } from '../../entities/run'

import { mockRunsListPage } from './mockRunsList.fixture'

describe('mockRunsList.fixture', () => {
  it('validates as RunListPage and covers PR review runs', () => {
    const result = RunListPageSchema.safeParse(mockRunsListPage)
    expect(result.success).toBe(true)
    expect(mockRunsListPage.items.length).toBeGreaterThanOrEqual(10)
    expect(mockRunsListPage.items.every((run) => run.pullRequest.number > 0)).toBe(true)
    expect(mockRunsListPage.nextCursor).toBeNull()
  })

  it('lists the walking run as queued and the failed run as failed', () => {
    const walking = mockRunsListPage.items.find(
      (run) => run.id === '11111111-1111-4111-8111-000000000011',
    )
    const failed = mockRunsListPage.items.find(
      (run) => run.id === '11111111-1111-4111-8111-000000000012',
    )
    expect(walking?.status).toBe('queued')
    expect(failed?.status).toBe('failed')
    expect(failed?.errorCode).toBe('llm_timeout')
  })

  it('keeps every pull request number unique among the active runs', () => {
    const active = mockRunsListPage.items.filter((run) =>
      ['queued', 'running', 'publishing'].includes(run.status),
    )
    const numbers = active.map((run) => run.pullRequest.number)
    expect(new Set(numbers).size).toBe(numbers.length)
  })
})
