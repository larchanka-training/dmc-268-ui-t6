import type { ReactNode } from 'react'
import { appUrl } from '@/lib/shared'

/**
 * Link to the Reviewer dashboard, or to one of its pages with `path` (for example `/runs`).
 * The address comes from lib/shared.ts.
 */
export function AppLink({ path = '', children }: { path?: string; children?: ReactNode }) {
  return (
    <a href={`${appUrl}${path}`} target="_blank" rel="noreferrer">
      {children ?? 'Reviewer dashboard'}
    </a>
  )
}
