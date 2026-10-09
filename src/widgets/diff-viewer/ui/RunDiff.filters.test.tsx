// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps, JSX } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { diffApi, fromPatch } from '../../../entities/diff'
import type { FindingView, ReviewComment } from '../../../entities/review'
import { EMPTY_FINDING_FILTERS, type FindingFilters } from '../../../features/finding-filters'
import { SAMPLE_PATCH_A, SAMPLE_PATCH_B } from '../../../shared/fixtures/sample.patch'
import { useDiffViewerStore } from '../model/store'
import { RunDiff } from './RunDiff'

type RunDiffProps = ComponentProps<typeof RunDiff>

const FILES = diffApi.diff.response
  .parse([SAMPLE_PATCH_A, SAMPLE_PATCH_B, { filename: 'docs/huge.md', patch: null }])
  .map(fromPatch)

function makeFinding(id: string, overrides: Partial<FindingView>): FindingView {
  return {
    id: `44444444-4444-4444-8444-${id}`,
    file: 'src/a.ts',
    oldLine: null,
    newLine: 2,
    endLine: null,
    side: 'RIGHT',
    severity: 'medium',
    category: 'readability',
    title: 'Title',
    body: 'Body',
    suggestion: null,
    confidence: 0.5,
    ruleName: null,
    ...overrides,
  }
}

// src/a.ts new side: 2-3 and 12 are added lines, so those findings sit inline.
// Line 99 is not in the diff: a per-file "outside" finding.
const fA1 = makeFinding('000000000001', {
  newLine: 2,
  severity: 'critical',
  title: 'SQL injection',
  body: 'Query built from user input',
  ruleName: 'sql-injection',
})
const fA2 = makeFinding('000000000002', {
  newLine: 3,
  severity: 'medium',
  title: 'Console statement',
  body: 'Remove debug output',
  ruleName: 'no-console',
})
const fA3 = makeFinding('000000000003', {
  newLine: 99,
  severity: 'low',
  title: 'Stale reference',
  body: 'Line moved away',
})
// Same line as fA1: the two cards share one widget row.
const fA4 = makeFinding('000000000004', {
  newLine: 2,
  severity: 'info',
  title: 'Magic string',
  body: 'Extract the literal into a constant',
})
const fR1 = makeFinding('000000000005', {
  file: 'README.md',
  newLine: 2,
  severity: 'info',
  title: 'Typo in docs',
  body: 'Fix the spelling of separate',
})
// docs/huge.md is in /diff without a patch: a run-level "outside" finding.
const fH1 = makeFinding('000000000006', {
  file: 'docs/huge.md',
  newLine: 1,
  severity: 'high',
  title: 'Huge file hint',
  body: 'Split this file into modules',
})
// src/not-in-diff.ts is not in /diff at all: a run-level "outside" finding.
const fX1 = makeFinding('000000000007', {
  file: 'src/not-in-diff.ts',
  newLine: 10,
  severity: 'medium',
  title: 'Missing file finding',
  body: 'Not in the diff payload',
})
const FINDINGS = [fA1, fA2, fA3, fA4, fR1, fH1, fX1]

function makeComment(id: string, overrides: Partial<ReviewComment>): ReviewComment {
  return {
    id: `55555555-5555-4555-8555-${id}`,
    file: 'src/a.ts',
    oldLine: null,
    newLine: 12,
    endLine: null,
    body: 'Avoid magic numbers',
    ruleName: 'no-magic-numbers',
    severity: 'medium',
    category: 'readability',
    title: 'Magic number',
    createdAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  }
}

const COMMENTS: ReviewComment[] = [
  // counts: a comment on a file with a diff
  makeComment('000000000001', {}),
  // does not count twice: same id as the finding fA2
  makeComment('000000000099', { id: fA2.id, newLine: 3, title: 'Duplicate of console' }),
  // do not count and are not rendered: the file is absent from /diff / has no patch
  makeComment('000000000003', { file: 'src/not-in-diff.ts', title: 'Comment on missing file' }),
  makeComment('000000000004', { file: 'docs/huge.md', newLine: 1, title: 'Comment on patchless' }),
]

