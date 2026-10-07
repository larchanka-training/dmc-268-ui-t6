import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runQueryKeys } from '../../entities/run'
import { queryClient } from './queryClient'
import {
  connectRunStream,
  MAX_STREAM_401_RETRIES,
  runStreamUntilAborted,
  STREAM_KEEPALIVE_INTERVAL_MS,
  STREAM_RECONNECT_DELAY_MS,
} from './runStreamConnect'

vi.mock('../../shared/api/client', () => ({
  getAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
}))

import { getAccessToken, refreshAccessToken } from '../../shared/api/client'

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

const SSE_RESPONSE_INIT = { status: 200, headers: { 'content-type': 'text/event-stream' } }

const RUN_A = '11111111-1111-4111-8111-00000000000a'
const RUN_B = '11111111-1111-4111-8111-00000000000b'

const KEEPALIVE = ': keepalive\n\n'
const PING = 'event: ping\ndata: x\n\n'

function runUpdated(runId: string, id?: string): string {
  const idLine = id === undefined ? '' : `id: ${id}\n`
  return `event: run.updated\n${idLine}data: ${JSON.stringify({ runId, status: 'running' })}\n\n`
}

/**
 * A body that stays open until the test closes it. It errors with an AbortError once `signal`
 * aborts, as the body of a real fetch does; a bare ReadableStream would ignore the abort.
 */
function openStream(signal?: AbortSignal | null) {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
  })
  signal?.addEventListener(
    'abort',
    () => {
      controller?.error(new DOMException('Aborted', 'AbortError'))
    },
    { once: true },
  )
  return {
    body,
    send(text: string): void {
      controller?.enqueue(encoder.encode(text))
    },
    close(): void {
      controller?.close()
    },
  }
}

/** A fetch whose every call opens a fresh stream, kept in `streams` for the test to drive. */
function openStreamFetch() {
  const streams: ReturnType<typeof openStream>[] = []
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
    const stream = openStream(init?.signal)
    streams.push(stream)
    return Promise.resolve(new Response(stream.body, SSE_RESPONSE_INIT))
  })
  return { fetchMock, streams }
}

function requestHeader(
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
  call: number,
  name: string,
) {
  return new Headers(fetchMock.mock.calls[call]?.[1]?.headers).get(name)
}

function requestSignal(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, call: number) {
  return fetchMock.mock.calls[call]?.[1]?.signal
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
    let tokenIndex = 0
    vi.mocked(refreshAccessToken).mockImplementation(() => {
      tokenIndex += 1
      if (tokenIndex > 10) {
        return Promise.resolve(null)
      }
      return Promise.resolve(`token_${String(tokenIndex)}`)
    })
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

  it('reconnects after fetch throws a network error', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS + 10)
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)

    controller.abort()
    await done
  })

  it('does not log when the in-flight stream is aborted', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => {
            reject(new DOMException('Aborted', 'AbortError'))
          },
          { once: true },
        )
      })
    })

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    controller.abort()
    await done
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('resets reconnect delay after read() throws once a chunk was received', async () => {
    vi.useFakeTimers()
    const readError = new TypeError('network read failed')
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('event: ping\ndata: x\n\n'))
            controller.error(readError)
          },
        }),
        { status: 200, headers: { 'content-type': 'text/event-stream' } },
      ),
    )
    fetchMock.mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    controller.abort()
    await done
  })

  it('grows reconnect delay on 503 and resets only after a successful read', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Unavailable' }))
      .mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Unavailable' }))
      .mockResolvedValueOnce(
        new Response(sseBody(['event: ping\ndata: x\n\n']), {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      )
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS * 2 - 1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(4)

    controller.abort()
    await done
  })

  it('resets a grown reconnect delay when read() throws after a chunk was received', async () => {
    vi.useFakeTimers()
    const readError = new TypeError('network read failed')
    let chunkSent = false
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Unavailable' }))
      .mockResolvedValueOnce(
        new Response(
          // error() in start() would drop the queued chunk; pull() errors only after it was read.
          new ReadableStream({
            pull(controller) {
              if (chunkSent) {
                controller.error(readError)
                return
              }
              chunkSent = true
              controller.enqueue(new TextEncoder().encode('event: ping\ndata: x\n\n'))
            },
          }),
          { status: 200, headers: { 'content-type': 'text/event-stream' } },
        ),
      )
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // The first 503 waits the base delay and leaves the next wait at twice the base.
    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // The stream delivered a chunk before read() threw, so the wait is the base delay again.
    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    controller.abort()
    await done
  })

  it('caps 401 retries per attempt then backs off before the next fetch', async () => {
    vi.useFakeTimers()
    let tokenIndex = 0
    vi.mocked(refreshAccessToken).mockImplementation(() => {
      tokenIndex += 1
      return Promise.resolve(`token_${String(tokenIndex)}`)
    })
    vi.mocked(getAccessToken).mockReturnValue('token_loop')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401, statusText: 'Unauthorized' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(MAX_STREAM_401_RETRIES + 1)

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(MAX_STREAM_401_RETRIES + 1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes((MAX_STREAM_401_RETRIES + 1) * 2)

    controller.abort()
    await done
  })
})

