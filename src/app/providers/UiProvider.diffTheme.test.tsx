// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { theme } from 'antd'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { fromPatch } from '../../entities/diff'
import { THEME_STORAGE_KEY, useThemeStore } from '../../features/theme'
import { SAMPLE_PATCH_A } from '../../shared/fixtures/sample.patch'
import { DiffViewer, useDiffViewerStore } from '../../widgets/diff-viewer'
import { UiProvider } from './UiProvider'

const FILE = fromPatch(SAMPLE_PATCH_A)
const INSERT_BG = '--diff-code-insert-background-color'
const LIGHT_INSERT_BG = theme.getDesignToken({ algorithm: theme.defaultAlgorithm }).colorSuccessBg
const DARK_INSERT_BG = theme.getDesignToken({ algorithm: theme.darkAlgorithm }).colorSuccessBg

function themeRoot(container: HTMLElement): HTMLElement {
  const root = container.querySelector<HTMLElement>('.diff-theme')
  if (root === null) {
    throw new Error('DiffViewer renders no .diff-theme element')
  }
  return root
}

describe('UiProvider diff theme', () => {
  beforeEach(() => {
    useDiffViewerStore.setState({ viewType: 'unified', selectedFile: null })
  })

  afterEach(() => {
    cleanup()
    localStorage.removeItem(THEME_STORAGE_KEY)
    useThemeStore.setState({ mode: 'light' })
  })

  it('renders the dark values from the first render when the store starts dark', () => {
    useThemeStore.setState({ mode: 'dark' })
    const { container } = render(
      <UiProvider>
        <DiffViewer file={FILE} />
      </UiProvider>,
    )
    expect(themeRoot(container).style.getPropertyValue(INSERT_BG)).toBe(DARK_INSERT_BG)
  })

  it('follows toggleTheme() through the real UiProvider without remounting', () => {
    useThemeStore.setState({ mode: 'light' })
    const { container } = render(
      <UiProvider>
        <DiffViewer file={FILE} />
      </UiProvider>,
    )
    const rootBefore = themeRoot(container)
    const tableBefore = rootBefore.querySelector('table.diff')
    const lightInsert = rootBefore.style.getPropertyValue(INSERT_BG)
    expect(lightInsert).toBe(LIGHT_INSERT_BG)

    act(() => {
      useThemeStore.getState().toggleTheme()
    })

    const rootAfter = themeRoot(container)
    expect(rootAfter).toBe(rootBefore)
    expect(rootAfter.querySelector('table.diff')).toBe(tableBefore)
    expect(rootAfter.style.getPropertyValue(INSERT_BG)).toBe(DARK_INSERT_BG)
    expect(rootAfter.style.getPropertyValue(INSERT_BG)).not.toBe(lightInsert)

    act(() => {
      useThemeStore.getState().toggleTheme()
    })
    expect(themeRoot(container)).toBe(rootBefore)
    expect(rootBefore.style.getPropertyValue(INSERT_BG)).toBe(lightInsert)
  })
})
