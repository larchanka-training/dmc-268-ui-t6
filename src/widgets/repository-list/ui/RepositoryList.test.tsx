// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { disabledRagIndex, type Repository } from '../../../entities/repository'
import { useAuthStore } from '../../../features/auth'
import { stubViewport } from '../../../test/viewport'
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

// The full column set shows from a 1366px window (D16); below it the line under the name carries
// the details. jsdom answers no media query by itself, so a test sets the window width. The edge is
// written out here and not imported: a test that reads the constant passes for any value.
const WIDE = 1440
const EDGE = 1366

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
    provider: 'github',
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
    ragEnabled: false,
    ragIndex: disabledRagIndex,
  },
  {
    provider: 'github',
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
    ragEnabled: false,
    ragIndex: disabledRagIndex,
  },
]

describe('RepositoryList', () => {
  it('shows the Bitbucket provider and follows the server repository URL', () => {
    const first = mockRepos[0]
    if (!first) throw new Error('missing repository fixture')
    const bitbucket: Repository = {
      ...first,
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      provider: 'bitbucket',
      fullName: 'private-space/private-repo',
      url: 'https://bitbucket.org/private-space/private-repo',
    }
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={[bitbucket]}
      />,
    )
    expect(screen.getByText('Bitbucket')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'private-space/private-repo' }).getAttribute('href'),
    ).toBe('https://bitbucket.org/private-space/private-repo')
  })

  it('names inaccessible Bitbucket settings without mentioning a GitHub App', () => {
    const first = mockRepos[0]
    if (!first) throw new Error('missing repository fixture')
    const bitbucket: Repository = {
      ...first,
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      provider: 'bitbucket',
      fullName: 'private-space/private-repo',
      url: 'https://bitbucket.org/private-space/private-repo',
      installationAvailable: false,
    }
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={[bitbucket]}
      />,
    )
    expect(
      screen.getByRole('link', {
        name: 'Нет доступа у Bitbucket Cloud к private-space/private-repo: открыть настройки',
      }),
    ).toBeTruthy()
    expect(screen.queryByRole('link', { name: /GitHub App к private-space/i })).toBeNull()
  })

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
    expect(container.querySelector('[role="status"]')).toBeNull()
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
    stubViewport(WIDE)
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
      provider: 'github',
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
      ragEnabled: false,
      ragIndex: disabledRagIndex,
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

  it('pins the actions column to the right edge, the header and every row, and no other column (D14)', () => {
    const { container } = render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )

    // The table scrolls sideways under the column and «Настроить» is visible at any width. Ant
    // Design 6 names the right edge `end` (`ant-table-cell-fix-end`; `-right` before version 6).
    expect(container.querySelectorAll('.ant-table-cell-fix')).toHaveLength(mockRepos.length + 1)
    expect(container.querySelectorAll('.ant-table-cell-fix-end')).toHaveLength(mockRepos.length + 1)
    expect(container.querySelector('thead th.ant-table-cell-fix-end')).not.toBeNull()
    for (const repository of mockRepos) {
      const link = screen.getByRole('link', { name: `Настройки ${repository.fullName}` })
      expect(link.closest('td')?.classList.contains('ant-table-cell-fix-end')).toBe(true)
    }
    // A pinned column turns the layout into `fixed` (equal column widths, long names run over the
    // next column) unless it is asked to stay `auto`.
    expect(container.querySelector('table')?.style.tableLayout).toBe('auto')
  })

  it('lists «Ревью» second, so the pinned actions column never covers it (D15, D16)', () => {
    stubViewport(WIDE)
    const { container } = render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )

    // The informational columns scroll under the pinned actions column when the table is wider
    // than its container, so the switch and the no-access link sit right after the name.
    const headers = [...container.querySelectorAll('thead th')].map((th) => th.textContent)
    expect(headers).toEqual([
      'Репозиторий',
      'Ревью',
      'Ветка',
      'Движок',
      'Ожидание CI',
      'Лимит',
      'Вердикт',
      '',
    ])
  })

  it('hides «Ветка», «Движок», «Ожидание CI» and «Лимит» in a window narrower than 1366px, and not from it', () => {
    stubViewport(EDGE - 1)
    const narrow = render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )
    // «Ревью», «Вердикт» and the actions stay columns.
    expect([...narrow.container.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual([
      'Репозиторий',
      'Ревью',
      'Вердикт',
      '',
    ])
    narrow.unmount()

    stubViewport(EDGE)
    const wide = render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )
    expect(
      [...wide.container.querySelectorAll('thead th')].map((th) => th.textContent),
    ).toHaveLength(8)
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
        'Репозитории ещё не подключены. Для GitHub установите GitHub App или добавьте репозитории в существующую установку, затем нажмите «Обновить доступ». Для Bitbucket Cloud используйте блок «Bitbucket Cloud» ниже.',
      ),
    ).toBeDefined()
  })

  it('names the GitHub App action truthfully even when Bitbucket can also be connected', () => {
    mockSlug = 'test-bot'
    render(
      <RepositoryList
        settingsHref={settingsHref}
        onSyncAccess={vi.fn()}
        repositories={mockRepos}
      />,
    )
    const link = screen.getByRole('link', { name: /подключить github-репозиторий/i })
    expect(link.getAttribute('href')).toBe('https://github.com/apps/test-bot/installations/new')
    expect(screen.queryByRole('link', { name: 'Подключить репозиторий' })).toBeNull()
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
    const connectBtn = screen.getByRole('link', { name: /подключить github-репозиторий/i })
    fireEvent.mouseEnter(connectBtn)
    expect(
      await screen.findByText(
        'После установки GitHub App на новый аккаунт нажмите «Обновить доступ»: откроется GitHub, затем вы вернётесь сюда. Репозиторий может появиться с задержкой до нескольких минут',
      ),
    ).toBeDefined()
  })
})

