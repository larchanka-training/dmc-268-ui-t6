import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const base =
  'inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--glow)]'

/** The one primary action of a home variant. */
export function PrimaryLink({ href = '/docs/quickstart', label = 'Quickstart' }) {
  return (
    <Link
      href={href}
      className={`${base} bg-[var(--blue)] text-white hover:bg-[var(--blue-hover)]`}
    >
      {label}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  )
}

/** A quiet secondary action next to the primary one. */
export function SecondaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`${base} border border-[var(--border-strong)] text-fd-foreground hover:bg-[rgb(148_163_184/6%)]`}
    >
      {label}
    </Link>
  )
}
