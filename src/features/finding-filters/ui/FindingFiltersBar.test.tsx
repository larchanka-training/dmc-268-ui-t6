// @vitest-environment jsdom
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { stubResponsiveSelectLayout } from '../../../test/responsiveSelectLayout'
import { EMPTY_FINDING_FILTERS, type FindingFilters } from '../model/findingFilters'
import { FindingFiltersBar } from './FindingFiltersBar'

const FILE_OPTIONS = [
  { file: 'src/a.ts', count: 6 },
  { file: 'README.md', count: 1 },
  { file: 'src/utils/retry.ts', count: 0 },
]

interface RenderOptions {
  filters?: FindingFilters
  shown?: number
  total?: number
  empty?: boolean
  navigationKey?: number
}

function renderBar(options: RenderOptions = {}) {
  const onChange = vi.fn()
  const onQueryChange = vi.fn()
  const onReset = vi.fn()
  function bar(next: RenderOptions) {
    return (
      <FindingFiltersBar
        empty={next.empty}
        fileOptions={FILE_OPTIONS}
        filters={next.filters ?? EMPTY_FINDING_FILTERS}
        navigationKey={next.navigationKey}
        onChange={onChange}
        onQueryChange={onQueryChange}
        onReset={onReset}
        shown={next.shown ?? 8}
        total={next.total ?? 8}
      />
    )
  }
  const view = render(bar(options))
  return {
    onChange,
    onQueryChange,
    onReset,
    rerender: (next: RenderOptions) => {
      view.rerender(bar(next))
    },
    unmount: view.unmount,
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function searchInput(): HTMLInputElement {
  return screen.getByRole('textbox', { name: 'Поиск по замечаниям' })
}

function type(text: string): void {
  fireEvent.change(searchInput(), { target: { value: text } })
}

function openSelect(name: string): void {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }))
}

function optionTexts(): string[] {
  return [...document.querySelectorAll('.ant-select-item-option')].map(
    (option) => option.textContent,
  )
}

function clickOption(text: string): void {
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(
    (candidate) => candidate.textContent === text,
  )
  if (option === undefined) {
    throw new Error(`option "${text}" is not rendered`)
  }
  fireEvent.click(option)
}

function resetButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Сбросить фильтры' })
}

/** The shown chips of a select: neither the «+N» chip nor the chips folded into it. */
function chips(name: string): Element[] {
  const selector = screen.getByRole('combobox', { name }).closest('.ant-select')
  expect(selector).not.toBeNull()
  return [
    ...(selector?.querySelectorAll<HTMLElement>(
      '.ant-select-content-item:not(.ant-select-content-item-rest)',
    ) ?? []),
  ]
    .filter((item) => item.style.opacity !== '0')
    .flatMap((item) => [...item.querySelectorAll('.ant-select-selection-item')])
}

/** The text of the «+N» chip of a select, or `null` while every chip fits. */
function restChip(name: string): string | null {
  const rest = screen
    .getByRole('combobox', { name })
    .closest('.ant-select')
    ?.querySelector<HTMLElement>('.ant-select-content-item-rest')
  return rest === undefined || rest === null || rest.style.opacity === '0' ? null : rest.textContent
}

