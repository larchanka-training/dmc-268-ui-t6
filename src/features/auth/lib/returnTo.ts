export const AUTH_RETURN_TO_KEY = 'dmc_auth_return_to'

export function saveAuthReturnTo(pathname: string, search = ''): void {
  if (typeof window === 'undefined') {
    return
  }
  const target = `${pathname}${search}`
  if (target.startsWith('/login') || target.startsWith('/auth/')) {
    return
  }
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
    if (value?.startsWith('/')) {
      return value
    }
  } catch {
    // ignore
  }
  return fallback
}
