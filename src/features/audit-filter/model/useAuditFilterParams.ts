import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { parseAuditFilter, writeAuditFilter, type AuditFilter } from './auditFilter'

/**
 * The audit filter lives in the URL (`repo`, `status`). It is parsed on every read and the
 * sanitised value is never written back. Reset is a navigation push, so Back restores the filter.
 */
export function useAuditFilterParams(): {
  filter: AuditFilter
  setFilter: (next: AuditFilter) => void
  resetFilter: () => void
} {
  const [params, setSearchParams] = useSearchParams()
  const filter = useMemo(() => parseAuditFilter(params), [params])
  const setFilter = useCallback(
    (next: AuditFilter) => {
      setSearchParams((prev) => writeAuditFilter(prev, next))
    },
    [setSearchParams],
  )
  const resetFilter = useCallback(() => {
    setSearchParams((prev) => writeAuditFilter(prev, {}))
  }, [setSearchParams])
  return { filter, setFilter, resetFilter }
}
