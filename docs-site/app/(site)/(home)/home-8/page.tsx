import type { Metadata } from 'next'
import { HomeLoginCard } from '@/components/home/fresh'

// Home variant 8 for review, home-6 plus: login page logo and one card with dividers.
export const metadata: Metadata = { title: 'Home variant 8', robots: { index: false } }

export default function Page() {
  return <HomeLoginCard />
}
