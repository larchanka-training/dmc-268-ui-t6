import type { Metadata } from 'next'
import { HomeLinear } from '@/components/home/fresh'

// Home variant 13 for review, home-6 plus: Linear, left aligned text and quiet rows.
export const metadata: Metadata = { title: 'Home variant 13', robots: { index: false } }

export default function Page() {
  return <HomeLinear />
}
