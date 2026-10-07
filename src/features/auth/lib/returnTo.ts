export const AUTH_RETURN_TO_KEY = 'dmc_auth_return_to'

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

export function consumeAuthReturnTo(fallback = '/repositories'): string {
  if (typeof window === 'undefined') {
    return fallback
  }
  try {
    const value = sessionStorage.getItem(AUTH_RETURN_TO_KEY)
    sessionStorage.removeItem(AUTH_RETURN_TO_KEY)
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
