import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  BookOpen,
  CircleQuestionMark,
  FileText,
  Rocket,
  Settings2,
  Workflow,
} from 'lucide-react'
import { ReviewPreview } from '@/components/review-preview'

export const metadata: Metadata = {
  title: { absolute: 'Reviewer Docs' },
}

const SECTIONS = [
  {
    href: '/docs',
    icon: BookOpen,
    title: 'Introduction',
    text: 'What Reviewer is and what it adds to a pull request.',
  },
  {
    href: '/docs/quickstart',
    icon: Rocket,
    title: 'Quickstart',
    text: 'Install the GitHub App and get your first review.',
  },
  {
    href: '/docs/how-it-works',
    icon: Workflow,
    title: 'How it works',
    text: 'When a review starts and how to read the result.',
  },
  {
    href: '/docs/features',
    icon: Settings2,
    title: 'Features',
    text: 'Repository settings, the code index and the dashboard.',
  },
  {
    href: '/docs/rules-file',
    icon: FileText,
    title: 'Rules file',
    text: 'What .review/rules.md does today and what is coming.',
  },
  {
    href: '/docs/faq',
    icon: CircleQuestionMark,
    title: 'FAQ',
    text: 'Access, stored data, cost and fixes for common problems.',
  },
]

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto grid w-full max-w-[1080px] items-center gap-12 px-6 pt-16 pb-16 lg:grid-cols-[1fr_minmax(0,460px)]">
        <div>
          <p className="text-xs font-medium tracking-[0.08em] text-[var(--glow)] uppercase">
            Reviewer docs
          </p>
          <h1
            className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl"
            style={{
              background: 'linear-gradient(180deg, #fff 30%, #cbd5e1 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              paddingBottom: '0.12em',
            }}
          >
            Add a label. Get a review.
          </h1>
          <p className="mt-4 max-w-lg text-[#cbd5e1]">
            Reviewer is a GitHub App. Put the <code className="text-[0.9em]">ai-review</code> label
            on a pull request and, once CI passes, it posts a review with inline comments, severity
            levels and a verdict.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/docs/quickstart"
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--blue)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--blue-hover)]"
            >
              Start with the quickstart
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/docs/how-it-works"
              className="inline-flex h-11 items-center rounded-[10px] border border-[var(--border-strong)] px-5 text-sm font-medium text-fd-foreground transition-colors hover:bg-[rgb(148_163_184/6%)]"
            >
              How it works
            </Link>
          </div>
        </div>
        <ReviewPreview />
      </section>

      <section className="mx-auto grid w-full max-w-[1080px] gap-3 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, icon: Icon, title, text }) => (
          <Link
            key={href}
            href={href}
            className="surface group p-5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
          >
            <Icon className="size-5 text-[var(--glow)]" aria-hidden />
            <h2 className="mt-3 flex items-center gap-1.5 text-base font-semibold tracking-[-0.015em]">
              {title}
              <ArrowRight
                className="size-4 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </h2>
            <p className="mt-1 text-sm text-fd-muted-foreground">{text}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}
