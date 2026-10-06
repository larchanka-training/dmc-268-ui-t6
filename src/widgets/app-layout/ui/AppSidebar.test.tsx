// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

describe('AppSidebar review navigation', () => {
  it('hides the Review item when not in mock mode', () => {
    vi.mocked(isMockMode).mockReturnValue(false)
    render(<AppSidebar currentPath="/runs" onNavigate={vi.fn()} />)
    expect(screen.queryByText('Ревью')).toBeNull()
    expect(screen.getByText('Прогоны')).toBeTruthy()
  })

  it('shows Review and navigates to /review in mock mode', () => {
    vi.mocked(isMockMode).mockReturnValue(true)
    const onNavigate = vi.fn()
    render(<AppSidebar currentPath="/runs" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Ревью'))
    expect(onNavigate).toHaveBeenCalledWith('/review')
  })
})
