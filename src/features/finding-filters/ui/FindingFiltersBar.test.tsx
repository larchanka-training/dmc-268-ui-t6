// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
  const onReset = vi.fn()
  render(
    <FindingFiltersBar
      fileOptions={FILE_OPTIONS}
      filters={options.filters ?? EMPTY_FINDING_FILTERS}
      onChange={onChange}
      onReset={onReset}
      shown={options.shown ?? 8}
      total={options.total ?? 8}
    />,
  )
  return { onChange, onReset }
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

  it('replaces the URL entry while typing: onChange(next, { replace: true })', () => {
    const { onChange } = renderBar({ filters: { ...EMPTY_FINDING_FILTERS, files: ['src/a.ts'] } })
    fireEvent.change(screen.getByPlaceholderText('Поиск по замечаниям'), {
      target: { value: 'console' },
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(
      { files: ['src/a.ts'], severities: [], query: 'console' },
      { replace: true },
    )
  })

  it('clearing the search with the clear icon empties the query and replaces', () => {
    const { onChange } = renderBar({ filters: { ...EMPTY_FINDING_FILTERS, query: 'console' } })
    const clearIcon = document.querySelector('.ant-input-clear-icon')
    expect(clearIcon).not.toBeNull()
    if (clearIcon !== null) {
      fireEvent.click(clearIcon)
    }

    expect(onChange).toHaveBeenCalledWith(EMPTY_FINDING_FILTERS, { replace: true })
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