// Displayed set M = 8: fA1 fA2 fA3 fA4 fR1 fH1 fX1 + the Magic number comment.
const TOTAL = 8

function filtersOf(overrides: Partial<FindingFilters>): FindingFilters {
  return { ...EMPTY_FINDING_FILTERS, ...overrides }
}

function runDiff(overrides: Partial<RunDiffProps> = {}): JSX.Element {
  return (
    <RunDiff
      comments={COMMENTS}
      files={FILES}
      findings={FINDINGS}
      onFiltersChange={vi.fn()}
      onFiltersReset={vi.fn()}
      summaryOnly={false}
      {...overrides}
    />
  )
}

function cardTitles(): string[] {
  return screen
    .queryAllByTestId('inline-comment')
    .map((card) => card.querySelector('.inline-comment-header strong')?.textContent ?? '')
    .sort()
}

function expectCards(titles: string[]): void {
  expect(cardTitles()).toEqual([...titles].sort())
}

function counter(shown: number, total: number): string {
  return `Показано ${String(shown)} из ${String(total)} замечаний`
}

/** A file name rendered by the diff area (header, placeholder, list entry), not by the filter bar. */
function fileNameShown(name: string): boolean {
  return screen
    .queryAllByText(name)
    .some((element) => element.closest('[data-testid="finding-filters-bar"]') === null)
}

function outsideBlocks(): { perFile: HTMLElement[]; runLevel: HTMLElement[] } {
  const blocks = screen.queryAllByTestId('findings-outside-diff')
  return {
    perFile: blocks.filter((block) => block.closest('.diff-theme') !== null),
    runLevel: blocks.filter((block) => block.closest('.diff-theme') === null),
  }
}

function only(elements: HTMLElement[]): HTMLElement {
  const [first] = elements
  if (elements.length !== 1 || first === undefined) {
    throw new Error(`expected exactly one element, got ${String(elements.length)}`)
  }
  return first
}

function diffCount(container: HTMLElement): number {
  return container.querySelectorAll('.diff-theme').length
}

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

beforeEach(() => {
  useDiffViewerStore.setState({ viewType: 'unified', selectedFile: null })
})

afterEach(() => {
  cleanup()
})

