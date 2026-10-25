'use client'

/*
 * The frame of a settings snippet: the app's design system and background, tight padding, no
 * sidebar. It reports its height to the docs page, so the iframe there fits the snippet exactly.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { App as AntApp } from 'antd'
import { DesignSystemProvider } from '../../../src/shared/ui'
import { SNIPPET_HEIGHT_MESSAGE, SNIPPET_MEASURE_MESSAGE } from './mock-names'

export function SnippetShell({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (root === null) return
    // The iframe takes the height of the snippet: no scrollbars inside it.
    document.documentElement.style.overflow = 'hidden'
    if (window.parent === window) return
    const report = () => {
      window.parent.postMessage(
        { type: SNIPPET_HEIGHT_MESSAGE, height: Math.ceil(root.getBoundingClientRect().height) },
        window.location.origin,
      )
    }
    // The docs page may start listening after the first report; it asks again on load.
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return
      if ((event.data as { type?: unknown } | null)?.type === SNIPPET_MEASURE_MESSAGE) report()
    }
    window.addEventListener('message', onMessage)
    const observer = new ResizeObserver(report)
    observer.observe(root)
    return () => {
      window.removeEventListener('message', onMessage)
      observer.disconnect()
    }
  }, [])

  return (
    <DesignSystemProvider mode="dark">
      <AntApp>
        <div ref={rootRef} style={{ padding: 16, overflow: 'hidden' }}>
          {children}
        </div>
      </AntApp>
    </DesignSystemProvider>
  )
}
