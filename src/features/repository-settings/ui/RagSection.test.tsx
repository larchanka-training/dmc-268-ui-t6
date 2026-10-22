// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { disabledRagIndex, type RagIndex } from '../../../entities/repository'
import { RAG_POLL_TIMED_OUT_TEXT } from '../lib/ragIndexView'
import { RagSection, type RagSectionProps } from './RagSection'

const SHA = '0123456789abcdef0123456789abcdef01234567'
const READY_INDEX: RagIndex = {
  status: 'ready',
  indexedCommitSha: SHA,
  indexedAt: '2026-10-14T09:30:15.000Z',
  fileCount: 214,
  symbolCount: 1730,
  lastErrorCode: null,
}

type OnChange = (ragEnabled: boolean) => Promise<void>

function element(onChange: OnChange, props: Partial<RagSectionProps> = {}) {
  return (
    <RagSection
      describeError={(error) => `Ошибка: ${error instanceof Error ? error.message : 'неизвестно'}`}
      installationAvailable={true}
      onChange={onChange}
      polling="idle"
      ragEnabled={false}
      ragIndex={disabledRagIndex}
      {...props}
    />
  )
}

function renderSection(props: Partial<RagSectionProps> = {}) {
  const onChange = vi.fn<OnChange>(() => Promise.resolve())
  const view = render(element(onChange, props))
  return {
    onChange,
    view,
    rerenderWith: (next: Partial<RagSectionProps>) => {
      view.rerender(element(onChange, next))
    },
  }
}

function theSwitch(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>('switch', { name: 'RAG' })
}

function statusLine(): HTMLElement {
  return screen.getByRole('status')
}

/** A request that stays open until the test lets it go. */
function deferred(onChange: ReturnType<typeof renderSection>['onChange']): () => Promise<void> {
  let release = (): void => undefined
  onChange.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        release = resolve
      }),
  )
  return async () => {
    await act(async () => {
      release()
      await Promise.resolve()
    })
  }
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

describe('RagSection: the switch', () => {
  it('is a region and a switch named «RAG»', () => {
    renderSection()

    expect(screen.getByRole('region', { name: 'RAG' })).toBeTruthy()
    expect(theSwitch()).toBeTruthy()
  })

  it.each([
    [false, 'false'],
    [true, 'true'],
  ])('reads %s from the props', (ragEnabled, checked) => {
    renderSection({ ragEnabled })

    expect(theSwitch().getAttribute('aria-checked')).toBe(checked)
    expect(theSwitch().disabled).toBe(false)
  })

  it('saves true when the switch is turned on', async () => {
    const { onChange } = renderSection({ ragEnabled: false })

    fireEvent.click(theSwitch())

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1)
    })
    expect(onChange).toHaveBeenLastCalledWith(true)
  })

  it('saves false when the switch is turned off', async () => {
    const { onChange } = renderSection({ ragEnabled: true, ragIndex: READY_INDEX })

    fireEvent.click(theSwitch())

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1)
    })
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('shows the switch as loading and disabled while the change saves', async () => {
    const { onChange } = renderSection()
    const release = deferred(onChange)

    fireEvent.click(theSwitch())

    await waitFor(() => {
      expect(theSwitch().className).toContain('ant-switch-loading')
    })
    expect(theSwitch().disabled).toBe(true)

    await release()
    await waitFor(() => {
      expect(theSwitch().disabled).toBe(false)
    })
    expect(theSwitch().className).not.toContain('ant-switch-loading')
  })

  it('gives the focus back to the switch once the change is saved', async () => {
    const { onChange } = renderSection()
    const release = deferred(onChange)
    const observer = dropFocusWhenDisabled(theSwitch())
    try {
      // A click alone does not focus a button in jsdom, so the switch gets the focus first.
      theSwitch().focus()
      fireEvent.click(theSwitch())
      await waitFor(() => {
        expect(theSwitch().disabled).toBe(true)
      })
      expect(document.activeElement).toBe(document.body)

      await release()

      await waitFor(() => {
        expect(document.activeElement).toBe(theSwitch())
      })
    } finally {
      observer.disconnect()
    }
  })

  it('does not take the focus from a control the user moved to while the change saves', async () => {
    const { onChange } = renderSection()
    const release = deferred(onChange)
    const other = document.createElement('input')
    document.body.append(other)
    const observer = dropFocusWhenDisabled(theSwitch())
    try {
      theSwitch().focus()
      fireEvent.click(theSwitch())
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1)
      })
      other.focus()

      await release()
      await waitFor(() => {
        expect(theSwitch().disabled).toBe(false)
      })

      expect(document.activeElement).toBe(other)
    } finally {
      observer.disconnect()
      other.remove()
    }
  })

  it('shows the error when saving fails, and lets the user try again', async () => {
    const { onChange } = renderSection()
    onChange.mockRejectedValueOnce(new Error('boom'))

    fireEvent.click(theSwitch())

    expect(await screen.findByText('Не удалось изменить настройку RAG')).toBeTruthy()
    expect(screen.getByText('Ошибка: boom')).toBeTruthy()
    expect(screen.getByRole('alert').className).toContain('ant-alert-error')
    await waitFor(() => {
      expect(theSwitch().disabled).toBe(false)
    })
  })

  it('clears the error once a later change is saved', async () => {
    const { onChange } = renderSection()
    onChange.mockRejectedValueOnce(new Error('boom'))
    fireEvent.click(theSwitch())
    expect(await screen.findByText('Не удалось изменить настройку RAG')).toBeTruthy()
    await waitFor(() => {
      expect(theSwitch().disabled).toBe(false)
    })

    fireEvent.click(theSwitch())

    await waitFor(() => {
      expect(screen.queryByText('Не удалось изменить настройку RAG')).toBeNull()
    })
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})

