import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { UPDATE_REPOSITORY_MUTATION_KEY, type RagIndexStatus } from '../../../entities/repository'

export type RagIndexPolling = 'idle' | 'waiting' | 'timedOut'

export const RAG_POLL_MS = 5000
export const RAG_POLL_WINDOW_MS = 120_000

/**
 * Refetches the repository every 5 s while its RAG index is on the way, for at most 120 s (ui#102).
 * A window opens on a `building` index, or on an `empty` one right after a switch-on made on this
 * page (`enabledAt` changed); an `empty` index the page was opened on is not polled. Any other
 * status closes the window. When the window runs out the hook reports `timedOut` until a new
 * switch-on or a final status. A poll is skipped while a repository update runs: the update
 * refetches the list itself when it settles.
 */
export function useRagIndexPolling(
  status: RagIndexStatus | undefined,
  enabledAt: number | null,
  refetch: (options?: { cancelRefetch?: boolean }) => Promise<unknown>,
): RagIndexPolling {
  const queryClient = useQueryClient()
  const [seenEnabledAt, setSeenEnabledAt] = useState<number | null>(null)
  // `round` numbers the windows: a new one restarts the timers and with them the deadline.
  const [round, setRound] = useState(0)
  const [open, setOpen] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  // A final status, or no repository yet, closes the window and forgets a time-out.
  if (status !== 'building' && status !== 'empty' && open) {
    setOpen(false)
  }
  // A switch-on on an `empty` index opens a fresh window, even after a time-out.
  if (enabledAt !== seenEnabledAt) {
    setSeenEnabledAt(enabledAt)
    if (enabledAt !== null && status === 'empty') {
      setRound(round + 1)
      setOpen(true)
      setTimedOut(false)
    }
  }
  // A build already polled since the switch-on keeps its window.
  if (status === 'building' && !open) {
    setRound(round + 1)
    setOpen(true)
    setTimedOut(false)
  }

  // The latest `refetch`, so that a new function does not restart the window.
  const refetchRef = useRef(refetch)
  useEffect(() => {
    refetchRef.current = refetch
  })

  useEffect(() => {
    if (!open || timedOut) return
    const deadline = Date.now() + RAG_POLL_WINDOW_MS
    const interval = window.setInterval(() => {
      // A tick that comes at or past the deadline (the machine slept) ends the window itself.
      if (Date.now() >= deadline) {
        window.clearInterval(interval)
        setTimedOut(true)
        return
      }
      if (queryClient.isMutating({ mutationKey: UPDATE_REPOSITORY_MUTATION_KEY }) === 0) {
        void refetchRef.current({ cancelRefetch: false })
      }
    }, RAG_POLL_MS)
    // Mirrors `useRepositoryAccessRefresh`: closes the window on time even when the interval is
    // throttled; the interval's own `Date.now() >= deadline` guard covers a clock jump.
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval)
      setTimedOut(true)
    }, RAG_POLL_WINDOW_MS)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [open, round, timedOut, queryClient])

  return !open ? 'idle' : timedOut ? 'timedOut' : 'waiting'
}
