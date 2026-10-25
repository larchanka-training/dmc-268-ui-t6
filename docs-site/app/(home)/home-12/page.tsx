import type { Metadata } from 'next'
import { HomeMintlify } from '@/components/home/fresh'

// Home variant 12 for review, home-6 plus: Mintlify, light band and icon-on-top tiles.
export const metadata: Metadata = { title: 'Home variant 12', robots: { index: false } }

export default function Page() {
  return <HomeMintlify />
}
