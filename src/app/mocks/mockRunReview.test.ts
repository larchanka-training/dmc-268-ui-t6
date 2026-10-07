import { refractor } from 'refractor'
import { describe, expect, it } from 'vitest'

import {
  commentKey,
  extractNewSideLines,
  fromPatch,
  languageFromFilename,
  toHunks,
} from '../../entities/diff'
import type { FileDiff, RawFileDiff } from '../../entities/diff'
import { RunDetailSchema } from '../../entities/run'
import { SAMPLE_PATCHES } from '../../shared/fixtures/sample.patch'

import {
  REVIEW_ATTENTION_RUN_ID,
  REVIEW_CLEAN_RUN_ID,
  REVIEW_DEMO_RUN_ID,
  REVIEW_SUMMARY_ONLY_RUN_ID,
  buildMockRunDetail,
  mockRawDiffForRun,
  mockReviewFindings,
  mockVerdictVariantRuns,
} from './mockRunReview'
import { mockRunsListPage } from './mockRunsList.fixture'

describe('mockRunReview verdict variants', () => {
  it('builds attention and clean run details for mock list runs', () => {
    const attention = mockVerdictVariantRuns.find((run) => run.id === REVIEW_ATTENTION_RUN_ID)
    const clean = mockVerdictVariantRuns.find((run) => run.id === REVIEW_CLEAN_RUN_ID)
    if (!attention || !clean) {
      throw new Error('verdict demo runs missing')
    }

    const attentionDetail = buildMockRunDetail(attention)
    const cleanDetail = buildMockRunDetail(clean)

    expect(RunDetailSchema.safeParse(attentionDetail).success).toBe(true)
    expect(attentionDetail.verdict).toBe('attention')
    expect(RunDetailSchema.safeParse(cleanDetail).success).toBe(true)
    expect(cleanDetail.verdict).toBe('clean')
  })
})

describe('buildMockRunDetail', () => {
  const runs = new Map(
    [...mockRunsListPage.items, ...mockVerdictVariantRuns].map((run) => [run.id, run]),
  )

  it.each([...runs])('builds a contract-valid run detail for %s', (_id, run) => {
    expect(RunDetailSchema.safeParse(buildMockRunDetail(run)).success).toBe(true)
  })
})

const DEFAULT_DIFF: RawFileDiff[] = SAMPLE_PATCHES.map(({ filename, patch }) => ({
  filename,
  patch,
}))
const SUMMARY_DIFF: RawFileDiff[] = [{ filename: 'big.ts', patch: null }]

function demoDiff(): RawFileDiff[] {
  return mockRawDiffForRun(REVIEW_DEMO_RUN_ID, DEFAULT_DIFF, SUMMARY_DIFF)
}

function classesIn(node: unknown, found: Set<string>): void {
  if (typeof node !== 'object' || node === null) {
    return
  }
  if ('properties' in node && typeof node.properties === 'object' && node.properties !== null) {
    const className = (node.properties as { className?: unknown }).className
    if (Array.isArray(className)) {
      for (const name of className) {
        found.add(String(name))
      }
    }
  }
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      classesIn(child, found)
    }
  }
}

/** Old plus new side lines of a diff, as the sync highlight budget counts them. */
function sideLines(file: FileDiff): number {
  return toHunks(file).reduce((sum, hunk) => sum + hunk.oldLines + hunk.newLines, 0)
}

/** Token classes the real refractor emits for one file of the demo diff (each side as one source). */
function tokenClassesOf(filename: string): Set<string> {
  const file = demoDiff()
    .map(fromPatch)
    .find((candidate) => candidate.filename === filename)
  const language = languageFromFilename(filename)
  if (file === undefined || language === null) {
    throw new Error(`demo diff has no highlightable ${filename}`)
  }
  const lines = file.chunks.flatMap((chunk) => chunk.lines)
  const found = new Set<string>()
  const sides = [
    lines.filter((line) => line.type !== 'added'),
    lines.filter((line) => line.type !== 'removed'),
  ]
  for (const side of sides) {
    const source = side.map((line) => line.content).join('\n')
    classesIn(refractor.highlight(source, language), found)
  }
  return found
}

/** Demo-only files: real-code patches that are not part of the default diff. */
function highlightFilenames(): string[] {
  const defaults = new Set(DEFAULT_DIFF.map((raw) => raw.filename))
  return demoDiff()
    .filter((raw) => raw.patch !== null && !defaults.has(raw.filename))
    .map((raw) => raw.filename)
}

