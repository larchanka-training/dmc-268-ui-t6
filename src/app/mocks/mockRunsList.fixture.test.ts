import { describe, expect, it } from 'vitest'

import { RunListPageSchema } from '../../entities/run'

import { mockRunsListPage } from './mockRunsList.fixture'

describe('mockRunsList.fixture', () => {
  it('validates as RunListPage and covers PR review runs', () => {
    const result = RunListPageSchema.safeParse(mockRunsListPage)
    expect(result.success).toBe(true)
    expect(mockRunsListPage.items.length).toBeGreaterThanOrEqual(8)
    expect(mockRunsListPage.items.every((run) => run.pullRequest.number > 0)).toBe(true)
    expect(mockRunsListPage.nextCursor).toBeNull()
  })
})
