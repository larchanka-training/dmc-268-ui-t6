// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

import type { Repository } from '../../../entities/repository'
import { RepositoryList } from './RepositoryList'

const mockRepos: Repository[] = [
  {
    id: 'repo-1',
    name: 'dmc-268-ui-t6',
    fullName: 'larchanka-training/dmc-268-ui-t6',
    url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
    defaultBranch: 'main',
    enabled: true,
    defaultEngine: 'fast',
    waitForCi: true,
    maxComments: 10,
  },
  {
    id: 'repo-2',
    name: 'dmc-268-api-t6',
    fullName: 'larchanka-training/dmc-268-api-t6',
    url: 'https://github.com/larchanka-training/dmc-268-api-t6',
    defaultBranch: 'master',
    enabled: false,
    defaultEngine: 'deep',
    waitForCi: false,
    maxComments: 5,
  },
]

describe('RepositoryList', () => {
  it('renders repository items with branch tags and status switches', () => {
    const handleToggle = vi.fn()
    const handleConnect = vi.fn()

    render(
      <RepositoryList
        onConnectClick={handleConnect}
        onToggleEnabled={handleToggle}
        repositories={mockRepos}
      />,
    )

    expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
    expect(screen.getByText('larchanka-training/dmc-268-api-t6')).toBeDefined()
    expect(screen.getByText('main')).toBeDefined()
    expect(screen.getByText('master')).toBeDefined()
  })

  it('filters repositories by search input', () => {
    render(<RepositoryList repositories={mockRepos} />)

    const searchInput = screen.getByPlaceholderText('Поиск по названию...')
    fireEvent.change(searchInput, { target: { value: 'ui' } })

    expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
    expect(screen.queryByText('larchanka-training/dmc-268-api-t6')).toBeNull()
  })
})
