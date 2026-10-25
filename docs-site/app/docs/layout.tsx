import { source } from '@/lib/source'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { baseOptions } from '@/lib/layout.shared'
import { SiteHeader } from '@/components/site-header'

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <>
      <SiteHeader wide />
      <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
        {children}
      </DocsLayout>
    </>
  )
}
