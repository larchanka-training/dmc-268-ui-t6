import type { Metadata } from 'next'
import { HomeQuickstartFirst } from '@/components/home/variants'

// Home variant 5 for review: Resend, Quickstart block then Explore.
export const metadata: Metadata = { title: 'Home variant 5', robots: { index: false } }

export default function Page() {
  return <HomeQuickstartFirst />
}
