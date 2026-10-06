// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Repository } from '../../../entities/repository'
import { useAuthStore } from '../../../features/auth'
import {
  APP_INSTALL_TOOLTIP,
  EMPTY_REPOSITORIES_DESCRIPTION,
  REFRESH_TOOLTIP,
  RepositoryList,
  SYNC_ACCESS_TOOLTIP,
} from './RepositoryList'

let mockSlug = ''
vi.mock('../../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/config/env')>()
  return {
    ...actual,
    get GITHUB_APP_SLUG() {
      return mockSlug
    },
  }
})

const originalLoginWithGitHub = useAuthStore.getState().loginWithGitHub

afterEach(() => {
  cleanup()
  mockSlug = ''
  useAuthStore.setState({ loginWithGitHub: originalLoginWithGitHub })
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
    defaultEngine: 'fast',
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
    expect(screen.getByText('Авто')).toBeDefined()
    expect(screen.getByText('Никогда')).toBeDefined()
    expect(screen.getByText('Комментарий')).toBeDefined()
    expect(screen.getByText('Запрос изменений')).toBeDefined()
    expect(
      screen.getByRole('switch', { name: 'Ревью для larchanka-training/dmc-268-ui-t6' }),
    ).toBeDefined()
    expect(
      screen.getByRole('switch', { name: 'Ревью для larchanka-training/dmc-268-api-t6' }),
    ).toBeDefined()
  })

  it('disables only the switches matching updatingRepoIds', () => {
    const updatingRepoIds = new Set(['a1b2c3d4-e5f6-7890-abcd-ef1234567890'])
    render(<RepositoryList repositories={mockRepos} updatingRepoIds={updatingRepoIds} />)

    const switch1 = screen.getByRole('switch', {
      name: 'Ревью для larchanka-training/dmc-268-ui-t6',
    })
    const switch2 = screen.getByRole('switch', {
      name: 'Ревью для larchanka-training/dmc-268-api-t6',
    })

    expect(switch1.hasAttribute('disabled')).toBe(true)
    expect(switch2.hasAttribute('disabled')).toBe(false)
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

  it('renders installation link with correct href when GITHUB_APP_SLUG is configured', () => {
    mockSlug = 'test-bot'
    render(<RepositoryList repositories={[]} />)
    expect(screen.getByText(/Репозитории ещё не подключены/i)).toBeDefined()
    const link = screen.getByRole('link', { name: /установить github app/i })
    expect(link.getAttribute('href')).toBe('https://github.com/apps/test-bot/installations/new')
  })

  it('renders disabled button with no href when GITHUB_APP_SLUG is not configured', () => {
    mockSlug = ''
    render(<RepositoryList repositories={[]} />)
    expect(screen.getByText(/Репозитории ещё не подключены/i)).toBeDefined()
    const button = screen.getByRole('button', { name: /установить github app/i })
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('href')).toBeNull()
    expect(screen.queryByRole('link', { name: /установить github app/i })).toBeNull()
  })

  it('keeps settings modal open if onUpdateRepository rejects', async () => {
    const onUpdate = vi.fn().mockRejectedValue(new Error('Update failed'))
    render(<RepositoryList onUpdateRepository={onUpdate} repositories={mockRepos} />)

    const settingsBtn = screen.getByLabelText(/настройки larchanka-training\/dmc-268-ui-t6/i)
    fireEvent.click(settingsBtn)

    await waitFor(() => {
      expect(
        screen.getByText('Настройки репозитория larchanka-training/dmc-268-ui-t6'),
      ).toBeDefined()
    })

    const maxCommentsInput = document.getElementById('maxComments') as HTMLInputElement
    expect(maxCommentsInput).not.toBeNull()
    fireEvent.change(maxCommentsInput, { target: { value: '5' } })

    const saveBtn = screen.getByRole('button', { name: /сохранить/i })
    fireEvent.click(saveBtn)

    const targetRepo = mockRepos[0]
    expect(targetRepo).toBeDefined()
    if (!targetRepo) {
      throw new Error('mockRepos[0] is undefined')
    }

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(targetRepo.id, { maxComments: 5 })
    })

    // Modal dialog is still present in DOM and open
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('Настройки репозитория larchanka-training/dmc-268-ui-t6')).toBeDefined()
  })

  it('offers only DiffEngine and never sends the engine in the settings patch', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<RepositoryList onUpdateRepository={onUpdate} repositories={mockRepos} />)

    fireEvent.click(screen.getByLabelText(/настройки larchanka-training\/dmc-268-ui-t6/i))
    await waitFor(() => {
      expect(screen.getByText('Движок анализа')).toBeDefined()
    })

    const engineSelect = document.getElementById('defaultEngine') as HTMLInputElement
    expect(engineSelect).not.toBeNull()
    fireEvent.mouseDown(engineSelect)
    await waitFor(() => {
      expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0)
    })
    const engineOptions = [...document.querySelectorAll('.ant-select-item-option')].map(
      (option) => option.textContent,
    )
    expect(engineOptions).toEqual(['DiffEngine (быстрый синтаксический анализ)'])
    expect(screen.queryByText('SandboxEngine (глубокий анализ в песочнице)')).toBeNull()

    const maxCommentsInput = document.getElementById('maxComments') as HTMLInputElement
    fireEvent.change(maxCommentsInput, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('a1b2c3d4-e5f6-7890-abcd-ef1234567890', {
        maxComments: 5,
      })
    })
  })

  it('calls onSyncAccess when "Обновить доступ" button is clicked in header', () => {
    const handleSyncAccess = vi.fn()
    render(<RepositoryList onSyncAccess={handleSyncAccess} repositories={mockRepos} />)

    const syncBtn = screen.getByRole('button', { name: /обновить доступ/i })
    fireEvent.click(syncBtn)

    expect(handleSyncAccess).toHaveBeenCalledOnce()
  })

  it('renders "Обновить доступ" button in empty state and triggers callback', () => {
    const handleSyncAccess = vi.fn()
    render(<RepositoryList onSyncAccess={handleSyncAccess} repositories={[]} />)

    const syncButtons = screen.getAllByRole('button', { name: /обновить доступ/i })
    expect(syncButtons.length).toBe(2)
    const targetBtn = syncButtons[1]
    expect(targetBtn).toBeDefined()
    if (!targetBtn) {
      throw new Error('Button not found')
    }
    fireEvent.click(targetBtn)

    expect(handleSyncAccess).toHaveBeenCalledOnce()
  })

  it('calls loginWithGitHub from auth store when onSyncAccess is not provided in header', () => {
    const spy = vi.fn()
    useAuthStore.setState({ loginWithGitHub: spy })
    render(<RepositoryList repositories={mockRepos} />)

    const syncBtn = screen.getByRole('button', { name: /обновить доступ/i })
    fireEvent.click(syncBtn)

    expect(spy).toHaveBeenCalledOnce()
  })

  it('calls loginWithGitHub from auth store when onSyncAccess is not provided in empty state', () => {
    const spy = vi.fn()
    useAuthStore.setState({ loginWithGitHub: spy })
    render(<RepositoryList repositories={[]} />)

    const syncButtons = screen.getAllByRole('button', { name: /обновить доступ/i })
    expect(syncButtons.length).toBe(2)
    const targetBtn = syncButtons[1]
    expect(targetBtn).toBeDefined()
    if (!targetBtn) {
      throw new Error('Button not found')
    }
    fireEvent.click(targetBtn)

    expect(spy).toHaveBeenCalledOnce()
  })

  it('renders empty state description explaining both installation scenarios', () => {
    render(<RepositoryList repositories={[]} />)
    expect(screen.getByText(EMPTY_REPOSITORIES_DESCRIPTION)).toBeDefined()
  })

  it('displays tooltip on hover over "Обновить доступ"', async () => {
    render(<RepositoryList repositories={mockRepos} />)
    const syncBtn = screen.getByRole('button', { name: /обновить доступ/i })
    fireEvent.mouseEnter(syncBtn)
    expect(await screen.findByText(SYNC_ACCESS_TOOLTIP)).toBeDefined()
  })

  it('displays tooltip on hover over "Обновить"', async () => {
    render(<RepositoryList repositories={mockRepos} />)
    const refreshBtn = screen.getByRole('button', { name: /обновить$/i })
    fireEvent.mouseEnter(refreshBtn)
    expect(await screen.findByText(REFRESH_TOOLTIP)).toBeDefined()
  })

  it('displays install tooltip on hover over connect button when app is configured', async () => {
    mockSlug = 'my-github-app'
    render(<RepositoryList repositories={mockRepos} />)
    const connectBtn = screen.getByRole('link', { name: /подключить репозиторий/i })
    fireEvent.mouseEnter(connectBtn)
    expect(await screen.findByText(APP_INSTALL_TOOLTIP)).toBeDefined()
  })
})
