import type { Metadata } from 'next'
import { HomeClassic } from '@/components/home/variants'

// Home variant 6 for review: the first home, simpler.
export const metadata: Metadata = { title: 'Home variant 6', robots: { index: false } }

export default function Page() {
  return <HomeClassic />
}
