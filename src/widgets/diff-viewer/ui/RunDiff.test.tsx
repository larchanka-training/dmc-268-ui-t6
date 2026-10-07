// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { theme } from 'antd'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { diffApi, expandContext, fromPatch, toHunks } from '../../../entities/diff'
import { RunSessionSchema } from '../../../entities/run'
import { SAMPLE_PATCH_A, SAMPLE_PATCHES } from '../../../shared/fixtures/sample.patch'
import {
  countDiffSideLines,
  MAX_LINES_FOR_SYNC_HIGHLIGHT,
  MAX_SYNC_HIGHLIGHT_TOTAL_LINES,
} from '../lib/tokensForHunks'
import { useDiffViewerStore } from '../model/store'
import { RunDiff } from './RunDiff'

function addedLinesPatch(filename: string, lineCount: number) {
  const adds = Array.from(
    { length: lineCount },
    (_, index) => `+const line${String(index)} = ${String(index)}`,
  )
  const patch = [
    `diff --git a/${filename} b/${filename}`,
    'index 1111111..2222222 100644',
    `--- a/${filename}`,
    `+++ b/${filename}`,
    `@@ -1,1 +1,${String(lineCount + 1)} @@`,
    ' context',
    ...adds,
  ].join('\n')
  return { filename, patch: `${patch}\n` }
}

const PULL_REQUEST = {
  repo: 'larchanka-training/dmc-268-ui-t6',
  number: 40,
  title: 'feat: huge refactor',
  url: 'https://github.com/larchanka-training/dmc-268-ui-t6/pull/40',
  headSha: 'ffff9999ffff9999ffff9999ffff9999ffff9999',
}

const SUMMARY_ONLY_RUN_WIRE = {
  id: '33333333-3333-4333-8333-000000000001',
  engine: 'deep',
  model: 'claude-sonnet-5',
  status: 'succeeded',
  startedAt: '2026-09-18T07:00:00.000Z',
  finishedAt: '2026-09-18T07:20:00.000Z',
  attempt: 1,
  cancelRequested: false,
  summaryOnly: true,
  pullRequest: PULL_REQUEST,
  actionCount: 20,
  errorCode: null,
}

const SUMMARY_ONLY_DIFF_WIRE = [
  { filename: 'src/big-one.ts', patch: null },
  { filename: 'src/big-two.ts', patch: null },
]

beforeEach(() => {
  useDiffViewerStore.setState({ viewType: 'unified', selectedFile: null })
})

afterEach(() => {
  cleanup()
})

