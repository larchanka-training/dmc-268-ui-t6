// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fromPatch } from '../../../entities/diff'
import type { ReviewComment } from '../../../entities/review'
import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'
import { useDiffViewerStore } from '../model/store'
import { DiffViewer } from './DiffViewer'

const FILE = fromPatch(SAMPLE_PATCH_A)

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
  it('renders the unified diff with a widget for the resolvable comment', () => {
    const { container } = render(<DiffViewer file={FILE} comments={COMMENTS} />)
    expect(container.querySelectorAll('.diff-line')).toHaveLength(10)
    expect(container.querySelectorAll('.diff-widget')).toHaveLength(1)
    expect(screen.getByText('правило: no-magic-numbers')).toBeTruthy()
    expect(screen.getByText('Magic number')).toBeTruthy()
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
})
