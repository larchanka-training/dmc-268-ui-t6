'use client'

import { useEffect, useRef, useState } from 'react'
import type { ScreenName } from '../dashboard/mock-names'

/** The width the dashboard screens are laid out at, as on a laptop. */
const NATIVE_WIDTH = 1280

/** Below this column width the scaled screen is too small to read: it links to the full page. */
const LINK_BELOW = 640

interface DashboardFrameProps {
  /** A screen of app/(mock)/mockups/[screen]. */
  screen: ScreenName
  /** Height of the screen at the native width, in pixels. */
  height: number
  caption: string
}

/**
 * A dashboard screen, scaled down to the content column. The screen is its own page in an iframe:
 * Ant Design and the app styles stay there, and the docs pages load none of them. The iframe is
 * loaded lazily and takes no input: it is a picture of the dashboard. On a narrow column the
 * picture is too small to read, so the whole frame opens the screen at full size in a new tab.
 */
export function DashboardFrame({ screen, height, caption }: DashboardFrameProps) {
  const figureRef = useRef<HTMLElement>(null)
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const figure = figureRef.current
    if (figure === null) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(entry.contentRect.width)
    })
    observer.observe(figure)
    return () => {
      observer.disconnect()
    }
  }, [])

  const src = `/mockups/${screen}`
  const scale = width === null ? null : width / NATIVE_WIDTH
  const narrow = width !== null && width < LINK_BELOW

  const picture = (
    <div
      aria-label={narrow ? undefined : caption}
      className="overflow-hidden rounded-xl border border-fd-border bg-[#090d18] shadow-lg"
      role={narrow ? undefined : 'img'}
      style={{ aspectRatio: `${String(NATIVE_WIDTH)} / ${String(height)}` }}
    >
      {scale !== null ? (
        <iframe
          aria-hidden="true"
          loading="lazy"
          src={src}
          style={{
            display: 'block',
            width: NATIVE_WIDTH,
            height,
            border: 0,
            transform: `scale(${String(scale)})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
          }}
          tabIndex={-1}
          title={caption}
        />
      ) : null}
    </div>
  )

  return (
    <figure className="not-prose my-6" ref={figureRef}>
      {narrow ? (
        <a
          aria-label={`${caption} Open full size in a new tab.`}
          className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary"
          href={src}
          rel="noopener"
          target="_blank"
        >
          {picture}
          <span className="mt-2 block text-center text-xs font-medium text-fd-primary">
            Open full size ↗
          </span>
        </a>
      ) : (
        picture
      )}
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  )
}
