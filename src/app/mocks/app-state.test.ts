import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  RunActionSchema,
  RunSessionSchema,
  RunStatusSchema,
  groupActions,
  isStaleRunning,
} from '../../entities/run'
import { FileDiffSchema, RawFileDiffSchema, commentKey, fromPatch } from '../../entities/diff'
import type { FileDiff } from '../../entities/diff'
import { RepositorySchema } from '../../entities/repository'
import { ReviewCommentSchema } from '../../entities/review'
import { UserSchema } from '../../entities/user'

import {
  MOCK_NOW,
  mockCurrentUser,
  mockFileDiffs,
  mockRepositories,
  mockReviewComments,
  mockRunActions,
  mockRunSessions,
  mockSummaryOnlyDiff,
  mockSummaryOnlyRun,
} from './app-state'

function findFileDiff(filename: string): FileDiff {
  const file = mockFileDiffs.find((f) => f.filename === filename)
  if (file === undefined) {
    throw new Error(`file diff not found: ${filename}`)
  }
  return file
}

describe('mockRunSessions', () => {
  it('validates and covers every status exactly once', () => {
    const result = z.array(RunSessionSchema).safeParse(mockRunSessions)
    expect(result.success).toBe(true)
    expect(mockRunSessions.length).toBe(7)
    const statuses = [...mockRunSessions.map((r) => r.status)].sort()
    const expectedStatuses = [...RunStatusSchema.options].sort()
    expect(statuses).toEqual(expectedStatuses)
  })

  it('flags the hung running session as stale but not the publishing one', () => {
    const running = mockRunSessions.find((r) => r.status === 'running')
    if (running === undefined) {
      throw new Error('running session missing from mockRunSessions')
    }
    expect(isStaleRunning(running, new Date(MOCK_NOW))).toBe(true)

    const publishing = mockRunSessions.find((r) => r.status === 'publishing')
    if (publishing === undefined) {
      throw new Error('publishing session missing from mockRunSessions')
    }
    expect(isStaleRunning(publishing, new Date(MOCK_NOW))).toBe(false)
  })
})

describe('mockRunSessions run origin', () => {
  const runs = [...mockRunSessions, mockSummaryOnlyRun]

  it('marks only the queued session as a rerun, created two minutes before MOCK_NOW', () => {
    const queued = mockRunSessions.find((r) => r.status === 'queued')
    if (queued === undefined) {
      throw new Error('queued session missing from mockRunSessions')
    }
    expect(queued.trigger).toBe('rerun')
    expect(queued.createdAt).toBe('2026-09-18T11:58:00.000Z')
    expect(queued.startedAt).toBeNull()
    expect(queued.attempt).toBe(1)

    const others = runs.filter((r) => r.id !== queued.id)
    expect(others.map((r) => r.trigger)).toEqual(others.map(() => 'webhook'))
  })

  it.each([
    ['running', '2026-09-18T11:19:00.000Z'],
    ['publishing', '2026-09-18T11:55:00.000Z'],
    ['succeeded', '2026-09-18T11:49:00.000Z'],
    ['failed', '2026-09-18T10:29:00.000Z'],
    ['cancelled', '2026-09-18T08:59:00.000Z'],
    ['skipped', '2026-09-18T07:59:00.000Z'],
  ])('creates the %s session one minute before it started', (status, createdAt) => {
    const run = mockRunSessions.find((r) => r.status === status)
    expect(run?.createdAt).toBe(createdAt)
  })

  it('creates the summary-only run one minute before it started', () => {
    expect(mockSummaryOnlyRun.createdAt).toBe('2026-09-18T06:59:00.000Z')
  })

  it('never starts a run before it was created', () => {
    const inverted = runs.filter(
      (r) => r.startedAt !== null && Date.parse(r.createdAt) > Date.parse(r.startedAt),
    )
    expect(inverted).toEqual([])
  })
})

describe('mockFileDiffs', () => {
  it('validates and matches the sample patch fixtures', () => {
    const result = z.array(FileDiffSchema).safeParse(mockFileDiffs)
    expect(result.success).toBe(true)
    expect(mockFileDiffs.map((f) => f.filename)).toEqual(['src/a.ts', 'README.md'])
    expect(findFileDiff('src/a.ts').chunks.length).toBe(2)
  })
})