describe('RunDiff filters: wiring', () => {
  it('renders no bar and every card without onFiltersChange, even when filters are given', () => {
    render(
      <RunDiff
        comments={COMMENTS}
        files={FILES}
        filters={filtersOf({ severities: ['info'] })}
        findings={FINDINGS}
        summaryOnly={false}
      />,
    )

    expect(screen.queryByTestId('finding-filters-bar')).toBeNull()
    expectCards([
      'SQL injection',
      'Console statement',
      'Stale reference',
      'Magic string',
      'Typo in docs',
      'Huge file hint',
      'Missing file finding',
      'Magic number',
    ])
  })

  it('renders the bar above the diffs when onFiltersChange is given', () => {
    const { container } = render(runDiff())

    const bar = screen.getByTestId('finding-filters-bar')
    expect(bar).toBeTruthy()
    expect(container.firstElementChild?.firstElementChild).toBe(bar)
  })

  it('treats missing filters as empty: all cards, N of M', () => {
    render(runDiff())

    expect(screen.getByText(counter(TOTAL, TOTAL))).toBeTruthy()
    expect(cardTitles()).toHaveLength(TOTAL)
  })

  it('counts a comment that repeats a finding id once and skips comments that are not rendered', () => {
    render(runDiff({ filters: EMPTY_FINDING_FILTERS }))

    expectCards([
      'SQL injection',
      'Console statement',
      'Stale reference',
      'Magic string',
      'Typo in docs',
      'Huge file hint',
      'Missing file finding',
      'Magic number',
    ])
    expect(screen.queryByText('Duplicate of console')).toBeNull()
    expect(screen.queryByText('Comment on missing file')).toBeNull()
    expect(screen.queryByText('Comment on patchless')).toBeNull()
    expect(screen.getByText(counter(TOTAL, TOTAL))).toBeTruthy()
  })

  it('without an active filter shows every file, and both kinds of outside block', () => {
    const { container } = render(runDiff({ filters: EMPTY_FINDING_FILTERS }))

    expect(diffCount(container)).toBe(2)
    expect(fileNameShown('src/a.ts')).toBe(true)
    expect(fileNameShown('README.md')).toBe(true)
    expect(fileNameShown('docs/huge.md')).toBe(true)
    expect(screen.queryByText('Нет замечаний, подходящих под фильтры')).toBeNull()
    const { perFile, runLevel } = outsideBlocks()
    expect(perFile).toHaveLength(1)
    expect(runLevel).toHaveLength(1)
  })

  it('passes the typing and reset events of the bar up', async () => {
    const onFiltersChange = vi.fn()
    const onFiltersReset = vi.fn()
    render(
      runDiff({
        filters: filtersOf({ severities: ['info'] }),
        onFiltersChange,
        onFiltersReset,
      }),
    )

    fireEvent.change(screen.getByPlaceholderText('Поиск по замечаниям'), {
      target: { value: 'x' },
    })
    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalledWith(
        { files: [], severities: ['info'], query: 'x' },
        { replace: true },
      )
    })

    const bar = screen.getByTestId('finding-filters-bar')
    fireEvent.click(within(bar).getByRole('button', { name: 'Сбросить фильтры' }))
    expect(onFiltersReset).toHaveBeenCalledTimes(1)
  })

  it('resets through onFiltersChange when no onFiltersReset is given', () => {
    const onFiltersChange = vi.fn()
    render(
      <RunDiff
        files={FILES}
        filters={filtersOf({ severities: ['info'] })}
        findings={FINDINGS}
        onFiltersChange={onFiltersChange}
        summaryOnly={false}
      />,
    )

    const bar = screen.getByTestId('finding-filters-bar')
    fireEvent.click(within(bar).getByRole('button', { name: 'Сбросить фильтры' }))
    expect(onFiltersChange).toHaveBeenCalledTimes(1)
    expect(onFiltersChange).toHaveBeenCalledWith(EMPTY_FINDING_FILTERS)
  })
})

