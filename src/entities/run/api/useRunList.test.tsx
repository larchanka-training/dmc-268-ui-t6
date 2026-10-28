// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RunListPage } from '../model/schemas'
import { RUN_LIST_PAGE_SIZE, runQueryKeys, useRunList } from './index'

vi.mock('../../../shared/api/client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../../../shared/api/client'

function run(n: number): RunListPage['items'][number] {
  const id = `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`
  return {
    id,
    engine: 'fast',
    model: null,
    status: 'succeeded',
    startedAt: '2026-09-18T11:50:00.000Z',
    finishedAt: '2026-09-18T11:55:12.000Z',
    attempt: 1,
    cancelRequested: false,
    trigger: 'webhook',
    createdAt: '2026-09-18T11:00:00.000Z',
    summaryOnly: false,
    pullRequest: {
      repo: 'org/repo',
      number: n,
      title: `pr ${String(n)}`,
      url: `https://github.com/org/repo/pull/${String(n)}`,
      headSha: 'abcdef1234567890abcdef1234567890abcdef12',
    },
    actionCount: 1,
    errorCode: null,
    triggeredBy: null,
    usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 },
  }
}

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

// TanStack Query re-renders a component only for the result fields it read during a render, so the
// hook under test reads every field the assertions look at.
function useRunListFields(args?: Parameters<typeof useRunList>[0]) {
  const { data, hasNextPage, isSuccess, isFetchNextPageError, fetchNextPage } = useRunList(args)
  return { data, hasNextPage, isSuccess, isFetchNextPageError, fetchNextPage }
}

function requestedPaths(): string[] {
  return vi.mocked(apiClient).mock.calls.map(([endpoint]) => endpoint.path)
}

beforeEach(() => {
  client.clear()
  vi.mocked(apiClient).mockReset()
})

afterEach(() => {
  cleanup()
})

describe('useRunList', () => {
  it('requests the first page of the repo with the page size and no cursor', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ items: [run(1)], nextCursor: null })

    const { result } = renderHook(() => useRunListFields({ repo: 'org/repo' }), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(RUN_LIST_PAGE_SIZE).toBe(20)
    expect(requestedPaths()).toEqual(['/runs?repo=org%2Frepo&limit=20'])
    expect(requestedPaths()[0]).not.toContain('status=')
    expect(client.getQueryState(runQueryKeys.listFiltered({ repo: 'org/repo' }))?.status).toBe(
      'success',
    )
  })

  it('fetches the next page with the last cursor', async () => {
    vi.mocked(apiClient)
      .mockResolvedValueOnce({ items: [run(1), run(2)], nextCursor: 'cursor-a' })
      .mockResolvedValueOnce({ items: [run(3)], nextCursor: 'cursor-b' })

    const { result } = renderHook(() => useRunListFields(), { wrapper })
    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true)
    })

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.data?.pages.map((page) => page.items.length)).toEqual([2, 1])
    })
    expect(requestedPaths()).toEqual(['/runs?limit=20', '/runs?cursor=cursor-a&limit=20'])
    expect(result.current.hasNextPage).toBe(true)

    vi.mocked(apiClient).mockResolvedValueOnce({ items: [], nextCursor: null })
    await act(async () => {
      await result.current.fetchNextPage()
    })
    // The cursor of the newest page is the one that goes out, not the first one.
    expect(requestedPaths()[2]).toBe('/runs?cursor=cursor-b&limit=20')
  })

  it('sends status when the list is filtered by it and omits it otherwise', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ items: [run(1)], nextCursor: null })
    const { result } = renderHook(() => useRunListFields({ repo: 'org/repo', status: 'failed' }), {
      wrapper,
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(requestedPaths()).toEqual(['/runs?status=failed&repo=org%2Frepo&limit=20'])
  })

  it('stops paging when nextCursor is null', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ items: [run(1)], nextCursor: null })

    const { result } = renderHook(() => useRunListFields(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.hasNextPage).toBe(false)
  })

  it('keeps the rows of the loaded pages when the next page fails', async () => {
    vi.mocked(apiClient)
      .mockResolvedValueOnce({ items: [run(1)], nextCursor: 'cursor-a' })
      .mockRejectedValueOnce(new Error('boom'))

    const { result } = renderHook(() => useRunListFields(), { wrapper })
    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true)
    })

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.isFetchNextPageError).toBe(true)
    })
    expect(result.current.data?.pages).toHaveLength(1)
    expect(result.current.hasNextPage).toBe(true)
  })
})
