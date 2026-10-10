import { z } from 'zod'

export const AUTH_RETURN_TO_KEY = 'dmc_auth_return_to'
export const AUTH_ACCESS_REFRESH_KEY = 'dmc_auth_access_refresh'
const AccessRefreshIntentSchema = z.enum(['pending', 'ready'])

/** Marks OAuth as an access refresh without altering the authenticated session. */
export function saveAccessRefreshIntent(): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    sessionStorage.setItem(AUTH_ACCESS_REFRESH_KEY, 'pending')
  } catch {
    // Authorization can continue when sessionStorage is unavailable.
  }
}

/** Validates stored UI metadata without consuming it; safe during render. */
export function peekAccessRefreshIntent(): z.infer<typeof AccessRefreshIntentSchema> | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const parsed = AccessRefreshIntentSchema.safeParse(
      sessionStorage.getItem(AUTH_ACCESS_REFRESH_KEY),
    )
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function clearAccessRefreshIntent(): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    sessionStorage.removeItem(AUTH_ACCESS_REFRESH_KEY)
  } catch {
    // Authorization can continue when sessionStorage is unavailable.
  }
}

/** Only a successful callback may activate a refresh that was explicitly requested. */
export function activateAccessRefreshIntent(): void {
  if (peekAccessRefreshIntent() !== 'pending') {
    return
  }
  try {
    sessionStorage.setItem(AUTH_ACCESS_REFRESH_KEY, 'ready')
  } catch {
    // Authorization can continue when sessionStorage is unavailable.
  }
}

/** Relative in-app paths only; blocks open redirects and auth loops (Refs #65). */
export function isSafeAuthReturnPath(pathname: string, search = ''): boolean {
  const target = `${pathname}${search}`
  if (!target.startsWith('/')) {
    return false
  }
  if (target.startsWith('//')) {
    return false
  }
  if (target.includes('\\')) {
    return false
  }
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return false
  }
  if (pathname === '/auth/callback' || pathname.startsWith('/auth/')) {
    return false
  }
  return true
}

export function saveAuthReturnTo(pathname: string, search = ''): void {
  if (typeof window === 'undefined') {
    return
  }
  if (!isSafeAuthReturnPath(pathname, search)) {
    return
  }
  const target = `${pathname}${search}`
  try {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, target)
  } catch {
    // ignore
  }
}

/** Reads the saved route without removing it: safe to call while rendering. */
export function peekAuthReturnTo(fallback = '/repositories'): string {
  if (typeof window === 'undefined') {
    return fallback
  }
  try {
    const value = sessionStorage.getItem(AUTH_RETURN_TO_KEY)
    if (value === null) {
      return fallback
    }
    const qIndex = value.indexOf('?')
    const pathname = qIndex === -1 ? value : value.slice(0, qIndex)
    const search = qIndex === -1 ? '' : value.slice(qIndex)
    if (isSafeAuthReturnPath(pathname, search)) {
      return value
    }
  } catch {
    // ignore
  }
  return fallback
}

export function clearAuthReturnTo(): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    sessionStorage.removeItem(AUTH_RETURN_TO_KEY)
  } catch {
    // ignore
  }
}

/** Reads and removes the saved route. Event handlers and callbacks only, never render. */
export function consumeAuthReturnTo(fallback = '/repositories'): string {
  const target = peekAuthReturnTo(fallback)
  clearAuthReturnTo()
  return target
}