describe('RunDiff filters: each filter alone', () => {
  it('severity: both members of the Critical group, files without a hit are hidden', () => {
    const { container } = render(runDiff({ filters: filtersOf({ severities: ['critical'] }) }))

    expectCards(['SQL injection', 'Huge file hint'])
    expect(screen.getByText(counter(2, TOTAL))).toBeTruthy()
    expect(diffCount(container)).toBe(1)
    expect(fileNameShown('src/a.ts')).toBe(true)
    expect(fileNameShown('docs/huge.md')).toBe(true)
    expect(fileNameShown('README.md')).toBe(false)
  })

  it('severity: Info', () => {
    render(runDiff({ filters: filtersOf({ severities: ['info'] }) }))

    expectCards(['Magic string', 'Typo in docs'])
    expect(screen.getByText(counter(2, TOTAL))).toBeTruthy()
  })

  it('file: only that file and its findings', () => {
    const { container } = render(runDiff({ filters: filtersOf({ files: ['README.md'] }) }))

    expectCards(['Typo in docs'])
    expect(screen.getByText(counter(1, TOTAL))).toBeTruthy()
    expect(diffCount(container)).toBe(1)
    expect(fileNameShown('README.md')).toBe(true)
    expect(fileNameShown('src/a.ts')).toBe(false)
    expect(fileNameShown('docs/huge.md')).toBe(false)
    expect(screen.queryAllByTestId('findings-outside-diff')).toHaveLength(0)
  })

  it('file: several files are OR-ed', () => {
    render(runDiff({ filters: filtersOf({ files: ['README.md', 'src/not-in-diff.ts'] }) }))

    expectCards(['Typo in docs', 'Missing file finding'])
    expect(screen.getByText(counter(2, TOTAL))).toBeTruthy()
  })

  it('file: a finding outside the diff is selectable and shown without any diff', () => {
    const { container } = render(runDiff({ filters: filtersOf({ files: ['src/not-in-diff.ts'] }) }))

    expectCards(['Missing file finding'])
    expect(diffCount(container)).toBe(0)
    expect(fileNameShown('src/a.ts')).toBe(false)
    expect(fileNameShown('docs/huge.md')).toBe(false)
    const { perFile, runLevel } = outsideBlocks()
    expect(perFile).toHaveLength(0)
    expect(runLevel).toHaveLength(1)
  })

  it('file: a patchless file in /diff keeps its placeholder and its run-level finding', () => {
    render(runDiff({ filters: filtersOf({ files: ['docs/huge.md'] }) }))

    expectCards(['Huge file hint'])
    expect(screen.getByText('Без диффа')).toBeTruthy()
    expect(fileNameShown('src/a.ts')).toBe(false)
  })

  it('query: title, body and ruleName, including a comment turned into a finding', () => {
    const { unmount } = render(runDiff({ filters: filtersOf({ query: 'CONSOLE' }) }))
    expectCards(['Console statement'])
    unmount()

    const second = render(runDiff({ filters: filtersOf({ query: 'spelling' }) }))
    expectCards(['Typo in docs'])
    second.unmount()

    render(runDiff({ filters: filtersOf({ query: 'NO-MAGIC' }) }))
    expectCards(['Magic number'])
    expect(screen.getByText(counter(1, TOTAL))).toBeTruthy()
  })

  it('query: a whitespace-only query filters nothing and shows no empty message', () => {
    render(runDiff({ filters: filtersOf({ query: '   ' }) }))

    expect(cardTitles()).toHaveLength(TOTAL)
    expect(screen.getByText(counter(TOTAL, TOTAL))).toBeTruthy()
    expect(screen.queryByText('Нет замечаний, подходящих под фильтры')).toBeNull()
  })

  it('a file the run does not have is ignored on read', () => {
    const { container } = render(runDiff({ filters: filtersOf({ files: ['gone.ts'] }) }))

    expect(cardTitles()).toHaveLength(TOTAL)
    expect(diffCount(container)).toBe(2)
    expect(screen.getByText(counter(TOTAL, TOTAL))).toBeTruthy()
    expect(screen.queryByText('Нет замечаний, подходящих под фильтры')).toBeNull()
  })

  it('a file the run does not have does not hide the content filter hits', () => {
    render(runDiff({ filters: filtersOf({ files: ['gone.ts'], severities: ['info'] }) }))

    expectCards(['Magic string', 'Typo in docs'])
  })
})

describe('RunDiff filters: combinations', () => {
  it('file and severity', () => {
    render(runDiff({ filters: filtersOf({ files: ['src/a.ts'], severities: ['warning'] }) }))

    expectCards(['Console statement', 'Stale reference', 'Magic number'])
    expect(screen.getByText(counter(3, TOTAL))).toBeTruthy()
    const { perFile, runLevel } = outsideBlocks()
    expect(perFile).toHaveLength(1)
    expect(within(only(perFile)).getByText('Stale reference')).toBeTruthy()
    expect(runLevel).toHaveLength(0)
  })

  it('file and query', () => {
    render(runDiff({ filters: filtersOf({ files: ['src/a.ts'], query: 'magic' }) }))

    expectCards(['Magic string', 'Magic number'])
  })

  it('severity and query', () => {
    render(runDiff({ filters: filtersOf({ severities: ['info'], query: 'magic' }) }))

    expectCards(['Magic string'])
  })

  it('file, severity and query', () => {
    render(
      runDiff({
        filters: filtersOf({ files: ['src/a.ts'], severities: ['warning'], query: 'moved' }),
      }),
    )

    expectCards(['Stale reference'])
    expect(screen.getByText(counter(1, TOTAL))).toBeTruthy()
  })
})