describe('connectRunStream keep-alive and abort plumbing', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('invalidates nothing for a keep-alive comment frame', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    globalThis.fetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(sseBody([KEEPALIVE, KEEPALIVE]), SSE_RESPONSE_INIT))

    const controller = new AbortController()
    await connectRunStream(controller.signal, 'token_a')

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('hands fetch an aborted signal when the outer signal is already aborted', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    globalThis.fetch = fetchMock
    const controller = new AbortController()
    controller.abort()

    await expect(connectRunStream(controller.signal, 'token_a')).rejects.toThrow('Aborted')

    expect(requestSignal(fetchMock, 0)?.aborted).toBe(true)
  })

  it('removes its listener from the outer signal when the connection ends', async () => {
    const controller = new AbortController()
    const addSpy = vi.spyOn(controller.signal, 'addEventListener')
    const removeSpy = vi.spyOn(controller.signal, 'removeEventListener')
    globalThis.fetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(sseBody([PING]), SSE_RESPONSE_INIT))

    await connectRunStream(controller.signal, 'token_a')

    const added = addSpy.mock.calls.filter(([type]) => type === 'abort')
    const removed = removeSpy.mock.calls.filter(([type]) => type === 'abort')
    expect(added.length).toBeGreaterThan(0)
    expect(removed.map(([, listener]) => listener)).toStrictEqual(
      added.map(([, listener]) => listener),
    )
  })
})

