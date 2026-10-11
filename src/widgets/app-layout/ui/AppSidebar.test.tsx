// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('offers the theme choice in the user menu and applies it', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    useThemeStore.setState({ mode: 'light', preference: 'light' })
    renderWithQuery(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Меню пользователя'))
    fireEvent.click(await screen.findByText('Тёмная'))
    expect(useThemeStore.getState().preference).toBe('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
  })
})
