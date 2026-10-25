import type { ReactNode } from 'react'

type Status = 'soon' | 'inactive' | 'exploring'

const LABEL: Record<Status, string> = {
  soon: 'Coming soon',
  inactive: 'Not active yet',
  exploring: 'Exploring',
}

interface StatusBadgeProps {
  status?: Status
  children?: ReactNode
}

/**
 * Small pill for things that exist in the design but do not work yet.
 * `soon`: planned, nothing to do today. `inactive`: can be switched on, has no effect yet.
 * `exploring`: an idea under study, it may not come.
 */
export function StatusBadge({ status = 'soon', children }: StatusBadgeProps) {
  return (
    <span className="status-badge not-prose" data-tone={status}>
      {children ?? LABEL[status]}
    </span>
  )
}
