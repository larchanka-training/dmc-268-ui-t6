// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { theme } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { diffApi, expandContext, fromPatch, toHunks, type FileDiff } from '../../../entities/diff'
import type { FindingView, ReviewComment } from '../../../entities/review'
import { RunSessionSchema } from '../../../entities/run'
import { EMPTY_FINDING_FILTERS } from '../../../features/finding-filters'
import { SAMPLE_PATCH_A, SAMPLE_PATCHES } from '../../../shared/fixtures/sample.patch'
import filePathStyles from '../../../shared/ui/FilePath/FilePath.module.css'
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
  provider: 'github',
  repo: 'larchanka-training/dmc-268-ui-t6',
  number: 40,
  title: 'feat: huge refactor',
  url: 'https://github.com/larchanka-training/dmc-268-ui-t6/pull/40',
  headSha: 'ffff9999ffff9999ffff9999ffff9999ffff9999',
}

const SUMMARY_ONLY_RUN_WIRE = {
  provider: 'github',
  id: '33333333-3333-4333-8333-000000000001',
  engine: 'deep',
  model: 'claude-sonnet-5',
  status: 'succeeded',
  startedAt: '2026-09-18T07:00:00.000Z',
  finishedAt: '2026-09-18T07:20:00.000Z',
  attempt: 1,
  cancelRequested: false,
  trigger: 'webhook',
  createdAt: '2026-09-18T11:00:00.000Z',
  summaryOnly: true,
  pullRequest: PULL_REQUEST,
  actionCount: 20,
  errorCode: null,
  triggeredBy: null,
  usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 },
}

const SUMMARY_ONLY_DIFF_WIRE = [
  { filename: 'src/big-one.ts', patch: null },
  { filename: 'src/big-two.ts', patch: null },
]

const OUTSIDE_COMMENT: ReviewComment = {
  id: '55555555-5555-4555-8555-000000000001',
  file: 'src/comment-only.ts',
  oldLine: null,
  newLine: 10,
  endLine: null,
  body: 'Comment body outside the available patch',
  ruleName: 'outside-comment',
  severity: 'medium',
  category: 'correctness',
  title: 'Comment outside the available patch',
  createdAt: '2026-09-18T00:00:00.000Z',
}

