import type { Metadata } from 'next'
import { HomeGrouped } from '@/components/home/fresh'

// Home variant 14 for review, home-6 plus: left aligned with large mark and two tile groups.
export const metadata: Metadata = { title: 'Home variant 14', robots: { index: false } }

export default function Page() {
  return <HomeGrouped />
}