function highlightFilename(extension: string): string {
  const filename = highlightFilenames().find((name) => name.endsWith(extension))
  if (filename === undefined) {
    throw new Error(`demo diff has no ${extension} file`)
  }
  return filename
}

describe('mockRawDiffForRun demo highlight fixtures', () => {
  it('keeps the default diff for non-demo runs', () => {
    expect(mockRawDiffForRun(REVIEW_ATTENTION_RUN_ID, DEFAULT_DIFF, SUMMARY_DIFF)).toBe(
      DEFAULT_DIFF,
    )
    expect(mockRawDiffForRun(REVIEW_SUMMARY_ONLY_RUN_ID, DEFAULT_DIFF, SUMMARY_DIFF)).toBe(
      SUMMARY_DIFF,
    )
  })

  it('keeps the sample patches first and package.json last in the demo diff', () => {
    const diff = demoDiff()
    expect(diff.slice(0, DEFAULT_DIFF.length)).toEqual(DEFAULT_DIFF)
    expect(diff[diff.length - 1]).toEqual({ filename: 'package.json', patch: null })
  })

  it('adds exactly a .ts and a .py file with real patches to the demo diff', () => {
    expect(highlightFilenames()).toHaveLength(2)
    for (const extension of ['.ts', '.py']) {
      const filename = highlightFilename(extension)
      const raw = demoDiff().find((candidate) => candidate.filename === filename)
      expect(raw && fromPatch(raw).chunks.length).toBeGreaterThan(0)
    }
  })

  it.each(['.ts', '.py'])(
    'tokenizes the demo %s file to keyword, string and comment with the real refractor',
    (extension) => {
      const classes = tokenClassesOf(highlightFilename(extension))
      expect(classes).toContain('keyword')
      expect(classes).toContain('string')
      expect(classes).toContain('comment')
    },
  )

  it('stays well inside the sync highlight budget', () => {
    const total = demoDiff()
      .map(fromPatch)
      .reduce((sum, file) => sum + sideLines(file), 0)
    // The widget's sync highlight budget is 1000 lines (Refs #65); stay under a quarter of it.
    expect(total).toBeLessThan(250)
  })
})

describe('demo run suggestion finding', () => {
  const finding = mockReviewFindings.find(
    (candidate) =>
      candidate.suggestion?.includes('\n') === true &&
      highlightFilenames().includes(candidate.file),
  )

  it('adds a multi-line suggestion finding on one of the highlight files', () => {
    expect(finding).toBeDefined()
  })

  it('anchors the suggestion on an existing new-side range of the diff', () => {
    if (finding?.newLine == null) {
      throw new Error('suggestion finding with a new-side line missing')
    }
    const raw = demoDiff().find((candidate) => candidate.filename === finding.file)
    if (raw === undefined) {
      throw new Error('finding file missing from the demo diff')
    }
    const file = fromPatch(raw)
    const target = { oldLine: finding.oldLine, newLine: finding.newLine, endLine: finding.endLine }
    expect(commentKey(target, file)).not.toBeNull()
    expect(extractNewSideLines(file, finding.newLine, finding.endLine).length).toBeGreaterThan(1)
  })

  it('writes suggestion code that highlights as keyword and string', () => {
    if (finding?.suggestion == null) {
      throw new Error('suggestion finding missing')
    }
    const language = languageFromFilename(finding.file)
    if (language === null) {
      throw new Error(`no language for ${finding.file}`)
    }
    const found = new Set<string>()
    classesIn(refractor.highlight(finding.suggestion, language), found)
    expect(found).toContain('keyword')
    expect(found).toContain('string')
  })
})

describe('demo run severityCounts', () => {
  const EXPECTED = { critical: 1, high: 2, medium: 3, low: 1, info: 1 }

  it('pins the demo severity distribution and keeps it consistent with the findings', () => {
    const session = mockRunsListPage.items.find((run) => run.id === REVIEW_DEMO_RUN_ID)
    if (!session) {
      throw new Error('demo run missing from mock list')
    }
    const detail = buildMockRunDetail(session)
    const tally = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    for (const item of detail.findings) {
      tally[item.severity] += 1
    }
    expect(detail.severityCounts).toEqual(EXPECTED)
    expect(tally).toEqual(EXPECTED)
    expect(RunDetailSchema.safeParse(detail).success).toBe(true)
  })
})
