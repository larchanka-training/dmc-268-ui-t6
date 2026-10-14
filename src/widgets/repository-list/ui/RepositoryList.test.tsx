// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Repository } from '../../../entities/repository'
import { useAuthStore } from '../../../features/auth'
import { RepositoryList } from './RepositoryList'
import styles from './RepositoryList.module.css'

let mockSlug = ''
let mockClientId = 'test-client'
const mockMode = vi.hoisted(() => ({ enabled: false }))
vi.mock('../../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/config/env')>()
  return {
    ...actual,
    isMockMode: () => mockMode.enabled,
    get GITHUB_CLIENT_ID() {
      return mockClientId
    },
    get GITHUB_APP_SLUG() {
      return mockSlug
    },
  }
})

const originalLoginWithGitHub = useAuthStore.getState().loginWithGitHub

afterEach(() => {
  cleanup()
  mockSlug = ''
  mockClientId = 'test-client'
  mockMode.enabled = false
  useAuthStore.setState({ loginWithGitHub: originalLoginWithGitHub })
})

function settingsHref(repository: Repository): string {
  return `/repositories/${repository.id}/settings`
}

/**
 * Clicks and tells whether the app took the click over (`preventDefault`). The listener on the
 * document runs after React's and then cancels the navigation jsdom cannot perform.
 */
function clickIsTakenOver(element: Element, init?: MouseEventInit): boolean {
  let prevented = false
  const listener = (event: Event): void => {
    prevented = event.defaultPrevented
    event.preventDefault()
  }
  document.addEventListener('click', listener)
  fireEvent.click(element, init)
  document.removeEventListener('click', listener)
  return prevented
}

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
    branchFilter: [],
    severityThreshold: 'all',
    installationAvailable: true,
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
    branchFilter: [],
    severityThreshold: 'all',
    installationAvailable: true,
  },
]

