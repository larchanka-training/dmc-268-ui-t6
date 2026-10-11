// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { isMockMode } from '../../../shared/config/env'
import { AppLayout } from './AppLayout'

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

describe('AppLayout', () => {
  afterEach(() => {
    cleanup()
    vi.mocked(isMockMode).mockReset()
  })

  it('renders the brand, navigation items and main content', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    renderWithQuery(
      <AppLayout currentPath="/repositories">
        <div data-testid="test-content">Контент страницы</div>
      </AppLayout>,
    )

    expect(screen.getByText('Reviewer')).toBeDefined()
    expect(screen.getByText('Репозитории')).toBeDefined()
    expect(screen.getByText('Прогоны')).toBeDefined()
    expect(screen.queryByText('Ревью')).toBeNull()
    expect(screen.getByTestId('test-content')).toBeDefined()
  })

  it('shows Review in the sidebar when mock mode is enabled', () => {
    vi.mocked(isMockMode).mockReturnValue(true)
    renderWithQuery(
      <AppLayout currentPath="/repositories">
        <div data-testid="test-content">Контент страницы</div>
      </AppLayout>,
    )
    expect(screen.getByText('Ревью')).toBeDefined()
  })
})
