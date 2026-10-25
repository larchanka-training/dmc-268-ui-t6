import { SiteHeader } from '@/components/site-header'

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SiteHeader />
      <div id="nd-home-layout" className="flex flex-1 flex-col pt-(--site-header-h)">
        {children}
      </div>
    </>
  )
}
