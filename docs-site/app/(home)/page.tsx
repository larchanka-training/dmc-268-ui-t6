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
import { Logo } from '@/components/logo'

export const metadata: Metadata = {
  title: { absolute: 'Reviewer Docs' },
}

const SECTIONS = [
  {
    href: '/docs',
    icon: BookOpen,
    title: 'Introduction',
    text: 'What Reviewer is and what it posts on your pull requests.',
  },
  {
    href: '/docs/quickstart',
    icon: Rocket,
    title: 'Quickstart',
    text: 'Install the GitHub App, turn on a repository, get the first review.',
  },
  {
    href: '/docs/how-it-works',
    icon: Workflow,
    title: 'How it works',
    text: 'When a review starts, what a run is, how to read the result.',
  },
  {
    href: '/docs/features',
    icon: Settings2,
    title: 'Features',
    text: 'Repository settings, the rules file, RAG and the dashboard.',
  },
  {
    href: '/docs/features#rules-file',
    icon: FileText,
    title: 'Rules file',
    text: 'Teach the review your conventions with .review/rules.md.',
  },
  {
    href: '/docs/faq',
    icon: CircleQuestionMark,
    title: 'FAQ',
    text: 'What is stored, what it costs, which access it needs, fixes.',
  },
]

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 50% 0%, rgb(37 99 235 / 34%), transparent 70%), radial-gradient(ellipse 30% 40% at 80% 10%, rgb(96 165 250 / 12%), transparent 70%)',
        }}
      />
      <section className="mx-auto flex w-full max-w-[1080px] flex-col items-center px-6 pt-24 pb-16 text-center">
        <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-fd-muted-foreground">
          <Logo size={14} className="text-fd-foreground" />
          Reviewer documentation
        </span>
        <h1
          className="mt-6 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-6xl"
          style={{
            background: 'linear-gradient(180deg, #fff 30%, #cbd5e1 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            paddingBottom: '0.12em',
          }}
        >
          AI code review on every pull request.
        </h1>
        <p className="mt-4 max-w-xl text-balance text-[#cbd5e1]">
          Reviewer is a GitHub App. It reads the change, follows your rules and posts a review with
          inline comments, severity levels and a clear verdict.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/docs/quickstart"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--blue)] px-5 text-sm font-medium text-white shadow-[0_0_0_1px_rgb(255_255_255/12%)_inset,0_10px_30px_-10px_rgb(37_99_235/80%)] transition-colors hover:bg-[var(--blue-hover)]"
          >
            Start with the quickstart
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/docs"
            className="glass inline-flex h-11 items-center rounded-full px-5 text-sm font-medium text-fd-foreground transition-colors hover:border-[rgb(96_165_250/45%)]"
          >
            Read the introduction
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1080px] gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, icon: Icon, title, text }) => (
          <Link
            key={href}
            href={href}
            className="glass group rounded-2xl p-5 transition-colors hover:border-[rgb(96_165_250/25%)]"
          >
            <Icon className="size-5 text-[var(--glow)]" />
            <h2 className="mt-3 flex items-center gap-1.5 text-[17px] font-semibold tracking-[-0.015em]">
              {title}
              <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </h2>
            <p className="mt-1 text-sm text-fd-muted-foreground">{text}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}
