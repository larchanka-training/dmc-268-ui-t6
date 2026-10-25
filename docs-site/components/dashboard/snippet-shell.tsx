'use client'

/*
 * The frame of a settings snippet: the app's design system and background, tight padding, no
 * sidebar. The shots script measures it to size the picture.
 */
import type { ReactNode } from 'react'
import { App as AntApp } from 'antd'
import { DesignSystemProvider } from '../../../src/shared/ui'

export function SnippetShell({ children }: { children: ReactNode }) {
  return (
    <DesignSystemProvider mode="dark">
      <AntApp>
        <div style={{ padding: 16, overflow: 'hidden' }}>{children}</div>
      </AntApp>
    </DesignSystemProvider>
  )
}
