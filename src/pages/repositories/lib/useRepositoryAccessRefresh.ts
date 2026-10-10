import type { RefetchOptions } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { clearAccessRefreshIntent, peekAccessRefreshIntent } from '../../../features/auth'

export function useRepositoryAccessRefresh(
  refetch: (options?: RefetchOptions) => Promise<unknown>,
) {
  const [deadline] = useState(() =>
    peekAccessRefreshIntent() === 'ready' ? Date.now() + 120000 : null,
  )
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (deadline === null || timedOut) return
    clearAccessRefreshIntent()
    let active = true
    queueMicrotask(() => {
      if (active && Date.now() < deadline) void refetch({ cancelRefetch: false })
    })
    const interval = window.setInterval(() => {
      if (Date.now() >= deadline) {
        window.clearInterval(interval)
        setTimedOut(true)
        return
      }
      void refetch({ cancelRefetch: false })
    }, 5000)
    const timeout = window.setTimeout(
      () => {
        window.clearInterval(interval)
        setTimedOut(true)
      },
      Math.max(0, deadline - Date.now()),
    )
    return () => {
      active = false
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [deadline, refetch, timedOut])

  return deadline === null ? 'idle' : timedOut ? 'timedOut' : 'waiting'
}
