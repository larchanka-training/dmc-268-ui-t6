import Link from 'next/link'
import { ArrowRight, FileText, Rocket, Workflow } from 'lucide-react'

const ITEMS = [
  { href: '/docs/quickstart', icon: Rocket, title: 'Quickstart', text: 'Get your first review.' },
  {
    href: '/docs/how-it-works',
    icon: Workflow,
    title: 'How it works',
    text: 'When a review starts.',
  },
  {
    href: '/docs/rules-file',
    icon: FileText,
    title: 'Rules file',
    text: 'Keep files out of reviews.',
  },
]

/** Compact row of three entry points, right under the Introduction lead. */
export function StartHere() {
  return (
    <div className="not-prose my-6 grid gap-3 sm:grid-cols-3">
      {ITEMS.map(({ href, icon: Icon, title, text }) => (
        <Link
          key={href}
          href={href}
          className="group flex items-start gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3.5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
        >
          <Icon className="mt-0.5 size-4 shrink-0 text-[var(--glow)]" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-fd-foreground">{title}</span>
            <span className="mt-0.5 block text-[13px] text-fd-muted-foreground">{text}</span>
          </span>
          <ArrowRight
            className="mt-0.5 size-4 shrink-0 text-fd-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </Link>
      ))}
    </div>
  )
}
