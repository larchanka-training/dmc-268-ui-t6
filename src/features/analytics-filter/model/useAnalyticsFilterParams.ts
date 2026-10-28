import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { parseAnalyticsFilter, writeAnalyticsFilter, type AnalyticsFilter } from './analyticsFilter'

export function useAnalyticsFilterParams(): {
  filter: AnalyticsFilter
  setFilter: (next: AnalyticsFilter) => void
} {
  const [params, setSearchParams] = useSearchParams()
  const filter = useMemo(() => parseAnalyticsFilter(params), [params])
  const setFilter = useCallback(
    (next: AnalyticsFilter) => {
      setSearchParams((prev) => writeAnalyticsFilter(prev, next))
    },
    [setSearchParams],
  )
  return { filter, setFilter }
}
