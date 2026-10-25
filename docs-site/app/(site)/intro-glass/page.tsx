import type { Metadata } from 'next'
import { IntroPage } from '@/components/intro-page'

// Introduction-as-home variant "glass", for comparison with the other one.
export const metadata: Metadata = { title: 'Introduction (glass)', robots: { index: false } }

export default function Page() {
  return <IntroPage glass={true} />
}
