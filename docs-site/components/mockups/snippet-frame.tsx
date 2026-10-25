'use client'

import { useEffect, useRef, useState } from 'react'
import {
  SNIPPET_HEIGHT_MESSAGE,
  SNIPPET_MEASURE_MESSAGE,
  type SnippetName,
} from '../dashboard/mock-names'

interface SnippetFrameProps {
  /** A snippet of app/(mock)/mockups/[screen]. */
  snippet: SnippetName
  /** The height before the snippet reports its own, in pixels: keeps the page from jumping. */
  height: number
  /** The widest the card gets, in pixels; on a narrow screen it takes the column. */
  maxWidth?: number
  caption: string
}

/**
 * One block of the repository settings page in a small card, at its real size. The block is its
 * own page in an iframe, so Ant Design and the app styles stay out of the docs; the iframe is laid
 * out at the card width and takes the height the block reports, so it never scrolls.
 */
export function SnippetFrame({ snippet, height, maxWidth = 560, caption }: SnippetFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [frameHeight, setFrameHeight] = useState(height)

  function requestMeasure() {
    frameRef.current?.contentWindow?.postMessage(
      { type: SNIPPET_MEASURE_MESSAGE },
      window.location.origin,
    )
  }

  useEffect(() => {
    function onMessage(event: MessageEvent<unknown>) {
      const frame = frameRef.current
      if (frame === null || event.source !== frame.contentWindow) return
      if (event.origin !== window.location.origin) return
      const data = event.data as { type?: unknown; height?: unknown } | null
      if (data?.type !== SNIPPET_HEIGHT_MESSAGE || typeof data.height !== 'number') return
      setFrameHeight(data.height)
    }
    window.addEventListener('message', onMessage)
    // The snippet may have reported before this page listened: ask once more.
    requestMeasure()
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [])

  return (
    <figure className="not-prose my-5" style={{ maxWidth }}>
      <div
        aria-label={caption}
        className="overflow-hidden rounded-xl border border-fd-border bg-[#090d18] shadow-md"
        role="img"
      >
        <iframe
          aria-hidden="true"
          loading="lazy"
          onLoad={requestMeasure}
          ref={frameRef}
          scrolling="no"
          src={`/mockups/${snippet}`}
          style={{
            display: 'block',
            width: '100%',
            height: frameHeight,
            border: 0,
            pointerEvents: 'none',
          }}
          tabIndex={-1}
          title={caption}
        />
      </div>
      <figcaption className="mt-2 text-sm text-fd-muted-foreground">{caption}</figcaption>
    </figure>
  )
}
