// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import {
  AUTH_RETURN_TO_KEY,
  clearAuthReturnTo,
  consumeAuthReturnTo,
  isSafeAuthReturnPath,
  peekAuthReturnTo,
  saveAuthReturnTo,
} from './returnTo'

describe('auth returnTo', () => {
  afterEach(() => {
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
})
