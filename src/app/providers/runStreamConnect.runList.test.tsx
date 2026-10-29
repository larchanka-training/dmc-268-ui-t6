// @vitest-environment jsdom
import { QueryClientProvider, onlineManager } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runQueryKeys, useRunList } from '../../entities/run'
import type { RunListPage } from '../../entities/run'
import { queryClient } from './queryClient'
import { applyRunUpdated } from './runStreamConnect'

// `applyRunUpdated` against a mounted run list: `invalidateQueries` refetches only queries with an
// observer, and the page being loaded is the state `fetchNextPage` leaves behind.

const RUN_ID = '11111111-1111-4111-8111-000000000004'
const FIRST = '/api/runs?limit=20'
const SECOND = '/api/runs?cursor=c1&limit=20'

function run(
  n: number,
  status: 'succeeded' | 'cancelled' = 'succeeded',
): RunListPage['items'][number] {
  return {
    id: `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`,
    engine: 'fast',
    model: null,
    status,
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

function pageOf(items: RunListPage['items'], nextCursor: string | null): RunListPage {
  return { items, nextCursor }
}

interface HeldRequest {
  url: string
  release: () => void
  fail: () => void
}

// The stub answers every url at once except those in `hold`: that response waits in `held`. A body
// is read when the request goes out, so a later change of `pages` reaches only later requests.
let urls: string[]
let held: HeldRequest[]
let hold: Set<string>
let pages: Record<string, RunListPage>
const originalFetch = globalThis.fetch

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input
  }
  return input instanceof URL ? input.href : input.url
}