describe('RunDiff filters: file options', () => {
  it('count the displayed set per file, whatever the other filters are', () => {
    render(runDiff({ filters: filtersOf({ severities: ['info'] }) }))
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Файлы' }))

    expect(
      [...document.querySelectorAll('.ant-select-item-option')].map((option) => option.textContent),
    ).toEqual(['src/a.ts (5)', 'README.md (1)', 'docs/huge.md (1)', 'src/not-in-diff.ts (1)'])
  })
})

describe('RunDiff filters: outside blocks', () => {
  it('per-file block: shown with its hit, the file stays, the run-level block goes', () => {
    const { container } = render(runDiff({ filters: filtersOf({ query: 'stale' }) }))

    expectCards(['Stale reference'])
    const { perFile, runLevel } = outsideBlocks()
    expect(perFile).toHaveLength(1)
    expect(runLevel).toHaveLength(0)
    expect(diffCount(container)).toBe(1)
  })

  it('per-file block: not rendered when nothing in it passes', () => {
    render(runDiff({ filters: filtersOf({ severities: ['critical'] }) }))

    expect(outsideBlocks().perFile).toHaveLength(0)
  })

  it('run-level block: shown with its hit only, the per-file block goes', () => {
    const { container } = render(runDiff({ filters: filtersOf({ query: 'modules' }) }))

    expectCards(['Huge file hint'])
    const { perFile, runLevel } = outsideBlocks()
    expect(runLevel).toHaveLength(1)
    expect(perFile).toHaveLength(0)
    expect(diffCount(container)).toBe(0)
    expect(screen.getByText('Без диффа')).toBeTruthy()
  })

  it('run-level block: lists only the findings that pass', () => {
    render(runDiff({ filters: filtersOf({ severities: ['warning'] }) }))

    const { runLevel } = outsideBlocks()
    expect(runLevel).toHaveLength(1)
    expect(within(only(runLevel)).getByText('Missing file finding')).toBeTruthy()
    expect(within(only(runLevel)).queryByText('Huge file hint')).toBeNull()
  })

  it('run-level block: not rendered when nothing in it passes', () => {
    render(runDiff({ filters: filtersOf({ severities: ['info'] }) }))

    expect(outsideBlocks().runLevel).toHaveLength(0)
  })
})

describe('RunDiff filters: empty result', () => {
  it('shows an explicit message and a reset button instead of a blank area', () => {
    const onFiltersReset = vi.fn()
    const { container } = render(runDiff({ filters: filtersOf({ query: 'zzzz' }), onFiltersReset }))

    const message = screen.getByTestId('findings-filter-empty')
    expect(within(message).getByText('Нет замечаний, подходящих под фильтры')).toBeTruthy()
    expect(screen.getByText(counter(0, TOTAL))).toBeTruthy()
    expect(cardTitles()).toHaveLength(0)
    expect(diffCount(container)).toBe(0)

    fireEvent.click(within(message).getByRole('button', { name: 'Сбросить фильтры' }))
    expect(onFiltersReset).toHaveBeenCalledTimes(1)
  })

  it('resets through onFiltersChange from the message when no onFiltersReset is given', () => {
    const onFiltersChange = vi.fn()
    render(
      <RunDiff
        files={FILES}
        filters={filtersOf({ query: 'zzzz' })}
        findings={FINDINGS}
        onFiltersChange={onFiltersChange}
        summaryOnly={false}
      />,
    )

    const message = screen.getByTestId('findings-filter-empty')
    fireEvent.click(within(message).getByRole('button', { name: 'Сбросить фильтры' }))
    expect(onFiltersChange).toHaveBeenCalledWith(EMPTY_FINDING_FILTERS)
  })

  it('is shown for a content filter that nothing passes in a run without findings', () => {
    render(runDiff({ findings: [], comments: [], filters: filtersOf({ severities: ['info'] }) }))

    expect(screen.getByTestId('findings-filter-empty')).toBeTruthy()
    expect(screen.getByText(counter(0, 0))).toBeTruthy()
  })

  it('is not shown for a run without findings when no filter is in effect', () => {
    render(runDiff({ findings: [], comments: [], filters: EMPTY_FINDING_FILTERS }))

    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()
    expect(screen.getByText(counter(0, 0))).toBeTruthy()
  })

  it('is not shown for a run without findings when the only filter is a file it does not have', () => {
    render(runDiff({ findings: [], comments: [], filters: filtersOf({ files: ['gone.ts'] }) }))

    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()
  })

  it('is not shown when a filter lets something pass', () => {
    render(runDiff({ filters: filtersOf({ severities: ['info'] }) }))

    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()
  })
})

