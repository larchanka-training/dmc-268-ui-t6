'use client'

import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { useSearchContext } from 'fumadocs-ui/contexts/search'
import { DOC_PAGES, HOME_LEAD, HOME_TITLE } from './pages'
import { PrimaryLink } from './primary-link'

const container = 'mx-auto w-full max-w-(--docs-width) px-4'
const title = 'text-3xl font-semibold tracking-[-0.03em] text-fd-foreground sm:text-4xl'
const lead = 'mt-3 max-w-xl text-base text-fd-muted-foreground'

/** 1. Text only: left aligned title, one line, Quickstart, then a plain list of pages. */
export function HomeTextList() {
  return (
    <main className={`${container} pt-16 pb-24`}>
      <div className="max-w-2xl">
        <h1 className={title}>{HOME_TITLE}</h1>
        <p className={lead}>{HOME_LEAD}</p>
        <div className="mt-6">
          <PrimaryLink />
        </div>
        <ul className="mt-14 border-t border-[var(--border)]">
          {DOC_PAGES.map((page) => (
            <li key={page.href} className="border-b border-[var(--border)]">
              <Link
                href={page.href}
                className="group flex items-baseline gap-4 py-3.5 text-sm transition-colors"
              >
                <span className="w-32 shrink-0 font-medium text-fd-foreground">{page.title}</span>
                <span className="text-fd-muted-foreground group-hover:text-fd-foreground">
                  {page.text}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

/** 3. Centered hero with one quiet row of page links under it. */
export function HomeCentered() {
  return (
    <main className={`${container} flex flex-col items-center pt-28 pb-24 text-center`}>
      <h1 className={title}>{HOME_TITLE}</h1>
      <p className={`${lead} text-balance`}>{HOME_LEAD}</p>
      <div className="mt-7">
        <PrimaryLink />
      </div>
      <nav
        aria-label="Docs pages"
        className="mt-16 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm"
      >
        {DOC_PAGES.filter((page) => page.href !== '/docs/quickstart').map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            {page.title}
          </Link>
        ))}
      </nav>
    </main>
  )
}

const STEPS = [
  { title: 'Sign in to the dashboard', text: 'With your GitHub account.' },
  { title: 'Install the GitHub App', text: 'On the repositories you want reviewed.' },
  {
    title: 'Add the ai-review label',
    text: 'Once CI passes, the review appears on the pull request.',
  },
]

/** 4. Split: text and action on the left, three short steps on the right. */
export function HomeSplit() {
  return (
    <main
      className={`${container} grid gap-12 pt-20 pb-24 lg:grid-cols-[minmax(0,560px)_380px] lg:gap-24 lg:items-start`}
    >
      <div>
        <h1 className={title}>{HOME_TITLE}</h1>
        <p className={lead}>{HOME_LEAD}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <PrimaryLink />
          <Link
            href="/docs/how-it-works"
            className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            How it works
          </Link>
        </div>
      </div>
      <ol className="surface divide-y divide-[var(--border)]">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 p-4">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] font-mono text-xs text-fd-muted-foreground">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-fd-foreground">{step.title}</p>
              <p className="mt-0.5 text-[13px] text-fd-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  )
}

/** 5. Search first: title, a large search field, then a few page chips. */
export function HomeSearch() {
  const { setOpenSearch } = useSearchContext()
  return (
    <main className={`${container} flex flex-col items-center pt-28 pb-24 text-center`}>
      <h1 className={title}>How can we help?</h1>
      <p className={`${lead} text-balance`}>{HOME_LEAD}</p>
      <button
        type="button"
        onClick={() => {
          setOpenSearch(true)
        }}
        className="mt-8 flex h-12 w-full max-w-xl items-center gap-3 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-left text-sm text-fd-muted-foreground transition-colors hover:border-[rgb(148_163_184/32%)]"
      >
        <Search className="size-4" aria-hidden />
        Search the docs
        <kbd className="ms-auto rounded border border-[var(--border)] px-1.5 font-mono text-[11px]">
          Ctrl K
        </kbd>
      </button>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {DOC_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--border)] px-3 text-[13px] text-fd-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-fd-foreground"
          >
            {page.title}
            {page.href === '/docs/quickstart' ? (
              <ArrowRight className="size-3" aria-hidden />
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  )
}
