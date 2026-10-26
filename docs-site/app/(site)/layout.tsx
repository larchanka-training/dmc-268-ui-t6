import { RootProvider } from 'fumadocs-ui/provider/next'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '../global.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Reviewer Docs',
    default: 'Reviewer Docs',
  },
  description: 'User guide for Reviewer, an AI code review service for pull requests.',
  icons: { icon: '/favicon.svg' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider
          theme={{ forcedTheme: 'dark', defaultTheme: 'dark', enableSystem: false, hotKey: false }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
