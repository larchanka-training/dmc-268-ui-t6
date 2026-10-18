import { useContext, useMemo } from 'react'
import { UNSAFE_DataRouterContext, type Location, type NavigationType } from 'react-router'

export interface RouterLocation {
  location: Location
  action: NavigationType
}

/** The only dependency on react-router's private pre-commit state/subscription API. */
export function useRouterLocationAdapter() {
  const context = useContext(UNSAFE_DataRouterContext)
  const router = context?.router
  return useMemo(() => {
    const state: { location?: Partial<Location> } | undefined = router?.state
    // Declarative routers and incompatible versions retain the rendered-hook fallback.
    if (
      !router ||
      typeof router.subscribe !== 'function' ||
      !state?.location ||
      typeof state.location.key !== 'string' ||
      typeof state.location.pathname !== 'string' ||
      typeof state.location.search !== 'string'
    ) {
      return undefined
    }
    return {
      read: (): RouterLocation => ({
        location: router.state.location,
        action: router.state.historyAction,
      }),
      subscribe: (listener: (snapshot: RouterLocation) => void): (() => void) =>
        router.subscribe((state) => {
          listener({ location: state.location, action: state.historyAction })
        }),
    }
  }, [router])
}
