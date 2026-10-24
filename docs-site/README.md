# Reviewer user docs

Public user guide for Reviewer, built with [Fumadocs](https://fumadocs.dev) on Next.js.
It is a pnpm workspace package, separate from the dashboard (`src/`) and the landing (`landing/`).
Team docs for developers stay in `docs/`.

```bash
pnpm install          # from the repository root
pnpm --dir docs-site dev
pnpm --dir docs-site build
```

- Pages live in `content/docs/*.mdx`, the order is set in `content/docs/meta.json`.
- The home page is `app/(home)/page.tsx`.
- UI mockups used inside pages are in `components/mockups/`.
- Colors and fonts follow `landing/src/styles/global.css`. The site is dark only.

Vercel: import the repository, set Root Directory to `docs-site`, framework preset Next.js.
The root `eslint`, `stylelint` configs skip this folder; it is type-checked by `next build`.