// The api serves `enabled: false` for a repository the GitHub App cannot reach (api PR #156,
// SD §6.9), whatever the user chose: the row shows no stored value and links to the settings page.
const UNREACHABLE_NAME = 'larchanka-training/dmc-268-infra-t6'
const UNREACHABLE_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
const UNREACHABLE_REPO: Repository = {
  provider: 'github',
  id: UNREACHABLE_ID,
  fullName: UNREACHABLE_NAME,
  url: 'https://github.com/larchanka-training/dmc-268-infra-t6',
  defaultBranch: 'main',
  enabled: false,
  defaultEngine: 'fast',
  waitForCi: 'auto',
  maxComments: 10,
  reviewEvent: 'COMMENT',
  branchFilter: [],
  severityThreshold: 'all',
  installationAvailable: false,
  ragEnabled: false,
  ragIndex: disabledRagIndex,
}

// D17: a row without GitHub App access links to the settings page, where the choice lives.
describe('RepositoryList no-access row', () => {
  const NO_ACCESS_LINK = `Нет доступа у GitHub App к ${UNREACHABLE_NAME}: открыть настройки`

  function noAccessList(
    props: Partial<Parameters<typeof RepositoryList>[0]> = {},
  ): React.ReactElement {
    return (
      <RepositoryList
        onSyncAccess={vi.fn()}
        repositories={[UNREACHABLE_REPO, ...mockRepos.filter((repo) => repo.enabled)]}
        settingsHref={settingsHref}
        {...props}
      />
    )
  }

  it('shows a warning icon and a «Нет доступа» link to the settings page, and nothing to choose with', () => {
    render(noAccessList({ onToggleEnabled: vi.fn() }))

    const link = screen.getByRole('link', { name: NO_ACCESS_LINK })
    expect(link.textContent).toBe('Нет доступа')
    expect(link.getAttribute('href')).toBe(`/repositories/${UNREACHABLE_ID}/settings`)
    // The icon is decoration next to the link, on one line with it (D13: the cell does not wrap).
    const cell = link.closest('.ant-flex')
    expect(cell?.className).not.toContain('ant-flex-wrap')
    expect(cell?.querySelector('.anticon-exclamation-circle')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
    // D13 / D17: no switch for this row and no menu; the choice lives on the settings page.
    expect(screen.queryByRole('switch', { name: `Ревью для ${UNREACHABLE_NAME}` })).toBeNull()
    expect(screen.queryByRole('button', { name: /Выбрать/ })).toBeNull()
    expect(screen.queryByText('Выбрать')).toBeNull()
    expect(screen.queryByRole('menuitem')).toBeNull()
    // The row with access keeps its switch.
    expect(screen.getAllByRole('switch')).toHaveLength(1)
  })

  it('keeps a row with access as it was: a working switch, no link', () => {
    const onToggleEnabled = vi.fn()
    render(
      <RepositoryList
        onSyncAccess={vi.fn()}
        onToggleEnabled={onToggleEnabled}
        repositories={mockRepos}
        settingsHref={settingsHref}
      />,
    )

    expect(screen.queryByText('Нет доступа')).toBeNull()
    expect(screen.queryByRole('link', { name: /Нет доступа/ })).toBeNull()
    const active = screen.getByRole('switch', {
      name: 'Ревью для larchanka-training/dmc-268-ui-t6',
    })
    expect(active.hasAttribute('disabled')).toBe(false)
    fireEvent.click(active)
    expect(onToggleEnabled).toHaveBeenCalledExactlyOnceWith(
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      false,
    )
  })

  it('keeps the link and no switch while a choice from the settings page is saving', () => {
    render(
      noAccessList({
        repositories: [{ ...UNREACHABLE_REPO, enabled: true }],
        updatingRepoIds: new Set([UNREACHABLE_ID]),
      }),
    )

    expect(screen.getByRole('link', { name: NO_ACCESS_LINK })).toBeTruthy()
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('opens the settings of a no-access row in-app on a plain click and leaves a modified click to the browser', () => {
    const onOpenSettings = vi.fn()
    render(noAccessList({ onOpenSettings }))
    const link = screen.getByRole('link', { name: NO_ACCESS_LINK })

    expect(clickIsTakenOver(link, { ctrlKey: true })).toBe(false)
    expect(clickIsTakenOver(link, { metaKey: true })).toBe(false)
    expect(clickIsTakenOver(link, { shiftKey: true })).toBe(false)
    expect(onOpenSettings).not.toHaveBeenCalled()

    expect(clickIsTakenOver(link)).toBe(true)
    expect(onOpenSettings).toHaveBeenCalledExactlyOnceWith(UNREACHABLE_REPO)
  })

  it('leaves the click on a no-access link to the browser when nobody handles navigation', () => {
    render(noAccessList())

    expect(clickIsTakenOver(screen.getByRole('link', { name: NO_ACCESS_LINK }))).toBe(false)
  })
})

// D16: the compact table of the reviewer's sketch.
describe('RepositoryList compact table', () => {
  function list(): React.ReactElement {
    return (
      <RepositoryList
        onSyncAccess={vi.fn()}
        repositories={[...mockRepos, UNREACHABLE_REPO]}
        settingsHref={settingsHref}
      />
    )
  }

  /** The parts of the first details line with this «CI: …» part; separators left out. */
  function detailsLine(ci: string): (string | null)[] {
    return [...(screen.getAllByText(ci)[0]?.parentElement?.children ?? [])]
      .filter((part) => part.getAttribute('aria-hidden') !== 'true')
      .map((part) => part.textContent)
  }

  it('names a repository by its full name and, under it, its short name: no GitHub icon, no id', () => {
    stubViewport(WIDE)
    const { container } = render(list())

    expect(container.querySelector('.anticon-github')).toBeNull()
    expect(screen.getByText('dmc-268-ui-t6')).toBeTruthy()
    expect(screen.getByText('dmc-268-api-t6')).toBeTruthy()
    expect(container.textContent).not.toContain(mockRepos[0]?.id)
    expect(container.textContent).not.toContain('•')
  })

  it('shows the switch alone: no «Активен» / «Пауза», the accessible name stays', () => {
    stubViewport(WIDE)
    render(list())

    expect(screen.queryByText('Активен')).toBeNull()
    expect(screen.queryByText('Пауза')).toBeNull()
    expect(screen.queryByText('Статус')).toBeNull()
    const active = screen.getByRole('switch', {
      name: 'Ревью для larchanka-training/dmc-268-ui-t6',
    })
    const paused = screen.getByRole('switch', {
      name: 'Ревью для larchanka-training/dmc-268-api-t6',
    })
    expect(active.getAttribute('aria-checked')).toBe('true')
    expect(paused.getAttribute('aria-checked')).toBe('false')
    expect(active.closest('td')?.textContent).toBe('')
  })

  it('opens the settings with an icon-only button: the name is in aria-label, «Настроить» in a tooltip', async () => {
    stubViewport(WIDE)
    render(list())

    const link = screen.getByRole('link', { name: 'Настройки larchanka-training/dmc-268-ui-t6' })
    expect(link.textContent).toBe('')
    expect(link.querySelector('svg')).not.toBeNull()
    expect(screen.queryByText('Настроить')).toBeNull()

    fireEvent.mouseEnter(link)
    expect((await screen.findByText('Настроить')).closest('[role="tooltip"]')).not.toBeNull()
  })

  it('shows the tooltip of the settings button on keyboard focus too and describes the button by it', async () => {
    stubViewport(WIDE)
    render(list())

    const link = screen.getByRole('link', { name: 'Настройки larchanka-training/dmc-268-ui-t6' })
    expect(link.getAttribute('aria-describedby')).toBeNull()

    act(() => {
      link.focus()
    })

    const tooltip = (await screen.findByText('Настроить')).closest('[role="tooltip"]')
    expect(tooltip).not.toBeNull()
    expect(link.getAttribute('aria-describedby')).toBe(tooltip?.id)
  })

  it('writes the verdict as plain text, not a tag', () => {
    stubViewport(WIDE)
    const { container } = render(list())

    for (const label of ['Комментарий', 'Запрос изменений']) {
      const verdict = screen.getAllByText(label)[0]
      expect(verdict?.closest('td')?.textContent).toBe(label)
      // A `Tag` carries `data-variant`: the branch is the only one left in a row.
      expect(verdict?.closest('[data-variant]')).toBeNull()
    }
    expect(container.querySelectorAll('[data-variant="solid"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-variant="dot"]')).toHaveLength(0)
  })

  it('puts branch, engine, CI wait and limit on a line under the name on a narrow screen', () => {
    stubViewport(EDGE - 1)
    render(list())

    // The sketch: the line takes the place of the short name, and the branch keeps its tag.
    expect(detailsLine('CI: авто')).toEqual([
      'main',
      'DiffEngine (быстрый)',
      'CI: авто',
      'лимит 10',
    ])
    expect(detailsLine('CI: никогда')).toEqual([
      'master',
      'DiffEngine (быстрый)',
      'CI: никогда',
      'лимит 5',
    ])
    expect(screen.getAllByText('main')[0]?.closest('[data-variant="outline"]')).not.toBeNull()
    expect(screen.queryByText('dmc-268-ui-t6')).toBeNull()
    // The rows without access have it too, next to the link.
    expect(screen.getAllByText(/^CI: /)).toHaveLength(3)
    expect(screen.getByRole('link', { name: /^Нет доступа/ })).toBeTruthy()
  })

  it('has no such line on a wide screen: the columns carry it', () => {
    stubViewport(WIDE)
    render(list())

    expect(screen.queryByText(/^CI: /)).toBeNull()
    expect(screen.queryByText(/^лимит /)).toBeNull()
    expect(screen.getAllByText('Авто')).toHaveLength(2)
    expect(screen.getAllByText('10 комм.')).toHaveLength(2)
  })
})
