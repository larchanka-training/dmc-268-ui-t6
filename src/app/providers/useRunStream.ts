import { useEffect, useRef } from 'react'

import { useAuthStore } from '../../features/auth'
import { parseRunUpdatedEvent, parseSseBuffer } from '../../entities/run/api/runStreamParse'
import { runQueryKeys } from '../../entities/run/api'
import { getAccessToken, refreshAccessToken } from '../../shared/api/client'
import { API_BASE_URL } from '../../shared/config/env'
import { endpoints, resolveUrl } from '../../shared/api/endpoints'
import { queryClient } from './queryClient'

async function connectRunStream(signal: AbortSignal, token: string): Promise<void> {
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
    const newToken = await refreshAccessToken()
    if (newToken && newToken !== token) {
      return connectRunStream(signal, newToken)
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

export function useRunStreamSubscription(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      abortRef.current?.abort()
      abortRef.current = null
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    const token = getAccessToken()
    if (!token) {
      return () => {
        controller.abort()
      }
    }

    void connectRunStream(controller.signal, token).finally(() => {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    })

    return () => {
      controller.abort()
    }
  }, [isAuthenticated])
}
