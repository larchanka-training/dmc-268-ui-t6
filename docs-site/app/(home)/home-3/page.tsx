import type { Metadata } from 'next'
import { HomeJourney } from '@/components/home/variants'

// Home variant 3 for review: Claude platform, hero, chips and a journey.
export const metadata: Metadata = { title: 'Home variant 3', robots: { index: false } }

export default function Page() {
  return <HomeJourney />
}
