// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fromPatch } from '../../../entities/diff'
import type { ReviewComment } from '../../../entities/review'
import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'
import { useDiffViewerStore } from '../model/store'
import { DiffViewer } from './DiffViewer'

const FILE = fromPatch(SAMPLE_PATCH_A)

const TS_HIGHLIGHT_FILE = fromPatch({
  filename: 'src/app.ts',
  patch: [
    'diff --git a/src/app.ts b/src/app.ts',
    'index 1111111..2222222 100644',
    '--- a/src/app.ts',
    '+++ b/src/app.ts',
    '@@ -1,1 +1,2 @@',
    '-const old = 1',
    '+const value = 1',
    '+export function run() {}',
  ].join('\n'),
})

const PY_FILE = fromPatch({
  filename: 'lib/run.py',
  patch: [
    'diff --git a/lib/run.py b/lib/run.py',
    'index 1111111..2222222 100644',
    '--- a/lib/run.py',
    '+++ b/lib/run.py',
    '@@ -1,2 +1,3 @@',
    ' def main():',
    '-    pass',
    '+    return 1',
    '+    x = 2',
  ].join('\n'),
})

const TSX_HIGHLIGHT_FILE = fromPatch({
  filename: 'src/App.tsx',
  patch: [
    'diff --git a/src/App.tsx b/src/App.tsx',
    'index 1111111..2222222 100644',
    '--- a/src/App.tsx',
    '+++ b/src/App.tsx',
    '@@ -1,3 +1,3 @@',
    ' export function App({ name }: { name: string }) {',
    '-  return <span>{name}</span>',
    '+  return <div className="x">{name}</div>',
    ' }',
  ].join('\n'),
})

function expectSyntaxTokens(container: HTMLElement): void {
  const codeCells = container.querySelectorAll('.diff-code')
  expect(codeCells.length).toBeGreaterThan(0)
  const tokens = container.querySelectorAll('.diff-code span.token')
  expect(tokens.length).toBeGreaterThan(0)
}

function makeComment(overrides: Partial<ReviewComment> & { id: string }): ReviewComment {
  return {
    file: FILE.filename,
    oldLine: null,
    newLine: null,
    endLine: null,
    body: 'Avoid magic numbers',
    ruleName: null,
    severity: 'medium',
    category: 'readability',
    title: 'Magic number',
    createdAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  }
}

const COMMENTS: ReviewComment[] = [
  makeComment({
    id: '11111111-1111-4111-8111-111111111111',
    newLine: 2,
    ruleName: 'no-magic-numbers',
  }),
  makeComment({ id: '11111111-1111-4111-8111-111111111112', newLine: 99, title: 'Unresolvable' }),
]

beforeEach(() => {
  useDiffViewerStore.setState({ viewType: 'unified', selectedFile: null })
})

afterEach(() => {
  cleanup()
})

