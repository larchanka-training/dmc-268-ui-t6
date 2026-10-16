import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NavigationType, useLocation, useNavigationType, useSearchParams } from 'react-router'

import {
  EMPTY_FINDING_FILTERS,
  parseFindingFilters,
  writeFindingFilters,
  type FindingFilters,
  type FindingFiltersChange,
} from './findingFilters'
import { useRouterLocationAdapter, type RouterLocation } from './routerLocationAdapter'

/** Notifies the local input synchronously when an external navigation invalidates pending text. */
export type SubscribeFilterNavigation = (listener: (query: string) => void) => () => void

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
  subscribeToNavigation: SubscribeFilterNavigation
} {
  const [params, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const filters = useMemo(() => parseFindingFilters(params), [params])

  const adapter = useRouterLocationAdapter()
  const observed = useRef<RouterLocation>({ location, action: navigationType })
  const written = useRef(params)
  const ownSearches = useRef<{ pathname: string; search: string }[]>([])
  const navigationRevision = useRef(0)
  const [navigationKey, setNavigationKey] = useState(0)
  const listeners = useRef(new Set<(query: string) => void>())
  const subscribeToNavigation = useCallback<SubscribeFilterNavigation>((listener) => {
    listeners.current.add(listener)
    return () => {
      listeners.current.delete(listener)
    }
  }, [])

  const observe = useCallback((snapshot: RouterLocation) => {
    const next = snapshot.location
    const previous = observed.current.location
    if (
      next.key === previous.key &&
      next.pathname === previous.pathname &&
      next.search === previous.search
    ) {
      return
    }
    observed.current = snapshot
    const own =
      snapshot.action === NavigationType.Pop
        ? -1
        : ownSearches.current.findIndex(
            (entry) => entry.pathname === next.pathname && entry.search === next.search,
          )
    written.current = new URLSearchParams(next.search)
    if (own >= 0) {
      ownSearches.current.splice(0, own + 1)
      return
    }
    ownSearches.current = []
    navigationRevision.current += 1
    const query = parseFindingFilters(written.current).query
    for (const listener of listeners.current) {
      listener(query)
    }
  }, [])

  useLayoutEffect(() => {
    if (!adapter) {
      return
    }
    const unsubscribe = adapter.subscribe(observe)
    observe(adapter.read())
    return unsubscribe
  }, [adapter, observe])

  useEffect(() => {
    // A late effect from the old screen must never restore the pre-navigation base.
    observe(adapter?.read() ?? { location, action: navigationType })
    setNavigationKey(navigationRevision.current)
  }, [adapter, location, navigationType, observe])

  const write = useCallback(
    (update: (prev: FindingFilters) => FindingFilters, options?: { replace?: boolean }) => {
      if (adapter) {
        observe(adapter.read())
      }
      // The still-visible controls of one run cannot write into a different run.
      if (observed.current.location.pathname !== location.pathname) {
        return
      }
      const base = written.current
      const next = writeFindingFilters(base, update(parseFindingFilters(base)))
      written.current = next
      ownSearches.current.push({ pathname: location.pathname, search: searchOf(next) })
      setSearchParams(next, options)
    },
    [adapter, location.pathname, observe, setSearchParams],
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

  return { filters, setFilters, setQuery, resetFilters, navigationKey, subscribeToNavigation }
}
