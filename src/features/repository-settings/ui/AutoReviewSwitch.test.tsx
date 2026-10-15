// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AutoReviewSwitch, type AutoReviewSwitchProps } from './AutoReviewSwitch'

const SWITCH_LABEL = 'Автоматическое ревью'
// Regular expressions: antd adds an icon named «loading» to the name of a loading button.
const ENABLE_LABEL = /Включить авто-ревью/
const KEEP_OFF_LABEL = /Оставить выключенным/
const ERROR_TITLE = 'Не удалось изменить автоматическое ревью'
const WARNING_TITLE = 'Автоматическое ревью недоступно'
const WARNING_TEXT =
  'У GitHub App нет доступа к этому репозиторию, поэтому автоматическое ревью не запустится. Выберите, что сделать, когда доступ к GitHub App будет восстановлен: сохранённый выбор здесь не показывается, пока доступа нет.'

type OnChange = (enabled: boolean) => Promise<void>

function element(onChange: OnChange, props: Partial<AutoReviewSwitchProps> = {}) {
  return (
    <AutoReviewSwitch
      describeError={(error) => `Ошибка: ${error instanceof Error ? error.message : 'неизвестно'}`}
      enabled={false}
      installationAvailable={false}
      onChange={onChange}
      {...props}
    />
  )
}

function renderSwitch(props: Partial<AutoReviewSwitchProps> = {}) {
  const onChange = vi.fn<OnChange>(() => Promise.resolve())
  const view = render(element(onChange, props))
  return {
    onChange,
    view,
    rerenderWith: (next: Partial<AutoReviewSwitchProps>) => {
      view.rerender(element(onChange, next))
    },
  }
}

function theSwitch(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>('switch', { name: SWITCH_LABEL })
}

function enableButton(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>('button', { name: ENABLE_LABEL })
}

function keepOffButton(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>('button', { name: KEEP_OFF_LABEL })
}

/**
 * Browsers hand the focus of a button that turns disabled to <body>; jsdom keeps it where it was,
 * and cannot blur a disabled element. This does what the browsers do, so a test can tell a
 * component that gives the focus back from one that never loses it.
 */
function dropFocusWhenDisabled(element: HTMLElement): MutationObserver {
  const observer = new MutationObserver(() => {
    if (element.hasAttribute('disabled') && document.activeElement === element) {
      const sentinel = document.createElement('div')
      sentinel.tabIndex = -1
      document.body.append(sentinel)
      sentinel.focus()
      sentinel.blur()
      sentinel.remove()
    }
  })
  observer.observe(element, { attributes: true, attributeFilter: ['disabled'] })
  return observer
}

afterEach(() => {
  cleanup()
})

