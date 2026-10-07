// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
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

describe('AppLayout', () => {
  afterEach(() => {
    cleanup()
    vi.mocked(isMockMode).mockReset()
  })

  it('renders header, navigation items and main content', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    render(
      <AppLayout currentPath="/repositories">
        <div data-testid="test-content">Контент страницы</div>
      </AppLayout>,
    )

    expect(screen.getByText('AI Code Reviewer')).toBeDefined()
    expect(screen.getByText('Репозитории')).toBeDefined()
    expect(screen.getByText('Прогоны')).toBeDefined()
    expect(screen.queryByText('Ревью')).toBeNull()
    expect(screen.getByTestId('test-content')).toBeDefined()
  })

  it('shows Review in the sidebar when mock mode is enabled', () => {
    vi.mocked(isMockMode).mockReturnValue(true)
    render(
      <AppLayout currentPath="/repositories">
        <div data-testid="test-content">Контент страницы</div>
      </AppLayout>,
    )
    expect(screen.getByText('Ревью')).toBeDefined()
  })
})
