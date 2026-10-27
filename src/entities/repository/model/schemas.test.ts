import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  disabledRagIndex,
  RagIndexSchema,
  RagIndexStatusSchema,
  RepositoryIdSchema,
  RepositorySchema,
  SeverityThresholdSchema,
  UpdateRepositorySchema,
} from './schemas'

const readyRagIndex = {
  status: 'ready' as const,
  indexedCommitSha: '0123456789abcdef0123456789abcdef01234567',
  indexedAt: '2026-10-16T09:30:00.000Z',
  fileCount: 214,
  symbolCount: 3187,
  lastErrorCode: null,
}

describe('SeverityThresholdSchema', () => {
  it('accepts all, warning and critical', () => {
    expect(SeverityThresholdSchema.options).toEqual(['all', 'warning', 'critical'])
  })

  it('rejects a value outside the threshold enum', () => {
    expect(() => SeverityThresholdSchema.parse('info')).toThrow()
  })
})

describe('RagIndexStatusSchema', () => {
  it('lists the six statuses in the api order', () => {
    expect(RagIndexStatusSchema.options).toEqual([
      'disabled',
      'empty',
      'building',
      'ready',
      'stale',
      'failed',
    ])
  })

  it('rejects a status outside the enum', () => {
    expect(RagIndexStatusSchema.safeParse('indexing').success).toBe(false)
  })
})

describe('RagIndexSchema', () => {
  it('parses a published index', () => {
    expect(RagIndexSchema.parse(readyRagIndex)).toEqual(readyRagIndex)
  })

  it('accepts null publication fields with zero counts and an error code', () => {
    const failed = {
      status: 'failed',
      indexedCommitSha: null,
      indexedAt: null,
      fileCount: 0,
      symbolCount: 0,
      lastErrorCode: 'limit_exceeded:symbols',
    }
    expect(RagIndexSchema.parse(failed)).toEqual(failed)
  })

  it.each([
    'status',
    'indexedCommitSha',
    'indexedAt',
    'fileCount',
    'symbolCount',
    'lastErrorCode',
  ] as const)('requires %s', (field) => {
    const rest = Object.fromEntries(Object.entries(readyRagIndex).filter(([key]) => key !== field))
    expect(RagIndexSchema.safeParse(rest).success).toBe(false)
  })

  it.each(['fileCount', 'symbolCount'] as const)('rejects a negative or fractional %s', (field) => {
    expect(RagIndexSchema.safeParse({ ...readyRagIndex, [field]: -1 }).success).toBe(false)
    expect(RagIndexSchema.safeParse({ ...readyRagIndex, [field]: 1.5 }).success).toBe(false)
  })

  it('rejects an indexedAt that is not an ISO datetime', () => {
    expect(RagIndexSchema.safeParse({ ...readyRagIndex, indexedAt: '16.10.2026' }).success).toBe(
      false,
    )
  })

  it('keeps the object non-strict: unknown members are stripped, not rejected', () => {
    expect(RagIndexSchema.parse({ ...readyRagIndex, somethingNew: 1 })).toEqual(readyRagIndex)
  })

  it('stays representable as JSON Schema with every member required', () => {
    expect(z.toJSONSchema(RagIndexSchema).required).toEqual([
      'status',
      'indexedCommitSha',
      'indexedAt',
      'fileCount',
      'symbolCount',
      'lastErrorCode',
    ])
  })
})

describe('disabledRagIndex', () => {
  it('is the disabled index with no publication', () => {
    expect(disabledRagIndex).toEqual({
      status: 'disabled',
      indexedCommitSha: null,
      indexedAt: null,
      fileCount: 0,
      symbolCount: 0,
      lastErrorCode: null,
    })
    expect(RagIndexSchema.safeParse(disabledRagIndex).success).toBe(true)
  })
})

