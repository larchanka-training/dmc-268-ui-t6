import { useCallback, useEffect, useMemo, useRef } from 'react'
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
  /** Writes only `q` (replace); a select change that has not landed yet is kept. */
  setQuery: (query: string) => void
  resetFilters: () => void
} {
  const [params, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFindingFilters(params), [params])

  // The router commits a navigation in a transition: until it lands, `params` (and the `prev` of
  // the functional setter, which is a copy of it) is still the old URL. Writes build on the URL as
  // this hook last wrote it, so a `q` write cannot undo a select change that is still on its way.
  const written = useRef(params)
  useEffect(() => {
    written.current = params
  }, [params])

  const write = useCallback(
    (update: (prev: FindingFilters) => FindingFilters, options?: { replace?: boolean }) => {
      const base = written.current
      const next = writeFindingFilters(base, update(parseFindingFilters(base)))
      written.current = next
      setSearchParams(next, options)
    },
    [setSearchParams],
  )

  const setFilters = useCallback(
    (next: FindingFilters, options?: { replace?: boolean }) => {
      write(() => next, options)
    },
    [write],
  )
  const setQuery = useCallback(
    (query: string) => {
      write((prev) => ({ ...prev, query }), { replace: true })
    },
    [write],
  )
  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FINDING_FILTERS)
  }, [setFilters])

  return { filters, setFilters, setQuery, resetFilters }
}