describe('runStreamUntilAborted reconnect state', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    queryClient.clear()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.mocked(getAccessToken).mockReset()
    vi.mocked(refreshAccessToken).mockReset()
    queryClient.clear()
  })

  function runKeys(runId: string) {
    return [
      runQueryKeys.detail(runId),
      runQueryKeys.actions(runId),
      runQueryKeys.diff(runId),
      runQueryKeys.comments(runId),
    ]
  }

  function seedRunQueries(): void {
    // Two runs, one of them with two cached keys: the run id is collected once.
    queryClient.setQueryData(runQueryKeys.detail(RUN_A), {})
    queryClient.setQueryData(runQueryKeys.diff(RUN_A), {})
    queryClient.setQueryData(runQueryKeys.comments(RUN_B), [])
    // Never a run id: the list, the disabled-query placeholders and a foreign key.
    queryClient.setQueryData(runQueryKeys.list(), [])
    queryClient.setQueryData(runQueryKeys.detailDisabled(), {})
    queryClient.setQueryData(['runs', 'actions', null], [])
    queryClient.setQueryData(['runs', 'actions', 'response', null], {})
    queryClient.setQueryData(['runs', 'comments', null], [])
    queryClient.setQueryData(['runs', 'diff', null], {})
    queryClient.setQueryData(['repos'], [])
  }

  it('invalidates the run queries of every cached run after a reconnect, not on the first connection', async () => {
    vi.useFakeTimers()
    seedRunQueries()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(sseBody([PING]), SSE_RESPONSE_INIT))
      .mockResolvedValueOnce(new Response(sseBody([PING]), SSE_RESPONSE_INIT))
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // Exactly the per-event key set for each cached run: never `['runs']`, `list()` or a placeholder.
    const keys = invalidateSpy.mock.calls.map(([filters]) => filters?.queryKey)
    expect(keys).toHaveLength(8)
    expect(keys).toEqual(expect.arrayContaining([...runKeys(RUN_A), ...runKeys(RUN_B)]))

    controller.abort()
    await done
  })

  it('counts only a 200 with a body as a connection for the reconnect invalidation', async () => {
    vi.useFakeTimers()
    seedRunQueries()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Unavailable' }))
      .mockResolvedValueOnce(new Response(sseBody([PING]), SSE_RESPONSE_INIT))
      .mockResolvedValueOnce(new Response(sseBody([PING]), SSE_RESPONSE_INIT))
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    // The failed attempt and the first successful connection invalidate nothing.
    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(invalidateSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(invalidateSpy).toHaveBeenCalledTimes(8)

    controller.abort()
    await done
  })

  it('sends the last event id on every later connection and none before an id was seen', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(sseBody([PING]), SSE_RESPONSE_INIT))
      .mockResolvedValueOnce(
        new Response(
          sseBody([runUpdated(RUN_A, '41'), runUpdated(RUN_A, '42')]),
          SSE_RESPONSE_INIT,
        ),
      )
      .mockResolvedValueOnce(new Response(sseBody([PING]), SSE_RESPONSE_INIT))
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestHeader(fetchMock, 0, 'Last-Event-ID')).toBeNull()

    // The first connection carried no id (an api that does not send them): still no header.
    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestHeader(fetchMock, 1, 'Last-Event-ID')).toBeNull()

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(requestHeader(fetchMock, 2, 'Last-Event-ID')).toBe('42')

    // The connection without an id keeps the last one that was seen.
    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(requestHeader(fetchMock, 3, 'Last-Event-ID')).toBe('42')

    controller.abort()
    await done
  })

  it('takes the last event id from a frame that carries no data', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(sseBody(['id: 7\n\n']), SSE_RESPONSE_INIT))
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestHeader(fetchMock, 1, 'Last-Event-ID')).toBe('7')

    controller.abort()
    await done
  })

  it.each([
    ['a code point above 0xFF, which makes fetch throw', 'идентификатор'],
    ['a control character, which a server or proxy rejects', 'a\u0001b'],
    ['DEL, which a server or proxy rejects', '\u007f'],
    ['a Latin-1 character, which would be re-encoded', 'é'],
  ])('never sends an id with %s, and keeps the previous one', async (_label, unsendable) => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(sseBody([`id: ${unsendable}\n\n`]), SSE_RESPONSE_INIT))
      .mockResolvedValueOnce(
        new Response(sseBody(['id: 5\n\n', `id: ${unsendable}\n\n`]), SSE_RESPONSE_INIT),
      )
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestHeader(fetchMock, 1, 'Last-Event-ID')).toBeNull()

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(requestHeader(fetchMock, 2, 'Last-Event-ID')).toBe('5')

    controller.abort()
    await done
  })

  it('leaves no abort listener on the outer signal after reconnect cycles', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const addSpy = vi.spyOn(controller.signal, 'addEventListener')
    const removeSpy = vi.spyOn(controller.signal, 'removeEventListener')
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const done = runStreamUntilAborted(controller.signal, 'token_a')
    // Fetches at 0, 3 s, 9 s and 21 s: three finished waits and the fourth one still running.
    await vi.advanceTimersByTimeAsync(
      STREAM_RECONNECT_DELAY_MS + STREAM_RECONNECT_DELAY_MS * 2 + STREAM_RECONNECT_DELAY_MS * 4,
    )
    expect(fetchMock).toHaveBeenCalledTimes(4)

    const added = addSpy.mock.calls.filter(([type]) => type === 'abort').map(([, l]) => l)
    const removed = new Set(
      removeSpy.mock.calls.filter(([type]) => type === 'abort').map(([, l]) => l),
    )
    // Only the running wait keeps its listener.
    expect(added.filter((listener) => !removed.has(listener))).toHaveLength(1)

    controller.abort()
    await done
  })

  it('sends the last event id on the retry after a 401 refresh', async () => {
    vi.useFakeTimers()
    vi.mocked(refreshAccessToken).mockResolvedValue('token_b')
    vi.mocked(getAccessToken).mockReturnValue('token_a')
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(sseBody(['id: 9\n\n']), SSE_RESPONSE_INIT))
      .mockResolvedValueOnce(new Response(null, { status: 401, statusText: 'Unauthorized' }))
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    // Call 1 got the 401, call 2 is the retry with the refreshed token.
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(requestHeader(fetchMock, 1, 'Last-Event-ID')).toBe('9')
    expect(requestHeader(fetchMock, 2, 'Last-Event-ID')).toBe('9')
    expect(requestHeader(fetchMock, 2, 'Authorization')).toBe('Bearer token_b')

    controller.abort()
    await done
  })
})

