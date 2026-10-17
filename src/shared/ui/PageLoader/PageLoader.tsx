import { theme } from 'antd'
import { useEffect, useState, useSyncExternalStore, type JSX } from 'react'

import { Spinner } from '../Spinner/Spinner'
import { RV_MOTION_FADE_MS, RV_PAGE_LOADER_DELAY_MS } from '../theme/motion'
import styles from './PageLoader.module.css'

// The pages that wait right now. Each `PageLoading` adds one while it is mounted; the host reads
// the count, so a screen only says that it waits and never owns the ring.
let waitingCount = 0
const listeners = new Set<() => void>()

function register(): () => void {
  waitingCount += 1
  listeners.forEach((listener) => {
    listener()
  })
  return () => {
    waitingCount -= 1
    listeners.forEach((listener) => {
      listener()
    })
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function isWaiting(): boolean {
  return waitingCount > 0
}

function isNeverWaiting(): boolean {
  return false
}

/**
 * Marks that a page is still loading. It renders nothing: put it where a spinner would have gone,
 * e.g. as the `fallback` of `Suspense`. `PageLoaderHost` then shows the ring, but only if the wait
 * lasts. The marker that takes over from another in the same commit does not interrupt the wait.
 */
export function PageLoading(): null {
  useEffect(register, [])
  return null
}

/**
 * The one loading ring of the app, mounted once inside the theme. It appears after the wait has
 * lasted 300 ms without a break, so a fast page never flashes it, fades in and out in 200 ms, and
 * sits in the middle of the window whichever screen asks. The fade-out starts two frames after the
 * wait ends, once the page has painted. Under "reduce motion" it appears and goes at once. The ring
 * is decorative: the page is not delayed and nothing reads it aloud.
 */
export function PageLoaderHost(): JSX.Element | null {
  const waiting = useSyncExternalStore(subscribe, isWaiting, isNeverWaiting)
  const { token } = theme.useToken()
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)
  const [released, setReleased] = useState(false)
  const fadeMs = token.motion ? RV_MOTION_FADE_MS : 0

  // A new wait takes back a ring whose fade-out had been released.
  if (waiting && released) {
    setReleased(false)
  }
  // The ring leaves at once, no frames waited, when it has nothing to fade: motion is off, or it
  // was never drawn opaque.
  const leaving = released || !token.motion || !entered

  // The wait has lasted long enough: put the ring in the DOM.
  useEffect(() => {
    if (!waiting || mounted) {
      return
    }
    const timer = setTimeout(() => {
      setMounted(true)
    }, RV_PAGE_LOADER_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [waiting, mounted])

  // The ring is first drawn transparent; one frame later it turns opaque and the transition runs.
  // A wait that ends first cancels the frame: the ring is not shown for a page that is ready.
  useEffect(() => {
    if (!mounted || !waiting) {
      return
    }
    const frame = requestAnimationFrame(() => {
      setEntered(true)
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [mounted, waiting])

  // The wait is over, but the page has just been committed and its first frame is a long one:
  // fading now would be spent before it is drawn. Let two frames pass, then release the fade-out.
  // A new wait cancels it, and the ring stays as it is.
  useEffect(() => {
    if (waiting || !mounted || leaving) {
      return
    }
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setReleased(true)
      })
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [waiting, mounted, leaving])

  // The ring is fading: take it out when the fade ends. A timer, not `transitionend`, which never
  // fires without a transition. A new wait cancels it.
  useEffect(() => {
    if (waiting || !mounted || !leaving) {
      return
    }
    const timer = setTimeout(() => {
      setMounted(false)
      setEntered(false)
    }, fadeMs)
    return () => {
      clearTimeout(timer)
    }
  }, [waiting, mounted, leaving, fadeMs])

  if (!mounted) {
    return null
  }
  // Without motion there is nothing to fade in, so the ring does not wait for the frame.
  const shown = (waiting || !leaving) && (entered || !token.motion)
  return (
    <div className={styles.layer} data-state={shown ? 'shown' : 'hidden'} data-testid="page-loader">
      <Spinner label={null} size="lg" />
    </div>
  )
}
