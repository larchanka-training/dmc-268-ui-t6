import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { parseRunListFilter, writeRunListFilter, type RunListFilter } from './runListFilter'

/**
 * The run list filter of the page lives in the URL (`repo`). It is parsed on every read and the
 * sanitised value is never written back. Reset is a navigation push, so Back restores the filter.
 */
export function useRunListFilterParams(): { filter: RunListFilter; resetFilter: () => void } {
  const [params, setSearchParams] = useSearchParams()
  const filter = useMemo(() => parseRunListFilter(params), [params])
  const resetFilter = useCallback(() => {
    setSearchParams((prev) => writeRunListFilter(prev, {}))
  }, [setSearchParams])
  return { filter, resetFilter }
}
