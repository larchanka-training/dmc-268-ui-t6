import { useCallback, useSyncExternalStore } from 'react'

/**
 * Whether the window is at least `width` px wide, as the media query `(min-width: …px)` answers.
 * The first render already knows it (no frame of the wrong layout), and a resize updates it.
 */
export function useViewportAtLeast(width: number): boolean {
  const query = `(min-width: ${String(width)}px)`
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => {
        media.removeEventListener('change', onChange)
      }
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