describe('RunDiff filters: search expands the cards', () => {
  it('a hit in the body is visible without a click, inline, per file and run-level', () => {
    const { unmount } = render(runDiff({ filters: filtersOf({ query: 'user input' }) }))
    expect(screen.getByText('Query built from user input')).toBeTruthy()
    expect(screen.getByText('правило: sql-injection')).toBeTruthy()
    unmount()

    const second = render(runDiff({ filters: filtersOf({ query: 'moved away' }) }))
    expect(screen.getByText('Line moved away')).toBeTruthy()
    second.unmount()

    render(runDiff({ filters: filtersOf({ query: 'modules' }) }))
    expect(screen.getByText('Split this file into modules')).toBeTruthy()
  })

  it('expands the cards of a shared widget row too', () => {
    const { container } = render(runDiff({ filters: filtersOf({ query: 'in' }) }))

    const rows = [...container.querySelectorAll('tr.diff-widget')]
    expect(
      rows.some((row) => row.querySelectorAll('[data-testid="inline-comment"]').length === 2),
    ).toBe(true)
    expect(screen.getByText('Query built from user input')).toBeTruthy()
    expect(screen.getByText('Extract the literal into a constant')).toBeTruthy()
  })

  it('without a search the cards stay collapsed', () => {
    render(runDiff({ filters: filtersOf({ severities: ['critical'] }) }))

    expect(screen.queryByText('Query built from user input')).toBeNull()
    expect(screen.queryByText('Split this file into modules')).toBeNull()
  })

  it('a whitespace-only query does not expand anything', () => {
    render(runDiff({ filters: filtersOf({ query: '   ' }) }))

    expect(screen.queryByText('Query built from user input')).toBeNull()
  })

  it('a search that starts later expands the cards at every site', () => {
    const everything = filtersOf({ severities: ['critical', 'warning', 'info'] })
    const { rerender } = render(runDiff({ filters: everything }))
    expect(cardTitles()).toHaveLength(TOTAL)
    expect(screen.queryByText('Query built from user input')).toBeNull()

    rerender(runDiff({ filters: { ...everything, query: 'e' } }))

    // widget row with one card, widget row with two cards, per-file block, run-level block
    expect(screen.getByText('Query built from user input')).toBeTruthy()
    expect(screen.getByText('Extract the literal into a constant')).toBeTruthy()
    expect(screen.getByText('Line moved away')).toBeTruthy()
    expect(screen.getByText('Split this file into modules')).toBeTruthy()
    const { perFile, runLevel } = outsideBlocks()
    expect(perFile).toHaveLength(1)
    expect(runLevel).toHaveLength(1)
  })

  it('toggling the search remounts the cards; typing more does not', () => {
    const { rerender } = render(runDiff({ filters: filtersOf({ severities: ['critical'] }) }))
    expect(screen.queryByText('Query built from user input')).toBeNull()

    // a manual expand, then the search starts: the card is remounted expanded
    fireEvent.click(screen.getByText('SQL injection'))
    expect(screen.getByText('Query built from user input')).toBeTruthy()
    rerender(runDiff({ filters: filtersOf({ severities: ['critical'], query: 'sql' }) }))
    expect(screen.getByText('Query built from user input')).toBeTruthy()

    // a manual collapse survives more typing: same key, no remount
    fireEvent.click(screen.getByText('SQL injection'))
    expect(screen.queryByText('Query built from user input')).toBeNull()
    rerender(runDiff({ filters: filtersOf({ severities: ['critical'], query: 'sql i' }) }))
    expect(screen.queryByText('Query built from user input')).toBeNull()

    // the search is cleared: collapsed again
    rerender(runDiff({ filters: filtersOf({ severities: ['critical'] }) }))
    expect(screen.queryByText('Query built from user input')).toBeNull()

    // and started again: expanded again
    rerender(runDiff({ filters: filtersOf({ severities: ['critical'], query: 'sql' }) }))
    expect(screen.getByText('Query built from user input')).toBeTruthy()
  })
})

