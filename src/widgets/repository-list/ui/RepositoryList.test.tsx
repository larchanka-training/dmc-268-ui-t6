// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Repository } from '../../../entities/repository'
import { RepositoryList } from './RepositoryList'

afterEach(() => {
  cleanup()
})

const mockRepos: Repository[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    fullName: 'larchanka-training/dmc-268-ui-t6',
    url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
    defaultBranch: 'main',
    enabled: true,
    defaultEngine: 'fast',
    waitForCi: 'auto',
    maxComments: 10,
    reviewEvent: 'COMMENT',
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    fullName: 'larchanka-training/dmc-268-api-t6',
    url: 'https://github.com/larchanka-training/dmc-268-api-t6',
    defaultBranch: 'master',
    enabled: false,
    defaultEngine: 'deep',
    waitForCi: 'never',
    maxComments: 5,
    reviewEvent: 'REQUEST_CHANGES',
  },
]

describe('RepositoryList', () => {
  it('renders repository items with branch tags, CI badges, and status switches', () => {
    const handleToggle = vi.fn()

    render(<RepositoryList onToggleEnabled={handleToggle} repositories={mockRepos} />)

    expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
    expect(screen.getByText('larchanka-training/dmc-268-api-t6')).toBeDefined()
    expect(screen.getByText('main')).toBeDefined()
    expect(screen.getByText('master')).toBeDefined()
    expect(screen.getByText('Auto')).toBeDefined()
    expect(screen.getByText('Never')).toBeDefined()
  })

  it('renders settings button with unique per-row aria-label', () => {
    render(<RepositoryList repositories={mockRepos} />)
    expect(
      screen.getByRole('button', { name: 'Настройки larchanka-training/dmc-268-ui-t6' }),
    ).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'Настройки larchanka-training/dmc-268-api-t6' }),
    ).toBeDefined()
  })

  it('filters repositories by search input matching full and short name', () => {
    render(<RepositoryList repositories={mockRepos} />)

    const searchInput = screen.getByPlaceholderText('Поиск по названию...')
    fireEvent.change(searchInput, { target: { value: 'ui-t6' } })

    expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
    expect(screen.queryByText('larchanka-training/dmc-268-api-t6')).toBeNull()
  })

  it('renders empty state when repositories array is empty', () => {
    render(<RepositoryList repositories={[]} />)
    expect(screen.getByText(/Репозитории ещё не подключены/i)).toBeDefined()
    expect(screen.getByText(/Установить GitHub App/i)).toBeDefined()
  })
})
