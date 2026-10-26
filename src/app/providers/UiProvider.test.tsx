// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { ConfigProvider, Empty } from 'antd'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useLanguageStore } from '../../features/language'
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

function LocaleProbe() {
  const { locale } = useContext(ConfigProvider.ConfigContext)
  return <output data-testid="antd-locale">{locale?.locale}</output>
}

describe('UiProvider language', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('switches the Ant Design locale and <html lang> together with the language', () => {
    const view = render(
      <UiProvider>
        <LocaleProbe />
        <Empty />
      </UiProvider>,
    )
    // The suite runs in Russian (src/test/setup.ts).
    expect(document.documentElement.lang).toBe('ru')
    expect(view.getByTestId('antd-locale').textContent).toBe('ru')
    expect(view.container.querySelector('.ant-empty-description')?.textContent).toBe('Нет данных')

    act(() => {
      useLanguageStore.getState().setLanguage('en')
    })
    expect(document.documentElement.lang).toBe('en')
    expect(view.getByTestId('antd-locale').textContent).toBe('en')
    expect(view.container.querySelector('.ant-empty-description')?.textContent).toBe('No data')
  })
})