describe('RunDiff filters: highlight budget', () => {
  it('stays off when a filter hides files and the rest would fit the budget', () => {
    const files = diffApi.diff.response
      .parse([
        addedLinesPatch('src/a.ts', 400),
        addedLinesPatch('src/b.ts', 400),
        addedLinesPatch('src/c.ts', 400),
      ])
      .map(fromPatch)

    const { container } = render(
      <RunDiff
        files={files}
        filters={filtersOf({ files: ['src/c.ts'] })}
        findings={[]}
        onFiltersChange={vi.fn()}
        summaryOnly={false}
      />,
    )

    expect(diffCount(container)).toBe(1)
    expect(container.querySelector('span.token')).toBeNull()
  })

  it('stays on when a filter hides files', () => {
    const files = diffApi.diff.response
      .parse([addedLinesPatch('src/a.ts', 400), addedLinesPatch('src/b.ts', 400)])
      .map(fromPatch)

    const { container } = render(
      <RunDiff
        files={files}
        filters={filtersOf({ files: ['src/b.ts'] })}
        findings={[]}
        onFiltersChange={vi.fn()}
        summaryOnly={false}
      />,
    )

    expect(diffCount(container)).toBe(1)
    expect(container.querySelector('span.token')).not.toBeNull()
  })
})

