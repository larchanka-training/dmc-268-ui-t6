// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RULES_SIMULATION_POLL_MS, useRulesSimulation } from './rulesSimulation'

const ID = '5a5a5a5a-5a5a-4a5a-8a5a-000000000001'

const queued = { id: ID, status: 'queued' }
const running = { id: ID, status: 'running' }
const succeeded = {
  id: ID,
  status: 'succeeded',
  findings: [],
  tokensIn: 10,
  tokensOut: 2,
  costUsd: 0.001,
}
const failed = { id: ID, status: 'failed', errorCode: 'deadline_exceeded', costUsd: 0 }

type Answer = object | number

/** One answer per GET, the last one repeats; a number is an error status with an empty body. */
function answers(...bodies: Answer[]) {
  let count = 0
  const fetchMock = vi.fn<typeof fetch>(() => {
    count += 1
    const body = bodies[Math.min(count, bodies.length) - 1]
    return Promise.resolve(
      typeof body === 'number'
        ? new Response('', { status: body })
        : new Response(JSON.stringify(body)),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mount(id: string | null = ID) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(() => useRulesSimulation(id), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useRulesSimulation', () => {
  it('asks every 2 s while the simulation waits or runs, and stops once it succeeds', async () => {
    vi.useFakeTimers()
    const fetchMock = answers(queued, running, succeeded)

    const { result } = mount()
    await advance(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.data?.status).toBe('queued')

    await advance(RULES_SIMULATION_POLL_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // TanStack hands the answer to the hook from a zero-delay timer set once the request is over.
    await advance(1)
    expect(result.current.data?.status).toBe('running')

    await advance(RULES_SIMULATION_POLL_MS)
    await advance(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result.current.data?.status).toBe('succeeded')

    // The result is final: no request however long we wait.
    await advance(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('stops once the simulation failed', async () => {
    vi.useFakeTimers()
    const fetchMock = answers(running, failed)

    const { result } = mount()
    await advance(RULES_SIMULATION_POLL_MS + 1)
    expect(result.current.data?.status).toBe('failed')

    await advance(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['a missing simulation', 404],
    ['an answer that breaks the schema', { id: ID, status: 'succeeded' }],
  ])('stops on %s: asking again would get the same', async (_name, answer) => {
    vi.useFakeTimers()
    const fetchMock = answers(running, answer)

    const { result } = mount()
    await advance(RULES_SIMULATION_POLL_MS + 1)
    expect(result.current.isError).toBe(true)

    await advance(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps asking through a server failure and shows the next answer', async () => {
    vi.useFakeTimers()
    const fetchMock = answers(running, 502, succeeded)

    const { result } = mount()
    await advance(RULES_SIMULATION_POLL_MS + 1)
    expect(result.current.isError).toBe(true)

    await advance(RULES_SIMULATION_POLL_MS + 1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result.current.isError).toBe(false)
    expect(result.current.data?.status).toBe('succeeded')
  })

  it('asks nothing without a simulation', async () => {
    vi.useFakeTimers()
    const fetchMock = answers(queued)

    const { result } = mount(null)
    await advance(60_000)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })
})
