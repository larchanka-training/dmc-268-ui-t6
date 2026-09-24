import { describe, expect, it } from 'vitest'

import { AuthCallbackResponseSchema, AuthTokensSchema, UserSchema } from './schemas'

describe('UserSchema', () => {
  it('parses valid user profile with defaults', () => {
    const raw = {
      id: 'usr_123',
      login: 'skvertl',
    }
    const user = UserSchema.parse(raw)
    expect(user).toEqual({
      id: 'usr_123',
      login: 'skvertl',
      name: null,
      avatarUrl: null,
      email: null,
      provider: 'github',
    })
  })

  it('preserves full user details', () => {
    const raw = {
      id: 'usr_456',
      login: 'octocat',
      name: 'The Octocat',
      avatarUrl: 'https://github.com/images/error/octocat_happy.gif',
      email: 'octocat@github.com',
      provider: 'github',
    }
    expect(UserSchema.parse(raw)).toEqual(raw)
  })

  it('rejects empty login', () => {
    expect(() => UserSchema.parse({ id: 'usr_1', login: '' })).toThrow()
  })
})

describe('AuthTokensSchema', () => {
  it('parses access token and assigns default tokenType', () => {
    const parsed = AuthTokensSchema.parse({ accessToken: 'gho_12345' })
    expect(parsed).toEqual({
      accessToken: 'gho_12345',
      tokenType: 'Bearer',
    })
  })
})

describe('AuthCallbackResponseSchema', () => {
  it('parses callback response with token and optional user', () => {
    const parsed = AuthCallbackResponseSchema.parse({
      token: 'jwt.token.here',
      user: { id: 'usr_1', login: 'skvertl' },
    })
    expect(parsed.token).toBe('jwt.token.here')
    expect(parsed.user?.login).toBe('skvertl')
  })
})
