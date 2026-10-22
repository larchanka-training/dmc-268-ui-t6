// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UPDATE_REPOSITORY_MUTATION_KEY, type RagIndexStatus } from '../../../entities/repository'
import { advance } from '../../../test/advanceTimers'
import { RAG_POLL_MS, RAG_POLL_WINDOW_MS, useRagIndexPolling } from './useRagIndexPolling'

interface Props {
  status: RagIndexStatus | undefined
  enabledAt: number | null
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
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
  // The timings are pinned with literals below; this is the one place that reads the constants.
  it('polls every 5000 ms for at most 120 000 ms', () => {
    expect(RAG_POLL_MS).toBe(5000)
    expect(RAG_POLL_WINDOW_MS).toBe(120_000)
  })

  it('polls every 5 s while the index is building and stops at a final status', async () => {
    const { result, rerender, refetch } = mount({ status: 'building', enabledAt: null })
    expect(result.current).toBe('waiting')

    await advance(4999)
    expect(refetch).not.toHaveBeenCalled()
    await advance(1)
    expect(refetch).toHaveBeenCalledTimes(1)
    // A poll joins a request already in flight instead of cancelling it.
    expect(refetch).toHaveBeenLastCalledWith({ cancelRefetch: false })
    await advance(5000)
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

    await advance(125_000)
    expect(refetch).not.toHaveBeenCalled()
    expect(result.current).toBe('idle')
  })

  it('does not poll an empty index the page was opened on', async () => {
    const { result, refetch } = mount({ status: 'empty', enabledAt: null })
    expect(result.current).toBe('idle')

    await advance(125_000)
    expect(refetch).not.toHaveBeenCalled()
    expect(result.current).toBe('idle')
  })

  it('polls an empty index after a switch-on made on the page', async () => {
    const { result, rerender, refetch } = mount({ status: 'empty', enabledAt: null })
    expect(result.current).toBe('idle')

    rerender({ status: 'empty', enabledAt: Date.now() })
    expect(result.current).toBe('waiting')
    await advance(4999)
    expect(refetch).not.toHaveBeenCalled()
    await advance(1)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('counts a switch-on it is mounted with', async () => {
    const { result, refetch } = mount({ status: 'empty', enabledAt: Date.now() })
    expect(result.current).toBe('waiting')

    await advance(5000)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('gives up 120 s after a building index was first seen and stays timed out', async () => {
    const { result, rerender, refetch } = mount({ status: 'building', enabledAt: null })

    await advance(119_999)
    expect(result.current).toBe('waiting')
    // A poll every 5 s inside the window: 23 of them, none at the deadline itself.
    expect(refetch).toHaveBeenCalledTimes(23)

    await advance(1)
    expect(result.current).toBe('timedOut')
    await advance(60_000)
    expect(result.current).toBe('timedOut')
    expect(refetch).toHaveBeenCalledTimes(23)

    // The time-out holds as long as the index is still being built ...
    rerender({ status: 'building', enabledAt: null })
    expect(result.current).toBe('timedOut')
    // ... and a final status forgets it: the next build is polled again.
    rerender({ status: 'ready', enabledAt: null })
    expect(result.current).toBe('idle')
    rerender({ status: 'building', enabledAt: null })
    expect(result.current).toBe('waiting')
    await advance(5000)
    expect(refetch).toHaveBeenCalledTimes(24)
  })

  it('does not poll past the deadline when the clock jumps ahead of the timers', async () => {
    const { result, refetch } = mount({ status: 'building', enabledAt: null })
    await advance(5000)
    expect(refetch).toHaveBeenCalledTimes(1)

    // A machine that slept: the wall clock is past the deadline, the timers are not due yet.
    vi.setSystemTime(Date.now() + 120_000)
    await advance(5000)
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
    await advance(59_999)
    expect(result.current).toBe('waiting')
    await advance(1)
    expect(result.current).toBe('timedOut')
    expect(refetch).toHaveBeenCalledTimes(23)
  })

  it('opens a fresh window on a new switch-on after a time-out', async () => {
    const switchedOnAt = Date.now()
    const { result, rerender, refetch } = mount({ status: 'empty', enabledAt: null })
    rerender({ status: 'empty', enabledAt: switchedOnAt })
    await advance(120_000)
    expect(result.current).toBe('timedOut')

    // Neither the same switch-on again nor a forgotten one is a new switch-on.
    rerender({ status: 'empty', enabledAt: switchedOnAt })
    expect(result.current).toBe('timedOut')
    rerender({ status: 'empty', enabledAt: null })
    expect(result.current).toBe('timedOut')
    await advance(5000)
    expect(refetch).toHaveBeenCalledTimes(23)

    rerender({ status: 'empty', enabledAt: Date.now() })
    expect(result.current).toBe('waiting')
    await advance(5000)
    expect(refetch).toHaveBeenCalledTimes(24)
    await advance(115_000)
    expect(result.current).toBe('timedOut')
    expect(refetch).toHaveBeenCalledTimes(46)
  })

  it('restarts the window on another switch-on while it still waits', async () => {
    const { result, rerender, refetch } = mount({ status: 'empty', enabledAt: null })
    rerender({ status: 'empty', enabledAt: Date.now() })
    await advance(60_000)
    expect(refetch).toHaveBeenCalledTimes(12)

    rerender({ status: 'empty', enabledAt: Date.now() })
    await advance(119_999)
    expect(result.current).toBe('waiting')
    await advance(1)
    expect(result.current).toBe('timedOut')
    expect(refetch).toHaveBeenCalledTimes(35)
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

    await advance(60_000)
    expect(result.current).toBe('timedOut')
    expect(first).toHaveBeenCalledTimes(12)
    expect(second).toHaveBeenCalledTimes(11)
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

    await advance(5000)
    expect(refetch).not.toHaveBeenCalled()
    expect(result.current).toBe('waiting')

    release()
    await advance(5000)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('stops polling when unmounted', async () => {
    const { unmount, refetch } = mount({ status: 'building', enabledAt: null })
    await advance(5000)
    expect(refetch).toHaveBeenCalledTimes(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
    await advance(60_000)
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
