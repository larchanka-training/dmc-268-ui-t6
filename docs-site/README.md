# Reviewer user docs

Public user guide for Reviewer, built with [Fumadocs](https://fumadocs.dev) on Next.js.
It is a pnpm workspace package, separate from the dashboard (`src/`) and the landing (`landing/`).
Team docs for developers stay in `docs/`.

```bash
pnpm install          # from the repository root
pnpm --dir docs-site dev
pnpm --dir docs-site check-types
pnpm --dir docs-site build
```

- Pages live in `content/docs/*.mdx`, the order is set in `content/docs/meta.json`.
  The site opens on the Introduction (`content/docs/index.mdx`).
- Dashboard mockups and settings snippets are in `components/mockups/` and
  `components/dashboard/`; they render the real app components on `/mockups/*` pages.
- Colors and fonts follow `landing/src/styles/global.css`. The site is dark only.

## Status badges

`<StatusBadge />` from `components/status-badge.tsx` marks what does not work yet:

- `status="soon"` (default), **Coming soon**: planned, nothing to do today.
- `status="inactive"`, **Not active yet**: can be switched on, has no effect yet.
- `status="exploring"`, **Exploring**: an idea under study, it may not come.

## Keeping the docs current

- A PR that changes user-visible behavior updates `content/docs/` in the same PR, or links a
  follow-up issue.
- The core pages `index.mdx` (Introduction), `how-it-works.mdx` and `features.mdx` change only
  with an explicit review of that page. Prefer adding to Roadmap or FAQ, or a status badge, over
  rewriting a core page.

## Deploy

Vercel: import the repository, set Root Directory to `docs-site`, framework preset Next.js.
The root `eslint`, `stylelint` configs skip this folder; it is type-checked by `next build`.