describe('RagSection: the hint', () => {
  it.each([
    ['with access, off', { ragEnabled: false, installationAvailable: true }],
    ['with access, on', { ragEnabled: true, installationAvailable: true, ragIndex: READY_INDEX }],
    ['without access', { ragEnabled: false, installationAvailable: false }],
  ])('is on the page, not in a tooltip: %s', (_, props) => {
    renderSection(props)

    const hint = screen.getByText(
      'RAG добавляет в контекст ревью связанные символы из графа репозитория и увеличивает стоимость ревью. Индекс хранит только граф символов и указатели (путь, строки, commit) — текст кода не хранится.',
    )
    expect(hint.textContent).toContain('связанные символы из графа')
    expect(hint.textContent).toContain('граф символов и указатели')
    expect(hint.textContent).toContain('увеличивает стоимость ревью')
    expect(hint.textContent).toContain('текст кода не хранится')
  })
})

describe('RagSection: GitHub App has no access', () => {
  it('shows the switch off and disabled, says why, and reports the index as «Выключен»', () => {
    renderSection({ installationAvailable: false })

    expect(theSwitch().getAttribute('aria-checked')).toBe('false')
    expect(theSwitch().disabled).toBe(true)
    expect(screen.getByText('Нет доступа GitHub App — RAG недоступен')).toBeTruthy()
    expect(within(statusLine()).getByText('Выключен')).toBeTruthy()
  })

  it('shows the switch off and the index off even when the cache holds a choice and an index', () => {
    // The optimistic update of the mutation does not mask `ragEnabled`; the section does not rely
    // on it.
    renderSection({ installationAvailable: false, ragEnabled: true, ragIndex: READY_INDEX })

    expect(theSwitch().getAttribute('aria-checked')).toBe('false')
    expect(theSwitch().disabled).toBe(true)
    expect(screen.getByText('Нет доступа GitHub App — RAG недоступен')).toBeTruthy()
    expect(within(statusLine()).getByText('Выключен')).toBeTruthy()
    expect(within(statusLine()).queryByText('Готов')).toBeNull()
    expect(statusLine().querySelector('code')).toBeNull()
  })

  it('does not say the access is missing when it is there', () => {
    renderSection({ installationAvailable: true })

    expect(screen.queryByText('Нет доступа GitHub App — RAG недоступен')).toBeNull()
  })
})

