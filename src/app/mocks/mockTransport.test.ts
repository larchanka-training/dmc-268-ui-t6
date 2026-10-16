import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/config/env', () => ({
  USE_MOCKS: true,
  isMockMode: () => true,
  env: { VITE_USE_MOCKS: true },
  API_BASE_URL: '/api',
  GITHUB_CLIENT_ID: '',
  GITHUB_APP_SLUG: '',
}))

import type { Repository } from '../../entities/repository'
import {
  RunDetailSchema,
  RunListPageSchema,
  RunSessionSchema,
  type RunDetail,
  type RunListPage,
  type RunSession,
} from '../../entities/run'
import { ApiError, apiClient } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { mockRepositories } from './app-state'
import { mockRunsListPage } from './mockRunsList.fixture'
import { WALKING_RUN_ID } from './mockRunTimeline'
import { initMockTransport } from './mockTransport'

describe('initMockTransport', () => {
  it('serves GET /runs from the mock handler', async () => {
    initMockTransport()
    const page = await apiClient<{ items: unknown[] }>(endpoints.runs.list())
    expect(Array.isArray(page.items)).toBe(true)
    expect(page.items.length).toBeGreaterThan(0)
  })

  describe('POST /runs/{id}/rerun', () => {
    const completedRunId = '11111111-1111-4111-8111-000000000004'

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-16T12:00:00.000Z'))
      initMockTransport()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('serves the newly queued rerun from GET detail', async () => {
      const created = RunSessionSchema.parse(
        await apiClient<unknown>(endpoints.runs.rerun(completedRunId)),
      )

      const detail = RunDetailSchema.parse(
        await apiClient<unknown>(endpoints.runs.detail(created.id)),
      )

      expect(detail.id).toBe(created.id)
      expect(detail.status).toBe('queued')
      expect(detail.trigger).toBe('rerun')
      expect(detail.createdAt).toBe('2026-10-16T12:00:00.000Z')
      expect(detail.engine).toBe('deep')
      expect(detail.model).toBe('claude-sonnet-5')
      expect(detail.pullRequest).toMatchObject({
        repo: 'larchanka-training/dmc-268-ui-t6',
        number: 34,
        headSha: 'abcdef1234567890abcdef1234567890abcdef12',
      })
      expect(detail.startedAt).toBeNull()
      expect(detail.finishedAt).toBeNull()
      expect(detail.attempt).toBe(2)
      expect(detail.cancelRequested).toBe(false)
      expect(detail.actionCount).toBe(0)
      expect(detail.errorCode).toBeNull()
      expect(detail.findings).toEqual([])
      expect(detail.summary).toBeNull()
      expect(detail.verdict).toBeNull()
      expect(detail.budget).toBeNull()
    })

    it('lists the new run and rejects another rerun of the same PR', async () => {
      const created = await apiClient<RunSession>(endpoints.runs.rerun(completedRunId))

      const page = RunListPageSchema.parse(await apiClient<unknown>(endpoints.runs.list()))
      expect(page.items.find((run) => run.id === created.id)).toEqual(created)
      await expect(apiClient(endpoints.runs.rerun(completedRunId))).rejects.toEqual(
        new ApiError(409, 'Conflict', { detail: 'Active run already exists' }),
      )
    })

    it('gives different PRs unique UUIDs and resets previous errors and cancellation', async () => {
      const failed = RunSessionSchema.parse(
        await apiClient<unknown>(endpoints.runs.rerun('11111111-1111-4111-8111-000000000005')),
      )
      const cancelled = RunSessionSchema.parse(
        await apiClient<unknown>(endpoints.runs.rerun('11111111-1111-4111-8111-000000000006')),
      )

      expect(failed.id).not.toBe('11111111-1111-4111-8111-000000000005')
      expect(cancelled.id).not.toBe('11111111-1111-4111-8111-000000000006')
      expect(failed.id).not.toBe(cancelled.id)
      expect(failed).toMatchObject({ attempt: 4, actionCount: 0, errorCode: null })
      expect(cancelled).toMatchObject({
        attempt: 2,
        actionCount: 0,
        cancelRequested: false,
      })
    })

    it('isolates POST, detail and list responses from stored sessions and fixtures', async () => {
      const before = structuredClone(mockRunsListPage)
      const created = await apiClient<RunSession>(endpoints.runs.rerun(completedRunId))
      const createdId = created.id
      created.status = 'succeeded'
      created.pullRequest.number = 999

      const detail = await apiClient<RunDetail>(endpoints.runs.detail(createdId))
      expect(detail.status).toBe('queued')
      expect(detail.pullRequest.number).toBe(34)
      detail.pullRequest.repo = 'changed/repo'

      const page = await apiClient<RunListPage>(endpoints.runs.list())
      const listed = page.items.find((run) => run.id === createdId)
      expect(listed?.pullRequest.repo).toBe('larchanka-training/dmc-268-ui-t6')
      if (!listed) throw new Error('rerun is missing from the list')
      listed.pullRequest.title = 'changed title'
      listed.actionCount = 99

      const fresh = await apiClient<RunDetail>(endpoints.runs.detail(createdId))
      expect(fresh.pullRequest.title).toBe('feat: frontend architecture skeleton')
      expect(fresh.actionCount).toBe(0)
      await expect(apiClient(endpoints.runs.rerun(completedRunId))).rejects.toMatchObject({
        status: 409,
        data: { detail: 'Active run already exists' },
      })
      expect(mockRunsListPage).toEqual(before)
    })

    it('drops created runs on re-init and permits a fresh rerun', async () => {
      const created = await apiClient<RunSession>(endpoints.runs.rerun(completedRunId))
      initMockTransport()

      await expect(apiClient(endpoints.runs.detail(created.id))).rejects.toMatchObject({
        status: 404,
      })
      const page = await apiClient<RunListPage>(endpoints.runs.list())
      expect(page.items.some((run) => run.id === created.id)).toBe(false)
      const recreated = RunSessionSchema.parse(
        await apiClient<unknown>(endpoints.runs.rerun(completedRunId)),
      )
      expect(recreated.id).not.toBe(created.id)
      expect(recreated.attempt).toBe(2)
    })

    it('keeps the walking run live in GET detail and list after adding a rerun', async () => {
      await apiClient(endpoints.runs.rerun(completedRunId))
      const initial = await apiClient<RunDetail>(endpoints.runs.detail(WALKING_RUN_ID))
      expect(initial.status).toBe('queued')

      vi.advanceTimersByTime(2000)
      const running = await apiClient<RunDetail>(endpoints.runs.detail(WALKING_RUN_ID))
      expect(running.status).toBe('running')
      expect(running.actionCount).toBe(1)

      vi.advanceTimersByTime(12_000)
      const page = await apiClient<RunListPage>(endpoints.runs.list())
      expect(page.items.find((run) => run.id === WALKING_RUN_ID)?.status).toBe('succeeded')
      const walkingRerun = await apiClient<RunSession>(endpoints.runs.rerun(WALKING_RUN_ID))
      expect(walkingRerun.status).toBe('queued')
      expect(walkingRerun.pullRequest.number).toBe(41)
    })
  })

  describe('PATCH /repos/{id}', () => {
    const [repo] = mockRepositories
    if (!repo) {
      throw new Error('mock repositories are empty')
    }
    const patched = repo.maxComments === 3 ? 4 : 3

    beforeEach(() => {
      initMockTransport()
    })

    it('leaves the exported mockRepositories untouched', async () => {
      const before = structuredClone(mockRepositories)

      const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { maxComments: patched },
      })

      expect(updated.maxComments).toBe(patched)
      expect(mockRepositories).toEqual(before)
    })

    it('serves the patched value from GET one and from the list', async () => {
      await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { maxComments: patched },
      })

      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(one.maxComments).toBe(patched)

      const list = await apiClient<Repository[]>(endpoints.repos.list())
      expect(list.find((item) => item.id === repo.id)?.maxComments).toBe(patched)
    })

    it('hands out copies of the working copy and drops it on re-init', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { maxComments: patched },
      })
      updated.maxComments = patched + 1

      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(one.maxComments).toBe(patched)

      initMockTransport()

      const reset = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(reset.maxComments).toBe(repo.maxComments)
    })

    it('hands out copies of the rows from the list', async () => {
      const first = await apiClient<Repository[]>(endpoints.repos.list())
      const row = first.find((item) => item.id === repo.id)
      if (!row) {
        throw new Error('mock repository is missing from the list')
      }
      row.maxComments = patched

      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(one.maxComments).toBe(repo.maxComments)

      const second = await apiClient<Repository[]>(endpoints.repos.list())
      expect(second.find((item) => item.id === repo.id)?.maxComments).toBe(repo.maxComments)
    })
  })
})
