import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/** The one primary action of a home variant. */
export function PrimaryLink({ href = '/docs/quickstart', label = 'Quickstart' }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--blue)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--blue-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--glow)]"
    >
      {label}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  )
}
