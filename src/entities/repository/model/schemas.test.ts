import { describe, expect, it } from 'vitest'

import { RepositorySchema, UpdateRepositorySchema } from './schemas'

describe('RepositorySchema', () => {
  const validRepo = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    fullName: 'larchanka-training/dmc-268-ui-t6',
    url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
    defaultBranch: 'main',
    enabled: true,
    defaultEngine: 'fast' as const,
    waitForCi: 'auto' as const,
    maxComments: 10,
    reviewEvent: 'COMMENT' as const,
  }

  it('parses valid repository object', () => {
    const parsed = RepositorySchema.parse(validRepo)
    expect(parsed).toEqual(validRepo)
  })

  it('accepts deep engine and REQUEST_CHANGES reviewEvent', () => {
    const parsed = RepositorySchema.parse({
      ...validRepo,
      defaultEngine: 'deep',
      waitForCi: 'always',
      reviewEvent: 'REQUEST_CHANGES',
    })
    expect(parsed.defaultEngine).toBe('deep')
    expect(parsed.waitForCi).toBe('always')
    expect(parsed.reviewEvent).toBe('REQUEST_CHANGES')
  })

  it('rejects maxComments greater than 10', () => {
    expect(() =>
      RepositorySchema.parse({
        ...validRepo,
        maxComments: 11,
      }),
    ).toThrow()
  })

  it('rejects maxComments less than 1', () => {
    expect(() =>
      RepositorySchema.parse({
        ...validRepo,
        maxComments: 0,
      }),
    ).toThrow()
  })

  it('rejects boolean waitForCi', () => {
    expect(() =>
      RepositorySchema.parse({
        ...validRepo,
        waitForCi: true,
      }),
    ).toThrow()
  })
})

describe('UpdateRepositorySchema', () => {
  it('allows partial updates with valid values', () => {
    const parsed = UpdateRepositorySchema.parse({
      enabled: false,
      defaultEngine: 'deep',
      waitForCi: 'never',
      maxComments: 5,
      reviewEvent: 'REQUEST_CHANGES',
    })
    expect(parsed.enabled).toBe(false)
    expect(parsed.defaultEngine).toBe('deep')
    expect(parsed.waitForCi).toBe('never')
    expect(parsed.maxComments).toBe(5)
    expect(parsed.reviewEvent).toBe('REQUEST_CHANGES')
  })

  it('rejects maxComments greater than 10', () => {
    expect(() =>
      UpdateRepositorySchema.parse({
        maxComments: 11,
      }),
    ).toThrow()
  })
})
