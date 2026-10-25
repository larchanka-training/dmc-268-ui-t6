# Reviewer user docs

Public user guide for Reviewer, built with [Fumadocs](https://fumadocs.dev) on Next.js.
It is a pnpm workspace package, separate from the dashboard (`src/`) and the landing (`landing/`).
Team docs for developers stay in `docs/`.

```bash
pnpm install          # from the repository root
pnpm --dir docs-site dev           # http://localhost:3000/docs
pnpm --dir docs-site check-types
pnpm --dir docs-site build         # static export to docs-site/out
```

- The site is served at `<landing host>/docs` (`basePath` in `next.config.mjs`); the edge proxy
  sends `/docs` and `/docs/*` to the docs container. The Introduction is the base path itself.
- Pages live in `content/docs/*.mdx`, the order is set in `content/docs/meta.json`.
  The site opens on the Introduction (`content/docs/index.mdx`). Links between pages leave out
  the base path (`[FAQ](/faq)`): Next.js adds it. A plain URL (an image `src`, an icon) takes it
  from `basePath` in `lib/shared.ts`.
- Search is static: `app/api/search` writes the index at build time, the browser searches it.
- Dashboard pictures are plain images in `public/screens/*.webp`, shown by
  `components/mockups/` with their sizes from `components/mockups/screens.json`; a click opens
  them zoomed in. They are shot from the `/docs/mockups/*` pages, which render the real app
  components from `components/dashboard/` (not indexed, no docs page links to them).
- Colors and fonts follow `landing/src/styles/global.css`. The site is dark only.
- Fumadocs packages are pinned to exact versions: `app/global.css` overrides some of their
  internal classes, so an update needs a look at every page in a browser (desktop and 390px).

## Dashboard pictures

After a change to a mockup in `components/dashboard/` or to the app components it uses, take the
pictures again and commit `public/screens/` with `components/mockups/screens.json`:

```bash
NODE_PATH=/path/to/node_modules/with/playwright pnpm --dir docs-site shots
```

What to take again after a change:

| You changed                                                                                                                                                                              | Take again                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `components/dashboard/runs-screen.tsx`, `src/pages/runs/RunsPage.module.css`                                                                                                             | `runs`                                                                                          |
| `components/dashboard/run-detail-screen.tsx`, `src/pages/runs/RunDetailPage.module.css`, `src/widgets/run-inspector/ui/`, `src/widgets/diff-viewer/`, `src/features/finding-filters/ui/` | `run-detail`                                                                                    |
| `components/dashboard/app-shell.tsx`, `src/widgets/app-layout/ui/`, `src/features/auth/ui/UserMenu.module.css`                                                                           | `runs`, `run-detail`                                                                            |
| `src/features/repository-settings/ui/`                                                                                                                                                   | `settings-auto-review`, `settings-rag`, `settings-review-options`, `settings-branches-severity` |
| `src/widgets/repository-rules/ui/`                                                                                                                                                       | `settings-rules`                                                                                |
| `components/dashboard/settings-blocks.tsx`, `snippet-shell.tsx`                                                                                                                          | all `settings-*`                                                                                |
| `src/shared/ui/` (design system), `components/dashboard/mock-screen.tsx`                                                                                                                 | all                                                                                             |

The script takes all pictures every time; commit only the ones that changed.

The script builds the site, starts it on 127.0.0.1, port 3917 (`PORT`), opens every `/mockups/*`
page in Chromium at 2x pixel density and saves WebP (with `sharp`, which Next.js installs; PNG
without it). Playwright is an outside tool, not a dependency of this package, so `pnpm install`
stays light: `NODE_PATH` points to any install of `playwright` or `playwright-core`. `CHROME_PATH` sets the
browser (default `/usr/bin/google-chrome`), `BASE_URL=http://localhost:3000` uses a running server
instead of building (with the base path, e.g. `http://localhost:3000/docs`), `SKIP_BUILD=1` starts the last build. The list of pictures and their widths is
at the top of `scripts/shoot-mockups.mjs`.

## Status badges

`<StatusBadge />` from `components/status-badge.tsx` marks what does not work yet:

- `status="soon"` (default), **Coming soon**: planned, nothing to do today.
- `status="inactive"`, **Not active yet**: can be switched on, has no effect yet.
- `status="exploring"`, **Exploring**: an idea under study, it may not come.

## Keeping the docs current

The full rule is in [api `docs/CONTRIBUTING.md` §8](https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/CONTRIBUTING.md#8-пользовательская-документация).

- A PR that changes user-visible behavior updates `content/docs/` in the same PR, or links a
  follow-up issue in the PR body (`Refs`).
- Core pages index.mdx, how-it-works.mdx and features.mdx change only with an explicit review
  by the tech lead or a participant they appoint: for each changed core page the reviewer
  writes in Submit review «`<page>.mdx` прочитана целиком». Prefer adding to Roadmap or FAQ,
  or a status badge, over rewriting a core page.

## Checks

- Root `pnpm lint` covers this folder: eslint with the app rules (Next.js `app/` files may export
  `metadata` and `generateStaticParams`), stylelint for the CSS Modules. `app/global.css` is
  skipped by stylelint: it holds Tailwind at-rules and Fumadocs overrides.
- Root `pnpm format:check` covers the code; `content/` is skipped, since prettier can reflow MDX.
- The `UI quality` CI job runs `pnpm --dir docs-site check-types` and
  `pnpm --dir docs-site build`. They also fail when a file of `src/` that the mockups import is
  renamed or moved; a renamed CSS Module class fails nothing, see [Dashboard pictures](#dashboard-pictures).
- The mockups in `components/dashboard/` import internals of `src/` slices (CSS Modules,
  `widgets/diff-viewer/lib/*`); this exception to the FSD rule is written in
  `.agents/rules/frontend.md` §3.

## Deploy

Docker (from the repository root): `docker build -f docs-site/Dockerfile -t dmc-268-docs:local .`,
then `docker run --rm -p 8082:8080 dmc-268-docs:local` and open `http://localhost:8082/docs`
(nginx config: `docker/docs/nginx.conf`; staging deploy: `docs/CICD.md` §4.2).

Vercel is used only for preview builds: Root Directory `docs-site`, framework preset Next.js.