describe('AutoReviewSwitch: GitHub App has no access', () => {
  it('disables the switch and shows the server value, off', () => {
    renderSwitch({ enabled: false, installationAvailable: false })

    expect(theSwitch().getAttribute('aria-checked')).toBe('false')
    expect(theSwitch().disabled).toBe(true)
  })

  it('shows the switch off even when the cache holds a choice the server has not confirmed', () => {
    // The optimistic update of a save writes `enabled: true` into the cache before the answer.
    renderSwitch({ enabled: true, installationAvailable: false })

    expect(theSwitch().getAttribute('aria-checked')).toBe('false')
  })

  it('explains why auto-review does not run and offers the two choices', () => {
    renderSwitch()

    expect(screen.getByText(WARNING_TITLE)).toBeTruthy()
    expect(screen.getByText(WARNING_TEXT)).toBeTruthy()
    expect(enableButton()).toBeTruthy()
    expect(keepOffButton()).toBeTruthy()
  })

  it('saves true from «Включить авто-ревью» and false from «Оставить выключенным»', async () => {
    const { onChange } = renderSwitch()

    fireEvent.click(enableButton())
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1)
    })
    expect(onChange).toHaveBeenLastCalledWith(true)
    await waitFor(() => {
      expect(keepOffButton().disabled).toBe(false)
    })

    fireEvent.click(keepOffButton())
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(2)
    })
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('shows the clicked button as loading and disables both while the choice saves', async () => {
    const { onChange } = renderSwitch()
    let release = (): void => undefined
    onChange.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )

    fireEvent.click(keepOffButton())

    await waitFor(() => {
      expect(keepOffButton().className).toContain('ant-btn-loading')
    })
    expect(enableButton().className).not.toContain('ant-btn-loading')
    expect(keepOffButton().disabled).toBe(true)
    expect(enableButton().disabled).toBe(true)
    // The switch itself is not saving.
    expect(theSwitch().className).not.toContain('ant-switch-loading')

    await act(async () => {
      release()
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(keepOffButton().disabled).toBe(false)
    })
    expect(enableButton().disabled).toBe(false)
    expect(keepOffButton().className).not.toContain('ant-btn-loading')
  })

  it('gives the focus back to the clicked button once the choice is saved', async () => {
    const { onChange } = renderSwitch()
    const button = keepOffButton()
    const observer = dropFocusWhenDisabled(button)
    try {
      button.focus()

      fireEvent.click(button)
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1)
      })

      await waitFor(() => {
        expect(document.activeElement).toBe(button)
      })
    } finally {
      observer.disconnect()
    }
  })

  it('does not take the focus from a control the user moved to while the choice saves', async () => {
    const { onChange } = renderSwitch()
    let release = (): void => undefined
    onChange.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    const other = document.createElement('input')
    document.body.append(other)
    const button = enableButton()
    const observer = dropFocusWhenDisabled(button)
    try {
      button.focus()
      fireEvent.click(button)
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1)
      })
      other.focus()

      await act(async () => {
        release()
        await Promise.resolve()
      })
      await waitFor(() => {
        expect(button.disabled).toBe(false)
      })

      expect(document.activeElement).toBe(other)
    } finally {
      observer.disconnect()
      other.remove()
    }
  })

  it('shows the error when saving the choice fails, and lets the user choose again', async () => {
    const { onChange } = renderSwitch()
    onChange.mockRejectedValueOnce(new Error('boom'))

    fireEvent.click(enableButton())

    expect(await screen.findByText(ERROR_TITLE)).toBeTruthy()
    expect(screen.getByText('Ошибка: boom')).toBeTruthy()
    await waitFor(() => {
      expect(enableButton().disabled).toBe(false)
    })
    expect(keepOffButton().disabled).toBe(false)
  })

  it('moves the focus to the switch when the warning goes away while a choice button had it', () => {
    const { rerenderWith } = renderSwitch()
    keepOffButton().focus()
    expect(document.activeElement).toBe(keepOffButton())

    rerenderWith({ enabled: true, installationAvailable: true })

    expect(screen.queryByText(WARNING_TITLE)).toBeNull()
    expect(theSwitch().disabled).toBe(false)
    expect(document.activeElement).toBe(theSwitch())
  })

  it('moves no focus when the warning goes away and no choice button had it', () => {
    const { rerenderWith } = renderSwitch()
    expect(document.activeElement).toBe(document.body)

    rerenderWith({ enabled: true, installationAvailable: true })

    expect(screen.queryByText(WARNING_TITLE)).toBeNull()
    expect(document.activeElement).toBe(document.body)
  })
})

describe('AutoReviewSwitch: GitHub App has access', () => {
  it('shows no choice buttons and keeps the switch usable', async () => {
    const { onChange } = renderSwitch({ enabled: true, installationAvailable: true })

    expect(screen.queryByText(WARNING_TITLE)).toBeNull()
    expect(screen.queryByRole('button', { name: ENABLE_LABEL })).toBeNull()
    expect(screen.queryByRole('button', { name: KEEP_OFF_LABEL })).toBeNull()
    expect(theSwitch().disabled).toBe(false)
    expect(theSwitch().getAttribute('aria-checked')).toBe('true')

    fireEvent.click(theSwitch())

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(false)
    })
  })
})
