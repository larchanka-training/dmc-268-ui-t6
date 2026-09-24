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
import { ReviewCommentSchema } from '../../entities/review'

import {
  MOCK_NOW,
  mockFileDiffs,
  mockReviewComments,
  mockRunActions,
  mockRunSessions,
  mockSummaryOnlyDiff,
  mockSummaryOnlyRun,
  mockUiState,
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
    expect(keys).toEqual(['I2', 'N3', 'I2'])
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

describe('mockUiState', () => {
  it('selects a file that exists in mockFileDiffs', () => {
    const filenames = mockFileDiffs.map((f) => f.filename)
    expect(filenames).toContain(mockUiState.diffViewer.selectedFile)
  })
})
