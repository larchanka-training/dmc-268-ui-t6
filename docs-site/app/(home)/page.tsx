import type { Metadata } from 'next'
import { HomeCentered } from '@/components/home/variants'

export const metadata: Metadata = {
  title: { absolute: 'Reviewer Docs' },
}

// The current pick among the variants at /home-1 to /home-5.
export default function HomePage() {
  return <HomeCentered />
}