describe('RunDiff filters: summary-only run', () => {
  const SUMMARY_FILES = diffApi.diff.response
    .parse([
      { filename: 'src/big-one.ts', patch: null },
      { filename: 'src/big-two.ts', patch: null },
    ])
    .map(fromPatch)
  const sOne = makeFinding('000000000011', {
    file: 'src/big-one.ts',
    severity: 'critical',
    title: 'Big one critical',
  })
  const sTwo = makeFinding('000000000012', {
    file: 'src/big-two.ts',
    severity: 'info',
    title: 'Big two info',
  })
  const sThree = makeFinding('000000000013', {
    file: 'src/big-one.ts',
    severity: 'low',
    title: 'Big one low',
  })
  const SUMMARY_COMMENTS = [
    makeComment('000000000014', { file: 'src/big-one.ts', title: 'Never rendered comment' }),
  ]

  function summaryOnlyRunDiff(filters: FindingFilters): JSX.Element {
    return (
      <RunDiff
        comments={SUMMARY_COMMENTS}
        files={SUMMARY_FILES}
        filters={filters}
        findings={[sOne, sTwo, sThree]}
        onFiltersChange={vi.fn()}
        onFiltersReset={vi.fn()}
        summaryOnly
      />
    )
  }

  it('counts and lists findings only, comments are not part of the set', () => {
    render(summaryOnlyRunDiff(EMPTY_FINDING_FILTERS))

    expect(screen.getByText('Дифф слишком большой')).toBeTruthy()
    expect(screen.getByText(counter(3, 3))).toBeTruthy()
    expect(fileNameShown('src/big-one.ts')).toBe(true)
    expect(fileNameShown('src/big-two.ts')).toBe(true)
    expectCards(['Big one critical', 'Big two info', 'Big one low'])
    expect(screen.queryByText('Never rendered comment')).toBeNull()
  })

  it('does not count or render comments even for a file that has a patch', () => {
    render(
      <RunDiff
        comments={[makeComment('000000000015', { file: 'src/a.ts', title: 'Comment on a.ts' })]}
        files={[...SUMMARY_FILES, ...FILES.slice(0, 1)]}
        filters={EMPTY_FINDING_FILTERS}
        findings={[sOne]}
        onFiltersChange={vi.fn()}
        summaryOnly
      />,
    )

    expect(screen.getByText(counter(1, 1))).toBeTruthy()
    expect(screen.queryByText('Comment on a.ts')).toBeNull()
  })

  it('a content filter hides the list entries without a hit and the findings that do not pass', () => {
    render(summaryOnlyRunDiff(filtersOf({ severities: ['info'] })))

    expect(screen.getByText(counter(1, 3))).toBeTruthy()
    expect(fileNameShown('src/big-two.ts')).toBe(true)
    expect(fileNameShown('src/big-one.ts')).toBe(false)
    expectCards(['Big two info'])
    expect(screen.getByText('Дифф слишком большой')).toBeTruthy()
  })

  it('a file filter keeps only that list entry and its findings', () => {
    render(summaryOnlyRunDiff(filtersOf({ files: ['src/big-one.ts'] })))

    expect(fileNameShown('src/big-one.ts')).toBe(true)
    expect(fileNameShown('src/big-two.ts')).toBe(false)
    expectCards(['Big one critical', 'Big one low'])
    expect(screen.getByText(counter(2, 3))).toBeTruthy()
  })

  it('a search expands the findings in the outside block', () => {
    render(summaryOnlyRunDiff(filtersOf({ query: 'big two' })))

    expectCards(['Big two info'])
    // the body of makeFinding's default
    expect(screen.getByText('Body')).toBeTruthy()
  })

  it('shows one empty message and no list when nothing passes', () => {
    const { container } = render(summaryOnlyRunDiff(filtersOf({ query: 'zzzz' })))

    expect(screen.getByTestId('findings-filter-empty')).toBeTruthy()
    expect(container.querySelector('.ant-list')).toBeNull()
    expect(container.querySelectorAll('.ant-empty')).toHaveLength(1)
    expect(fileNameShown('src/big-one.ts')).toBe(false)
    expect(fileNameShown('src/big-two.ts')).toBe(false)
    expect(screen.queryAllByTestId('findings-outside-diff')).toHaveLength(0)
  })
})

describe('RunDiff filters: search text and pending comments', () => {
  it('typing goes to onFiltersQueryChange when it is given, not to onFiltersChange', async () => {
    const onFiltersChange = vi.fn()
    const onFiltersQueryChange = vi.fn()
    render(
      runDiff({
        filters: filtersOf({ severities: ['info'] }),
        onFiltersChange,
        onFiltersQueryChange,
      }),
    )

    fireEvent.change(screen.getByPlaceholderText('Поиск по замечаниям'), {
      target: { value: 'x' },
    })

    await waitFor(() => {
      expect(onFiltersQueryChange).toHaveBeenCalledWith('x')
    })
    expect(onFiltersQueryChange).toHaveBeenCalledTimes(1)
    expect(onFiltersChange).not.toHaveBeenCalled()
  })

  it('does not show the empty message while /comments is pending, and shows it once it settles', () => {
    const { rerender } = render(
      runDiff({ filters: filtersOf({ query: 'zzzz' }), commentsPending: true }),
    )

    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()
    // the counter and the rest of the page work as usual
    expect(screen.getByText(counter(0, TOTAL))).toBeTruthy()

    rerender(runDiff({ filters: filtersOf({ query: 'zzzz' }), commentsPending: false }))
    expect(screen.getByTestId('findings-filter-empty')).toBeTruthy()
  })

  it('does not show the empty message for a file filter either while /comments is pending', () => {
    render(
      runDiff({
        findings: [],
        comments: [],
        filters: filtersOf({ severities: ['info'] }),
        commentsPending: true,
      }),
    )

    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()
  })
})
