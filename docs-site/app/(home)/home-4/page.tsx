import type { Metadata } from 'next'
import { HomeText } from '@/components/home/variants'

// Home variant 4 for review: Next.js, text first.
export const metadata: Metadata = { title: 'Home variant 4', robots: { index: false } }

export default function Page() {
  return <HomeText />
}
