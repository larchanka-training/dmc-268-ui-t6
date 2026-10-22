// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UPDATE_REPOSITORY_MUTATION_KEY, type RagIndexStatus } from '../../../entities/repository'
import { RAG_POLL_MS, RAG_POLL_WINDOW_MS, useRagIndexPolling } from './useRagIndexPolling'

/** The polls of one full window: one every 5 s, none at the deadline itself. */
const POLLS_PER_WINDOW = RAG_POLL_WINDOW_MS / RAG_POLL_MS - 1

interface Props {
  status: RagIndexStatus | undefined
  enabledAt: number | null
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

/** Lets the timers up to `ms` run, and the renders they cause. */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

/** A `refetch` that counts the polls. */
function refetchSpy() {
  return vi.fn<(options?: { cancelRefetch?: boolean }) => Promise<unknown>>(() => Promise.resolve())
}

/** Mounts the hook; `refetch` counts the polls. */
function mount(initialProps: Props, client = new QueryClient()) {
  const refetch = refetchSpy()
  const view = renderHook(
    ({ status, enabledAt }: Props) => useRagIndexPolling(status, enabledAt, refetch),
    { initialProps, wrapper: wrapper(client) },
  )
  return { ...view, refetch }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useRagIndexPolling', () => {
  it('polls every 5 s while the index is building and stops at a final status', async () => {
    const { result, rerender, refetch } = mount({ status: 'building', enabledAt: null })
    expect(result.current).toBe('waiting')

    await advance(RAG_POLL_MS - 1)
    expect(refetch).not.toHaveBeenCalled()
    await advance(1)
    expect(refetch).toHaveBeenCalledTimes(1)
    // A poll joins a request already in flight instead of cancelling it.
    expect(refetch).toHaveBeenLastCalledWith({ cancelRefetch: false })
    await advance(RAG_POLL_MS)
    expect(refetch).toHaveBeenCalledTimes(2)

    rerender({ status: 'ready', enabledAt: null })
    expect(result.current).toBe('idle')
    await advance(60_000)
    expect(refetch).toHaveBeenCalledTimes(2)
  })

  it.each<[string, RagIndexStatus | undefined]>([
    ['ready', 'ready'],
    ['stale', 'stale'],
    ['failed', 'failed'],
    ['disabled', 'disabled'],
    ['no repository yet', undefined],
  ])('does not poll a final status, even right after a switch-on: %s', async (_name, status) => {
    const { result, refetch } = mount({ status, enabledAt: Date.now() })
    expect(result.current).toBe('idle')

    await advance(RAG_POLL_WINDOW_MS + RAG_POLL_MS)
    expect(refetch).not.toHaveBeenCalled()
    expect(result.current).toBe('idle')
  })

  it('does not poll an empty index the page was opened on', async () => {
    const { result, refetch } = mount({ status: 'empty', enabledAt: null })
    expect(result.current).toBe('idle')

    await advance(RAG_POLL_WINDOW_MS + RAG_POLL_MS)
    expect(refetch).not.toHaveBeenCalled()
    expect(result.current).toBe('idle')
  })

  it('polls an empty index after a switch-on made on the page', async () => {
    const { result, rerender, refetch } = mount({ status: 'empty', enabledAt: null })
    expect(result.current).toBe('idle')

    rerender({ status: 'empty', enabledAt: Date.now() })
    expect(result.current).toBe('waiting')
    await advance(RAG_POLL_MS - 1)
    expect(refetch).not.toHaveBeenCalled()
    await advance(1)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('counts a switch-on it is mounted with', async () => {
    const { result, refetch } = mount({ status: 'empty', enabledAt: Date.now() })
    expect(result.current).toBe('waiting')

    await advance(RAG_POLL_MS)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('gives up 120 s after a building index was first seen and stays timed out', async () => {
    const { result, rerender, refetch } = mount({ status: 'building', enabledAt: null })

    await advance(RAG_POLL_WINDOW_MS - 1)
    expect(result.current).toBe('waiting')
    expect(refetch).toHaveBeenCalledTimes(POLLS_PER_WINDOW)

    await advance(1)
    expect(result.current).toBe('timedOut')
    await advance(60_000)
    expect(result.current).toBe('timedOut')
    expect(refetch).toHaveBeenCalledTimes(POLLS_PER_WINDOW)

    // The time-out holds as long as the index is still being built ...
    rerender({ status: 'building', enabledAt: null })
    expect(result.current).toBe('timedOut')
    // ... and a final status forgets it: the next build is polled again.
    rerender({ status: 'ready', enabledAt: null })
    expect(result.current).toBe('idle')
    rerender({ status: 'building', enabledAt: null })
    expect(result.current).toBe('waiting')
    await advance(RAG_POLL_MS)
    expect(refetch).toHaveBeenCalledTimes(POLLS_PER_WINDOW + 1)
  })

  it('does not poll past the deadline when the clock jumps ahead of the timers', async () => {
    const { result, refetch } = mount({ status: 'building', enabledAt: null })
    await advance(RAG_POLL_MS)
    expect(refetch).toHaveBeenCalledTimes(1)

    // A machine that slept: the wall clock is past the deadline, the timers are not due yet.
    vi.setSystemTime(Date.now() + RAG_POLL_WINDOW_MS)
    await advance(RAG_POLL_MS)
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(result.current).toBe('timedOut')
  })

  it('keeps the window of the switch-on when the build starts', async () => {
    const switchedOnAt = Date.now()
    const { result, rerender, refetch } = mount({ status: 'empty', enabledAt: null })
    rerender({ status: 'empty', enabledAt: switchedOnAt })

    await advance(60_000)
    rerender({ status: 'building', enabledAt: switchedOnAt })
    expect(result.current).toBe('waiting')

    // The deadline is 120 s after the switch-on, not after the first `building`.
    await advance(RAG_POLL_WINDOW_MS - 60_000 - 1)
    expect(result.current).toBe('waiting')
    await advance(1)
    expect(result.current).toBe('timedOut')
    expect(refetch).toHaveBeenCalledTimes(POLLS_PER_WINDOW)
  })

  it('opens a fresh window on a new switch-on after a time-out', async () => {
    const switchedOnAt = Date.now()
    const { result, rerender, refetch } = mount({ status: 'empty', enabledAt: null })
    rerender({ status: 'empty', enabledAt: switchedOnAt })
    await advance(RAG_POLL_WINDOW_MS)
    expect(result.current).toBe('timedOut')

    // Neither the same switch-on again nor a forgotten one is a new switch-on.
    rerender({ status: 'empty', enabledAt: switchedOnAt })
    expect(result.current).toBe('timedOut')
    rerender({ status: 'empty', enabledAt: null })
    expect(result.current).toBe('timedOut')
    await advance(RAG_POLL_MS)
    expect(refetch).toHaveBeenCalledTimes(POLLS_PER_WINDOW)

    rerender({ status: 'empty', enabledAt: Date.now() })
    expect(result.current).toBe('waiting')
    await advance(RAG_POLL_MS)
    expect(refetch).toHaveBeenCalledTimes(POLLS_PER_WINDOW + 1)
    await advance(RAG_POLL_WINDOW_MS - RAG_POLL_MS)
    expect(result.current).toBe('timedOut')
    expect(refetch).toHaveBeenCalledTimes(2 * POLLS_PER_WINDOW)
  })

  it('restarts the window on another switch-on while it still waits', async () => {
    const { result, rerender, refetch } = mount({ status: 'empty', enabledAt: null })
    rerender({ status: 'empty', enabledAt: Date.now() })
    await advance(60_000)
    expect(refetch).toHaveBeenCalledTimes(60_000 / RAG_POLL_MS)

    rerender({ status: 'empty', enabledAt: Date.now() })
    await advance(RAG_POLL_WINDOW_MS - 1)
    expect(result.current).toBe('waiting')
    await advance(1)
    expect(result.current).toBe('timedOut')
    expect(refetch).toHaveBeenCalledTimes(60_000 / RAG_POLL_MS + POLLS_PER_WINDOW)
  })

  it('keeps its deadline and polls with the newest refetch it is handed', async () => {
    const first = refetchSpy()
    const second = refetchSpy()
    const { result, rerender } = renderHook(
      ({ refetch }) => useRagIndexPolling('building', null, refetch),
      { initialProps: { refetch: first }, wrapper: wrapper(new QueryClient()) },
    )
    await advance(60_000)
    rerender({ refetch: second })

    await advance(RAG_POLL_WINDOW_MS - 60_000)
    expect(result.current).toBe('timedOut')
    expect(first).toHaveBeenCalledTimes(60_000 / RAG_POLL_MS)
    expect(second).toHaveBeenCalledTimes(POLLS_PER_WINDOW - 60_000 / RAG_POLL_MS)
  })

  it('skips a poll while a repository update runs', async () => {
    const client = new QueryClient()
    const { result, refetch } = mount({ status: 'building', enabledAt: null }, client)
    let release: () => void = () => undefined
    const update = new Promise<void>((resolve) => {
      release = resolve
    })
    void client
      .getMutationCache()
      .build(client, { mutationKey: UPDATE_REPOSITORY_MUTATION_KEY, mutationFn: () => update })
      .execute(undefined)
    expect(client.isMutating({ mutationKey: UPDATE_REPOSITORY_MUTATION_KEY })).toBe(1)

    await advance(RAG_POLL_MS)
    expect(refetch).not.toHaveBeenCalled()
    expect(result.current).toBe('waiting')

    release()
    await advance(RAG_POLL_MS)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('stops polling when unmounted', async () => {
    const { unmount, refetch } = mount({ status: 'building', enabledAt: null })
    await advance(RAG_POLL_MS)
    expect(refetch).toHaveBeenCalledTimes(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
    await advance(60_000)
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
