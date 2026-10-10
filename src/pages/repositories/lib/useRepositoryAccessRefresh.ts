import { useQueryClient, type RefetchOptions } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { UPDATE_REPOSITORY_MUTATION_KEY } from '../../../entities/repository'
import { clearAccessRefreshIntent, peekAccessRefreshIntent } from '../../../features/auth'

export function useRepositoryAccessRefresh(
  refetch: (options?: RefetchOptions) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  const [deadline] = useState(() =>
    peekAccessRefreshIntent() === 'ready' ? Date.now() + 120000 : null,
  )
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (deadline === null || timedOut) return
    clearAccessRefreshIntent()
    const refresh = () => {
      if (queryClient.isMutating({ mutationKey: UPDATE_REPOSITORY_MUTATION_KEY }) === 0) {
        void refetch({ cancelRefetch: false })
      }
    }
    let active = true
    queueMicrotask(() => {
      if (active && Date.now() < deadline) refresh()
    })
    const interval = window.setInterval(() => {
      if (Date.now() >= deadline) {
        window.clearInterval(interval)
        setTimedOut(true)
        return
      }
      refresh()
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
  }, [deadline, queryClient, refetch, timedOut])

  return deadline === null ? 'idle' : timedOut ? 'timedOut' : 'waiting'
}
