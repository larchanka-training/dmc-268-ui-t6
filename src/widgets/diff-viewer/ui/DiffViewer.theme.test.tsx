// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { ConfigProvider, theme } from 'antd'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { fromPatch } from '../../../entities/diff'
import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'
import { useDiffViewerStore } from '../model/store'
import { DiffViewer } from './DiffViewer'

// No @types/node here: load `fs` untyped to read the real stylesheet. Under jsdom
// `import.meta.url` is not a file URL, so the path is relative to the project root, where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// The rule that breaks a word of code only when it is longer than the line. react-diff-view ships
// `.diff-code { word-break: break-all }`; this selector is more specific. Its classes are those of
// react-diff-view: one that no longer matches what it renders goes dead without an error
// (DESIGN_SYSTEM §11), so the rule is matched against a real diff.
const CODE_BREAK_RULE = '.diff-theme .diff-code'

/** Declarations of each rule of diff-layout.css with exactly this selector, whitespace collapsed. */
function declarationsOf(selector: string): string[] {
  const css = readFileSync('src/widgets/diff-viewer/ui/diff-layout.css', 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )
  return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter((match) => (match[1] ?? '').trim().replace(/\s+/g, ' ') === selector)
    .map((match) => (match[2] ?? '').trim().replace(/\s+/g, ' '))
}

const FILE = fromPatch(SAMPLE_PATCH_A)
const INSERT_BG = '--diff-code-insert-background-color'
const DELETE_BG = '--diff-code-delete-background-color'
const TEXT = '--diff-text-color'

function themeRoot(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>('.diff-theme')
  if (root === null) {
    throw new Error('DiffViewer renders no .diff-theme element')
  }
  return root
}

const LIGHT = theme.getDesignToken({ algorithm: theme.defaultAlgorithm })
const DARK = theme.getDesignToken({ algorithm: theme.darkAlgorithm })

beforeEach(() => {
  useDiffViewerStore.setState({ viewType: 'unified' })
})

afterEach(() => {
  cleanup()
})

describe('DiffViewer theme', () => {
  it('scopes the antd-derived diff variables on the root element that wraps the table', () => {
    const { container } = render(<DiffViewer file={FILE} />)
    const root = themeRoot(container)
    expect(root.querySelector('table.diff')).not.toBeNull()
    expect(root.style.getPropertyValue(INSERT_BG)).toBe(LIGHT.colorSuccessBg)
  })

  it('differs between a dark and a light ConfigProvider', () => {
    const light = render(
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
        <DiffViewer file={FILE} />
      </ConfigProvider>,
    )
    const lightRoot = themeRoot(light.container)
    const lightInsert = lightRoot.style.getPropertyValue(INSERT_BG)
    const lightDelete = lightRoot.style.getPropertyValue(DELETE_BG)
    const lightText = lightRoot.style.getPropertyValue(TEXT)
    light.unmount()

    const dark = render(
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <DiffViewer file={FILE} />
      </ConfigProvider>,
    )
    const darkRoot = themeRoot(dark.container)

    expect(lightInsert).toBe(LIGHT.colorSuccessBg)
    expect(lightDelete).toBe(LIGHT.colorErrorBg)
    expect(lightText).toBe(LIGHT.colorText)
    expect(darkRoot.style.getPropertyValue(INSERT_BG)).toBe(DARK.colorSuccessBg)
    expect(darkRoot.style.getPropertyValue(DELETE_BG)).toBe(DARK.colorErrorBg)
    expect(darkRoot.style.getPropertyValue(TEXT)).toBe(DARK.colorText)
    expect(darkRoot.style.getPropertyValue(INSERT_BG)).not.toBe(lightInsert)
    expect(darkRoot.style.getPropertyValue(DELETE_BG)).not.toBe(lightDelete)
    expect(darkRoot.style.getPropertyValue(TEXT)).not.toBe(lightText)
  })
})

describe('diff-layout.css: where code breaks (DS §5, #239 D8)', () => {
  it('breaks a word of code only when it is longer than the line', () => {
    // jsdom computes no layout: the rule itself is what keeps a word whole.
    expect(declarationsOf(CODE_BREAK_RULE)).toEqual([
      'word-break: normal; overflow-wrap: anywhere;',
    ])
  })

  it('matches every code cell of the diff, in Unified and in Split', () => {
    for (const viewType of ['unified', 'split'] as const) {
      useDiffViewerStore.setState({ viewType })
      const { container, unmount } = render(<DiffViewer file={FILE} />)
      const cells = [...container.querySelectorAll('td.diff-code')]
      expect(cells.length, viewType).toBeGreaterThan(0)
      expect(
        cells.filter((cell) => !cell.matches(CODE_BREAK_RULE)),
        viewType,
      ).toEqual([])
      unmount()
    }
  })
})
