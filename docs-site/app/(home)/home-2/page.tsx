import type { Metadata } from 'next'
import { HomeGroups } from '@/components/home/variants'

// Home variant 2 for review: Linear, two card groups.
export const metadata: Metadata = { title: 'Home variant 2', robots: { index: false } }

export default function Page() {
  return <HomeGroups />
}