describe('runStreamUntilAborted keep-alive watchdog', () => {
  const originalFetch = globalThis.fetch
  const WATCHDOG_MS = 2 * STREAM_KEEPALIVE_INTERVAL_MS

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('aborts only the silent connection and reconnects after the base delay', async () => {
    vi.useFakeTimers()
    const { fetchMock, streams } = openStreamFetch()
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    streams[0]?.send(KEEPALIVE)
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS - 1)
    expect(requestSignal(fetchMock, 0)?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(requestSignal(fetchMock, 0)?.aborted).toBe(true)
    expect(controller.signal.aborted).toBe(false)

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestSignal(fetchMock, 1)?.aborted).toBe(false)

    controller.abort()
    await done
  })

  it('trips the watchdog at the frozen 30 s after a keep-alive of a 15 s interval', async () => {
    vi.useFakeTimers()
    const { fetchMock, streams } = openStreamFetch()
    globalThis.fetch = fetchMock

    expect(STREAM_KEEPALIVE_INTERVAL_MS).toBe(15_000)

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    await vi.advanceTimersByTimeAsync(0)
    streams[0]?.send(KEEPALIVE)

    await vi.advanceTimersByTimeAsync(29_999)
    expect(requestSignal(fetchMock, 0)?.aborted).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(requestSignal(fetchMock, 0)?.aborted).toBe(true)

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    controller.abort()
    await done
  })

  it('reconnects after the base delay when the watchdog aborts a connection that delivered data', async () => {
    vi.useFakeTimers()
    const { fetchMock, streams } = openStreamFetch()
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // The 503 waits the base delay and leaves the next wait at twice the base.
    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // The 503 opened no stream: streams[0] is the body of the second fetch.
    streams[0]?.send(KEEPALIVE)
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS)
    expect(requestSignal(fetchMock, 1)?.aborted).toBe(true)

    // The connection delivered data before it went silent, so the wait is the base delay again.
    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    controller.abort()
    await done
  })

  it('does not log the connection abort of the watchdog as an error', async () => {
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { fetchMock, streams } = openStreamFetch()
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    await vi.advanceTimersByTimeAsync(0)
    streams[0]?.send(KEEPALIVE)
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS + STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    controller.abort()
    await done
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('does not reconnect while keep-alive frames keep arriving', async () => {
    vi.useFakeTimers()
    const { fetchMock, streams } = openStreamFetch()
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    await vi.advanceTimersByTimeAsync(0)
    streams[0]?.send(KEEPALIVE)

    for (let elapsed = 0; elapsed < 120_000; elapsed += STREAM_KEEPALIVE_INTERVAL_MS) {
      await vi.advanceTimersByTimeAsync(STREAM_KEEPALIVE_INTERVAL_MS)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      streams[0]?.send(KEEPALIVE)
    }
    expect(requestSignal(fetchMock, 0)?.aborted).toBe(false)

    controller.abort()
    await done
  })

  it('counts any chunk as a sign of life, not only a keep-alive frame', async () => {
    vi.useFakeTimers()
    const { fetchMock, streams } = openStreamFetch()
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    await vi.advanceTimersByTimeAsync(0)
    streams[0]?.send(KEEPALIVE)

    // A frame arrives in two halves, 20 s apart: no keep-alive and no complete frame in between.
    const [firstHalf = '', secondHalf = ''] = runUpdated(RUN_A).split('data:')
    for (let i = 0; i < 6; i += 1) {
      await vi.advanceTimersByTimeAsync(20_000)
      streams[0]?.send(i % 2 === 0 ? firstHalf : `data:${secondHalf}`)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }

    controller.abort()
    await done
  })

  it('never aborts a stream that has sent no keep-alive, an api without keep-alive', async () => {
    vi.useFakeTimers()
    const { fetchMock, streams } = openStreamFetch()
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    await vi.advanceTimersByTimeAsync(0)
    streams[0]?.send(PING)

    await vi.advanceTimersByTimeAsync(120_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestSignal(fetchMock, 0)?.aborted).toBe(false)

    controller.abort()
    await done
  })

  it('stays armed on a later connection once any earlier connection sent a keep-alive', async () => {
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { fetchMock, streams } = openStreamFetch()
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    await vi.advanceTimersByTimeAsync(0)
    streams[0]?.send(KEEPALIVE)
    streams[0]?.close()

    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // The second connection is silent from the start: the watchdog runs from the response on.
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS - 1)
    expect(requestSignal(fetchMock, 1)?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(requestSignal(fetchMock, 1)?.aborted).toBe(true)

    // It delivered nothing, so the reconnect backs off instead of using the base delay.
    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(errorSpy).not.toHaveBeenCalled()

    controller.abort()
    await done
  })

  it('keeps reconnecting after an AbortError that is not the outer shutdown', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
      .mockResolvedValue(new Response(null, { status: 503, statusText: 'Unavailable' }))
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    await vi.advanceTimersByTimeAsync(STREAM_RECONNECT_DELAY_MS)

    expect(fetchMock).toHaveBeenCalledTimes(2)

    controller.abort()
    await done
  })

  it('makes no further fetch after the outer signal aborts', async () => {
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { fetchMock, streams } = openStreamFetch()
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const done = runStreamUntilAborted(controller.signal, 'token_a')
    await vi.advanceTimersByTimeAsync(0)
    streams[0]?.send(KEEPALIVE)
    await vi.advanceTimersByTimeAsync(STREAM_KEEPALIVE_INTERVAL_MS)

    controller.abort()
    await done
    // The watchdog timer of the aborted connection is cleared, not left to fire later.
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(10 * WATCHDOG_MS)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
