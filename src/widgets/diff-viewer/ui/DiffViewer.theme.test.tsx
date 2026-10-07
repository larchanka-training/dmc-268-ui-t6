// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { ConfigProvider, theme } from 'antd'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { UiProvider } from '../../../app/providers/UiProvider'
import { fromPatch } from '../../../entities/diff'
import { THEME_STORAGE_KEY, useThemeStore } from '../../../features/theme'
import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'
import { diffThemeVars } from '../lib/diffTheme'
import { useDiffViewerStore } from '../model/store'
import { DiffViewer } from './DiffViewer'

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

function expectedVars(algorithm: typeof theme.darkAlgorithm): Record<string, string> {
  return diffThemeVars(theme.getDesignToken({ algorithm }))
}

beforeEach(() => {
  useDiffViewerStore.setState({ viewType: 'unified', selectedFile: null })
})

afterEach(() => {
  cleanup()
  localStorage.removeItem(THEME_STORAGE_KEY)
  useThemeStore.setState({ mode: 'light' })
})

describe('DiffViewer theme', () => {
  it('scopes the antd-derived diff variables on the root element that wraps the table', () => {
    const { container } = render(<DiffViewer file={FILE} />)
    const root = themeRoot(container)
    expect(root.querySelector('table.diff')).not.toBeNull()
    expect(root.style.getPropertyValue(INSERT_BG)).toBe(
      expectedVars(theme.defaultAlgorithm)[INSERT_BG],
    )
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

    expect(lightInsert).toBe(expectedVars(theme.defaultAlgorithm)[INSERT_BG])
    expect(darkRoot.style.getPropertyValue(INSERT_BG)).toBe(
      expectedVars(theme.darkAlgorithm)[INSERT_BG],
    )
    expect(darkRoot.style.getPropertyValue(INSERT_BG)).not.toBe(lightInsert)
    expect(darkRoot.style.getPropertyValue(DELETE_BG)).not.toBe(lightDelete)
    expect(darkRoot.style.getPropertyValue(TEXT)).not.toBe(lightText)
  })

  it('renders the dark values from the first render when the store starts dark', () => {
    useThemeStore.setState({ mode: 'dark' })
    const { container } = render(
      <UiProvider>
        <DiffViewer file={FILE} />
      </UiProvider>,
    )
    expect(themeRoot(container).style.getPropertyValue(INSERT_BG)).toBe(
      expectedVars(theme.darkAlgorithm)[INSERT_BG],
    )
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
    expect(lightInsert).toBe(expectedVars(theme.defaultAlgorithm)[INSERT_BG])

    act(() => {
      useThemeStore.getState().toggleTheme()
    })

    const rootAfter = themeRoot(container)
    expect(rootAfter).toBe(rootBefore)
    expect(rootAfter.querySelector('table.diff')).toBe(tableBefore)
    expect(rootAfter.style.getPropertyValue(INSERT_BG)).toBe(
      expectedVars(theme.darkAlgorithm)[INSERT_BG],
    )
    expect(rootAfter.style.getPropertyValue(INSERT_BG)).not.toBe(lightInsert)

    act(() => {
      useThemeStore.getState().toggleTheme()
    })
    expect(themeRoot(container)).toBe(rootBefore)
    expect(rootBefore.style.getPropertyValue(INSERT_BG)).toBe(lightInsert)
  })
})
