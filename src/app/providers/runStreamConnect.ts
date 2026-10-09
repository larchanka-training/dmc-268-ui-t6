import { parseRunUpdatedEvent, parseSseBuffer, runQueryKeys } from '../../entities/run'
import type { RunUpdatedEvent } from '../../entities/run'
import { getAccessToken, refreshAccessToken } from '../../shared/api/client'
import { API_BASE_URL } from '../../shared/config/env'
import { endpoints, resolveUrl } from '../../shared/api/endpoints'
import { queryClient } from './queryClient'

/** Cap refresh-and-retry cycles on 401 to avoid infinite loops (Refs #65, AC 2.2). */
export const MAX_STREAM_401_RETRIES = 2

export const STREAM_RECONNECT_DELAY_MS = 3000
export const MAX_STREAM_RECONNECT_DELAY_MS = 30_000

/** The server sends a `: keepalive` comment after this much idle time (SSE contract, api PR). */
export const STREAM_KEEPALIVE_INTERVAL_MS = 15_000

function isAborted(signal: AbortSignal): boolean {
  return signal.aborted
}

/** Silence for two keep-alive intervals means the connection is dead, not just idle. */
const STREAM_WATCHDOG_TIMEOUT_MS = 2 * STREAM_KEEPALIVE_INTERVAL_MS

/**
 * What outlives one connection inside a single `runStreamUntilAborted` call: reconnects resume
 * from it. Starts empty, so a server without `id:` or keep-alive never gets a header or a watchdog.
 */
export interface StreamSession {
  /** Last `id:` received, an opaque string; empty before any. Sent back as `Last-Event-ID`. */
  lastEventId: string
  /** A comment frame (the keep-alive) arrived on some connection: the watchdog is armed from then on. */
  sawKeepAlive: boolean
  /**
   * Attempts of the reconnect loop so far, failed or not; the 401 refresh retry inside an attempt
   * is not another one. A stream that failed before it first connected was down after the page
   * loaded its data, so only the very first attempt has nothing to resync.
   */
  attempts: number
}

function createStreamSession(): StreamSession {
  return { lastEventId: '', sawKeepAlive: false, attempts: 0 }
}

/**
 * Visible ASCII plus tab and space. `fetch` throws on NUL, CR/LF and code points above 0xFF, which
 * would break every reconnect; a control character or DEL is sent but a server or proxy answers
 * 400; a non-ASCII id would go out as a Latin-1 byte where the server sent UTF-8, altering it. An
 * id outside this set is never kept.
 */
const SENDABLE_EVENT_ID = /^[\t\x20-\x7e]*$/

/** The queries one `run.updated` event invalidates for a run; also used after a reconnect. */
function invalidateRunQueries(runId: string): void {
  void queryClient.invalidateQueries({ queryKey: runQueryKeys.detail(runId) })
  void queryClient.invalidateQueries({ queryKey: runQueryKeys.actions(runId) })
  void queryClient.invalidateQueries({ queryKey: runQueryKeys.diff(runId) })
  void queryClient.invalidateQueries({ queryKey: runQueryKeys.comments(runId) })
}

/**
 * Applies one `run.updated` event: the queries of that run, plus the runs list, whose status
 * column shows the new status. The resync after a reconnect does not touch the list.
 */
export function applyRunUpdated(event: RunUpdatedEvent): void {
  invalidateRunQueries(event.runId)
  void queryClient.invalidateQueries({ queryKey: runQueryKeys.list() })
}

/**
 * Ids of the runs that have queries in the cache, from keys shaped `['runs', <id>, ...]`. The list
 * key and the disabled-query placeholders (`['runs', 'detail', null]`, ...) are not run ids.
 */
function cachedRunIds(): Set<string> {
  const [root, listSegment] = runQueryKeys.list()
  const ids = new Set<string>()
  for (const { queryKey } of queryClient.getQueryCache().getAll()) {
    const [first, second] = queryKey
    if (
      first === root &&
      typeof second === 'string' &&
      second !== listSegment &&
      !queryKey.includes(null)
    ) {
      ids.add(second)
    }
  }
  return ids
}

/**
 * Read one open stream until it ends, errors or goes silent. `connection` aborts this stream
 * alone (the watchdog); `signal` is the outer shutdown switch.
 */
