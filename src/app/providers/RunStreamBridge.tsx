import type { ReactNode } from 'react'

import { useRunStreamSubscription } from './useRunStream'

export function RunStreamBridge({ children }: { children: ReactNode }) {
  useRunStreamSubscription()
  return children
}
