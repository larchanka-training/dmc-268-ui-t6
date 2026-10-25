import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function baseOptions(): BaseLayoutProps {
  return {
    // The site header (components/site-header.tsx) carries the logo, so the docs nav has no title.
    nav: { title: null },
    // Dark only: the switch is hidden and next-themes is forced to dark in app/layout.tsx.
    themeSwitch: { enabled: false },
    // Search lives in the site header on every screen size.
    searchToggle: { enabled: false },
  }
}
