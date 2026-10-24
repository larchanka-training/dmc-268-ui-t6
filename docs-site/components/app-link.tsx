import type { ReactNode } from 'react'
import { appUrl } from '@/lib/shared'

/** Link to the Reviewer dashboard. The address comes from lib/shared.ts. */
export function AppLink({ children }: { children?: ReactNode }) {
  return (
    <a href={appUrl} target="_blank" rel="noreferrer">
      {children ?? 'Reviewer dashboard'}
    </a>
  )
}
