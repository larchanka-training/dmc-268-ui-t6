import type { Metadata } from 'next'
import { HomeGrain } from '@/components/home/fresh'

// Home variant 11 for review, home-6 plus: grain and glow, landing type, spotlight tiles.
export const metadata: Metadata = { title: 'Home variant 11', robots: { index: false } }

export default function Page() {
  return <HomeGrain />
}
