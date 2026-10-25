import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { appUrl } from '@/lib/shared'
import { Logo } from '../logo'
import { DOC_PAGES, LEAD, SLOGAN, pageByHref, type DocPage } from './pages'
import { PrimaryLink, SecondaryLink } from './primary-link'

const shell = 'mx-auto w-full max-w-[960px] px-4 pt-20 pb-24'
const h1 = 'text-3xl font-semibold tracking-[-0.03em] text-fd-foreground sm:text-4xl'
const lead = 'mt-3 text-base text-fd-muted-foreground'
const label = 'text-xs font-medium tracking-[0.08em] text-fd-muted-foreground uppercase'
const tile =
  'group flex gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]'

function Tile({ page, compact = false }: { page: DocPage; compact?: boolean }) {
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

/** 1. Mintlify: title, one line, then one column of stacked link cards. */
export function HomeStacked() {
  return (
    <main className={`${shell} max-w-[640px]`}>
      <h1 className={h1}>Reviewer docs</h1>
      <p className={lead}>{LEAD}</p>
      <div className="mt-10 grid gap-3">
        {DOC_PAGES.map((page) => (
          <Tile key={page.href} page={page} />
        ))}
      </div>
    </main>
  )
}

/** 2. Linear: title and one line, then two small groups, "Get started" and "Reference". */
export function HomeGroups() {
  const groups = [
    { name: 'Get started', pages: ['/docs/quickstart', '/docs/how-it-works'] as const },
    { name: 'Reference', pages: ['/docs/features', '/docs/rules-file', '/docs/faq'] as const },
  ]
  return (
    <main className={shell}>
      <h1 className={h1}>Reviewer docs</h1>
      <p className={lead}>
        {LEAD}{' '}
        <Link href="/docs" className="text-fd-foreground underline-offset-4 hover:underline">
          Read the introduction
        </Link>
        .
      </p>
      {groups.map((group) => (
        <section key={group.name} className="mt-12">
          <h2 className={label}>{group.name}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.pages.map((href) => (
              <Tile key={href} page={pageByHref(href)} />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}

/** 3. Claude platform: eyebrow, title, subtitle, quick chips, then a three step journey. */
export function HomeJourney() {
  const chip =
    'inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3.5 text-sm text-fd-foreground transition-colors hover:bg-[rgb(148_163_184/6%)]'
  const journey = [
    { name: 'Get started', pages: ['/docs', '/docs/quickstart'] as const },
    { name: 'Understand', pages: ['/docs/how-it-works', '/docs/features'] as const },
    { name: 'Configure and fix', pages: ['/docs/rules-file', '/docs/faq'] as const },
  ]
  return (
    <main className={shell}>
      <p className={label}>Reviewer</p>
      <h1 className={`${h1} mt-3`}>{SLOGAN}</h1>
      <p className={`${lead} max-w-2xl`}>{LEAD}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/docs/quickstart" className={chip}>
          Quickstart
        </Link>
        <Link href="/docs/how-it-works" className={chip}>
          How it works
        </Link>
        <a href={appUrl} target="_blank" rel="noreferrer" className={chip}>
          Open dashboard
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>
      <div className="mt-14 grid gap-8 border-t border-[var(--border)] pt-8 sm:grid-cols-3">
        {journey.map((step, i) => (
          <section key={step.name}>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fd-foreground">
              <span className="font-mono text-xs text-[var(--glow)]">0{i + 1}</span>
              {step.name}
            </h2>
            <ul className="mt-3 grid gap-2">
              {step.pages.map((href) => {
                const page = pageByHref(href)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
                    >
                      {page.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}

/** 4. Next.js: text first, "What is Reviewer?" and "How to use the docs". */
export function HomeText() {
  return (
    <main className={`${shell} max-w-[720px]`}>
      <h1 className={h1}>Reviewer docs</h1>
      <h2 className="mt-10 text-lg font-semibold text-fd-foreground">What is Reviewer?</h2>
      <p className="mt-2 text-fd-muted-foreground">{LEAD}</p>
      <p className="mt-3 text-fd-muted-foreground">
        It only reads text through the GitHub API. It never runs your code, merges or approves.
      </p>
      <h2 className="mt-10 text-lg font-semibold text-fd-foreground">How to use the docs</h2>
      <ul className="mt-3 grid gap-2.5">
        {DOC_PAGES.map((page) => (
          <li key={page.href} className="text-fd-muted-foreground">
            <Link
              href={page.href}
              className="font-medium text-fd-foreground underline-offset-4 hover:underline"
            >
              {page.title}
            </Link>
            : {page.text}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-fd-muted-foreground">
        Use the sidebar inside the docs, or search with Ctrl K.
      </p>
      <div className="mt-8">
        <PrimaryLink label="Start with the quickstart" />
      </div>
    </main>
  )
}

/** 5. Resend: title and tagline, one Quickstart block, then "Explore" with three topics. */
export function HomeQuickstartFirst() {
  const steps = ['Sign in to the dashboard', 'Install the GitHub App', 'Add the ai-review label']
  return (
    <main className={shell}>
      <h1 className={h1}>Reviewer docs</h1>
      <p className={`${lead} max-w-2xl`}>{LEAD}</p>
      <Link
        href="/docs/quickstart"
        className="group mt-10 block rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)]"
      >
        <span className="flex items-center gap-2 text-base font-semibold text-fd-foreground">
          Quickstart
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
        <ol className="mt-3 grid gap-2 text-sm text-fd-muted-foreground sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] font-mono text-[11px]">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Link>
      <h2 className={`${label} mt-12`}>Explore</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {(['/docs/how-it-works', '/docs/features', '/docs/rules-file'] as const).map((href) => (
          <Tile key={href} page={pageByHref(href)} />
        ))}
      </div>
      <p className="mt-8 text-sm text-fd-muted-foreground">
        Questions about access, data or cost?{' '}
        <Link href="/docs/faq" className="text-fd-foreground underline-offset-4 hover:underline">
          See the FAQ
        </Link>
        .
      </p>
    </main>
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
