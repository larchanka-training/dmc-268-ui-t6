import type { Metadata } from 'next'
import { HomeGrid } from '@/components/home/fresh'

// Home variant 10 for review, home-6 plus: soft grid texture behind the hero.
export const metadata: Metadata = { title: 'Home variant 10', robots: { index: false } }

export default function Page() {
  return <HomeGrid />
}
