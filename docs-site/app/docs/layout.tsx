import { source } from '@/lib/source'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { baseOptions } from '@/lib/layout.shared'
import { SiteHeader } from '@/components/site-header'

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <>
      <SiteHeader />
      <DocsLayout
        tree={source.getPageTree()}
        {...baseOptions()}
        // The docs sit in a centered container, so the sidebar is always shown.
        sidebar={{ collapsible: false }}
      >
        {children}
      </DocsLayout>
    </>
  )
}