describe('RunDiff', () => {
  it('AC2: summary-only run shows the message and file list, no hunks', () => {
    const run = RunSessionSchema.parse(SUMMARY_ONLY_RUN_WIRE)
    const files = diffApi.diff.response.parse(SUMMARY_ONLY_DIFF_WIRE).map(fromPatch)

    const { container } = render(
      <RunDiff findings={[]} files={files} summaryOnly={run.summaryOnly} />,
    )

    expect(screen.getByText('Дифф слишком большой')).toBeTruthy()
    expect(
      screen.getByText('Больше 3 000 строк — показан только список файлов, построчного ревью нет.'),
    ).toBeTruthy()
    expect(screen.getByText('src/big-one.ts')).toBeTruthy()
    expect(screen.getByText('src/big-two.ts')).toBeTruthy()
    expect(screen.queryByText('Без диффа')).toBeNull()
    expect(container.querySelectorAll('.diff-line')).toHaveLength(0)
  })

  it('renders filenames and full diff content for a normal (non-summary) run', () => {
    const run = RunSessionSchema.parse({
      ...SUMMARY_ONLY_RUN_WIRE,
      id: '33333333-3333-4333-8333-000000000002',
      summaryOnly: false,
    })
    const files = diffApi.diff.response.parse(SAMPLE_PATCHES).map(fromPatch)

    const { container } = render(
      <RunDiff findings={[]} files={files} summaryOnly={run.summaryOnly} />,
    )

    expect(screen.getAllByText('src/a.ts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('README.md').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.diff-line').length).toBeGreaterThan(0)
    expect(screen.queryByText('Дифф слишком большой')).toBeNull()
  })

  it('enables syntax highlighting while total diff lines stay within the sync budget', () => {
    const lineCount = 400
    const files = diffApi.diff.response
      .parse([addedLinesPatch('src/a.ts', lineCount), addedLinesPatch('src/b.ts', lineCount)])
      .map(fromPatch)

    const { container } = render(<RunDiff findings={[]} files={files} summaryOnly={false} />)

    expect(container.querySelector('span.token')).toBeTruthy()
  })

  it('disables syntax highlighting when total diff lines exceed the sync budget', () => {
    const lineCount = 400
    const files = diffApi.diff.response
      .parse([
        addedLinesPatch('src/a.ts', lineCount),
        addedLinesPatch('src/b.ts', lineCount),
        addedLinesPatch('src/c.ts', lineCount),
      ])
      .map(fromPatch)

    const { container } = render(<RunDiff findings={[]} files={files} summaryOnly={false} />)

    expect(container.querySelector('span.token')).toBeNull()
  })

  it('keeps highlighting on when only a file without a grammar pushes the raw sum over the budget', () => {
    const [grammarFile, plainFile] = diffApi.diff.response
      .parse([addedLinesPatch('src/a.ts', 400), addedLinesPatch('docs/big.txt', 700)])
      .map(fromPatch)
    if (grammarFile === undefined || plainFile === undefined) {
      throw new Error('expected two files')
    }
    const grammarLines = countDiffSideLines(toHunks(grammarFile))
    expect(grammarLines).toBeLessThanOrEqual(MAX_SYNC_HIGHLIGHT_TOTAL_LINES)
    expect(grammarLines + countDiffSideLines(toHunks(plainFile))).toBeGreaterThan(
      MAX_SYNC_HIGHLIGHT_TOTAL_LINES,
    )

    const { container } = render(
      <RunDiff findings={[]} files={[grammarFile, plainFile]} summaryOnly={false} />,
    )

    expect(container.querySelector('span.token')).toBeTruthy()
  })

  it('does not turn highlighting off when expanded context pushes the sum over the budget', () => {
    const [fileA, fileB] = diffApi.diff.response
      .parse([addedLinesPatch('src/a.ts', 400), addedLinesPatch('src/b.ts', 400)])
      .map(fromPatch)
    if (fileA === undefined || fileB === undefined) {
      throw new Error('expected two files')
    }
    const expandedA = expandContext(fileA, {
      path: 'src/a.ts',
      startLine: 402,
      lines: Array.from({ length: 150 }, (_, index) => `const ctx${String(index)} = 1`),
      totalLines: 551,
      nextOffset: null,
    })
    const expandedSum = countDiffSideLines(toHunks(expandedA)) + countDiffSideLines(toHunks(fileB))
    // the per-file cap stays out of play, so only the total budget can switch tokens off here
    expect(countDiffSideLines(toHunks(expandedA))).toBeLessThanOrEqual(MAX_LINES_FOR_SYNC_HIGHLIGHT)
    expect(expandedSum).toBeGreaterThan(MAX_SYNC_HIGHLIGHT_TOTAL_LINES)
    expect(
      countDiffSideLines(toHunks(fileA)) + countDiffSideLines(toHunks(fileB)),
    ).toBeLessThanOrEqual(MAX_SYNC_HIGHLIGHT_TOTAL_LINES)

    const { container } = render(
      <RunDiff
        budgetFiles={[fileA, fileB]}
        files={[expandedA, fileB]}
        findings={[]}
        summaryOnly={false}
      />,
    )

    const viewers = container.querySelectorAll('.diff-theme')
    expect(viewers).toHaveLength(2)
    for (const viewer of viewers) {
      expect(viewer.querySelector('span.token')).not.toBeNull()
    }
  })

  it('shows findings outside diff for a file with patch null', () => {
    const run = RunSessionSchema.parse({
      ...SUMMARY_ONLY_RUN_WIRE,
      id: '33333333-3333-4333-8333-000000000004',
      summaryOnly: false,
    })
    const files = diffApi.diff.response
      .parse([{ filename: 'docs/huge.md', patch: null }])
      .map(fromPatch)

    render(
      <RunDiff
        findings={[
          {
            id: '33333333-3333-4333-8333-000000000010',
            file: 'docs/huge.md',
            oldLine: null,
            newLine: 1,
            endLine: null,
            side: 'RIGHT',
            severity: 'info',
            category: 'readability',
            title: 'Finding on patchless file',
            body: 'No inline anchor',
            suggestion: null,
            confidence: 0.5,
            ruleName: null,
          },
        ]}
        files={files}
        summaryOnly={run.summaryOnly}
      />,
    )

    expect(screen.getByTestId('findings-outside-diff')).toBeTruthy()
    expect(screen.getByText('Finding on patchless file')).toBeTruthy()
  })

  it('themes and highlights a suggestion rendered outside any DiffViewer (summary-only run)', () => {
    const files = diffApi.diff.response.parse(SUMMARY_ONLY_DIFF_WIRE).map(fromPatch)

    render(
      <RunDiff
        findings={[
          {
            id: '33333333-3333-4333-8333-000000000012',
            file: 'src/big-one.ts',
            oldLine: null,
            newLine: 3,
            endLine: null,
            side: 'RIGHT',
            severity: 'medium',
            category: 'correctness',
            title: 'Suggestion on a summary-only run',
            body: 'No inline anchor',
            suggestion: 'const limit = "10" // text',
            confidence: 0.5,
            ruleName: null,
          },
        ]}
        files={files}
        summaryOnly
      />,
    )
    fireEvent.click(screen.getByText('Suggestion on a summary-only run'))

    const outside = screen.getByTestId('findings-outside-diff')
    const suggestion = outside.querySelector<HTMLElement>('[data-testid="diff-suggestion"]')
    expect(suggestion).not.toBeNull()
    expect(suggestion?.classList.contains('diff-theme')).toBe(true)
    expect(suggestion?.style.getPropertyValue('--diff-code-insert-background-color')).toBe(
      theme.getDesignToken({ algorithm: theme.defaultAlgorithm }).colorSuccessBg,
    )
    expect(suggestion?.querySelector('.diff-code-insert span.token.keyword')).not.toBeNull()
  })

  it('shows findings outside diff when the file is missing from the diff list', () => {
    const run = RunSessionSchema.parse({
      ...SUMMARY_ONLY_RUN_WIRE,
      id: '33333333-3333-4333-8333-000000000005',
      summaryOnly: false,
    })
    const files = diffApi.diff.response.parse(SAMPLE_PATCHES).map(fromPatch)

    render(
      <RunDiff
        findings={[
          {
            id: '33333333-3333-4333-8333-000000000011',
            file: 'src/not-in-diff.ts',
            oldLine: null,
            newLine: 10,
            endLine: null,
            side: 'RIGHT',
            severity: 'low',
            category: 'correctness',
            title: 'Missing file finding',
            body: 'File not in /diff payload',
            suggestion: null,
            confidence: 0.4,
            ruleName: null,
          },
        ]}
        files={files}
        summaryOnly={run.summaryOnly}
      />,
    )

    expect(screen.getByTestId('findings-outside-diff')).toBeTruthy()
    expect(screen.getByText('Missing file finding')).toBeTruthy()
  })

  it('renders a per-file "no diff" placeholder alongside full diffs in the same normal run', () => {
    const run = RunSessionSchema.parse({
      ...SUMMARY_ONLY_RUN_WIRE,
      id: '33333333-3333-4333-8333-000000000003',
      summaryOnly: false,
    })
    const files = diffApi.diff.response
      .parse([SAMPLE_PATCH_A, { filename: 'docs/huge.md', patch: null }])
      .map(fromPatch)

    const { container } = render(
      <RunDiff findings={[]} files={files} summaryOnly={run.summaryOnly} />,
    )

    expect(screen.getByText('docs/huge.md')).toBeTruthy()
    expect(screen.getByText('Без диффа')).toBeTruthy()
    expect(screen.getAllByText('src/a.ts').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.diff-line').length).toBeGreaterThan(0)
    expect(screen.queryByText('Дифф слишком большой')).toBeNull()
  })
})
