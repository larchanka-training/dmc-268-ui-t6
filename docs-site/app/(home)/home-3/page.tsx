import type { Metadata } from 'next'
import { HomeCentered } from '@/components/home/variants'

// Home page variant 3 for review: centered hero and one quiet row of page links.
export const metadata: Metadata = { title: 'Home variant 3', robots: { index: false } }

export default function Page() {
  return <HomeCentered />
}
