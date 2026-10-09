import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavigationType, useLocation, useNavigationType, useSearchParams } from 'react-router'

import {
  EMPTY_FINDING_FILTERS,
  parseFindingFilters,
  writeFindingFilters,
  type FindingFilters,
  type FindingFiltersChange,
} from './findingFilters'

function searchOf(params: URLSearchParams): string {
  const text = params.toString()
  return text === '' ? '' : `?${text}`
}

/**
 * The finding filters of the page live in the URL (`file`, `severity`, `q`). They are parsed on
 * every read and the sanitised value is never written back: only a change made by the user
 * touches the URL, and it keeps every other param.
 */
export function useFindingFiltersParams(): {
  filters: FindingFilters
  /** Merges `change` over the filters of the URL: a control sends only the fields it owns. */
  setFilters: (change: FindingFiltersChange, options?: { replace?: boolean }) => void
  /** Writes only `q` (replace); a select change that has not landed yet is kept. */
  setQuery: (query: string) => void
  resetFilters: () => void
  /**
   * Changes each time the committed location changes by a navigation this hook did not make: back
   * or forward, a link, another component. The search box drops its pending text on it.
   */
  navigationKey: number
} {
  const [params, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const filters = useMemo(() => parseFindingFilters(params), [params])

  // The router commits a navigation in a transition: until it lands, `params` (and the `prev` of
  // the functional setter, which is a copy of it) is still the old URL. Writes build on the URL as
  // this hook last wrote it, so a `q` write cannot undo a select change that is still on its way.
  const written = useRef(params)
  useEffect(() => {
    written.current = params
  }, [params])

  // Searches this hook wrote that have not been seen in a committed location yet, oldest first.
  const ownSearches = useRef<string[]>([])
  const seenKey = useRef(location.key)
  const [navigationKey, setNavigationKey] = useState(0)
  useEffect(() => {
    if (location.key === seenKey.current) {
      return
    }
    seenKey.current = location.key
    const own =
      navigationType === NavigationType.Pop ? -1 : ownSearches.current.indexOf(location.search)
    if (own >= 0) {
      // one of our writes landed (so did every older one: they are superseded)
      ownSearches.current.splice(0, own + 1)
      return
    }
    ownSearches.current = []
    written.current = new URLSearchParams(location.search)
    setNavigationKey((key) => key + 1)
  }, [location.key, location.search, navigationType])

  const write = useCallback(
    (update: (prev: FindingFilters) => FindingFilters, options?: { replace?: boolean }) => {
      const base = written.current
      const next = writeFindingFilters(base, update(parseFindingFilters(base)))
      written.current = next
      ownSearches.current.push(searchOf(next))
      setSearchParams(next, options)
    },
    [setSearchParams],
  )

  const setFilters = useCallback(
    (change: FindingFiltersChange, options?: { replace?: boolean }) => {
      write((prev) => ({ ...prev, ...change }), options)
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

  return { filters, setFilters, setQuery, resetFilters, navigationKey }
}
