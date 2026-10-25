import type { Metadata } from 'next'
import { HomeSplit } from '@/components/home/variants'

// Home page variant 4 for review: split layout with three short steps.
export const metadata: Metadata = { title: 'Home variant 4', robots: { index: false } }

export default function Page() {
  return <HomeSplit />
}
