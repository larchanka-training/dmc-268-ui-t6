import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRepositories, fetchRepository, repoApi, updateRepository } from './index'

describe('repoApi schema mappings', () => {
  it('maps endpoints to correct definitions', () => {
    expect(repoApi.list.endpoint().path).toBe('/repos')
    expect(repoApi.detail.endpoint('123').path).toBe('/repos/123')
    expect(repoApi.update.endpoint('123').method).toBe('PATCH')
  })
})

describe('repository API client methods', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const sampleRepo = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    fullName: 'org/test-repo',
    url: 'https://github.com/org/test-repo',
    defaultBranch: 'main',
    enabled: true,
    defaultEngine: 'fast' as const,
    waitForCi: 'auto' as const,
    maxComments: 10,
    reviewEvent: 'COMMENT' as const,
  }

  it('fetchRepositories returns validated repositories', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([sampleRepo]), {
        status: 200,
        statusText: 'OK',
      }),
    )

    const result = await fetchRepositories()
    expect(result).toHaveLength(1)
    expect(result[0]?.fullName).toBe('org/test-repo')
    expect(result[0]?.waitForCi).toBe('auto')
  })

  it('fetchRepository returns single repository', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleRepo), {
        status: 200,
        statusText: 'OK',
      }),
    )

    const result = await fetchRepository('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(result.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  })

  it('updateRepository sends patch and returns updated repository', async () => {
    const updated = {
      ...sampleRepo,
      enabled: false,
      maxComments: 5,
    }

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(updated), {
        status: 200,
        statusText: 'OK',
      }),
    )

    const result = await updateRepository('a1b2c3d4-e5f6-7890-abcd-ef1234567890', {
      enabled: false,
      maxComments: 5,
    })
    expect(result.enabled).toBe(false)
    expect(result.maxComments).toBe(5)
  })

  it('updateRepository throws validation error if empty patch object is provided', async () => {
    await expect(updateRepository('a1b2c3d4-e5f6-7890-abcd-ef1234567890', {})).rejects.toThrow()
  })

  it('updateRepository sends only specified fields in body to the endpoint', async () => {
    let capturedBody: unknown
    globalThis.fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string)
      return Promise.resolve(
        new Response(JSON.stringify({ ...sampleRepo, enabled: false }), {
          status: 200,
          statusText: 'OK',
        }),
      )
    })

    await updateRepository('a1b2c3d4-e5f6-7890-abcd-ef1234567890', {
      enabled: false,
    })

    expect(capturedBody).toEqual({ enabled: false })
  })
})