describe('DiffViewer', () => {
  it('highlights TypeScript in unified view (span.token in .diff-code)', () => {
    const { container } = render(<DiffViewer comments={[]} file={TS_HIGHLIGHT_FILE} />)
    expectSyntaxTokens(container)
  })

  it('highlights Python in unified view', () => {
    const { container } = render(<DiffViewer comments={[]} file={PY_FILE} />)
    expectSyntaxTokens(container)
  })

  it('highlights JSX in a .tsx file (span.token.tag in .diff-code)', () => {
    const { container } = render(<DiffViewer comments={[]} file={TSX_HIGHLIGHT_FILE} />)
    expectSyntaxTokens(container)
    // `tag` comes from refractor's tsx grammar; plain typescript tokenises `<div …>` as operators.
    expect(container.querySelector('.diff-code span.token.tag')).not.toBeNull()
  })

  it('highlights TypeScript in split view', () => {
    const { container } = render(<DiffViewer comments={[]} file={TS_HIGHLIGHT_FILE} />)
    act(() => {
      useDiffViewerStore.getState().setViewType('split')
    })
    expectSyntaxTokens(container)
  })

  it('highlights Python in split view', () => {
    const { container } = render(<DiffViewer comments={[]} file={PY_FILE} />)
    act(() => {
      useDiffViewerStore.getState().setViewType('split')
    })
    expectSyntaxTokens(container)
  })

  it('renders the unified diff with a widget for the resolvable comment', () => {
    const { container } = render(<DiffViewer comments={COMMENTS} file={FILE} />)
    expect(container.querySelectorAll('.diff-line')).toHaveLength(10)
    expect(container.querySelectorAll('.diff-widget')).toHaveLength(1)
    expect(screen.getByText('Magic number')).toBeTruthy()
    fireEvent.click(screen.getByText('Magic number'))
    expect(screen.getByText('правило: no-magic-numbers')).toBeTruthy()
    const widgetRow = container.querySelector('tr.diff-widget')
    expect(widgetRow?.previousElementSibling?.textContent).toContain('line 2')
  })

  it('counts insert/delete/normal diff-code cells', () => {
    const { container } = render(<DiffViewer file={FILE} comments={COMMENTS} />)
    expect(container.querySelectorAll('.diff-code-insert')).toHaveLength(3)
    expect(container.querySelectorAll('.diff-code-delete')).toHaveLength(2)
    expect(container.querySelectorAll('.diff-code-normal')).toHaveLength(5)
  })

  it('switches to split view via the store without losing the widget', () => {
    const { container } = render(<DiffViewer file={FILE} comments={COMMENTS} />)
    act(() => {
      useDiffViewerStore.getState().setViewType('split')
    })
    expect(container.querySelector('table.diff-split')).toBeTruthy()
    expect(container.querySelectorAll('.diff-widget')).toHaveLength(1)
  })

  it('renders load-more gaps between hunks and after the last hunk, not before the first', () => {
    const onLoadMore = vi.fn()
    const { rerender } = render(<DiffViewer file={FILE} comments={[]} onLoadMore={onLoadMore} />)
    expect(screen.getAllByText(/^Показать ещё \d+ строк$/)).toHaveLength(1)
    fireEvent.click(screen.getByText('Показать ещё 5 строк'))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
    expect(onLoadMore).toHaveBeenCalledWith({ startLine: 6, count: 5 })

    rerender(<DiffViewer file={FILE} comments={[]} onLoadMore={onLoadMore} totalLines={20} />)
    expect(screen.getByText('Показать ещё 7 строк')).toBeTruthy()
    expect(screen.getAllByText(/^Показать ещё \d+ строк$/)).toHaveLength(2)
  })

  it('renders no load-more buttons when onLoadMore is not provided', () => {
    render(<DiffViewer file={FILE} comments={[]} />)
    expect(screen.queryByText(/Показать ещё/)).toBeNull()
  })

  it('renders a placeholder for a binary or empty diff', () => {
    render(<DiffViewer file={{ ...FILE, chunks: [] }} comments={[]} />)
    expect(screen.getByText('Бинарный файл или пустой дифф')).toBeTruthy()
    expect(screen.getByText(FILE.filename)).toBeTruthy()
  })

  it('renders a "no diff" placeholder for a summary-only file (hasPatch: false)', () => {
    render(<DiffViewer file={{ ...FILE, chunks: [], hasPatch: false }} comments={[]} />)
    expect(screen.getByText('Без диффа')).toBeTruthy()
    expect(screen.queryByText('Бинарный файл или пустой дифф')).toBeNull()
    expect(screen.getByText(FILE.filename)).toBeTruthy()
  })

  it('flattens multiple comments on the same line into one widget row', () => {
    const threeComments: ReviewComment[] = [
      makeComment({ id: '11111111-1111-4111-8111-111111111121', newLine: 2 }),
      makeComment({ id: '11111111-1111-4111-8111-111111111122', newLine: 2 }),
      makeComment({ id: '11111111-1111-4111-8111-111111111123', newLine: 2 }),
    ]
    const { container } = render(<DiffViewer file={FILE} comments={threeComments} />)
    const widgetRows = container.querySelectorAll('tr.diff-widget')
    expect(widgetRows).toHaveLength(1)
    const row = widgetRows[0]
    const wrapper = row?.querySelector('.diff-widget-content > div')
    expect(wrapper?.children.length).toBe(3)
    expect(row?.querySelectorAll('.inline-comment')).toHaveLength(3)
  })

  it('deduplicates findings and comments that share the same id', () => {
    const sharedId = '11111111-1111-4111-8111-111111111199'
    render(
      <DiffViewer
        comments={[makeComment({ id: sharedId, newLine: 2, title: 'From comments' })]}
        file={FILE}
        findings={[
          {
            id: sharedId,
            file: FILE.filename,
            oldLine: null,
            newLine: 2,
            endLine: null,
            side: 'RIGHT',
            severity: 'medium',
            category: 'readability',
            title: 'From findings',
            body: 'Prefer the finding payload',
            suggestion: 'const x = 1',
            confidence: 0.9,
            ruleName: null,
          },
        ]}
      />,
    )
    expect(screen.getByText('From findings')).toBeTruthy()
    expect(screen.queryByText('From comments')).toBeNull()
    expect(screen.getAllByTestId('inline-comment')).toHaveLength(1)
  })

  it('shows findings outside the loaded diff in a dedicated block', () => {
    render(
      <DiffViewer
        file={FILE}
        findings={[
          {
            id: '33333333-3333-4333-8333-000000000010',
            file: FILE.filename,
            oldLine: null,
            newLine: 500,
            endLine: null,
            side: 'RIGHT',
            severity: 'info',
            category: 'readability',
            title: 'Outside',
            body: 'Not in patch',
            suggestion: null,
            confidence: 0.5,
            ruleName: null,
          },
        ]}
      />,
    )
    expect(screen.getByTestId('findings-outside-diff')).toBeTruthy()
    expect(screen.getByText('Outside')).toBeTruthy()
  })
})
