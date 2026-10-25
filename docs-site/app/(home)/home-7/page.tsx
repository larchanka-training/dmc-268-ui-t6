import type { Metadata } from 'next'
import { HomeGlass } from '@/components/home/fresh'

// Home variant 7 for review, home-6 plus: landing WebGL glass and type scale.
export const metadata: Metadata = { title: 'Home variant 7', robots: { index: false } }

export default function Page() {
  return <HomeGlass />
}
