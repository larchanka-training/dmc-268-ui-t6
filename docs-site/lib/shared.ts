export const appName = 'Reviewer'
export const docsRoute = '/docs'

/**
 * Dashboard address. Same default as landing/src/lib/appUrl.ts (DEFAULT_APP_URL);
 * set NEXT_PUBLIC_APP_URL at build time to point the docs at another environment.
 */
export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://staging-ui.dmc268-t6.axyi.ru'
