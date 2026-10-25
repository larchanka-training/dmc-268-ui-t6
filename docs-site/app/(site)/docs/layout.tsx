import { source } from '@/lib/source'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { baseOptions } from '@/lib/layout.shared'
import { SiteHeader } from '@/components/site-header'

export default function Layout({ children }: LayoutProps<'/docs'>) {
  const base = baseOptions()
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...base}
      // The site header replaces the Fumadocs phone header, so the sidebar button sits in it.
      nav={{ ...base.nav, component: <SiteHeader menu /> }}
      // The docs sit in a centered container, so the sidebar is always shown.
      sidebar={{ collapsible: false }}
    >
      {children}
    </DocsLayout>
  )
}
