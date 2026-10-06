import { useEffect, useRef } from 'react'

import { useAuthStore } from '../../features/auth'
import { getAccessToken } from '../../shared/api/client'
import { runStreamUntilAborted } from './runStreamConnect'

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

    void runStreamUntilAborted(controller.signal, token).finally(() => {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    })

    return () => {
      controller.abort()
    }
  }, [isAuthenticated])
}
