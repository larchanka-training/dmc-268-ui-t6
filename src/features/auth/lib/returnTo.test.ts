// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import {
  AUTH_RETURN_TO_KEY,
  consumeAuthReturnTo,
  isSafeAuthReturnPath,
  saveAuthReturnTo,
} from './returnTo'

describe('auth returnTo', () => {
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

  it('rejects open redirects and backslash paths', () => {
    expect(isSafeAuthReturnPath('//evil.com')).toBe(false)
    expect(isSafeAuthReturnPath('/\\evil')).toBe(false)
    saveAuthReturnTo('//evil.com')
    expect(consumeAuthReturnTo('/repositories')).toBe('/repositories')
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '//evil.com/phish')
    expect(consumeAuthReturnTo('/repositories')).toBe('/repositories')
  })
})