beforeEach(() => {
  stubResponsiveSelectLayout()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('FindingFiltersBar', () => {
  it('shows the two selects, the search input and the counter', () => {
    renderBar({ shown: 3, total: 8 })

    expect(screen.getByRole('combobox', { name: 'Файлы' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Критичность' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Поиск по замечаниям' })).toBeTruthy()
    expect(screen.getByText('Показано 3 из 8 замечаний')).toBeTruthy()
  })

  it('says in the placeholders what an empty field means and what the search matches', () => {
    renderBar()

    expect(screen.getByText('Все файлы')).toBeTruthy()
    expect(screen.getByText('Все уровни')).toBeTruthy()
    expect(screen.getByPlaceholderText('Текст, правило')).toBeTruthy()
  })

  it('labels each field with visible text tied to its control, in an inline form', () => {
    renderBar()

    expect(screen.getByTestId('finding-filters-bar').classList.contains('ant-form-inline')).toBe(
      true,
    )

    const fields = [
      screen.getByRole('combobox', { name: 'Файлы' }),
      screen.getByRole('combobox', { name: 'Критичность' }),
      screen.getByRole('textbox', { name: 'Поиск по замечаниям' }),
    ]
    expect(
      fields.map((field) =>
        [...((field as HTMLInputElement).labels ?? [])].map((label) => label.textContent),
      ),
    ).toEqual([['Файлы'], ['Критичность'], ['Поиск']])
  })

  it('labels the file options "file (count)" in the given order', () => {
    renderBar()
    openSelect('Файлы')

    expect(optionTexts()).toEqual(['src/a.ts (6)', 'README.md (1)', 'src/utils/retry.ts (0)'])
  })

  it('offers the three severity groups with the badge labels', () => {
    renderBar()
    openSelect('Критичность')

    expect(optionTexts()).toEqual(['Critical', 'Warning', 'Info'])
  })

  it('pushes a file selection: onChange(next) without options', () => {
    const { onChange } = renderBar()
    openSelect('Файлы')
    clickOption('README.md (1)')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ files: ['README.md'], query: '' })
    expect(onChange.mock.calls[0]).toHaveLength(1)
  })

  it('adds a file to the files already selected', () => {
    const { onChange } = renderBar({ filters: { ...EMPTY_FINDING_FILTERS, files: ['src/a.ts'] } })
    openSelect('Файлы')
    clickOption('README.md (1)')

    expect(onChange).toHaveBeenCalledWith({ files: ['src/a.ts', 'README.md'], query: '' })
  })

  it('pushes a severity selection', () => {
    const { onChange } = renderBar()
    openSelect('Критичность')
    clickOption('Warning')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ severities: ['warning'], query: '' })
    expect(onChange.mock.calls[0]).toHaveLength(1)
  })

  it('emits severities in canonical group order, whatever the click order', () => {
    const { onChange } = renderBar({
      filters: { ...EMPTY_FINDING_FILTERS, severities: ['info'] },
    })
    openSelect('Критичность')
    clickOption('Critical')

    expect(onChange).toHaveBeenCalledWith({ severities: ['critical', 'info'], query: '' })
  })

  it('shows the selected files as tags by file name, including one the run does not have', async () => {
    renderBar({ filters: { ...EMPTY_FINDING_FILTERS, files: ['README.md', 'gone.ts'] } })

    await waitFor(() => {
      expect(chips('Файлы').map((chip) => chip.textContent)).toEqual(['README.md', 'gone.ts'])
    })
  })

  it('shows a selected file by its name, the whole path in the tooltip and in the list', async () => {
    renderBar({ filters: { ...EMPTY_FINDING_FILTERS, files: ['src/utils/retry.ts'] } })

    // Every read of a chip inside the wait: the stubbed observer may re-measure in between.
    await waitFor(() => {
      const shown = chips('Файлы')
      expect(shown.map((chip) => chip.textContent)).toEqual(['retry.ts'])
      expect(shown[0]?.getAttribute('title')).toBe('src/utils/retry.ts')
    })
    openSelect('Файлы')
    expect(optionTexts()).toEqual(['src/a.ts (6)', 'README.md (1)', 'src/utils/retry.ts (0)'])
  })

  it('cuts a long file name in its chip', async () => {
    renderBar({
      filters: {
        ...EMPTY_FINDING_FILTERS,
        files: ['src/features/finding-filters/model/useFindingFiltersParams.ts'],
      },
    })

    await waitFor(() => {
      expect(chips('Файлы').map((chip) => chip.textContent)).toEqual(['useFindingF...'])
    })
  })

  it('folds the chips that do not fit into a short «+N» chip in both selects', async () => {
    stubResponsiveSelectLayout(35)
    renderBar({
      filters: {
        ...EMPTY_FINDING_FILTERS,
        files: ['src/a.ts', 'README.md', 'src/utils/retry.ts'],
        severities: ['critical', 'warning', 'info'],
      },
    })

    await waitFor(() => {
      expect(restChip('Файлы')).toBe('+2')
      expect(chips('Файлы').map((chip) => chip.textContent)).toEqual(['a.ts'])
      expect(restChip('Критичность')).toBe('+2')
      expect(chips('Критичность').map((chip) => chip.textContent)).toEqual(['Critical'])
    })
  })

  it('names the clear buttons of both selects in Russian once they have a value', () => {
    const { onChange } = renderBar({
      filters: { ...EMPTY_FINDING_FILTERS, files: ['src/a.ts'], severities: ['critical'] },
    })

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Очистить выбор критичности' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Очистить выбор файлов' }))
    expect(onChange).toHaveBeenCalledWith({ files: [], query: '' })
  })

  it('names the clear button of the search in Russian once it has text', async () => {
    const { onQueryChange } = renderBar({ filters: { ...EMPTY_FINDING_FILTERS, query: 'утечка' } })

    expect(screen.queryByRole('button', { name: 'close-circle' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Очистить поиск' }))
    expect(searchInput().value).toBe('')
    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith('')
    })
  })

  it('shows the selected severities as tags', async () => {
    renderBar({ filters: { ...EMPTY_FINDING_FILTERS, severities: ['critical', 'info'] } })

    await waitFor(() => {
      expect(chips('Критичность').map((chip) => chip.textContent)).toEqual(['Critical', 'Info'])
    })
  })

  it('shows the query in the search input', () => {
    renderBar({ filters: { ...EMPTY_FINDING_FILTERS, query: 'утечка' } })

    expect(screen.getByRole('textbox', { name: 'Поиск по замечаниям' })).toHaveProperty(
      'value',
      'утечка',
    )
  })

  it('typing goes through onQueryChange, not onChange', async () => {
    const { onChange, onQueryChange } = renderBar({
      filters: { ...EMPTY_FINDING_FILTERS, files: ['src/a.ts'] },
    })
    type('console')

    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledTimes(1)
    })
    expect(onQueryChange).toHaveBeenCalledWith('console')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clearing the search with the clear icon empties the text and writes the empty query', async () => {
    const { onQueryChange } = renderBar({ filters: { ...EMPTY_FINDING_FILTERS, query: 'console' } })
    const clearIcon = document.querySelector('.ant-input-clear-icon')
    expect(clearIcon).not.toBeNull()
    if (clearIcon !== null) {
      fireEvent.click(clearIcon)
    }

    expect(searchInput().value).toBe('')
    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith('')
    })
  })

  describe('«Сбросить фильтры»', () => {
    // The bar's button turns disabled and the empty message goes away after a reset; the focus
    // must not fall back to the page (.agents/rules/frontend.md §3b, item 3).
    it('moves the focus to the Files select, the start of the bar', () => {
      renderBar({ filters: { ...EMPTY_FINDING_FILTERS, severities: ['info'] } })
      const button = within(screen.getByTestId('finding-filters-bar')).getByRole('button', {
        name: 'Сбросить фильтры',
      })
      button.focus()

      fireEvent.click(button)

      expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Файлы' }))
    })

    it('moves the focus to the Files select from the button of the empty message too', () => {
      renderBar({ empty: true, filters: { ...EMPTY_FINDING_FILTERS, query: 'zzzz' } })
      const button = within(screen.getByTestId('findings-filter-empty')).getByRole('button', {
        name: 'Сбросить фильтры',
      })
      button.focus()

      fireEvent.click(button)

      expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Файлы' }))
    })

    it('is disabled when nothing is active', () => {
      renderBar()
      expect(resetButton().hasAttribute('disabled')).toBe(true)
    })

    it.each<[string, FindingFilters]>([
      ['a file', { ...EMPTY_FINDING_FILTERS, files: ['src/a.ts'] }],
      ['a severity', { ...EMPTY_FINDING_FILTERS, severities: ['info'] }],
      ['a query', { ...EMPTY_FINDING_FILTERS, query: 'x' }],
      ['a whitespace-only query', { ...EMPTY_FINDING_FILTERS, query: '   ' }],
    ])('is enabled with %s', (_name, filters) => {
      renderBar({ filters })
      expect(resetButton().hasAttribute('disabled')).toBe(false)
    })

    it('calls onReset and nothing else', () => {
      const { onChange, onReset } = renderBar({
        filters: { ...EMPTY_FINDING_FILTERS, severities: ['info'] },
      })
      fireEvent.click(resetButton())

      expect(onReset).toHaveBeenCalledTimes(1)
      expect(onChange).not.toHaveBeenCalled()
    })

    it('is inside the bar, in one group with the counter', () => {
      renderBar()
      const bar = screen.getByTestId('finding-filters-bar')
      expect(within(bar).getByRole('button', { name: 'Сбросить фильтры' })).toBeTruthy()
      // The pair wraps as one item of the bar, so the button never lands alone on a row.
      const group = screen.getByRole('status').parentElement
      expect(group?.parentElement).toBe(bar)
      expect(resetButton().parentElement).toBe(group)
    })
  })
})

