import { describe, expect, it } from 'vitest'

import { AuthSessionSchema, MeSchema, UserSchema, WorkspaceSchema } from './schemas'

describe('UserSchema', () => {
  it('parses valid user profile with numeric id and nullables', () => {
    const raw = {
      id: 114473628,
      login: 'skvertl',
      name: 'Denis Skvertl',
      avatarUrl: 'https://avatars.githubusercontent.com/u/114473628?v=4',
    }
    const user = UserSchema.parse(raw)
    expect(user).toEqual(raw)
  })

  it('allows null name and avatarUrl', () => {
    const raw = {
      id: 1,
      login: 'ghost',
      name: null,
      avatarUrl: null,
    }
    expect(UserSchema.parse(raw)).toEqual(raw)
  })

  it('rejects string id or empty login', () => {
    expect(() =>
      UserSchema.parse({ id: 'usr_1', login: 'octo', name: null, avatarUrl: null }),
    ).toThrow()
    expect(() => UserSchema.parse({ id: 1, login: '', name: null, avatarUrl: null })).toThrow()
  })
})

describe('WorkspaceSchema & MeSchema', () => {
  it('parses Workspace and Me with workspaces list', () => {
    const workspace = WorkspaceSchema.parse({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'larchanka-training',
      installationId: 1234567,
    })
    expect(workspace.installationId).toBe(1234567)

    const me = MeSchema.parse({
      id: 114473628,
      login: 'skvertl',
      name: null,
      avatarUrl: null,
      workspaces: [workspace],
    })
    expect(me.workspaces).toHaveLength(1)
  })
})

describe('AuthSessionSchema', () => {
  it('parses AuthSession with accessToken, tokenType, expiresIn, user', () => {
    const parsed = AuthSessionSchema.parse({
      accessToken: 'access_jwt_123',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 114473628,
        login: 'skvertl',
        name: 'Denis',
        avatarUrl: null,
      },
    })
    expect(parsed.accessToken).toBe('access_jwt_123')
    expect(parsed.expiresIn).toBe(900)
    expect(parsed.user.id).toBe(114473628)
  })
})
