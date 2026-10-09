// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
}

function renderBar(options: RenderOptions = {}) {
  const onChange = vi.fn()
  const onQueryChange = vi.fn()
  const onReset = vi.fn()
  function bar(next: RenderOptions) {
    return (
      <FindingFiltersBar
        fileOptions={FILE_OPTIONS}
        filters={next.filters ?? EMPTY_FINDING_FILTERS}
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
  return screen.getByPlaceholderText('Поиск по замечаниям')
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

afterEach(() => {
  cleanup()
})

describe('FindingFiltersBar', () => {
  it('shows the two selects, the search input and the counter', () => {
    renderBar({ shown: 3, total: 8 })

    expect(screen.getByRole('combobox', { name: 'Файлы' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Критичность' })).toBeTruthy()
    expect(screen.getByPlaceholderText('Поиск по замечаниям')).toBeTruthy()
    expect(screen.getByText('Показано 3 из 8 замечаний')).toBeTruthy()
    expect(screen.getByText('Файлы')).toBeTruthy()
    expect(screen.getByText('Критичность')).toBeTruthy()
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
    expect(onChange).toHaveBeenCalledWith({ files: ['README.md'], severities: [], query: '' })
    expect(onChange.mock.calls[0]).toHaveLength(1)
  })

  it('adds a file to the files already selected', () => {
    const { onChange } = renderBar({ filters: { ...EMPTY_FINDING_FILTERS, files: ['src/a.ts'] } })
    openSelect('Файлы')
    clickOption('README.md (1)')

    expect(onChange).toHaveBeenCalledWith({
      files: ['src/a.ts', 'README.md'],
      severities: [],
      query: '',
    })
  })

  it('pushes a severity selection', () => {
    const { onChange } = renderBar()
    openSelect('Критичность')
    clickOption('Warning')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ files: [], severities: ['warning'], query: '' })
    expect(onChange.mock.calls[0]).toHaveLength(1)
  })

  it('emits severities in canonical group order, whatever the click order', () => {
    const { onChange } = renderBar({
      filters: { ...EMPTY_FINDING_FILTERS, severities: ['info'] },
    })
    openSelect('Критичность')
    clickOption('Critical')

    expect(onChange).toHaveBeenCalledWith({
      files: [],
      severities: ['critical', 'info'],
      query: '',
    })
  })

  it('shows the selected files as tags by file name, including one the run does not have', () => {
    renderBar({ filters: { ...EMPTY_FINDING_FILTERS, files: ['README.md', 'gone.ts'] } })

    const selector = screen.getByRole('combobox', { name: 'Файлы' }).closest('.ant-select')
    expect(selector).not.toBeNull()
    const tags = [...(selector?.querySelectorAll('.ant-select-selection-item') ?? [])].map(
      (tag) => tag.textContent,
    )
    expect(tags).toEqual(['README.md', 'gone.ts'])
  })

  it('shows the selected severities as tags', () => {
    renderBar({ filters: { ...EMPTY_FINDING_FILTERS, severities: ['critical', 'info'] } })

    const selector = screen.getByRole('combobox', { name: 'Критичность' }).closest('.ant-select')
    const tags = [...(selector?.querySelectorAll('.ant-select-selection-item') ?? [])].map(
      (tag) => tag.textContent,
    )
    expect(tags).toEqual(['Critical', 'Info'])
  })

  it('shows the query in the search input', () => {
    renderBar({ filters: { ...EMPTY_FINDING_FILTERS, query: 'утечка' } })

    expect(screen.getByPlaceholderText('Поиск по замечаниям')).toHaveProperty('value', 'утечка')
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

    it('is inside the bar', () => {
      renderBar()
      const bar = screen.getByTestId('finding-filters-bar')
      expect(within(bar).getByRole('button', { name: 'Сбросить фильтры' })).toBeTruthy()
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

  it('a select flushes the typed text into its own call and cancels the pending write', async () => {
    const { onChange, onQueryChange } = renderBar()
    type('abc')
    openSelect('Критичность')
    clickOption('Warning')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ files: [], severities: ['warning'], query: 'abc' })
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

    expect(onChange).toHaveBeenCalledWith({ files: ['README.md'], severities: [], query: 'abc' })
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

  it('announces the counter as a status in normal text', () => {
    renderBar({ shown: 3, total: 8 })

    const status = screen.getByRole('status')
    expect(status.textContent).toBe('Показано 3 из 8 замечаний')
    expect(status.classList.contains('ant-typography-secondary')).toBe(false)
  })
})
