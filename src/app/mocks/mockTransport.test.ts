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
import { apiClient } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { mockRepositories } from './app-state'
import { initMockTransport } from './mockTransport'

describe('initMockTransport', () => {
  it('serves GET /runs from the mock handler', async () => {
    initMockTransport()
    const page = await apiClient<{ items: unknown[] }>(endpoints.runs.list())
    expect(Array.isArray(page.items)).toBe(true)
    expect(page.items.length).toBeGreaterThan(0)
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
  })
})
