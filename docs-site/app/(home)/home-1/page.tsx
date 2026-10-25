import type { Metadata } from 'next'
import { HomeTextList } from '@/components/home/variants'

// Home page variant 1 for review: text only, title, Quickstart and a plain list of pages.
export const metadata: Metadata = { title: 'Home variant 1', robots: { index: false } }

export default function Page() {
  return <HomeTextList />
}