function stubFetch(): void {
  globalThis.fetch = (input) => {
    const url = requestUrl(input)
    urls.push(url)
    const body = JSON.stringify(pages[url])
    const respond = (): Response => new Response(body, { status: 200 })
    if (!hold.has(url)) {
      return Promise.resolve(respond())
    }
    return new Promise<Response>((resolve, reject) => {
      held.push({
        url,
        release: () => {
          resolve(respond())
        },
        fail: () => {
          reject(new Error('network down'))
        },
      })
    })
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

// TanStack Query re-renders a component only for the result fields it read during a render, so the
// hook under test reads every field the assertions look at.
function useRunListFields() {
  const { data, hasNextPage, isFetching, fetchNextPage } = useRunList()
  return { data, hasNextPage, isFetching, fetchNextPage }
}

function pageSizes(result: { current: ReturnType<typeof useRunListFields> }): number[] | undefined {
  return result.current.data?.pages.map((page) => page.items.length)
}

async function mountWithFirstPage() {
  const view = renderHook(() => useRunListFields(), { wrapper })
  await waitFor(() => {
    expect(view.result.current.hasNextPage).toBe(true)
  })
  return view
}

/** Starts the load of page 2 and waits until its request is out and held. */
async function startHeldPageLoad(view: Awaited<ReturnType<typeof mountWithFirstPage>>) {
  hold.add(SECOND)
  act(() => {
    void view.result.current.fetchNextPage()
  })
  await waitFor(() => {
    expect(urls).toEqual([FIRST, SECOND])
  })
}

async function settle(view: Awaited<ReturnType<typeof mountWithFirstPage>>) {
  await waitFor(() => {
    expect(view.result.current.isFetching).toBe(false)
  })
  // A request that a late invalidation would send still goes out within these ticks.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

beforeEach(() => {
  queryClient.clear()
  urls = []
  held = []
  hold = new Set()
  pages = {
    [FIRST]: pageOf([run(1), run(2)], 'c1'),
    [SECOND]: pageOf([run(3)], null),
  }
  stubFetch()
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  globalThis.fetch = originalFetch
  onlineManager.setOnline(true)
})

describe('applyRunUpdated with a mounted run list', () => {
  it('keeps the page being loaded and refetches the list once after it', async () => {
    const view = await mountWithFirstPage()
    await startHeldPageLoad(view)

    act(() => {
      applyRunUpdated({ runId: RUN_ID, status: 'running' })
    })
    await act(async () => {
      await Promise.resolve()
    })
    const urlsAfterEvent = [...urls]

    hold.delete(SECOND)
    await act(async () => {
      held[0]?.release()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(pageSizes(view.result)).toEqual([2, 1])
    })
    expect(view.result.current.data?.pages[1]?.items[0]?.id).toBe(run(3).id)
    // The event neither cancelled the page load nor started a request of its own; the trailing
    // refetch reloads both pages, the first one first.
    expect(urlsAfterEvent).toEqual([FIRST, SECOND])
    await waitFor(() => {
      expect(urls).toEqual([FIRST, SECOND, FIRST, SECOND])
    })
    await settle(view)
    expect(urls).toHaveLength(4)
    expect(pageSizes(view.result)).toEqual([2, 1])
  })

  it('lets a newer refetch win over the list refetch in flight', async () => {
    const view = await mountWithFirstPage()
    hold.add(FIRST)

    act(() => {
      applyRunUpdated({ runId: RUN_ID, status: 'running' })
    })
    await waitFor(() => {
      expect(urls).toEqual([FIRST, FIRST])
    })
    pages[FIRST] = pageOf([run(1, 'cancelled'), run(2)], 'c1')
    act(() => {
      applyRunUpdated({ runId: RUN_ID, status: 'succeeded' })
    })
    await waitFor(() => {
      expect(urls).toEqual([FIRST, FIRST, FIRST])
    })

    // The abandoned refetch lands first and is discarded; the newest one wins.
    await act(async () => {
      held[0]?.release()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(view.result.current.data?.pages[0]?.items[0]?.status).toBe('succeeded')

    await act(async () => {
      held[1]?.release()
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(view.result.current.data?.pages[0]?.items[0]?.status).toBe('cancelled')
    })
    await settle(view)
    expect(urls).toHaveLength(3)
  })

  it('queues one trailing refetch round for several events during one page load', async () => {
    const view = await mountWithFirstPage()
    await startHeldPageLoad(view)

    act(() => {
      applyRunUpdated({ runId: RUN_ID, status: 'running' })
      applyRunUpdated({ runId: RUN_ID, status: 'publishing' })
      applyRunUpdated({ runId: RUN_ID, status: 'succeeded' })
    })

    hold.delete(SECOND)
    await act(async () => {
      held[0]?.release()
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(urls).toEqual([FIRST, SECOND, FIRST, SECOND])
    })
    await settle(view)
    expect(urls).toHaveLength(4)
    expect(pageSizes(view.result)).toEqual([2, 1])
  })

  it('refetches the list after a page load that failed', async () => {
    const view = await mountWithFirstPage()
    await startHeldPageLoad(view)

    act(() => {
      applyRunUpdated({ runId: RUN_ID, status: 'running' })
    })
    await act(async () => {
      await Promise.resolve()
    })
    const urlsAfterEvent = [...urls]
    await act(async () => {
      held[0]?.fail()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(urls).toEqual([FIRST, SECOND, FIRST])
    })
    expect(urlsAfterEvent).toEqual([FIRST, SECOND])
    await settle(view)
    expect(urls).toHaveLength(3)
    expect(pageSizes(view.result)).toEqual([2])
  })

  it('lets go of the cache listener when the list is removed during a page load', async () => {
    const view = await mountWithFirstPage()
    await startHeldPageLoad(view)
    const cache = queryClient.getQueryCache()
    // Nothing else listens to the cache, so a listener left over is the one of the trailing round.
    expect(cache.hasListeners()).toBe(false)

    act(() => {
      applyRunUpdated({ runId: RUN_ID, status: 'running' })
    })
    expect(cache.hasListeners()).toBe(true)

    // The list goes with its page (a cleared cache). A mounted observer would build it again.
    view.unmount()
    act(() => {
      queryClient.removeQueries({ queryKey: runQueryKeys.list() })
    })
    expect(cache.hasListeners()).toBe(false)

    hold.delete(SECOND)
    await act(async () => {
      held[0]?.release()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(urls).toEqual([FIRST, SECOND])
  })

  it('keeps a page load that is paused offline and refetches the list once after it', async () => {
    const view = await mountWithFirstPage()
    onlineManager.setOnline(false)
    act(() => {
      void view.result.current.fetchNextPage()
    })
    await waitFor(() => {
      expect(
        queryClient.getQueryCache().findAll({ queryKey: runQueryKeys.list() })[0]?.state
          .fetchStatus,
      ).toBe('paused')
    })

    act(() => {
      applyRunUpdated({ runId: RUN_ID, status: 'running' })
    })
    await act(async () => {
      await Promise.resolve()
    })
    // The page has not been requested yet, and the event did not turn it into a refetch.
    expect(urls).toEqual([FIRST])

    act(() => {
      onlineManager.setOnline(true)
    })
    await waitFor(() => {
      expect(urls).toEqual([FIRST, SECOND, FIRST, SECOND])
    })
    await settle(view)
    expect(urls).toHaveLength(4)
    expect(pageSizes(view.result)).toEqual([2, 1])
  })
})
