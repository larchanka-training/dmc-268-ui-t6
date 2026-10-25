import type { Metadata } from 'next'
import { HomeStacked } from '@/components/home/variants'

// Home variant 1 for review: Mintlify, stacked link cards.
export const metadata: Metadata = { title: 'Home variant 1', robots: { index: false } }

export default function Page() {
  return <HomeStacked />
}
