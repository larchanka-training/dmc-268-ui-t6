export const appName = 'Reviewer'
/**
 * URL prefix of the whole site (next.config.mjs basePath, served at <landing host>/docs). Next.js
 * adds it to <Link> and its assets; plain URLs (an <img> src, metadata icons, the search API)
 * take it from here.
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** Page URLs inside the site: the Introduction is the site root, at the base path itself. */
export const docsRoute = '/'

/**
 * Dashboard address. Same default as landing/src/lib/appUrl.ts (DEFAULT_APP_URL);
 * set NEXT_PUBLIC_APP_URL at build time to point the docs at another environment.
 */
export const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://staging-ui.dmc268-t6.axyi.ru'
