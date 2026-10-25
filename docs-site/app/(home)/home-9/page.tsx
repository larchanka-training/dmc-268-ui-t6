import type { Metadata } from 'next'
import { HomeTinted } from '@/components/home/fresh'

// Home variant 9 for review, home-6 plus: dot badge, tinted icon squares, sliding arrow.
export const metadata: Metadata = { title: 'Home variant 9', robots: { index: false } }

export default function Page() {
  return <HomeTinted />
}
