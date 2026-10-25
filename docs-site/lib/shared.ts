export const appName = 'Reviewer'
export const docsRoute = '/docs'

/**
 * Dashboard address. Same default as landing/src/lib/appUrl.ts (DEFAULT_APP_URL);
 * set NEXT_PUBLIC_APP_URL at build time to point the docs at another environment.
 */
export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://staging-ui.dmc268-t6.axyi.ru'

/**
 * Landing address, for header links to its sections. The staging landing from the api README
 * environments table; set NEXT_PUBLIC_LANDING_URL to point the docs at another environment.
 */
export const landingUrl = (
  process.env.NEXT_PUBLIC_LANDING_URL ?? 'https://staging.dmc268-t6.axyi.ru'
).replace(/\/$/, '')
