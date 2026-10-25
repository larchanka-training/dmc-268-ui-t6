import type { Metadata } from 'next'
import { IntroPage } from '@/components/intro-page'

// Introduction-as-home variant "plain", for comparison with the other one.
export const metadata: Metadata = { title: 'Introduction (plain)', robots: { index: false } }

export default function Page() {
  return <IntroPage glass={false} />
}
