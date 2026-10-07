// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { ConfigProvider, theme } from 'antd'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { fromPatch } from '../../../entities/diff'
import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'
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

const LIGHT = theme.getDesignToken({ algorithm: theme.defaultAlgorithm })
const DARK = theme.getDesignToken({ algorithm: theme.darkAlgorithm })

beforeEach(() => {
  useDiffViewerStore.setState({ viewType: 'unified', selectedFile: null })
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
