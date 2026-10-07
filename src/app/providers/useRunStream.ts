import { useEffect, useRef } from 'react'

import { useAuthStore } from '../../features/auth'
import { getAccessToken } from '../../shared/api/client'
import { mocksEnabledAtRuntime } from '../../shared/config/buildFlags'
import { isMockMode } from '../../shared/config/env'
import { runStreamUntilAborted } from './runStreamConnect'

export function useRunStreamSubscription(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // The stream is a raw `fetch` that bypasses the mock transport: on mocks it would only
    // loop 401 -> refresh -> backoff against `/api/stream`. Same condition as `main.tsx`.
    if (mocksEnabledAtRuntime(isMockMode)) {
      return
    }
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

    void runStreamUntilAborted(controller.signal, token)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('run stream subscription failed', error)
        }
      })
      .finally(() => {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      })

    return () => {
      controller.abort()
    }
  }, [isAuthenticated])
}
