import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '../logo'
import { DOC_PAGES, LEAD, SLOGAN, type DocPage } from './pages'
import { PrimaryLink, SecondaryLink } from './primary-link'

const shell = 'mx-auto w-full max-w-[960px] px-4 pt-20 pb-24'
const lead = 'mt-3 text-base text-fd-muted-foreground'
const tile =
  'group flex gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]'

export function Tile({ page, compact = false }: { page: DocPage; compact?: boolean }) {
  const Icon = page.icon
  return (
    <Link href={page.href} className={tile}>
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--glow)]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-fd-foreground">{page.title}</span>
        {compact ? null : (
          <span className="mt-0.5 block text-[13px] text-fd-muted-foreground">{page.text}</span>
        )}
      </span>
      <ArrowRight
        className="mt-0.5 size-4 shrink-0 text-fd-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  )
}

/** 6. The first home, simpler: badge, slogan, subtitle, two buttons and six flat tiles. */
export function HomeClassic() {
  return (
    <main className={`${shell} pt-24`}>
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-fd-muted-foreground">
          <Logo size={14} className="text-fd-foreground" />
          Reviewer documentation
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance text-fd-foreground sm:text-5xl">
          {SLOGAN}
        </h1>
        <p className={`${lead} max-w-xl text-balance`}>{LEAD}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <PrimaryLink />
          <SecondaryLink href="/docs" label="Introduction" />
        </div>
      </div>
      <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOC_PAGES.map((page) => (
          <Tile key={page.href} page={page} />
        ))}
      </div>
    </main>
  )
}