beforeEach(() => {
  useDiffViewerStore.setState({ viewType: 'unified' })
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

  it('sets the summary-only file names as FilePath, in the monospace font (DS §8, #239 D9)', () => {
    const files = diffApi.diff.response.parse(SUMMARY_ONLY_DIFF_WIRE).map(fromPatch)
    expect(filePathStyles.path).toBeTruthy()

    render(<RunDiff findings={[]} files={files} summaryOnly />)

    for (const name of ['src/big-one.ts', 'src/big-two.ts']) {
      expect(screen.getByText(name).classList.contains(filePathStyles.path ?? ''), name).toBe(true)
    }
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

  it.each<{ label: string; files: FileDiff[] }>([
    {
      label: 'the file is absent from /diff',
      files: diffApi.diff.response.parse(SAMPLE_PATCHES).map(fromPatch),
    },
    {
      label: 'the file has no patch',
      files: [{ filename: 'src/comment-only.ts', hasPatch: false, chunks: [] }],
    },
    {
      label: 'the file has a patch but no chunks',
      files: [{ filename: 'src/comment-only.ts', hasPatch: true, chunks: [] }],
    },
  ])('renders a comment exactly once in the run-level outside block when $label', ({ files }) => {
    render(<RunDiff comments={[OUTSIDE_COMMENT]} files={files} findings={[]} summaryOnly={false} />)

    const outside = screen.getByTestId('findings-outside-diff')
    expect(outside.closest('.diff-theme')).toBeNull()
    expect(within(outside).getByText('Comment outside the available patch')).toBeTruthy()
    expect(screen.getAllByTestId('inline-comment')).toHaveLength(1)
    fireEvent.click(within(outside).getByText('Comment outside the available patch'))
    expect(within(outside).getByText('Comment body outside the available patch')).toBeTruthy()
    expect(within(outside).getByText('правило: outside-comment')).toBeTruthy()
    expect(within(outside).getByText('src/comment-only.ts')).toBeTruthy()
  })

  describe('file path in the cards of the run-level outside block', () => {
    function pathFinding(id: string, file: string, overrides?: Partial<FindingView>): FindingView {
      return {
        id: `66666666-6666-4666-8666-${id}`,
        file,
        oldLine: null,
        newLine: 99,
        endLine: null,
        side: 'RIGHT',
        severity: 'high',
        category: 'security',
        title: `Finding in ${file}`,
        body: `Body of ${file}`,
        suggestion: null,
        confidence: 0.5,
        ruleName: null,
        ...overrides,
      }
    }

    function card(root: HTMLElement, title: string): HTMLElement {
      const found = within(root).getByText(title).closest<HTMLElement>('.inline-comment')
      if (found === null) {
        throw new Error(`no card with the title "${title}"`)
      }
      return found
    }

    function runLevelBlock(container: HTMLElement): HTMLElement {
      const block = container.querySelector<HTMLElement>(
        '.run-diff > [data-testid="findings-outside-diff"]',
      )
      if (block === null) {
        throw new Error('no run-level outside block')
      }
      return block
    }

    it('every card shows its own file: absent from /diff, no patch, empty chunks', () => {
      const paths = ['src/absent.ts', 'src/no-patch.ts', 'src/no-chunks.ts']
      const { container } = render(
        <RunDiff
          files={[
            { filename: 'src/no-patch.ts', hasPatch: false, chunks: [] },
            { filename: 'src/no-chunks.ts', hasPatch: true, chunks: [] },
          ]}
          findings={paths.map((path, index) => pathFinding(String(index).padStart(12, '0'), path))}
          summaryOnly={false}
        />,
      )

      const block = runLevelBlock(container)
      expect(within(block).getAllByTestId('inline-comment')).toHaveLength(paths.length)
      for (const path of paths) {
        const shown = card(block, `Finding in ${path}`)
        expect(within(within(shown).getByRole('button')).getByText(path)).toBeTruthy()
        for (const other of paths.filter((candidate) => candidate !== path)) {
          expect(within(shown).queryByText(other)).toBeNull()
        }
      }
    })

    it('shows the file in the summary-only branch too', () => {
      const { container } = render(
        <RunDiff
          files={[{ filename: 'src/big.ts', hasPatch: false, chunks: [] }]}
          findings={[pathFinding('000000000001', 'src/big.ts')]}
          summaryOnly
        />,
      )

      const shown = card(runLevelBlock(container), 'Finding in src/big.ts')
      expect(within(within(shown).getByRole('button')).getByText('src/big.ts')).toBeTruthy()
    })

    it('keeps the file visible in a card the active search expanded', () => {
      const { container } = render(
        <RunDiff
          files={[]}
          filters={{ ...EMPTY_FINDING_FILTERS, query: 'needle' }}
          findings={[
            pathFinding('000000000001', 'src/absent.ts', { body: 'A needle in the body' }),
          ]}
          onFiltersChange={vi.fn()}
          summaryOnly={false}
        />,
      )

      const shown = card(runLevelBlock(container), 'Finding in src/absent.ts')
      const button = within(shown).getByRole('button')
      expect(button.getAttribute('aria-expanded')).toBe('true')
      expect(within(shown).getByText('A needle in the body')).toBeTruthy()
      expect(within(button).getByText('src/absent.ts')).toBeTruthy()
    })

    it('adds no path to an inline card or to the outside block of one file', () => {
      const files = diffApi.diff.response.parse([SAMPLE_PATCH_A]).map(fromPatch)
      const { container } = render(
        <RunDiff
          files={files}
          findings={[
            pathFinding('000000000001', 'src/a.ts', { newLine: 2, title: 'Inline one' }),
            pathFinding('000000000002', 'src/a.ts', { newLine: 99, title: 'Outside lines one' }),
            pathFinding('000000000003', 'src/absent.ts'),
          ]}
          summaryOnly={false}
        />,
      )

      const fileFrame = container.querySelector<HTMLElement>('.diff-theme')
      if (fileFrame === null) {
        throw new Error('no diff of src/a.ts')
      }
      const fileBlock = within(fileFrame).getByTestId('findings-outside-diff')
      const outsideLines = card(fileBlock, 'Outside lines one')
      const inline = card(fileFrame, 'Inline one')
      expect(fileBlock.contains(inline)).toBe(false)
      for (const shown of [inline, outsideLines]) {
        expect(within(shown).queryByText('src/a.ts')).toBeNull()
      }
      const runLevel = card(runLevelBlock(container), 'Finding in src/absent.ts')
      expect(within(runLevel).getByText('src/absent.ts')).toBeTruthy()
    })
  })

  it('keeps the outside finding for a repeated id and a distinct comment at the same anchor', () => {
    const finding: FindingView = {
      id: OUTSIDE_COMMENT.id,
      file: 'src/comment-only.ts',
      oldLine: null,
      newLine: 10,
      endLine: null,
      side: 'RIGHT',
      severity: 'high',
      category: 'security',
      title: 'Original outside finding',
      body: 'Original finding content wins',
      suggestion: null,
      confidence: 0.5,
      ruleName: 'original-rule',
    }
    render(
      <RunDiff
        comments={[
          { ...OUTSIDE_COMMENT, title: 'Duplicate outside comment' },
          { ...OUTSIDE_COMMENT, id: '55555555-5555-4555-8555-000000000002' },
        ]}
        files={[]}
        findings={[finding]}
        onFiltersChange={vi.fn()}
        summaryOnly={false}
      />,
    )

    const outside = screen.getByTestId('findings-outside-diff')
    expect(within(outside).getAllByTestId('inline-comment')).toHaveLength(2)
    expect(screen.getAllByTestId('inline-comment')).toHaveLength(2)
    expect(screen.getByText('Показано 2 из 2 замечаний')).toBeTruthy()
    expect(screen.queryByText('Duplicate outside comment')).toBeNull()
    expect(within(outside).getByText('Comment outside the available patch')).toBeTruthy()
    fireEvent.click(within(outside).getByText('Original outside finding'))
    expect(within(outside).getByText('Original finding content wins')).toBeTruthy()
    expect(within(outside).getByText('правило: original-rule')).toBeTruthy()
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