describe('mockReviewComments', () => {
  it('validates and has exactly two comments with a ruleName', () => {
    const result = z.array(ReviewCommentSchema).safeParse(mockReviewComments)
    expect(result.success).toBe(true)
    const withRule = mockReviewComments.filter((c) => c.ruleName !== null)
    expect(withRule.length).toBe(2)
  })

  it('maps to the expected change keys via commentKey', () => {
    const keys = mockReviewComments.map((c) => commentKey(c, findFileDiff(c.file)))
    expect(keys).toEqual(['I2', 'N4', 'I2'])
  })
})

describe('mockRunActions', () => {
  it('validates against the succeeded run and groups as expected', () => {
    const result = z.array(RunActionSchema).safeParse(mockRunActions)
    expect(result.success).toBe(true)
    expect(mockRunActions.length).toBe(34)

    mockRunActions.forEach((action, position) => {
      expect(action.index).toBe(position)
    })

    const succeeded = mockRunSessions.find((r) => r.status === 'succeeded')
    if (succeeded === undefined) {
      throw new Error('succeeded session missing from mockRunSessions')
    }
    expect(mockRunActions.every((action) => action.runId === succeeded.id)).toBe(true)
    expect(succeeded.actionCount).toBe(34)

    const nodes = groupActions(mockRunActions)
    expect(nodes.map((n) => n.kind)).toEqual([
      'action',
      'action',
      'group',
      'group',
      'action',
      'action',
    ])

    const withResponseRef = mockRunActions.filter((action) => action.responseRef !== null)
    expect(withResponseRef.length).toBe(2)
    expect(withResponseRef.every((action) => action.response === null)).toBe(true)
  })
})

describe('mockSummaryOnlyRun', () => {
  it('validates through RunSessionSchema and is marked summaryOnly', () => {
    const result = RunSessionSchema.safeParse(mockSummaryOnlyRun)
    expect(result.success).toBe(true)
    expect(mockSummaryOnlyRun.summaryOnly).toBe(true)
  })
})

describe('mockSummaryOnlyDiff', () => {
  it('validates through RawFileDiffSchema and maps to files with hasPatch: false', () => {
    const result = z.array(RawFileDiffSchema).safeParse(mockSummaryOnlyDiff)
    expect(result.success).toBe(true)
    mockSummaryOnlyDiff.forEach((raw) => {
      expect(fromPatch(raw).hasPatch).toBe(false)
    })
  })
})

describe('mockRepositories', () => {
  it('validates against z.array(RepositorySchema) and has valid RFC 9562 UUIDs', () => {
    const result = z.array(RepositorySchema).safeParse(mockRepositories)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(mockRepositories.length)
      result.data.forEach((repo) => {
        expect(repo.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        )
      })
    }
  })

  it('covers every severityThreshold across the repositories', () => {
    expect(mockRepositories.map((repo) => repo.severityThreshold)).toEqual([
      'all',
      'critical',
      'warning',
      'all',
    ])
  })

  it('gives the ui repository a branch filter and the others the empty one', () => {
    expect(mockRepositories.map((repo) => repo.branchFilter)).toEqual([
      ['main', 'release/*'],
      [],
      [],
      [],
    ])
  })

  it('stores auto-review on for a repository the GitHub App cannot reach', () => {
    const unreachable = mockRepositories.filter((repo) => !repo.installationAvailable)

    expect(unreachable.map((repo) => repo.fullName)).toEqual([
      'larchanka-training/dmc-268-infra-t6',
    ])
    expect(unreachable.every((repo) => repo.enabled)).toBe(true)
  })

  it('has a fourth repository for the missing rules file', () => {
    expect(mockRepositories).toHaveLength(4)
    expect(mockRepositories[3]?.id).toBe('22222222-2222-4222-8222-000000000004')
    expect(mockRepositories[3]?.fullName).toBe('larchanka-training/dmc-268-docs-t6')
    expect(new Set(mockRepositories.map((repo) => repo.id)).size).toBe(4)
    expect(new Set(mockRepositories.map((repo) => repo.fullName)).size).toBe(4)
  })
})

describe('mockCurrentUser', () => {
  it('validates against UserSchema', () => {
    const result = UserSchema.safeParse(mockCurrentUser)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.login).toBe('skvertl')
      expect(result.data.avatarUrl).toContain('https://')
    }
  })
})
