import { parseRunUpdatedEvent, parseSseBuffer, runQueryKeys } from '../../entities/run'
import { getAccessToken, refreshAccessToken } from '../../shared/api/client'
import { API_BASE_URL } from '../../shared/config/env'
import { endpoints, resolveUrl } from '../../shared/api/endpoints'
import { queryClient } from './queryClient'

/** Cap refresh-and-retry cycles on 401 to avoid infinite loops (Refs #65, AC 2.2). */
export const MAX_STREAM_401_RETRIES = 2

export const STREAM_RECONNECT_DELAY_MS = 3000

export async function connectRunStream(
  signal: AbortSignal,
  token: string,
  authRetries = 0,
): Promise<void> {
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
      return
    }
    const newToken = await refreshAccessToken()
    if (newToken && newToken !== token) {
      return connectRunStream(signal, newToken, authRetries + 1)
    }
    return
  }

  if (!response.ok || !response.body) {
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (!signal.aborted) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
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
    }
  }
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
  while (!signal.aborted) {
    await connectRunStream(signal, token)
    await sleep(STREAM_RECONNECT_DELAY_MS, signal)
    const refreshed = getAccessToken()
    if (refreshed) {
      token = refreshed
    }
  }
}
