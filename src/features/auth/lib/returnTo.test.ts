import { describe, expect, it } from 'vitest'

import { consumeAuthReturnTo, saveAuthReturnTo } from './returnTo'

describe('auth returnTo', () => {
  it('stores and consumes a protected route', () => {
    saveAuthReturnTo('/runs', '?page=2')
    expect(consumeAuthReturnTo()).toBe('/runs?page=2')
    expect(consumeAuthReturnTo('/repositories')).toBe('/repositories')
  })

  it('ignores login and callback paths', () => {
    saveAuthReturnTo('/login')
    expect(consumeAuthReturnTo('/runs')).toBe('/runs')
  })
})