async function readStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  connection: AbortController,
  session: StreamSession,
): Promise<boolean> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let readChunk = false
  let watchdog: ReturnType<typeof setTimeout> | undefined

  const armWatchdog = (): void => {
    clearTimeout(watchdog)
    watchdog = setTimeout(() => {
      connection.abort()
    }, STREAM_WATCHDOG_TIMEOUT_MS)
  }

  try {
    if (session.sawKeepAlive) {
      armWatchdog()
    }
    while (!connection.signal.aborted) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      readChunk = true
      buffer += decoder.decode(value, { stream: true })
      const parsed = parseSseBuffer(buffer)
      buffer = parsed.rest
      if (parsed.comments > 0) {
        session.sawKeepAlive = true
      }
      if (parsed.lastEventId !== undefined && SENDABLE_EVENT_ID.test(parsed.lastEventId)) {
        session.lastEventId = parsed.lastEventId
      }
      // Every chunk is a sign of life, not only a parsed event.
      if (session.sawKeepAlive) {
        armWatchdog()
      }
      for (const frame of parsed.events) {
        if (frame.event !== 'run.updated') {
          continue
        }
        const payload = parseRunUpdatedEvent(frame.data)
        if (payload === null) {
          continue
        }
        applyRunUpdated(payload)
      }
    }
  } catch (error: unknown) {
    // An AbortError alone does not mean shutdown: the watchdog aborts the connection too.
    if (isAborted(signal)) {
      throw error
    }
    if (readChunk) {
      return true
    }
    // The outer signal is not aborted, so an aborted connection is the watchdog's: a silent
    // stream that never delivered data, to reconnect with backoff and without an error log.
    if (connection.signal.aborted) {
      return false
    }
    throw error
  } finally {
    clearTimeout(watchdog)
  }
  return readChunk
}

export async function connectRunStream(
  signal: AbortSignal,
  token: string,
  authRetries = 0,
  session: StreamSession = createStreamSession(),
): Promise<boolean> {
  // The watchdog aborts this connection through its own controller; the outer signal only
  // forwards its abort, so a watchdog abort never reads as a shutdown.
  const connection = new AbortController()
  const forwardAbort = (): void => {
    connection.abort()
  }
  if (signal.aborted) {
    connection.abort()
  } else {
    signal.addEventListener('abort', forwardAbort, { once: true })
  }

  try {
    const url = resolveUrl(API_BASE_URL, endpoints.stream())
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
        ...(session.lastEventId === '' ? {} : { 'Last-Event-ID': session.lastEventId }),
      },
      credentials: 'include',
      signal: connection.signal,
    })

    if (response.status === 401) {
      if (authRetries >= MAX_STREAM_401_RETRIES) {
        return false
      }
      const newToken = await refreshAccessToken()
      if (newToken && newToken !== token) {
        return await connectRunStream(signal, newToken, authRetries + 1, session)
      }
      return false
    }

    if (!response.ok || !response.body) {
      return false
    }

    if (session.attempts > 1) {
      // Every earlier attempt left a gap, a failed one included: the page fetched its data at
      // mount, the stream was down after that, and with no `Last-Event-ID` yet the server replays
      // nothing. Refetch what the cache holds; duplicates are harmless, an event only invalidates.
      for (const runId of cachedRunIds()) {
        invalidateRunQueries(runId)
      }
    }

    return await readStream(response.body, signal, connection, session)
  } finally {
    signal.removeEventListener('abort', forwardAbort)
  }
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const onAbort = (): void => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export async function runStreamUntilAborted(
  signal: AbortSignal,
  initialToken: string,
): Promise<void> {
  let token = initialToken
  let reconnectDelay = STREAM_RECONNECT_DELAY_MS
  const session = createStreamSession()
  while (!isAborted(signal)) {
    let gotChunk = false
    session.attempts += 1
    try {
      gotChunk = await connectRunStream(signal, token, 0, session)
    } catch (error: unknown) {
      if (isAborted(signal)) {
        return
      }
      console.error('run stream connection failed', error)
    }
    if (isAborted(signal)) {
      return
    }
    if (gotChunk) {
      reconnectDelay = STREAM_RECONNECT_DELAY_MS
    }
    await sleep(reconnectDelay, signal)
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_STREAM_RECONNECT_DELAY_MS)
    const refreshed = getAccessToken()
    if (refreshed) {
      token = refreshed
    }
  }
}
