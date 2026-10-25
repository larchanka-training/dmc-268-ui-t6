import { notFound } from 'next/navigation'
import { MockScreen } from '@/components/dashboard/mock-screen'

const SCREENS = ['settings', 'runs', 'run-detail'] as const

export function generateStaticParams() {
  return SCREENS.map((screen) => ({ screen }))
}

export default async function Page(props: { params: Promise<{ screen: string }> }) {
  const { screen } = await props.params
  if (!(SCREENS as readonly string[]).includes(screen)) notFound()
  return <MockScreen screen={screen as (typeof SCREENS)[number]} />
}
