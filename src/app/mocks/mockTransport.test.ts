import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/config/env', () => ({
  USE_MOCKS: true,
  isMockMode: () => true,
  env: { VITE_USE_MOCKS: true },
  API_BASE_URL: '/api',
  GITHUB_CLIENT_ID: '',
  GITHUB_APP_SLUG: '',
}))

import type { Repository } from '../../entities/repository'
import type { RunListPage } from '../../entities/run'
import { ApiError, apiClient } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { validationErrorLocations } from '../../shared/api/validationError'
import { mockRepositories } from './app-state'
import { initMockTransport } from './mockTransport'

describe('initMockTransport', () => {
  it('serves GET /runs from the mock handler', async () => {
    initMockTransport()
    const page = await apiClient<{ items: unknown[] }>(endpoints.runs.list())
    expect(Array.isArray(page.items)).toBe(true)
    expect(page.items.length).toBeGreaterThan(0)
  })

  describe('GET /runs', () => {
    const API_REPO = 'larchanka-training/dmc-268-api-t6'
    const INFRA_REPO = 'larchanka-training/dmc-268-infra-t6'

    function list(query: Record<string, string>): Promise<RunListPage> {
      const search = new URLSearchParams(query).toString()
      return apiClient<RunListPage>({ method: 'GET', path: `/runs?${search}` })
    }

    beforeEach(() => {
      initMockTransport()
    })

    it('filters GET /runs by repo', async () => {
      const page = await list({ repo: API_REPO })

      expect(page.items).toHaveLength(25)
      expect(page.items.every((run) => run.pullRequest.repo === API_REPO)).toBe(true)
      expect(page.nextCursor).toBeNull()

      const none = await list({ repo: INFRA_REPO })
      expect(none).toEqual({ items: [], nextCursor: null })

      const unknown = await list({ repo: 'someone/else' })
      expect(unknown.items).toEqual([])
    })

    it('lists the runs of every repo when no repo is given', async () => {
      const page = await apiClient<RunListPage>(endpoints.runs.list())

      const repos = new Set(page.items.map((run) => run.pullRequest.repo))
      expect(repos).toEqual(new Set(['larchanka-training/dmc-268-ui-t6', API_REPO]))
      expect(page.nextCursor).toBeNull()
    })

    it('paginates with an opaque cursor', async () => {
      const first = await list({ repo: API_REPO, limit: '20' })
      expect(first.items).toHaveLength(20)
      const cursor = first.nextCursor
      if (cursor === null) {
        throw new Error('the first page of 25 runs at limit 20 must have a next cursor')
      }

      const second = await list({ repo: API_REPO, limit: '20', cursor })
      expect(second.items).toHaveLength(5)
      expect(second.nextCursor).toBeNull()

      const ids = [...first.items, ...second.items].map((run) => run.id)
      expect(new Set(ids).size).toBe(25)
    })

    it('answers an unreadable cursor with 422', async () => {
      await expect(list({ cursor: 'not-a-cursor' })).rejects.toMatchObject({ status: 422 })
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

    it('hands out copies of the branchFilter array', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { branchFilter: ['main'] },
      })
      updated.branchFilter.push('from-patch')

      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(one.branchFilter).toEqual(['main'])
      one.branchFilter.push('from-detail')

      const list = await apiClient<Repository[]>(endpoints.repos.list())
      const row = list.find((item) => item.id === repo.id)
      expect(row?.branchFilter).toEqual(['main'])
      row?.branchFilter.push('from-list')

      const again = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(again.branchFilter).toEqual(['main'])
    })

    it('saves branchFilter and severityThreshold and serves them back', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { branchFilter: ['develop', 'hotfix/**'], severityThreshold: 'warning' },
      })

      expect(updated.branchFilter).toEqual(['develop', 'hotfix/**'])
      expect(updated.severityThreshold).toBe('warning')
      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(one.branchFilter).toEqual(['develop', 'hotfix/**'])
      expect(one.severityThreshold).toBe('warning')
    })

    it('saves an empty branchFilter as all branches', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { branchFilter: [] },
      })

      expect(updated.branchFilter).toEqual([])
    })

    it('never writes the read-only installationAvailable', async () => {
      const [, , unreachable] = mockRepositories
      if (unreachable?.installationAvailable !== false) {
        throw new Error('the third mock repository must be unreachable for the GitHub App')
      }

      const updated = await apiClient<Repository>(endpoints.repos.update(unreachable.id), {
        body: { maxComments: 4, installationAvailable: true },
      })

      expect(updated.maxComments).toBe(4)
      expect(updated.installationAvailable).toBe(false)
    })

    describe('422', () => {
      const repoId = repo.id

      async function rejection(body: unknown): Promise<ApiError> {
        try {
          await apiClient<Repository>(endpoints.repos.update(repoId), { body })
        } catch (error) {
          if (error instanceof ApiError) {
            return error
          }
          throw error
        }
        throw new Error('the PATCH was expected to be rejected')
      }

      it('answers 422 with the mask index for an invalid branch mask', async () => {
        const error = await rejection({ branchFilter: ['main', 'release 1', 'ok/*', 'feat/{a,b'] })

        expect(error.status).toBe(422)
        expect(error.data).toEqual({
          detail: [
            {
              loc: ['body', 'branchFilter', 1],
              msg: expect.any(String) as string,
              type: 'value_error',
            },
            {
              loc: ['body', 'branchFilter', 3],
              msg: expect.any(String) as string,
              type: 'value_error',
            },
          ],
        })
        expect(validationErrorLocations(error.data)).toEqual([
          { path: ['body', 'branchFilter', 1] },
          { path: ['body', 'branchFilter', 3] },
        ])
      })

      it.each([
        ['whitespace inside', 'release 1'],
        ['leading whitespace', ' main'],
        ['a backslash', 'feat\\x'],
        ['an unclosed bracket', 'feat/[ab'],
        ['a stray closing bracket', 'feat/ab]'],
        ['an unclosed brace', 'feat/{a,b'],
        ['a stray closing brace', 'feat/a}'],
      ])('rejects a mask with %s', async (_name, mask) => {
        const error = await rejection({ branchFilter: [mask] })

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([
          { path: ['body', 'branchFilter', 0] },
        ])
      })

      it.each(['main', 'release/*', 'feat/**', 'v[0-9]*', '{main,develop}', '*'])(
        'accepts the mask %s',
        async (mask) => {
          const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
            body: { branchFilter: [mask] },
          })

          expect(updated.branchFilter).toEqual([mask])
        },
      )

      it('answers 422 for a schema violation with its location', async () => {
        const error = await rejection({ severityThreshold: 'info' })

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([
          { path: ['body', 'severityThreshold'] },
        ])
      })

      it('answers 422 for an empty mask with its index', async () => {
        const error = await rejection({ branchFilter: ['main', ''] })

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([
          { path: ['body', 'branchFilter', 1] },
        ])
      })

      it('answers 422 for an empty patch', async () => {
        const error = await rejection({})

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([{ path: ['body'] }])
      })

      it('leaves the stored repository untouched after a 422', async () => {
        await rejection({ branchFilter: ['bad mask'], maxComments: 2 })

        const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
        expect(one.branchFilter).toEqual(repo.branchFilter)
        expect(one.maxComments).toBe(repo.maxComments)
      })
    })
  })
})
