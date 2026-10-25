import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import 'antd/dist/reset.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '../../../src/shared/ui/styles/tokens.css'
import { basePath } from '@/lib/shared'

/*
 * Separate root layout for the dashboard mockups. They are the source of the pictures in
 * public/screens (`pnpm --dir docs-site shots`), so Ant Design and the app styles never reach the
 * docs pages. Not for readers: not indexed, not followed, and no docs page links here.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  icons: { icon: `${basePath}/favicon.svg` },
}

export default function MockLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-rv-theme="dark">
      <body style={{ margin: 0, background: 'var(--rv-bg)', fontFamily: 'var(--rv-font-sans)' }}>
        {children}
      </body>
    </html>
  )
}
