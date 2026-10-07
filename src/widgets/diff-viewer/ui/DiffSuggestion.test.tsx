// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { ConfigProvider, theme } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DiffSuggestion } from './DiffSuggestion'

const INSERT_BG = '--diff-code-insert-background-color'

const TS_REMOVED = ['const limit = 10 // old']
const TS_ADDED = 'const limit: number = Number("10") // parsed'
const PY_REMOVED = ['def total(items): # old']
const PY_ADDED = 'def total(items: list[int]) -> int:\n    return sum(items)'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function lineText(container: HTMLElement, selector: string): string[] {
  return Array.from(container.querySelectorAll(selector)).map((cell) => cell.textContent)
}

describe('DiffSuggestion', () => {
  it('highlights a .ts suggestion with span.token on both sides', () => {
    const { container } = render(
      <DiffSuggestion addedText={TS_ADDED} filename="src/limits.ts" removedLines={TS_REMOVED} />,
    )

    expect(container.querySelector('.diff-code-delete span.token')).not.toBeNull()
    expect(container.querySelector('.diff-code-insert span.token')).not.toBeNull()
    expect(container.querySelector('.diff-code-insert span.token.keyword')).not.toBeNull()
    expect(container.querySelector('.diff-code-insert span.token.string')).not.toBeNull()
    expect(container.querySelector('.diff-code-insert span.token.comment')).not.toBeNull()
  })

  it('highlights a .py suggestion with span.token', () => {
    const { container } = render(
      <DiffSuggestion addedText={PY_ADDED} filename="app/totals.py" removedLines={PY_REMOVED} />,
    )

    expect(container.querySelector('.diff-code-delete span.token')).not.toBeNull()
    expect(container.querySelector('.diff-code-insert span.token.keyword')).not.toBeNull()
  })

  it('keeps the original text and order of removed then added lines', () => {
    const { container } = render(
      <DiffSuggestion addedText={PY_ADDED} filename="app/totals.py" removedLines={PY_REMOVED} />,
    )

    expect(lineText(container, '.diff-code-delete')).toEqual(PY_REMOVED)
    expect(lineText(container, '.diff-code-insert')).toEqual(PY_ADDED.split('\n'))
    const kinds = Array.from(container.querySelectorAll('td.diff-code')).map((cell) =>
      cell.classList.contains('diff-code-delete') ? 'delete' : 'insert',
    )
    expect(kinds).toEqual(['delete', 'insert', 'insert'])
  })

  it('renders an unknown extension as plain lines without tokens and without error', () => {
    const { container } = render(
      <DiffSuggestion
        addedText={'const a = "b" // c\nlet d = 1'}
        filename="notes/data.unknownext"
        removedLines={['const a = "x"']}
      />,
    )

    expect(container.querySelectorAll('.diff-code')).toHaveLength(3)
    expect(lineText(container, '.diff-code-insert')).toEqual(['const a = "b" // c', 'let d = 1'])
    expect(container.querySelector('span.token')).toBeNull()
  })

  it('renders a single blank removed line as its own deleted row', () => {
    const { container } = render(
      <DiffSuggestion addedText="const a = 1" filename="src/limits.ts" removedLines={['']} />,
    )

    expect(container.querySelectorAll('.diff-code-delete')).toHaveLength(1)
    expect(lineText(container, '.diff-code-insert')).toEqual(['const a = 1'])
  })

  it('skips highlighting above the 1000-line budget but still renders every line', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const added = Array.from({ length: 1001 }, (_, index) => `const value${String(index)} = "text"`)
    const { container } = render(
      <DiffSuggestion addedText={added.join('\n')} filename="src/limits.ts" removedLines={[]} />,
    )

    expect(container.querySelectorAll('.diff-code-insert')).toHaveLength(1001)
    expect(container.querySelector('span.token')).toBeNull()
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('re-renders the new added text when addedText changes', () => {
    const { container, rerender } = render(
      <DiffSuggestion addedText="const a = 1" filename="src/limits.ts" removedLines={TS_REMOVED} />,
    )
    expect(lineText(container, '.diff-code-insert')).toEqual(['const a = 1'])

    rerender(
      <DiffSuggestion addedText="const b = 2" filename="src/limits.ts" removedLines={TS_REMOVED} />,
    )

    expect(lineText(container, '.diff-code-insert')).toEqual(['const b = 2'])
    expect(container.textContent).not.toContain('const a = 1')
  })

  it('highlights after the filename changes from an unknown extension to .ts', () => {
    const { container, rerender } = render(
      <DiffSuggestion
        addedText={TS_ADDED}
        filename="notes/data.unknownext"
        removedLines={TS_REMOVED}
      />,
    )
    expect(container.querySelector('span.token')).toBeNull()

    rerender(
      <DiffSuggestion addedText={TS_ADDED} filename="src/limits.ts" removedLines={TS_REMOVED} />,
    )

    expect(container.querySelector('.diff-code-insert span.token.keyword')).not.toBeNull()
    expect(lineText(container, '.diff-code-insert')).toEqual([TS_ADDED])
  })

  it('re-renders the new removed text when removedLines content changes', () => {
    const { container, rerender } = render(
      <DiffSuggestion
        addedText={TS_ADDED}
        filename="src/limits.ts"
        removedLines={['const a = 1']}
      />,
    )
    expect(lineText(container, '.diff-code-delete')).toEqual(['const a = 1'])

    rerender(
      <DiffSuggestion
        addedText={TS_ADDED}
        filename="src/limits.ts"
        removedLines={['const b = 2', 'const c = 3']}
      />,
    )

    expect(lineText(container, '.diff-code-delete')).toEqual(['const b = 2', 'const c = 3'])
    expect(container.textContent).not.toContain('const a = 1')
  })

  it('renders nothing when both sides are empty', () => {
    const { container } = render(
      <DiffSuggestion addedText="" filename="src/limits.ts" removedLines={[]} />,
    )

    expect(container.querySelector('[data-testid="diff-suggestion"]')).toBeNull()
  })

  it('carries the .diff-theme root with the antd variables outside any DiffViewer', () => {
    const { container } = render(
      <DiffSuggestion addedText={TS_ADDED} filename="src/limits.ts" removedLines={TS_REMOVED} />,
    )

    const root = container.querySelector<HTMLElement>('[data-testid="diff-suggestion"]')
    expect(root).not.toBeNull()
    expect(root?.classList.contains('diff-theme')).toBe(true)
    expect(root?.style.getPropertyValue(INSERT_BG)).toBe(
      theme.getDesignToken({ algorithm: theme.defaultAlgorithm }).colorSuccessBg,
    )
    expect(root?.querySelector('table.diff')).not.toBeNull()
  })

  it('follows the surrounding ConfigProvider algorithm', () => {
    const light = render(
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
        <DiffSuggestion addedText={TS_ADDED} filename="src/limits.ts" removedLines={TS_REMOVED} />
      </ConfigProvider>,
    )
    const lightValue = light.container
      .querySelector<HTMLElement>('.diff-theme')
      ?.style.getPropertyValue(INSERT_BG)
    light.unmount()

    const dark = render(
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <DiffSuggestion addedText={TS_ADDED} filename="src/limits.ts" removedLines={TS_REMOVED} />
      </ConfigProvider>,
    )
    const darkValue = dark.container
      .querySelector<HTMLElement>('.diff-theme')
      ?.style.getPropertyValue(INSERT_BG)

    expect(darkValue).toBe(theme.getDesignToken({ algorithm: theme.darkAlgorithm }).colorSuccessBg)
    expect(darkValue).not.toBe(lightValue)
  })

  it('renders markup in the suggestion as text, never as elements', () => {
    const { container } = render(
      <DiffSuggestion
        addedText="<img src=x onerror=alert(1)>"
        filename="src/limits.ts"
        removedLines={[]}
      />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(lineText(container, '.diff-code-insert')).toEqual(['<img src=x onerror=alert(1)>'])
  })
})