describe('RepositorySchema', () => {
  const validRepo = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    provider: 'github',
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
    ragEnabled: false,
    ragIndex: disabledRagIndex,
  }

  it('parses valid repository object', () => {
    const parsed = RepositorySchema.parse(validRepo)
    expect(parsed).toEqual(validRepo)
  })

  it('accepts Bitbucket identity and rejects missing or unknown providers', () => {
    expect(RepositorySchema.parse({ ...validRepo, provider: 'bitbucket' }).provider).toBe(
      'bitbucket',
    )
    const withoutProvider: Record<string, unknown> = { ...validRepo }
    delete withoutProvider.provider
    expect(RepositorySchema.safeParse(withoutProvider).success).toBe(false)
    expect(RepositorySchema.safeParse({ ...validRepo, provider: 'unknown' }).success).toBe(false)
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

  it.each([
    'branchFilter',
    'severityThreshold',
    'installationAvailable',
    'ragEnabled',
    'ragIndex',
  ] as const)('requires %s in the response', (field) => {
    const rest = Object.fromEntries(Object.entries(validRepo).filter(([key]) => key !== field))
    expect(RepositorySchema.safeParse(rest).success).toBe(false)
  })

  it('parses a repository with RAG on and its published index', () => {
    const parsed = RepositorySchema.parse({
      ...validRepo,
      ragEnabled: true,
      ragIndex: readyRagIndex,
    })
    expect(parsed.ragEnabled).toBe(true)
    expect(parsed.ragIndex).toEqual({
      status: 'ready',
      indexedCommitSha: '0123456789abcdef0123456789abcdef01234567',
      indexedAt: '2026-10-16T09:30:00.000Z',
      fileCount: 214,
      symbolCount: 3187,
      lastErrorCode: null,
    })
  })

  it('rejects a non-boolean ragEnabled and a null ragIndex', () => {
    expect(RepositorySchema.safeParse({ ...validRepo, ragEnabled: 'false' }).success).toBe(false)
    expect(RepositorySchema.safeParse({ ...validRepo, ragEnabled: null }).success).toBe(false)
    expect(RepositorySchema.safeParse({ ...validRepo, ragIndex: null }).success).toBe(false)
  })

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

  it('treats an empty branchFilter as all branches and rejects null', () => {
    expect(RepositorySchema.parse({ ...validRepo, branchFilter: [] }).branchFilter).toEqual([])
    expect(() => RepositorySchema.parse({ ...validRepo, branchFilter: null })).toThrow()
  })

  it('leaves the glob syntax of a mask to the server', () => {
    const parsed = RepositorySchema.parse({ ...validRepo, branchFilter: ['[unbalanced', 'a b\\c'] })

    expect(parsed.branchFilter).toEqual(['[unbalanced', 'a b\\c'])
  })

  it('keeps the object non-strict: unknown members are stripped, not rejected', () => {
    expect(RepositorySchema.parse({ ...validRepo, somethingNew: 1 })).toEqual(validRepo)
  })

  it('stays representable as JSON Schema', () => {
    expect(() => z.toJSONSchema(RepositorySchema)).not.toThrow()
  })
})

describe('RepositoryIdSchema', () => {
  it('accepts a uuid and rejects anything else', () => {
    expect(RepositoryIdSchema.safeParse('a1b2c3d4-e5f6-7890-abcd-ef1234567890').success).toBe(true)
    expect(RepositoryIdSchema.safeParse('not-a-uuid').success).toBe(false)
    expect(RepositoryIdSchema.safeParse('').success).toBe(false)
  })

  it('is the id of a repository', () => {
    expect(RepositorySchema.shape.id).toBe(RepositoryIdSchema)
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

  it('leaves the glob syntax of a mask to the server', () => {
    expect(UpdateRepositorySchema.parse({ branchFilter: ['{unbalanced'] })).toEqual({
      branchFilter: ['{unbalanced'],
    })
  })

  it('still rejects an update that carries only the read-only installationAvailable', () => {
    expect(() => UpdateRepositorySchema.parse({ installationAvailable: true })).toThrow()
  })

  it('accepts ragEnabled alone, both ways', () => {
    expect(UpdateRepositorySchema.parse({ ragEnabled: true })).toEqual({ ragEnabled: true })
    expect(UpdateRepositorySchema.parse({ ragEnabled: false })).toEqual({ ragEnabled: false })
  })

  it('rejects a null or non-boolean ragEnabled', () => {
    expect(UpdateRepositorySchema.safeParse({ ragEnabled: null }).success).toBe(false)
    expect(UpdateRepositorySchema.safeParse({ ragEnabled: 'true' }).success).toBe(false)
  })

  it('does not carry the read-only ragIndex into the patch', () => {
    const parsed = UpdateRepositorySchema.parse({ ragEnabled: true, ragIndex: readyRagIndex })
    expect(parsed).toEqual({ ragEnabled: true })
  })

  it('rejects an update that carries only the read-only ragIndex', () => {
    expect(() => UpdateRepositorySchema.parse({ ragIndex: readyRagIndex })).toThrow()
  })

  it('stays representable as JSON Schema', () => {
    expect(() => z.toJSONSchema(UpdateRepositorySchema)).not.toThrow()
  })
})
