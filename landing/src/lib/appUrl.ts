// Runtime config contract for the app URL (set by the landing container, see issue #91):
//   GET /config.json  ->  { "appUrl": "https://..." }   (http/https only)
// nginx writes this file at container start from the env var APP_URL (envsubst template), so one
// image serves staging and prod without a rebuild. Missing or invalid file -> DEFAULT_APP_URL
// (local `pnpm dev`, build without a container).

// The only place the default app address is defined.
export const DEFAULT_APP_URL = 'https://staging-ui.dmc268-t6.axyi.ru'

export const CONFIG_PATH = '/config.json'

export const CONFIG_TIMEOUT_MS = 2000

let appUrl = DEFAULT_APP_URL

/** Returns a normalized http(s) URL from the config payload, or null if it is not usable. */
export function parseAppUrl(config: unknown): string | null {
  if (typeof config !== 'object' || config === null) return null
  const value = (config as Record<string, unknown>).appUrl
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

/** Reads /config.json once at startup; never throws, falls back to the default. */
export async function loadAppUrl(fetchImpl: typeof fetch = fetch): Promise<string> {
  try {
    const response = await fetchImpl(CONFIG_PATH, {
      cache: 'no-store',
      signal: AbortSignal.timeout(CONFIG_TIMEOUT_MS),
    })
    appUrl = (response.ok ? parseAppUrl(await response.json()) : null) ?? DEFAULT_APP_URL
  } catch (error) {
    // Missing file, an SPA fallback returning HTML, a timeout: all mean "use the default".
    console.warn('[landing] /config.json unavailable, using the default app url', error)
    appUrl = DEFAULT_APP_URL
  }
  return appUrl
}

export function getAppUrl(): string {
  return appUrl
}

/** Test helper: restores the default so tests do not depend on each other's state. */
export function resetAppUrl(): void {
  appUrl = DEFAULT_APP_URL
}