describe('RepositoryList', () => {
  it('names the settings column for table navigation', () => {
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'Настройки' })).toBeTruthy()
  })

  it('names its keyboard filter and changes the visible repositories with arrow keys', () => {
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )
    const filter = screen.getByRole('radiogroup', { name: 'Фильтр репозиториев' })
    expect(filter.tabIndex).toBe(-1)
    fireEvent.keyDown(within(filter).getByRole('radio', { name: 'Все (2)' }), {
      key: 'ArrowRight',
    })
    expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeTruthy()
    expect(screen.queryByText('larchanka-training/dmc-268-api-t6')).toBeNull()
    fireEvent.keyDown(within(filter).getByRole('radio', { name: 'Активные (1)' }), {
      key: 'ArrowLeft',
    })
    expect(screen.getByText('larchanka-training/dmc-268-api-t6')).toBeTruthy()
  })

  it('reserves a visual slot only outside idle and retains it through polling intervals', () => {
    const props = { repositories: mockRepos, settingsHref, onSyncAccess: vi.fn() }
    const { container, rerender } = render(<RepositoryList {...props} />)
    const getSlot = () => container.querySelector(`.${String(styles.accessRefreshStatus)}`)
    expect(getSlot()).toBeNull()

    rerender(<RepositoryList {...props} accessRefreshStatus="waiting" refreshing />)
    const slot = getSlot()
    expect(slot).not.toBeNull()
    expect(slot?.textContent).toBe('Загрузка репозиториев')
    rerender(<RepositoryList {...props} accessRefreshStatus="waiting" />)
    expect(getSlot()).toBe(slot)
    expect(slot?.textContent).toBe('')
    rerender(<RepositoryList {...props} accessRefreshStatus="waiting" refreshing />)
    expect(getSlot()).toBe(slot)
    expect(slot?.textContent).toBe('Загрузка репозиториев')
    rerender(<RepositoryList {...props} accessRefreshStatus="timedOut" />)
    expect(getSlot()).toBe(slot)
    expect(slot?.textContent).toBe('Нужного репозитория нет?Обновить список')
    rerender(<RepositoryList {...props} accessRefreshStatus="timedOut" refreshing />)
    expect(getSlot()).toBe(slot)
    rerender(<RepositoryList {...props} />)
    expect(getSlot()).toBeNull()
  })

  it('keeps visual refresh messages and the manual action across status transitions', () => {
    const onRefresh = vi.fn()
    const props = { repositories: mockRepos, settingsHref, onSyncAccess: vi.fn(), onRefresh }
    const { rerender } = render(<RepositoryList {...props} />)
    expect(screen.queryByText('Загрузка репозиториев')).toBeNull()
    expect(screen.queryByText('Нужного репозитория нет?')).toBeNull()

    rerender(<RepositoryList {...props} accessRefreshStatus="waiting" refreshing />)
    expect(screen.getByText('Загрузка репозиториев')).toBeDefined()
    rerender(<RepositoryList {...props} accessRefreshStatus="waiting" />)
    expect(screen.queryByText('Загрузка репозиториев')).toBeNull()
    rerender(<RepositoryList {...props} accessRefreshStatus="waiting" refreshing />)
    expect(screen.getByText('Загрузка репозиториев')).toBeDefined()

    rerender(<RepositoryList {...props} accessRefreshStatus="timedOut" />)
    expect(screen.queryByText('Загрузка репозиториев')).toBeNull()
    expect(screen.getByText('Нужного репозитория нет?')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Обновить список' }))
    expect(onRefresh).toHaveBeenCalledOnce()
    rerender(<RepositoryList {...props} accessRefreshStatus="timedOut" refreshing />)
    expect(screen.getByText('Нужного репозитория нет?')).toBeDefined()
    expect(screen.queryByText('Загрузка репозиториев')).toBeNull()

    rerender(<RepositoryList {...props} />)
    expect(screen.queryByText('Нужного репозитория нет?')).toBeNull()
  })

  it('renders repository items with branch tags, CI badges, and status switches', () => {
    const handleToggle = vi.fn()

    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        onToggleEnabled={handleToggle}
        repositories={mockRepos}
      />,
    )

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
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
        updatingRepoIds={updatingRepoIds}
      />,
    )

    const switch1 = screen.getByRole('switch', {
      name: 'Ревью для larchanka-training/dmc-268-ui-t6',
    })
    const switch2 = screen.getByRole('switch', {
      name: 'Ревью для larchanka-training/dmc-268-api-t6',
    })

    expect(switch1.hasAttribute('disabled')).toBe(true)
    expect(switch2.hasAttribute('disabled')).toBe(false)
  })

  it('filters repositories by search input matching full and short name', () => {
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )

    const searchInput = screen.getByPlaceholderText('Поиск по названию...')
    fireEvent.change(searchInput, { target: { value: 'ui-t6' } })

    expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
    expect(screen.queryByText('larchanka-training/dmc-268-api-t6')).toBeNull()
  })

  it('links the repository name to its http(s) url', () => {
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )

    const link = screen.getByRole('link', { name: 'larchanka-training/dmc-268-ui-t6' })
    expect(link.getAttribute('href')).toBe('https://github.com/larchanka-training/dmc-268-ui-t6')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders the name as plain text without href when the url is not http(s)', () => {
    const unsafeRepo: Repository = {
      id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      fullName: 'evil/repo',
      url: 'javascript:alert(1)',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
      branchFilter: [],
      severityThreshold: 'all',
      installationAvailable: true,
    }
    const { container } = render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={[unsafeRepo]}
      />,
    )

    // React rewrites a javascript: href instead of dropping it, so match on the scheme.
    expect(container.querySelector('a[href*="javascript:"]')).toBeNull()
    expect(screen.queryByRole('link', { name: 'evil/repo' })).toBeNull()
    expect(screen.getByText('evil/repo').closest('a')).toBeNull()
  })

  it('renders installation link with correct href when GITHUB_APP_SLUG is configured', () => {
    mockSlug = 'test-bot'
    render(<RepositoryList settingsHref={settingsHref} onSyncAccess={vi.fn()} repositories={[]} />)
    expect(screen.getByText(/Репозитории ещё не подключены/i)).toBeDefined()
    const link = screen.getByRole('link', { name: /установить github app/i })
    expect(link.getAttribute('href')).toBe('https://github.com/apps/test-bot/installations/new')
  })

  it('renders disabled button with no href when GITHUB_APP_SLUG is not configured', () => {
    mockSlug = ''
    mockClientId = 'test-client'
    render(<RepositoryList settingsHref={settingsHref} onSyncAccess={vi.fn()} repositories={[]} />)
    expect(screen.getByText(/Репозитории ещё не подключены/i)).toBeDefined()
    const button = screen.getByRole('button', { name: /установить github app/i })
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('href')).toBeNull()
    expect(screen.queryByRole('link', { name: /установить github app/i })).toBeNull()
  })

  it('links «Настроить» to the settings page with a unique per-row aria-label', () => {
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )

    expect(
      screen
        .getByRole('link', { name: 'Настройки larchanka-training/dmc-268-ui-t6' })
        .getAttribute('href'),
    ).toBe('/repositories/a1b2c3d4-e5f6-7890-abcd-ef1234567890/settings')
    expect(
      screen
        .getByRole('link', { name: 'Настройки larchanka-training/dmc-268-api-t6' })
        .getAttribute('href'),
    ).toBe('/repositories/b2c3d4e5-f6a7-8901-bcde-f12345678901/settings')
  })

  it('opens the settings through onOpenSettings and keeps the page from loading', () => {
    const onOpenSettings = vi.fn()
    render(
      <RepositoryList
        onOpenSettings={onOpenSettings}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
        settingsHref={settingsHref}
      />,
    )

    const link = screen.getByRole('link', { name: 'Настройки larchanka-training/dmc-268-api-t6' })
    expect(clickIsTakenOver(link)).toBe(true)

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(onOpenSettings).toHaveBeenCalledWith(mockRepos[1])
  })

  it('leaves a click with a modifier key to the browser', () => {
    const onOpenSettings = vi.fn()
    render(
      <RepositoryList
        onOpenSettings={onOpenSettings}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
        settingsHref={settingsHref}
      />,
    )

    const link = screen.getByRole('link', { name: 'Настройки larchanka-training/dmc-268-ui-t6' })
    expect(clickIsTakenOver(link, { ctrlKey: true })).toBe(false)
    expect(clickIsTakenOver(link, { metaKey: true })).toBe(false)
    expect(clickIsTakenOver(link, { shiftKey: true })).toBe(false)

    expect(onOpenSettings).not.toHaveBeenCalled()
  })

  it('leaves the click to the browser when nobody handles navigation', () => {
    render(
      <RepositoryList
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
        settingsHref={settingsHref}
      />,
    )

    const link = screen.getByRole('link', { name: 'Настройки larchanka-training/dmc-268-ui-t6' })
    expect(clickIsTakenOver(link)).toBe(false)
  })

  it('calls onSyncAccess when "Обновить доступ" button is clicked in header', () => {
    const handleSyncAccess = vi.fn()
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={handleSyncAccess}
        repositories={mockRepos}
      />,
    )

    const syncBtn = screen.getByRole('button', { name: /обновить доступ/i })
    fireEvent.click(syncBtn)

    expect(handleSyncAccess).toHaveBeenCalledOnce()
  })

  it('renders "Обновить доступ" button in empty state and triggers callback', () => {
    const handleSyncAccess = vi.fn()
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={handleSyncAccess}
        repositories={[]}
      />,
    )

    const syncButtons = screen.getAllByRole('button', { name: /обновить доступ/i })
    expect(syncButtons.length).toBe(1)
    const targetBtn = syncButtons[0]
    expect(targetBtn).toBeDefined()
    if (!targetBtn) {
      throw new Error('Button not found')
    }
    fireEvent.click(targetBtn)

    expect(handleSyncAccess).toHaveBeenCalledOnce()
  })

  it('uses the explicit callback without invoking the auth store', () => {
    const loginWithGitHub = vi.fn()
    const onSyncAccess = vi.fn()
    useAuthStore.setState({ loginWithGitHub })
    render(
      <RepositoryList settingsHref={settingsHref} onSyncAccess={onSyncAccess} repositories={[]} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Обновить доступ' }))
    expect(onSyncAccess).toHaveBeenCalledOnce()
    expect(loginWithGitHub).not.toHaveBeenCalled()
  })

  it.each([{ repositories: [] }, { repositories: mockRepos }])(
    'disables sync access and explains missing client ID for $repositories.length repositories',
    async ({ repositories }) => {
      mockClientId = ''
      const onSyncAccess = vi.fn()
      render(
        <RepositoryList
          settingsHref={settingsHref}
          onSyncAccess={onSyncAccess}
          repositories={repositories}
        />,
      )

      const button = screen.getByRole('button', { name: 'Обновить доступ' })
      expect(button.hasAttribute('disabled')).toBe(true)
      fireEvent.click(button)
      expect(onSyncAccess).not.toHaveBeenCalled()
      const tooltipTrigger = button.parentElement
      if (!tooltipTrigger) throw new Error('Missing tooltip trigger')
      fireEvent.mouseEnter(tooltipTrigger)
      expect(
        await screen.findByText('Обновление доступа недоступно: не задан VITE_GITHUB_CLIENT_ID'),
      ).toBeDefined()
    },
  )

  it.each([{ repositories: [] }, { repositories: mockRepos }])(
    'enables sync access without a client ID in mock mode for $repositories.length repositories',
    ({ repositories }) => {
      mockClientId = ''
      mockMode.enabled = true
      const onSyncAccess = vi.fn()
      render(
        <RepositoryList
          settingsHref={settingsHref}
          onSyncAccess={onSyncAccess}
          repositories={repositories}
        />,
      )

      const button = screen.getByRole('button', { name: 'Обновить доступ' })
      expect(button.hasAttribute('disabled')).toBe(false)
      fireEvent.click(button)
      expect(onSyncAccess).toHaveBeenCalledOnce()
    },
  )

  it('renders empty state description explaining both installation scenarios', () => {
    render(<RepositoryList settingsHref={settingsHref} onSyncAccess={vi.fn()} repositories={[]} />)
    expect(
      screen.getByText(
        'Репозитории ещё не подключены. После установки GitHub App на новый аккаунт или добавления репозиториев в уже подключённую установку нажмите «Обновить доступ»: откроется GitHub, затем вы вернётесь сюда. Репозиторий может появиться с задержкой до нескольких минут.',
      ),
    ).toBeDefined()
  })

  it('displays tooltip on hover over "Обновить доступ"', async () => {
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )
    const syncBtn = screen.getByRole('button', { name: /обновить доступ/i })
    fireEvent.mouseEnter(syncBtn)
    expect(
      await screen.findByText(
        'Повторная авторизация через GitHub обновит список ваших установок GitHub App. Откроется GitHub, затем вы вернётесь на эту страницу',
      ),
    ).toBeDefined()
  })

  it('displays tooltip on hover over "Обновить"', async () => {
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )
    const refreshBtn = screen.getByRole('button', { name: /обновить$/i })
    fireEvent.mouseEnter(refreshBtn)
    expect(
      await screen.findByText(
        'После добавления репозиториев в установку нажмите «Обновить доступ»',
      ),
    ).toBeDefined()
  })

  it('displays install tooltip on hover over connect button when app is configured', async () => {
    mockSlug = 'my-github-app'
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )
    const connectBtn = screen.getByRole('link', { name: /подключить репозиторий/i })
    fireEvent.mouseEnter(connectBtn)
    expect(
      await screen.findByText(
        'После установки GitHub App на новый аккаунт нажмите «Обновить доступ»: откроется GitHub, затем вы вернётесь сюда. Репозиторий может появиться с задержкой до нескольких минут',
      ),
    ).toBeDefined()
  })
})
