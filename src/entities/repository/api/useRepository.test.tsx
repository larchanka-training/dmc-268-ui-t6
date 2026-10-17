// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { REPOSITORIES_QUERY_KEY, useRepositories, useRepository } from './index'

const FIRST = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  fullName: 'org/first',
  url: 'https://github.com/org/first',
  defaultBranch: 'main',
  enabled: true,
  defaultEngine: 'fast',
  waitForCi: 'auto',
  maxComments: 10,
  reviewEvent: 'COMMENT',
  branchFilter: [],
  severityThreshold: 'all',
  installationAvailable: true,
}
const SECOND = {
  ...FIRST,
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  fullName: 'org/second',
  url: 'https://github.com/org/second',
}

function stubList() {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response(JSON.stringify([FIRST, SECOND]), { status: 200 })),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useRepository', () => {
  it('selects one repository from the list with a single list request', async () => {
    const fetchMock = stubList()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => useRepository(SECOND.id), { wrapper: wrapper(client) })

    expect(result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
    await waitFor(() => {
      expect(result.current.data?.fullName).toBe('org/second')
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/repos')
  })

  it('shares the cache of the list: both hooks read one entry and one request', async () => {
    const fetchMock = stubList()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(
      () => ({ list: useRepositories(), one: useRepository(FIRST.id) }),
      {
        wrapper: wrapper(client),
      },
    )

    await waitFor(() => {
      expect(result.current.one.data?.fullName).toBe('org/first')
    })
    expect(result.current.list.data).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(client.getQueryCache().findAll({ queryKey: REPOSITORIES_QUERY_KEY })).toHaveLength(1)
  })

  it('asks again on mount even when the cached list is still fresh', async () => {
    const fetchMock = stubList()
    // The app's staleTime: a fresh list is not refetched on mount by default.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })
    client.setQueryData(REPOSITORIES_QUERY_KEY, [{ ...FIRST, maxComments: 3 }, SECOND])

    const { result } = renderHook(() => useRepository(FIRST.id), { wrapper: wrapper(client) })

    // The cached value is there at once, and so is the request for the current one.
    expect(result.current.data?.maxComments).toBe(3)
    expect(result.current.isFetching).toBe(true)
    await waitFor(() => {
      expect(result.current.data?.maxComments).toBe(10)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stays undefined, not pending, when the list has no such repository', async () => {
    stubList()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => useRepository('c3d4e5f6-a7b8-4901-8def-123456789012'), {
      wrapper: wrapper(client),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data).toBeUndefined()
    expect(result.current.isPending).toBe(false)
  })

  it('follows a change of the list cache, such as an optimistic update', async () => {
    stubList()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useRepository(FIRST.id), { wrapper: wrapper(client) })
    await waitFor(() => {
      expect(result.current.data?.maxComments).toBe(10)
    })

    client.setQueryData(REPOSITORIES_QUERY_KEY, [{ ...FIRST, maxComments: 3 }, SECOND])

    await waitFor(() => {
      expect(result.current.data?.maxComments).toBe(3)
    })
  })
})
