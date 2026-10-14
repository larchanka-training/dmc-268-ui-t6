import { describe, expect, it } from 'vitest'

import { RepositorySchema, SeverityThresholdSchema, UpdateRepositorySchema } from './schemas'

describe('SeverityThresholdSchema', () => {
  it('accepts all, warning and critical', () => {
    expect(SeverityThresholdSchema.options).toEqual(['all', 'warning', 'critical'])
  })

  it('rejects a value outside the threshold enum', () => {
    expect(() => SeverityThresholdSchema.parse('info')).toThrow()
  })
})

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
    branchFilter: [] as string[],
    severityThreshold: 'all' as const,
    installationAvailable: true,
  }

  it('parses valid repository object', () => {
    const parsed = RepositorySchema.parse(validRepo)
    expect(parsed).toEqual(validRepo)
  })

  it('accepts the always CI mode and REQUEST_CHANGES reviewEvent', () => {
    const parsed = RepositorySchema.parse({
      ...validRepo,
      waitForCi: 'always',
      reviewEvent: 'REQUEST_CHANGES',
    })
    expect(parsed.defaultEngine).toBe('fast')
    expect(parsed.waitForCi).toBe('always')
    expect(parsed.reviewEvent).toBe('REQUEST_CHANGES')
  })

  it('rejects the deep engine until phase 3', () => {
    expect(() => RepositorySchema.parse({ ...validRepo, defaultEngine: 'deep' })).toThrow()
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

  it.each(['branchFilter', 'severityThreshold', 'installationAvailable'] as const)(
    'requires %s in the response',
    (field) => {
      const rest = Object.fromEntries(Object.entries(validRepo).filter(([key]) => key !== field))
      expect(RepositorySchema.safeParse(rest).success).toBe(false)
    },
  )

  it('parses review settings with a branch filter and a threshold', () => {
    const parsed = RepositorySchema.parse({
      ...validRepo,
      branchFilter: ['main', 'release/*'],
      severityThreshold: 'critical',
      installationAvailable: false,
    })
    expect(parsed.branchFilter).toEqual(['main', 'release/*'])
    expect(parsed.severityThreshold).toBe('critical')
    expect(parsed.installationAvailable).toBe(false)
  })

  it('accepts 20 branch patterns and rejects 21', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `branch-${String(i)}`)
    expect(RepositorySchema.safeParse({ ...validRepo, branchFilter: twenty }).success).toBe(true)
    expect(
      RepositorySchema.safeParse({ ...validRepo, branchFilter: [...twenty, 'branch-20'] }).success,
    ).toBe(false)
  })

  it('rejects an empty branch pattern', () => {
    expect(RepositorySchema.safeParse({ ...validRepo, branchFilter: [''] }).success).toBe(false)
  })

  it('accepts a 255-character branch pattern and rejects 256', () => {
    expect(
      RepositorySchema.safeParse({ ...validRepo, branchFilter: ['a'.repeat(255)] }).success,
    ).toBe(true)
    expect(
      RepositorySchema.safeParse({ ...validRepo, branchFilter: ['a'.repeat(256)] }).success,
    ).toBe(false)
  })

  it('rejects a severityThreshold outside the enum', () => {
    expect(RepositorySchema.safeParse({ ...validRepo, severityThreshold: 'info' }).success).toBe(
      false,
    )
  })

  it('rejects a non-boolean installationAvailable', () => {
    expect(
      RepositorySchema.safeParse({ ...validRepo, installationAvailable: 'true' }).success,
    ).toBe(false)
  })
})

describe('UpdateRepositorySchema', () => {
  it('allows partial updates with valid values', () => {
    const parsed = UpdateRepositorySchema.parse({
      enabled: false,
      defaultEngine: 'fast',
      waitForCi: 'never',
      maxComments: 5,
      reviewEvent: 'REQUEST_CHANGES',
    })
    expect(parsed.enabled).toBe(false)
    expect(parsed.defaultEngine).toBe('fast')
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

  it('accepts branchFilter alone', () => {
    const parsed = UpdateRepositorySchema.parse({ branchFilter: ['main', 'release/*'] })
    expect(parsed.branchFilter).toEqual(['main', 'release/*'])
  })

  it('accepts an empty branchFilter to clear the filter', () => {
    const parsed = UpdateRepositorySchema.parse({ branchFilter: [] })
    expect(parsed.branchFilter).toEqual([])
  })

  it('accepts severityThreshold alone', () => {
    const parsed = UpdateRepositorySchema.parse({ severityThreshold: 'warning' })
    expect(parsed.severityThreshold).toBe('warning')
  })

  it('rejects 21 branch patterns, an empty pattern and a 256-character pattern', () => {
    const twentyOne = Array.from({ length: 21 }, (_, i) => `branch-${String(i)}`)
    expect(UpdateRepositorySchema.safeParse({ branchFilter: twentyOne }).success).toBe(false)
    expect(UpdateRepositorySchema.safeParse({ branchFilter: [''] }).success).toBe(false)
    expect(UpdateRepositorySchema.safeParse({ branchFilter: ['a'.repeat(256)] }).success).toBe(
      false,
    )
  })

  it('rejects a severityThreshold outside the enum', () => {
    expect(UpdateRepositorySchema.safeParse({ severityThreshold: 'info' }).success).toBe(false)
  })

  it('does not carry installationAvailable into the patch', () => {
    const parsed = UpdateRepositorySchema.parse({ enabled: true, installationAvailable: false })
    expect(parsed).toEqual({ enabled: true })
  })
})
