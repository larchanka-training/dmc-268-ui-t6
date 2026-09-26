import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  connectRepository,
  fetchRepositories,
  fetchRepository,
  repoApi,
  updateRepository,
} from './index'

describe('repoApi schema mappings', () => {
  it('maps endpoints to correct definitions', () => {
    expect(repoApi.list.endpoint().path).toBe('/repos')
    expect(repoApi.connect.endpoint().method).toBe('POST')
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

  it('fetchRepositories returns validated repositories', async () => {
    const mockData = [
      {
        id: 'repo-1',
        name: 'test-repo',
        fullName: 'org/test-repo',
        url: 'https://github.com/org/test-repo',
        defaultBranch: 'main',
        enabled: true,
        defaultEngine: 'fast',
        waitForCi: true,
        maxComments: 10,
      },
    ]

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        statusText: 'OK',
      }),
    )

    const result = await fetchRepositories()
    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('test-repo')
  })

  it('connectRepository posts validated payload', async () => {
    const returnedRepo = {
      id: 'repo-2',
      name: 'new-repo',
      fullName: 'org/new-repo',
      url: 'https://github.com/org/new-repo',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: true,
      maxComments: 10,
    }

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(returnedRepo), {
        status: 201,
        statusText: 'Created',
      }),
    )
    globalThis.fetch = fetchMock

    const res = await connectRepository({ fullName: 'org/new-repo' })
    expect(res.fullName).toBe('org/new-repo')
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit | undefined] | undefined
    expect(callArgs).toBeDefined()
    expect(callArgs?.[0]).toContain('/repos')
    expect(callArgs?.[1]?.method).toBe('POST')
  })

  it('updateRepository sends patch request', async () => {
    const updated = {
      id: 'repo-1',
      name: 'test-repo',
      fullName: 'org/test-repo',
      url: 'https://github.com/org/test-repo',
      defaultBranch: 'main',
      enabled: false,
      defaultEngine: 'deep',
      waitForCi: false,
      maxComments: 5,
    }

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(updated), {
        status: 200,
        statusText: 'OK',
      }),
    )
    globalThis.fetch = fetchMock

    const res = await updateRepository('repo-1', { enabled: false, defaultEngine: 'deep' })
    expect(res.enabled).toBe(false)
    expect(res.defaultEngine).toBe('deep')
  })

  it('fetchRepository returns single repository', async () => {
    const mockRepo = {
      id: 'repo-1',
      name: 'test-repo',
      fullName: 'org/test-repo',
      url: 'https://github.com/org/test-repo',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: true,
      maxComments: 10,
    }

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockRepo), {
        status: 200,
        statusText: 'OK',
      }),
    )

    const res = await fetchRepository('repo-1')
    expect(res.id).toBe('repo-1')
  })
})
