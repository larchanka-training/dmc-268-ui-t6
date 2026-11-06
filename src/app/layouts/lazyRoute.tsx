import { lazy, useSyncExternalStore, type ComponentType, type FC } from 'react'

import { RouteOfflineNotice } from './RouteLayouts'

interface RouteModule<P> {
  default: ComponentType<P>
}

// Vite's preload helper asks for a stylesheet once per page load, even if that request failed, so a
// retried import would open the page unstyled. A failed link cannot be told by its state (Chrome
// gives it a sheet whose rules throw), only by its `error` event, which does not bubble. One that
// fails with the network on stays out: it is gone for good and would fail every later route.
const stylesheetsFailedOffline = new Set<HTMLLinkElement>()

document.addEventListener(
  'error',
  ({ target }) => {
    if (!navigator.onLine && target instanceof HTMLLinkElement && target.rel === 'stylesheet') {
      stylesheetsFailedOffline.add(target)
    }
  },
  true,
)

function reloadStylesheetsFailedOffline() {
  const links = [...stylesheetsFailedOffline]
  stylesheetsFailedOffline.clear()

  return Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve, reject) => {
          const fresh = link.cloneNode()
          fresh.addEventListener('load', () => {
            resolve()
          })
          fresh.addEventListener('error', () => {
            reject(new Error(`Unable to load the stylesheet ${link.href}`))
          })
          link.replaceWith(fresh)
        }),
    ),
  )
}

/**
 * `lazy` for a route page that survives a chunk failing offline. `lazy` remembers a rejected import
 * for good, so offline it resolves to the notice instead, and the `online` event swaps in a new
 * `lazy`, kept here and not in a component: the next visit must not get the old one either. A route
 * update runs in a transition that would hold the old screen, so waiting in Suspense would show
 * nothing. A failure with the network on (a chunk gone after a deploy) rejects as before.
 */
export function lazyRoute<P extends object>(load: () => Promise<RouteModule<P>>): FC<P> {
  const listeners = new Set<() => void>()

  const attempt = () =>
    lazy(async (): Promise<RouteModule<P>> => {
      try {
        await reloadStylesheetsFailedOffline()
        return await load()
      } catch (error) {
        if (navigator.onLine) throw error
        window.addEventListener('online', retry, { once: true })
        return { default: RouteOfflineNotice }
      }
    })

  let page = attempt()

  function retry() {
    page = attempt()
    for (const listener of listeners) listener()
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  return function LazyRoute(props: P) {
    const Page = useSyncExternalStore(subscribe, () => page)
    return <Page {...props} />
  }
}
