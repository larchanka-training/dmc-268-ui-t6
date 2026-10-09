import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  EMPTY_FINDING_FILTERS,
  parseFindingFilters,
  writeFindingFilters,
  type FindingFilters,
} from './findingFilters'

/**
 * The finding filters of the page live in the URL (`file`, `severity`, `q`). They are parsed on
 * every read and the sanitised value is never written back: only a change made by the user
 * touches the URL, and it keeps every other param.
 */
export function useFindingFiltersParams(): {
  filters: FindingFilters
  setFilters: (next: FindingFilters, options?: { replace?: boolean }) => void
  resetFilters: () => void
} {
  const [params, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFindingFilters(params), [params])

  const setFilters = useCallback(
    (next: FindingFilters, options?: { replace?: boolean }) => {
      setSearchParams((prev) => writeFindingFilters(prev, next), options)
    },
    [setSearchParams],
  )
  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FINDING_FILTERS)
  }, [setFilters])

  return { filters, setFilters, resetFilters }
}
