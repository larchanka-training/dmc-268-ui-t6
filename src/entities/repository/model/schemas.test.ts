import { describe, expect, it } from 'vitest'

import { ConnectRepositorySchema, RepositorySchema, UpdateRepositorySchema } from './schemas'

describe('RepositorySchema', () => {
  it('parses valid repository object with defaults', () => {
    const raw = {
      id: 'repo-1',
      name: 'dmc-268-ui-t6',
      fullName: 'larchanka-training/dmc-268-ui-t6',
      url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
    }
    const parsed = RepositorySchema.parse(raw)
    expect(parsed).toEqual({
      id: 'repo-1',
      name: 'dmc-268-ui-t6',
      fullName: 'larchanka-training/dmc-268-ui-t6',
      url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: true,
      maxComments: 10,
    })
  })

  it('rejects invalid maxComments', () => {
    const raw = {
      id: 'repo-1',
      name: 'test',
      fullName: 'org/test',
      url: 'https://github.com/org/test',
      maxComments: 0,
    }
    expect(() => RepositorySchema.parse(raw)).toThrow()
  })
})

describe('ConnectRepositorySchema', () => {
  it('validates owner/repo format and applies defaults', () => {
    const input = {
      fullName: 'facebook/react',
    }
    const parsed = ConnectRepositorySchema.parse(input)
    expect(parsed.fullName).toBe('facebook/react')
    expect(parsed.defaultBranch).toBe('main')
    expect(parsed.defaultEngine).toBe('fast')
    expect(parsed.waitForCi).toBe(true)
    expect(parsed.maxComments).toBe(10)
  })

  it('fails on invalid repository format without slash', () => {
    expect(() => ConnectRepositorySchema.parse({ fullName: 'just-repo' })).toThrow()
  })
})

describe('UpdateRepositorySchema', () => {
  it('allows partial updates', () => {
    const parsed = UpdateRepositorySchema.parse({
      enabled: false,
      defaultEngine: 'deep',
    })
    expect(parsed).toEqual({
      enabled: false,
      defaultEngine: 'deep',
    })
  })
})
