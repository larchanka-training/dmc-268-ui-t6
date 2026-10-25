import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import 'antd/dist/reset.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '../../../src/shared/ui/styles/tokens.css'

/*
 * Separate root layout for the dashboard mockups. They load in an iframe on the docs pages, so
 * Ant Design and the app styles never reach the docs, and the app's media queries see the
 * iframe width (the real dashboard width), not the phone or desktop the docs run on.
 */
export const metadata: Metadata = { robots: { index: false }, icons: { icon: '/favicon.svg' } }

export default function MockLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-rv-theme="dark">
      <body style={{ margin: 0, background: 'var(--rv-bg)', fontFamily: 'var(--rv-font-sans)' }}>
        {children}
      </body>
    </html>
  )
}
