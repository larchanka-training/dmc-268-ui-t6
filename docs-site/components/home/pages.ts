import { BookOpen, CircleQuestionMark, FileText, Rocket, Settings2, Workflow } from 'lucide-react'

/** The docs pages shown on the home variants, in reading order. Text matches the pages. */
export const DOC_PAGES = [
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
    text: 'Keep files out of reviews with .review/rules.md.',
  },
  {
    href: '/docs/faq',
    icon: CircleQuestionMark,
    title: 'FAQ',
    text: 'Access, stored data, cost and fixes for common problems.',
  },
] as const

export type DocPage = (typeof DOC_PAGES)[number]

export function pageByHref(href: DocPage['href']): DocPage {
  return DOC_PAGES.find((page) => page.href === href) ?? DOC_PAGES[0]
}

export const SLOGAN = 'AI code review for your pull requests.'
export const LEAD =
  'Reviewer is a GitHub App that reviews pull requests with AI: inline comments, severity levels, suggested fixes and a verdict.'
