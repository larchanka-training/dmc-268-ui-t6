import { describe, expect, it } from 'vitest'

import { oauthCallbackErrorMessage } from './oauthErrors'

describe('oauthCallbackErrorMessage', () => {
  it('does not treat prototype pollution keys as known OAuth codes', () => {
    expect(oauthCallbackErrorMessage('__proto__')).toBe('Не удалось войти через GitHub')
    expect(oauthCallbackErrorMessage('constructor')).toBe('Не удалось войти через GitHub')
  })
})
