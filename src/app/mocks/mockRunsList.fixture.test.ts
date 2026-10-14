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

  it('lists 25 finished runs of the api repository, none of the infra repository', () => {
    const api = mockRunsListPage.items.filter(
      (run) => run.pullRequest.repo === 'larchanka-training/dmc-268-api-t6',
    )
    expect(api).toHaveLength(25)
    expect(
      api.every((run) => ['succeeded', 'failed', 'cancelled', 'skipped'].includes(run.status)),
    ).toBe(true)
    expect(
      mockRunsListPage.items.some(
        (run) => run.pullRequest.repo === 'larchanka-training/dmc-268-infra-t6',
      ),
    ).toBe(false)
  })

  it('runs the api repository only on the fast engine', () => {
    // The product is fast-only since PR #71: the added history has no `deep` run.
    const engines = mockRunsListPage.items
      .filter((run) => run.pullRequest.repo === 'larchanka-training/dmc-268-api-t6')
      .map((run) => run.engine)
    expect(engines).toHaveLength(25)
    expect(new Set(engines)).toEqual(new Set(['fast']))
  })

  it('gives every listed run its own id', () => {
    const ids = mockRunsListPage.items.map((run) => run.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps the api runs newest first', () => {
    const created = mockRunsListPage.items
      .filter((run) => run.pullRequest.repo === 'larchanka-training/dmc-268-api-t6')
      .map((run) => Date.parse(run.createdAt))
    expect(created).toEqual([...created].sort((a, b) => b - a))
  })
})