describe('RagSection: the index status', () => {
  it('is a polite live region that starts with «Статус индекса:»', () => {
    renderSection()

    expect(statusLine().getAttribute('aria-live')).toBe('polite')
    expect(within(statusLine()).getByText('Статус индекса:')).toBeTruthy()
  })

  it('says «Выключен» while RAG is off', () => {
    renderSection({ ragEnabled: false })

    const tag = within(statusLine()).getByText('Выключен')
    expect(tag.getAttribute('data-tone')).toBe('neutral')
  })

  it('says «Не построен» for an index that is not built yet', () => {
    renderSection({ ragEnabled: true, ragIndex: { ...disabledRagIndex, status: 'empty' } })

    expect(within(statusLine()).getByText('Не построен').getAttribute('data-tone')).toBe('neutral')
  })

  it('says «Строится…» with a pulse while the index builds', () => {
    renderSection({ ragEnabled: true, ragIndex: { ...disabledRagIndex, status: 'building' } })

    const tag = within(statusLine()).getByText('Строится…')
    expect(tag.getAttribute('data-tone')).toBe('info')
    expect(tag.querySelector('[data-pulse]')?.getAttribute('data-pulse')).toBe('true')
  })

  it('does not pulse when the index is not building', () => {
    renderSection({ ragEnabled: true, ragIndex: READY_INDEX })

    expect(statusLine().querySelector('[data-pulse]')).toBeNull()
  })

  it('shows the short sha, the full sha in a tooltip on focus, and the time of a ready index', async () => {
    renderSection({ ragEnabled: true, ragIndex: READY_INDEX })

    expect(within(statusLine()).getByText('Готов').getAttribute('data-tone')).toBe('success')
    const short = within(statusLine()).getByText('0123456')
    expect(short.tagName).toBe('CODE')
    expect(short.tabIndex).toBe(0)
    expect(within(statusLine()).getByText('обновлён 2026-10-14 09:30:15 UTC')).toBeTruthy()
    expect(screen.queryByText(SHA)).toBeNull()

    fireEvent.focus(short)

    expect(await screen.findByText(SHA)).toBeTruthy()
  })

  it('says a ready index of an empty repository is empty', () => {
    renderSection({
      ragEnabled: true,
      ragIndex: { ...READY_INDEX, fileCount: 0, symbolCount: 0 },
    })

    expect(within(statusLine()).getByText('Готов — репозиторий пустой')).toBeTruthy()
    expect(within(statusLine()).getByText('0123456')).toBeTruthy()
  })

  it('says «Устарел», keeps the publication, and explains that the index is still used', () => {
    renderSection({ ragEnabled: true, ragIndex: { ...READY_INDEX, status: 'stale' } })

    const line = within(statusLine())
    expect(line.getByText('Устарел').getAttribute('data-tone')).toBe('warning')
    expect(line.getByText('индекс отстаёт от default branch, используется')).toBeTruthy()
    expect(line.getByText('0123456')).toBeTruthy()
    expect(line.getByText('обновлён 2026-10-14 09:30:15 UTC')).toBeTruthy()
  })

  it('says «Ошибка» with the raw error code of a failed index, and no publication', () => {
    renderSection({
      ragEnabled: true,
      ragIndex: { ...disabledRagIndex, status: 'failed', lastErrorCode: 'limit_exceeded:symbols' },
    })

    const line = within(statusLine())
    expect(line.getByText('Ошибка').getAttribute('data-tone')).toBe('danger')
    const code = line.getByText('limit_exceeded:symbols')
    expect(code.tagName).toBe('CODE')
    expect(line.queryByText(/обновлён/)).toBeNull()
  })

  it('says «Ошибка» with no code when a failed index carries none', () => {
    renderSection({ ragEnabled: true, ragIndex: { ...disabledRagIndex, status: 'failed' } })

    expect(within(statusLine()).getByText('Ошибка')).toBeTruthy()
    expect(statusLine().querySelector('code')).toBeNull()
  })

  it('follows the props when the index moves from building to ready', () => {
    const { rerenderWith } = renderSection({
      ragEnabled: true,
      ragIndex: { ...disabledRagIndex, status: 'building' },
    })
    expect(within(statusLine()).getByText('Строится…')).toBeTruthy()

    rerenderWith({ ragEnabled: true, ragIndex: READY_INDEX })

    expect(within(statusLine()).queryByText('Строится…')).toBeNull()
    expect(within(statusLine()).getByText('Готов')).toBeTruthy()
  })
})

describe('RagSection: polling', () => {
  it.each(['idle', 'waiting'] as const)(
    'says nothing about the updates while it is %s',
    (polling) => {
      renderSection({ ragEnabled: true, polling })

      expect(screen.queryByText(RAG_POLL_TIMED_OUT_TEXT)).toBeNull()
    },
  )

  it('says the updates have stopped once the polling timed out', () => {
    renderSection({
      ragEnabled: true,
      polling: 'timedOut',
      ragIndex: { ...disabledRagIndex, status: 'building' },
    })

    expect(within(statusLine()).getByText(RAG_POLL_TIMED_OUT_TEXT)).toBeTruthy()
    expect(RAG_POLL_TIMED_OUT_TEXT).toBe('Автообновление остановлено — обновите страницу')
    expect(within(statusLine()).getByText('Строится…')).toBeTruthy()
  })
})
