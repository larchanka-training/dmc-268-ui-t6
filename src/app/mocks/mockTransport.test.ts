import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/config/env', () => ({
  USE_MOCKS: true,
  isMockMode: () => true,
  env: { VITE_USE_MOCKS: true },
  API_BASE_URL: '/api',
  GITHUB_CLIENT_ID: '',
  GITHUB_APP_SLUG: '',
}))

import { RulesStatusSchema, type Repository } from '../../entities/repository'
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

    it('answers a limit over the api cap with 422 and takes the cap itself', async () => {
      await expect(list({ limit: '101' })).rejects.toMatchObject({ status: 422 })
      await expect(list({ limit: '0' })).rejects.toMatchObject({ status: 422 })
      await expect(list({ limit: '100' })).resolves.toMatchObject({ nextCursor: null })
    })
  })

  describe('GET /repos/{id}/rules-status', () => {
    beforeEach(() => {
      initMockTransport()
    })

    it('serves the rules status of each mock repository', async () => {
      const statuses = await Promise.all(
        mockRepositories.map((repo) =>
          apiClient<unknown>(endpoints.repos.rulesStatus(repo.id)).then((data) =>
            RulesStatusSchema.parse(data),
          ),
        ),
      )

      expect(statuses.map((status) => status.status)).toEqual([
        'present',
        'invalid',
        'unavailable',
        'missing',
      ])
    })

    it('answers 404 for a repository it does not know', async () => {
      await expect(
        apiClient<unknown>(endpoints.repos.rulesStatus('22222222-2222-4222-8222-0000000000ff')),
      ).rejects.toMatchObject({ status: 404 })
    })

    it('is matched before the repository itself', async () => {
      const [repo] = mockRepositories
      if (!repo) {
        throw new Error('mock repositories are empty')
      }

      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      const rules = await apiClient<{ status: string }>(endpoints.repos.rulesStatus(repo.id))

      expect(one.id).toBe(repo.id)
      expect(rules.status).toBe('present')
      expect(rules).not.toHaveProperty('fullName')
    })

    it('hands out copies of the rules status', async () => {
      const [repo] = mockRepositories
      if (!repo) {
        throw new Error('mock repositories are empty')
      }
      const first = await apiClient<{ branch: string }>(endpoints.repos.rulesStatus(repo.id))
      first.branch = 'changed'

      const second = await apiClient<{ branch: string }>(endpoints.repos.rulesStatus(repo.id))

      expect(second.branch).not.toBe('changed')
    })
  })

  // api PR #156 (`repository_settings.py:27`): the stored preference is write-only while the
  // GitHub App cannot reach the repository; the api serves `enabled AND installationAvailable`.
  describe('enabled is the effective value', () => {
    const [available, , unreachable] = mockRepositories
    if (available?.installationAvailable !== true || unreachable?.installationAvailable !== false) {
      throw new Error('the first mock repository must be reachable and the third not')
    }

    beforeEach(() => {
      initMockTransport()
    })

    it('reads enabled: false for a repository the GitHub App cannot reach', async () => {
      expect(unreachable.enabled).toBe(true)

      const one = await apiClient<Repository>(endpoints.repos.detail(unreachable.id))
      expect(one.enabled).toBe(false)
      expect(one.installationAvailable).toBe(false)

      const list = await apiClient<Repository[]>(endpoints.repos.list())
      expect(list.find((item) => item.id === unreachable.id)?.enabled).toBe(false)
    })

    it('reads the preference for a repository the GitHub App can reach', async () => {
      const list = await apiClient<Repository[]>(endpoints.repos.list())

      expect(list.find((item) => item.id === available.id)?.enabled).toBe(true)
    })

    it('answers PATCH { enabled: true } for an unreachable repository with enabled: false', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(unreachable.id), {
        body: { enabled: true },
      })

      expect(updated.enabled).toBe(false)
      expect(updated.installationAvailable).toBe(false)
      const one = await apiClient<Repository>(endpoints.repos.detail(unreachable.id))
      expect(one.enabled).toBe(false)
    })

    it('answers PATCH { enabled: false } for an unreachable repository with enabled: false', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(unreachable.id), {
        body: { enabled: false },
      })

      expect(updated.enabled).toBe(false)
    })

    it('answers PATCH of a reachable repository with the preference it stored', async () => {
      const off = await apiClient<Repository>(endpoints.repos.update(available.id), {
        body: { enabled: false },
      })
      expect(off.enabled).toBe(false)
      expect((await apiClient<Repository>(endpoints.repos.detail(available.id))).enabled).toBe(
        false,
      )

      const on = await apiClient<Repository>(endpoints.repos.update(available.id), {
        body: { enabled: true },
      })
      expect(on.enabled).toBe(true)
      expect((await apiClient<Repository>(endpoints.repos.detail(available.id))).enabled).toBe(true)
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

      // api PR #156 validates the whole list in one validator: one refusal, no mask index.
      it('answers 422 with one item at the field for several invalid branch masks', async () => {
        const error = await rejection({ branchFilter: ['main', 'release 1', 'ok/*', 'feat/a..b'] })

        expect(error.status).toBe(422)
        expect(error.data).toEqual({
          detail: [
            {
              loc: ['body', 'branchFilter'],
              msg: expect.any(String) as string,
              type: 'value_error',
            },
          ],
        })
        expect(validationErrorLocations(error.data)).toEqual([{ path: ['body', 'branchFilter'] }])
      })

      // The masks api PR #156 refuses (`branch_patterns._pattern_error`), one reason each.
      it.each([
        ['whitespace inside', 'release 1'],
        ['leading whitespace', ' main'],
        ['a tab', 'feat\tx'],
        ['a control character', 'feat\u0001x'],
        ['a backslash', 'feat\\x'],
        ['two dots', 'feat/a..b'],
        ['a double slash', 'feat//x'],
        ['a leading slash', '/main'],
        ['a trailing slash', 'feat/'],
        ['a .lock suffix', 'feat/x.lock'],
        ['a tilde', 'feat~1'],
        ['a caret', 'feat^'],
        ['a colon', 'feat:x'],
        ['a question mark', 'feat/?'],
        ['an opening bracket', 'v[0-9]*'],
        ['a closing bracket', 'feat/ab]'],
        ['an opening brace', 'feat/{a,b'],
        ['a closing brace', 'feat/a}'],
        ['an exclamation mark', '!main'],
        ['three stars in a row', 'feat/***'],
        ['a segment starting with a dot', 'feat/.hidden'],
        ['a leading dash', '-main'],
        ['a trailing dot', 'feat.'],
        ['a lone @', '@'],
        ['a lone surrogate', 'feat/\ud800x'],
      ])('rejects a mask with %s', async (_name, mask) => {
        const error = await rejection({ branchFilter: [mask] })

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([{ path: ['body', 'branchFilter'] }])
      })

      it.each([
        'main',
        'release/*',
        'feat/**',
        '*',
        '**',
        'hotfix/v1.2',
        'feature/a-b_c',
        'a@b',
        'feat/\u{1f642}',
      ])('accepts the mask %s', async (mask) => {
        const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
          body: { branchFilter: [mask] },
        })

        expect(updated.branchFilter).toEqual([mask])
      })

      it('rejects a repeated mask at the field, once', async () => {
        const error = await rejection({ branchFilter: ['main', 'release/*', 'main', 'release/*'] })

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([{ path: ['body', 'branchFilter'] }])
      })

      it('gives a malformed repeated mask one entry, not one per index', async () => {
        const error = await rejection({ branchFilter: ['a..b', 'a..b'] })

        expect(validationErrorLocations(error.data)).toEqual([{ path: ['body', 'branchFilter'] }])
      })

      it('answers 422 for a schema violation with its location', async () => {
        const error = await rejection({ severityThreshold: 'info' })

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([
          { path: ['body', 'severityThreshold'] },
        ])
      })

      // api PR #156 checks the length of a mask in the same list validator: no mask index either.
      it('answers 422 at the field for an empty mask, a mask over 255 characters and a long list', async () => {
        for (const branchFilter of [
          ['main', ''],
          ['main', 'a'.repeat(256)],
          ['', 'a'.repeat(256)],
          Array.from({ length: 21 }, (_item, index) => `release/${String(index)}`),
        ]) {
          const error = await rejection({ branchFilter })

          expect(error.status).toBe(422)
          expect(validationErrorLocations(error.data)).toEqual([{ path: ['body', 'branchFilter'] }])
        }
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
