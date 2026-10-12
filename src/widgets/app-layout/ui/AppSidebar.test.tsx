// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useThemeStore } from '../../../features/theme'
import { isMockMode } from '../../../shared/config/env'
import { AppSidebar } from './AppSidebar'

vi.mock('../../../shared/config/buildFlags', () => ({
  VITE_MOCKS_BUILD: false,
  mocksEnabledAtRuntime: (isMockMode: () => boolean) => isMockMode(),
}))

vi.mock('../../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/config/env')>()
  return {
    ...actual,
    isMockMode: vi.fn(),
  }
})

// The sidebar holds the user menu, which reads the current user through react-query.
function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('AppSidebar review navigation', () => {
  it('hides the Review item when not in mock mode', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    expect(screen.queryByText('Ревью')).toBeNull()
    expect(screen.getByText('Прогоны')).toBeTruthy()
  })

  it('shows Review and navigates to /review in mock mode', () => {
    vi.mocked(isMockMode).mockReturnValue(true)
    const onNavigate = vi.fn()
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Ревью'))
    expect(onNavigate).toHaveBeenCalledWith('/review')
  })

  it('folds from the toggle and unfolds from the logo without a separate row', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть меню' }))
    const expand = screen.getByRole('button', { name: 'Развернуть меню' })
    expect(screen.queryByRole('button', { name: 'Свернуть меню' })).toBeNull()
    fireEvent.click(expand)
    expect(screen.getByRole('button', { name: 'Свернуть меню' })).toBeTruthy()
  })

  it('keeps the keyboard focus on the sidebar button after folding and unfolding', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    const fold = screen.getByRole('button', { name: 'Свернуть меню' })
    fold.focus()
    fireEvent.click(fold)
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Развернуть меню' }))
    })
    fireEvent.click(screen.getByRole('button', { name: 'Развернуть меню' }))
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Свернуть меню' }))
    })
  })

  it('has no single-key shortcut: a bracket typed on the page leaves the sidebar as it is', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    // One press only: the old shortcut was a toggle, two presses would hide its return.
    fireEvent.keyDown(document.body, { key: '[', code: 'BracketLeft' })
    expect(screen.getByRole('button', { name: 'Свернуть меню' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Развернуть меню' })).toBeNull()
  })

  it('puts the navigation into a landmark and marks the current page', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(<AppSidebar currentPath="/runs/42" onNavigate={vi.fn()} />)
    const nav = screen.getByRole('navigation', { name: 'Разделы' })
    expect(within(nav).getByText('Прогоны').getAttribute('aria-current')).toBe('page')
    expect(within(nav).getByText('Репозитории').hasAttribute('aria-current')).toBe(false)
  })

  it('makes the brand a link to the repositories', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    const onNavigate = vi.fn()
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={onNavigate} />)
    const brand = screen.getByRole('link', { name: 'Reviewer' })
    expect(brand.getAttribute('href')).toBe('/repositories')
    fireEvent.click(brand)
    expect(onNavigate).toHaveBeenCalledWith('/repositories')
    onNavigate.mockClear()
    fireEvent.click(brand, { ctrlKey: true })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('offers the theme choice in the user menu and applies it', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    useThemeStore.setState({ mode: 'light', preference: 'light' })
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    fireEvent.click(await screen.findByText('Тёмная'))
    expect(useThemeStore.getState().preference).toBe('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
  })

  it('marks only the chosen theme as checked', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    useThemeStore.setState({ mode: 'light', preference: 'light' })
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    const radios = await screen.findAllByRole('menuitemradio')
    expect(radios.map((radio) => [radio.textContent, radio.getAttribute('aria-checked')])).toEqual([
      ['Как в системе', 'false'],
      ['Светлая', 'true'],
      ['Тёмная', 'false'],
    ])
  })

  it('applies "Как в системе" and resolves it to the theme of the operating system', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    useThemeStore.setState({ mode: 'dark', preference: 'dark' })
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    fireEvent.click(await screen.findByText('Как в системе'))
    expect(useThemeStore.getState().preference).toBe('system')
    // `src/test/setup.ts` answers every media query with "no match": the system theme is light.
    expect(useThemeStore.getState().mode).toBe('light')
  })

  it('returns the focus to the user button after a theme is chosen', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    useThemeStore.setState({ mode: 'light', preference: 'light' })
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    const trigger = screen.getByLabelText('Меню пользователя')
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByText('Тёмная'))
    // Not within the same event: a key press that chose the item must not reach the button.
    expect(document.activeElement).not.toBe(trigger)
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger)
    })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
})
