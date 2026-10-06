import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runQueryKeys } from '../../entities/run'
import { queryClient } from './queryClient'
import {
  connectRunStream,
  MAX_STREAM_401_RETRIES,
  runStreamUntilAborted,
  STREAM_RECONNECT_DELAY_MS,
} from './runStreamConnect'

vi.mock('../../shared/api/client', () => ({
  getAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
}))

import { refreshAccessToken } from '../../shared/api/client'

function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

describe('connectRunStream', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('invalidates run detail and actions on run.updated SSE frames', async () => {
    const runId = '11111111-1111-4111-8111-000000000004'
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          sseBody([
            `event: run.updated\ndata: ${JSON.stringify({ runId, status: 'running' })}\n\n`,
          ]),
          { status: 200, headers: { 'content-type': 'text/event-stream' } },
        ),
      )

    const controller = new AbortController()
    await connectRunStream(controller.signal, 'token_a')

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: runQueryKeys.detail(runId) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: runQueryKeys.actions(runId) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: runQueryKeys.diff(runId) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: runQueryKeys.comments(runId) })
  })

  it('stops retrying after MAX_STREAM_401_RETRIES refresh attempts', async () => {
    vi.mocked(refreshAccessToken).mockResolvedValueOnce('token_b').mockResolvedValueOnce('token_c')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401, statusText: 'Unauthorized' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    await connectRunStream(controller.signal, 'token_a')

    expect(fetchMock).toHaveBeenCalledTimes(MAX_STREAM_401_RETRIES + 1)
  })
})

describe('runStreamUntilAborted', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
  })

  it('reconnects after a failed stream response until aborted', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS + 10)
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)

    controller.abort()
    await done
  })
})
