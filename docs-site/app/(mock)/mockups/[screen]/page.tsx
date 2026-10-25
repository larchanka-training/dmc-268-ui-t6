import { notFound } from 'next/navigation'
import { MockScreen } from '@/components/dashboard/mock-screen'
import { MOCK_NAMES } from '@/components/dashboard/mock-names'

export function generateStaticParams() {
  return MOCK_NAMES.map((screen) => ({ screen }))
}

export default async function Page(props: { params: Promise<{ screen: string }> }) {
  const { screen } = await props.params
  const name = MOCK_NAMES.find((item) => item === screen)
  if (name === undefined) notFound()
  return <MockScreen screen={name} />
}
