// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useThemeStore } from '../../features/theme'
import { UiProvider } from './UiProvider'

describe('UiProvider ThemeBodySync', () => {
  beforeEach(() => {
    document.documentElement.style.colorScheme = ''
    document.body.style.backgroundColor = ''
    document.body.style.color = ''
  })

  afterEach(() => {
    cleanup()
    useThemeStore.setState({ mode: 'light' })
  })

  it('sets documentElement colorScheme to dark when mode is dark', () => {
    useThemeStore.setState({ mode: 'dark' })
    render(
      <UiProvider>
        <div>Content</div>
      </UiProvider>,
    )

    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.body.style.backgroundColor).not.toBe('')
  })

  it('sets documentElement colorScheme to light when mode is light', () => {
    useThemeStore.setState({ mode: 'light' })
    render(
      <UiProvider>
        <div>Content</div>
      </UiProvider>,
    )

    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})
