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
- Dashboard pictures are plain images in `public/screens/*.webp`, shown by
  `components/mockups/` with their sizes from `components/mockups/screens.json`; a click opens
  them zoomed in. They are shot from the `/mockups/*` pages, which render the real app components
  from `components/dashboard/` (not indexed, no docs page links to them).
- Colors and fonts follow `landing/src/styles/global.css`. The site is dark only.

## Dashboard pictures

After a change to a mockup in `components/dashboard/` or to the app components it uses, take the
pictures again and commit `public/screens/` with `components/mockups/screens.json`:

```bash
NODE_PATH=/path/to/node_modules/with/playwright pnpm --dir docs-site shots
```

The script builds the site, starts it on port 3917 (`PORT`), opens every `/mockups/*` page in
Chromium at 2x pixel density and saves WebP (with `sharp`, which Next.js installs; PNG without it).
Playwright is not a dependency here: `NODE_PATH` points to an install of it. `CHROME_PATH` sets the
browser (default `/usr/bin/google-chrome`), `BASE_URL=http://localhost:3000` uses a running server
instead of building, `SKIP_BUILD=1` starts the last build. The list of pictures and their widths is
at the top of `scripts/shoot-mockups.mjs`.

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
