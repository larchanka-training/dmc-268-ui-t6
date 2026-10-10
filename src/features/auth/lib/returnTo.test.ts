// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AUTH_ACCESS_REFRESH_KEY,
  AUTH_RETURN_TO_KEY,
  activateAccessRefreshIntent,
  clearAccessRefreshIntent,
  peekAccessRefreshIntent,
  clearAuthReturnTo,
  consumeAuthReturnTo,
  isSafeAuthReturnPath,
  peekAuthReturnTo,
  saveAuthReturnTo,
  saveAccessRefreshIntent,
} from './returnTo'

describe('auth returnTo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('stores and consumes a protected route', () => {
    saveAuthReturnTo('/runs', '?page=2')
    expect(consumeAuthReturnTo()).toBe('/runs?page=2')
    expect(consumeAuthReturnTo('/repositories')).toBe('/repositories')
  })

  it('ignores login and callback paths', () => {
    saveAuthReturnTo('/login')
    expect(consumeAuthReturnTo('/runs')).toBe('/runs')
    saveAuthReturnTo('/auth/callback', '?code=x')
    expect(consumeAuthReturnTo('/runs')).toBe('/runs')
  })

  it('rejects absolute URLs and javascript pseudo-schemes', () => {
    expect(isSafeAuthReturnPath('https://evil.com')).toBe(false)
    expect(isSafeAuthReturnPath('javascript:alert(1)')).toBe(false)
    saveAuthReturnTo('https://evil.com')
    expect(consumeAuthReturnTo('/repositories')).toBe('/repositories')
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, 'javascript:alert(1)')
    expect(consumeAuthReturnTo('/repositories')).toBe('/repositories')
  })

  it('rejects paths without a leading slash', () => {
    expect(isSafeAuthReturnPath('runs')).toBe(false)
    saveAuthReturnTo('runs')
    expect(consumeAuthReturnTo('/repositories')).toBe('/repositories')
  })

  it('rejects open redirects and backslash paths', () => {
    expect(isSafeAuthReturnPath('//evil.com')).toBe(false)
    expect(isSafeAuthReturnPath('/\\evil')).toBe(false)
    saveAuthReturnTo('//evil.com')
    expect(consumeAuthReturnTo('/repositories')).toBe('/repositories')
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '//evil.com/phish')
    expect(consumeAuthReturnTo('/repositories')).toBe('/repositories')
  })

  it('peeks at the saved route without removing it', () => {
    saveAuthReturnTo('/runs', '?page=2')
    expect(peekAuthReturnTo()).toBe('/runs?page=2')
    expect(peekAuthReturnTo()).toBe('/runs?page=2')
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBe('/runs?page=2')
  })

  it('peeks the fallback for a missing or unsafe value and leaves the key alone', () => {
    expect(peekAuthReturnTo('/repositories')).toBe('/repositories')
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '//evil.com/phish')
    expect(peekAuthReturnTo('/repositories')).toBe('/repositories')
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBe('//evil.com/phish')
  })

  it('clears the saved route', () => {
    saveAuthReturnTo('/runs')
    clearAuthReturnTo()
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull()
    expect(peekAuthReturnTo('/repositories')).toBe('/repositories')
  })

  it('peeks at pending access refresh intent without consuming it', () => {
    expect(peekAccessRefreshIntent()).toBeNull()
    saveAccessRefreshIntent()
    expect(peekAccessRefreshIntent()).toBe('pending')
    expect(peekAccessRefreshIntent()).toBe('pending')
  })

  it('clears access refresh intent without removing the return route', () => {
    saveAuthReturnTo('/repositories')
    saveAccessRefreshIntent()
    clearAccessRefreshIntent()
    expect(peekAccessRefreshIntent()).toBeNull()
    expect(peekAuthReturnTo()).toBe('/repositories')
  })

  it.each(['', 'true', 'complete', '{"status":"pending"}', '"ready"'])(
    'ignores malformed access refresh intent %j without consuming it',
    (value) => {
      sessionStorage.setItem(AUTH_ACCESS_REFRESH_KEY, value)
      expect(peekAccessRefreshIntent()).toBeNull()
      expect(sessionStorage.getItem(AUTH_ACCESS_REFRESH_KEY)).toBe(value)
    },
  )

  it('does not infer access refresh intent from an ordinary login return route', () => {
    saveAuthReturnTo('/repositories')
    expect(peekAccessRefreshIntent()).toBeNull()
  })

  it('activates only pending access refresh intent and safely clears ready intent', () => {
    activateAccessRefreshIntent()
    expect(peekAccessRefreshIntent()).toBeNull()
    sessionStorage.setItem(AUTH_ACCESS_REFRESH_KEY, 'invalid')
    activateAccessRefreshIntent()
    expect(peekAccessRefreshIntent()).toBeNull()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    expect(peekAccessRefreshIntent()).toBe('ready')
    activateAccessRefreshIntent()
    expect(peekAccessRefreshIntent()).toBe('ready')
    clearAccessRefreshIntent()
    expect(peekAccessRefreshIntent()).toBeNull()
  })

  it('safely saves, peeks and clears intent when storage is unavailable', () => {
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new DOMException('Storage unavailable', 'SecurityError')
      })
    }
    expect(() => {
      saveAccessRefreshIntent()
    }).not.toThrow()
    expect(peekAccessRefreshIntent()).toBeNull()
    expect(() => {
      activateAccessRefreshIntent()
    }).not.toThrow()
    expect(() => {
      clearAccessRefreshIntent()
    }).not.toThrow()
  })
})
