/** The docs pages shown on the home variants, in reading order. Text matches the page frontmatter. */
export const DOC_PAGES = [
  {
    href: '/docs',
    title: 'Introduction',
    text: 'What Reviewer is and what it adds to a pull request.',
  },
  {
    href: '/docs/quickstart',
    title: 'Quickstart',
    text: 'Install the GitHub App and get your first review.',
  },
  {
    href: '/docs/how-it-works',
    title: 'How it works',
    text: 'When a review starts and how to read the result.',
  },
  {
    href: '/docs/features',
    title: 'Features',
    text: 'Repository settings, the code index and the dashboard.',
  },
  {
    href: '/docs/rules-file',
    title: 'Rules file',
    text: 'What .review/rules.md does today and what is coming.',
  },
  {
    href: '/docs/faq',
    title: 'FAQ',
    text: 'Access, stored data, cost and fixes for common problems.',
  },
] as const

export const HOME_TITLE = 'Reviewer docs'
export const HOME_LEAD =
  'Reviewer is a GitHub App that reviews pull requests with AI: inline comments, severity levels and a verdict.'