describe('FindingFiltersBar search text', () => {
  it('shows the typed text at once and writes it once, after the debounce', async () => {
    const { onQueryChange } = renderBar()
    type('a')
    type('ab')
    type('abc')

    expect(searchInput().value).toBe('abc')
    expect(onQueryChange).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledTimes(1)
    })
    expect(onQueryChange).toHaveBeenCalledWith('abc')
    expect(searchInput().value).toBe('abc')
  })

  it('does not write a text that is already the query', async () => {
    const { onQueryChange } = renderBar({ filters: { ...EMPTY_FINDING_FILTERS, query: 'abc' } })
    type('abcd')
    type('abc')

    await pause(400)
    expect(onQueryChange).not.toHaveBeenCalled()
  })

  it('limits the text to 200 characters', () => {
    renderBar()
    expect(searchInput().maxLength).toBe(200)
  })

  // jsdom submits nothing on Enter, so the test pins both halves: the bar's form never lets a
  // submit through (no page reload), and Enter itself neither filters nor drops the text.
  it('Enter in the search field neither submits the bar nor reloads the page', () => {
    const { onChange, onQueryChange, onReset } = renderBar()
    const form = searchInput().closest('form')
    expect(form).not.toBeNull()
    if (form === null) {
      return
    }
    type('утечка')

    fireEvent.keyDown(searchInput(), { key: 'Enter', code: 'Enter', keyCode: 13 })
    const submit = createEvent.submit(form)
    fireEvent(form, submit)

    expect(submit.defaultPrevented).toBe(true)
    expect(searchInput().value).toBe('утечка')
    expect(onChange).not.toHaveBeenCalled()
    expect(onQueryChange).not.toHaveBeenCalled()
    expect(onReset).not.toHaveBeenCalled()
  })

  it('a select flushes the typed text into its own call and cancels the pending write', async () => {
    const { onChange, onQueryChange } = renderBar()
    type('abc')
    openSelect('Критичность')
    clickOption('Warning')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ severities: ['warning'], query: 'abc' })
    expect(onChange.mock.calls[0]).toHaveLength(1)
    expect(searchInput().value).toBe('abc')
    await pause(400)
    expect(onQueryChange).not.toHaveBeenCalled()
  })

  it('a file select flushes the typed text too', () => {
    const { onChange } = renderBar()
    type('abc')
    openSelect('Файлы')
    clickOption('README.md (1)')

    expect(onChange).toHaveBeenCalledWith({ files: ['README.md'], query: 'abc' })
  })

  it('reset empties the text and cancels the pending write', async () => {
    const { onQueryChange, onReset } = renderBar()
    type('abc')
    fireEvent.click(resetButton())

    expect(onReset).toHaveBeenCalledTimes(1)
    expect(searchInput().value).toBe('')
    await pause(400)
    expect(onQueryChange).not.toHaveBeenCalled()
  })

  it('reset is enabled by a text that is not in the URL yet', () => {
    renderBar()
    expect(resetButton().hasAttribute('disabled')).toBe(true)
    type('a')
    expect(resetButton().hasAttribute('disabled')).toBe(false)
  })

  it('shows the URL query again when it changes to a value the bar did not write', () => {
    const { rerender } = renderBar()
    expect(searchInput().value).toBe('')

    rerender({ filters: { ...EMPTY_FINDING_FILTERS, query: 'from a link' } })

    expect(searchInput().value).toBe('from a link')
  })

  it('an outside change of the query drops the pending write and the typed text', async () => {
    const { onQueryChange, rerender } = renderBar({
      filters: { ...EMPTY_FINDING_FILTERS, query: 'old' },
    })
    type('old more')
    rerender({ filters: { ...EMPTY_FINDING_FILTERS, query: '' } })

    expect(searchInput().value).toBe('')
    await pause(400)
    expect(onQueryChange).not.toHaveBeenCalled()
  })

  it('keeps the typed text while the URL catches up with an earlier part of it', async () => {
    const { onQueryChange, rerender } = renderBar()
    type('a')
    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith('a')
    })
    type('ab')

    // the write of 'a' lands while 'ab' is still being typed
    rerender({ filters: { ...EMPTY_FINDING_FILTERS, query: 'a' } })
    expect(searchInput().value).toBe('ab')

    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith('ab')
    })
    rerender({ filters: { ...EMPTY_FINDING_FILTERS, query: 'ab' } })
    expect(searchInput().value).toBe('ab')
  })

  it('keeps the typed text when an earlier write lands after a later one was made', async () => {
    const { onQueryChange, rerender } = renderBar()
    type('a')
    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith('a')
    })
    type('ab')
    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith('ab')
    })

    rerender({ filters: { ...EMPTY_FINDING_FILTERS, query: 'a' } })
    expect(searchInput().value).toBe('ab')
    rerender({ filters: { ...EMPTY_FINDING_FILTERS, query: 'ab' } })
    expect(searchInput().value).toBe('ab')
  })

  it('follows the URL again once it has caught up with what was written', async () => {
    const { onQueryChange, rerender } = renderBar()
    type('a')
    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith('a')
    })
    rerender({ filters: { ...EMPTY_FINDING_FILTERS, query: 'a' } })

    // back: the URL returns to the empty query, which the bar did not write after catching up
    rerender({ filters: EMPTY_FINDING_FILTERS })

    expect(searchInput().value).toBe('')
  })

  it('writes the empty text over a query that is in the URL', async () => {
    const { onQueryChange } = renderBar({ filters: { ...EMPTY_FINDING_FILTERS, query: 'abc' } })
    type('')

    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith('')
    })
  })

  it('drops a pending write when the bar goes away', async () => {
    const { onQueryChange, unmount } = renderBar()
    type('abc')
    unmount()

    await pause(400)
    expect(onQueryChange).not.toHaveBeenCalled()
  })

  it('announces the counter as a status in secondary text', () => {
    renderBar({ shown: 3, total: 8 })

    const status = screen.getByRole('status')
    expect(status.textContent).toBe('Показано 3 из 8 замечаний')
    expect(status.classList.contains('ant-typography-secondary')).toBe(true)
  })

  it('the reset button of the empty message also empties the typed text and cancels the pending write', async () => {
    const { onQueryChange, onReset } = renderBar({
      empty: true,
      filters: { ...EMPTY_FINDING_FILTERS, severities: ['critical'] },
    })
    type('abc')
    fireEvent.click(
      within(screen.getByTestId('findings-filter-empty')).getByRole('button', {
        name: 'Сбросить фильтры',
      }),
    )

    expect(onReset).toHaveBeenCalledTimes(1)
    expect(searchInput().value).toBe('')
    await pause(400)
    expect(onQueryChange).not.toHaveBeenCalled()
  })

  it('shows the empty message only when asked to', () => {
    const { rerender } = renderBar()
    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()

    rerender({ empty: true })
    expect(screen.getByTestId('findings-filter-empty')).toBeTruthy()
  })

  it('writes once, after the last key, when the gaps are short but the typing is long', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const { onQueryChange } = renderBar()
      type('a')
      vi.advanceTimersByTime(150)
      type('ab')
      vi.advanceTimersByTime(150)
      type('abc')
      vi.advanceTimersByTime(150)
      type('abcd')
      // 450 ms since the first key: a throttle would have written by now
      vi.advanceTimersByTime(249)
      expect(onQueryChange).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(onQueryChange).toHaveBeenCalledTimes(1)
      expect(onQueryChange).toHaveBeenCalledWith('abcd')
    } finally {
      vi.useRealTimers()
    }
  })

  it('an outside navigation drops the pending write and shows the URL query, even if it did not change', async () => {
    const { onQueryChange, rerender } = renderBar({
      filters: { ...EMPTY_FINDING_FILTERS, query: 'old' },
      navigationKey: 0,
    })
    type('old more')

    rerender({ filters: { ...EMPTY_FINDING_FILTERS, query: 'old' }, navigationKey: 1 })

    expect(searchInput().value).toBe('old')
    await pause(400)
    expect(onQueryChange).not.toHaveBeenCalled()
  })

  it('keeps the typed text while the navigation key stays the same', async () => {
    const { onQueryChange, rerender } = renderBar({
      filters: { ...EMPTY_FINDING_FILTERS, query: 'old' },
      navigationKey: 3,
    })
    type('old more')

    rerender({ filters: { ...EMPTY_FINDING_FILTERS, query: 'old' }, navigationKey: 3 })

    expect(searchInput().value).toBe('old more')
    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith('old more')
    })
  })
})
