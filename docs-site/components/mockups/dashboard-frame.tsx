'use client'

import { useEffect, useRef, useState } from 'react'

/** The width the dashboard screens are laid out at, as on a laptop. */
const NATIVE_WIDTH = 1280

interface DashboardFrameProps {
  /** A screen of app/(mock)/mockups/[screen]. */
  screen: 'settings' | 'runs' | 'run-detail'
  /** Height of the screen at the native width, in pixels. */
  height: number
  caption: string
}

/**
 * A dashboard screen, scaled down to the content column. The screen is its own page in an iframe:
 * Ant Design and the app styles stay there, and the docs pages load none of them. The iframe is
 * loaded lazily and takes no input: it is a picture of the dashboard.
 */
export function DashboardFrame({ screen, height, caption }: DashboardFrameProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number | null>(null)

  useEffect(() => {
    const box = boxRef.current
    if (box === null) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setScale(entry.contentRect.width / NATIVE_WIDTH)
    })
    observer.observe(box)
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <figure className="not-prose my-6">
      <div
        aria-label={caption}
        className="overflow-hidden rounded-xl border border-fd-border bg-[#090d18] shadow-lg"
        ref={boxRef}
        role="img"
        style={{ aspectRatio: `${String(NATIVE_WIDTH)} / ${String(height)}` }}
      >
        {scale !== null ? (
          <iframe
            aria-hidden="true"
            loading="lazy"
            src={`/mockups/${screen}`}
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
      <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  )
}
