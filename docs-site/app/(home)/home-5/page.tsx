import type { Metadata } from 'next'
import { HomeSearch } from '@/components/home/variants'

// Home page variant 5 for review: search first, with page chips.
export const metadata: Metadata = { title: 'Home variant 5', robots: { index: false } }

export default function Page() {
  return <HomeSearch />
}
