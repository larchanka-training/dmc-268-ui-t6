import { parseRunUpdatedEvent, parseSseBuffer, runQueryKeys } from '../../entities/run'
import { getAccessToken, refreshAccessToken } from '../../shared/api/client'
import { API_BASE_URL } from '../../shared/config/env'
import { endpoints, resolveUrl } from '../../shared/api/endpoints'
import { queryClient } from './queryClient'

/** Cap refresh-and-retry cycles on 401 to avoid infinite loops (Refs #65, AC 2.2). */
export const MAX_STREAM_401_RETRIES = 2

export const STREAM_RECONNECT_DELAY_MS = 3000
export const MAX_STREAM_RECONNECT_DELAY_MS = 30_000

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function isAborted(signal: AbortSignal): boolean {
  return signal.aborted
}

export async function connectRunStream(
  signal: AbortSignal,
  token: string,
  authRetries = 0,
): Promise<boolean> {
  const url = resolveUrl(API_BASE_URL, endpoints.stream())
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
    credentials: 'include',
    signal,
  })

  if (response.status === 401) {
    if (authRetries >= MAX_STREAM_401_RETRIES) {
      return false
    }
    const newToken = await refreshAccessToken()
    if (newToken && newToken !== token) {
      return connectRunStream(signal, newToken, authRetries + 1)
    }
    return false
  }

  if (!response.ok || !response.body) {
    return false
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let readChunk = false

  while (!signal.aborted) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    readChunk = true
    buffer += decoder.decode(value, { stream: true })
    const parsed = parseSseBuffer(buffer)
    buffer = parsed.rest
    for (const frame of parsed.events) {
      if (frame.event !== 'run.updated') {
        continue
      }
      const payload = parseRunUpdatedEvent(frame.data)
      if (payload === null) {
        continue
      }
      void queryClient.invalidateQueries({ queryKey: runQueryKeys.detail(payload.runId) })
      void queryClient.invalidateQueries({ queryKey: runQueryKeys.actions(payload.runId) })
      void queryClient.invalidateQueries({ queryKey: runQueryKeys.diff(payload.runId) })
      void queryClient.invalidateQueries({ queryKey: runQueryKeys.comments(payload.runId) })
    }
  }
  return readChunk
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

export async function runStreamUntilAborted(
  signal: AbortSignal,
  initialToken: string,
): Promise<void> {
  let token = initialToken
  let reconnectDelay = STREAM_RECONNECT_DELAY_MS
  while (!isAborted(signal)) {
    let gotChunk = false
    try {
      gotChunk = await connectRunStream(signal, token)
    } catch (error: unknown) {
      if (isAborted(signal) || isAbortError(error)) {
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
