// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { disabledRagIndex, type Repository } from '../../../entities/repository'
import { useAuthStore } from '../../../features/auth'
import { RepositoryList } from './RepositoryList'

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
    ragEnabled: false,
    ragIndex: disabledRagIndex,
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
    ragEnabled: false,
    ragIndex: disabledRagIndex,
  },
]

describe('RepositoryList', () => {
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

// The api serves `enabled: false` for a repository the GitHub App cannot reach (api PR #156,
// SD §6.9), whatever the user chose: the row shows no stored value and offers the two choices.
const UNREACHABLE_NAME = 'larchanka-training/dmc-268-infra-t6'
const UNREACHABLE_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
const UNREACHABLE_REPO: Repository = {
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
// The visible text «Выбрать» starts the accessible name (WCAG 2.5.3, label in name).
const CHOICE_TRIGGER_NAME = `Выбрать авто-ревью для ${UNREACHABLE_NAME}, когда доступ вернётся`
const ENABLE_CHOICE = 'Включить авто-ревью'
const KEEP_OFF_CHOICE = 'Оставить выключенным'

function choiceTrigger(): HTMLElement {
  return screen.getByRole('button', { name: CHOICE_TRIGGER_NAME })
}

function unreachableSwitch(): HTMLElement {
  return screen.getByRole('switch', { name: `Ревью для ${UNREACHABLE_NAME}` })
}

/** Opens the menu of the unreachable row and picks one of its two items. */
async function chooseFromMenu(label: string): Promise<void> {
  fireEvent.click(choiceTrigger())
  fireEvent.click(await screen.findByRole('menuitem', { name: label }))
}

/**
 * A menu that closes hands the focus to <body> in a browser (the item that held it is hidden);
 * jsdom keeps it where it was. This does what the browser does.
 */
function dropFocusToBody(): void {
  act(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  })
}

/**
 * Opens the menu and picks an item the way a person does: the item holds the focus (a click or the
 * keys put it there), then the click lands. Returns the item.
 */
async function pickFromMenu(label: string): Promise<HTMLElement> {
  fireEvent.click(choiceTrigger())
  const item = await screen.findByRole('menuitem', { name: label })
  item.focus()
  expect(document.activeElement).toBe(item)
  fireEvent.click(item)
  return item
}

/**
 * The closing menu keeps the focus on its item for the length of its motion (about 250 ms), then
 * the item leaves and the browser hands the focus to <body>. This is that moment for `item`; unlike
 * `dropFocusToBody` it leaves the focus alone when something else holds it.
 */
function itemLeaves(item: HTMLElement): void {
  act(() => {
    item.blur()
  })
}

describe('RepositoryList while the GitHub App has no access', () => {
  function unreachableList(
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

  it('shows the switch off and disabled, «Нет доступа», and the choice trigger only on that row', () => {
    render(unreachableList({ onToggleEnabled: vi.fn() }))

    expect(unreachableSwitch().getAttribute('aria-checked')).toBe('false')
    expect(unreachableSwitch().hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Нет доступа')).toBeTruthy()
    // The row with access keeps its status label and has no trigger.
    expect(screen.getByText('Активен')).toBeTruthy()
    expect(screen.queryByText('Пауза')).toBeNull()
    const trigger = choiceTrigger()
    // The visible text is short, so the Status column stays narrow (browser round 5, 3f); the caret
    // says the button opens a menu.
    expect(trigger.textContent).toBe('Выбрать')
    expect(trigger.querySelector('.anticon-down')).not.toBeNull()
    expect(trigger.getAttribute('aria-label')?.startsWith(trigger.textContent)).toBe(true)
    expect(screen.getAllByRole('button', { name: /когда доступ вернётся/ })).toHaveLength(1)
  })

  it('keeps a row with access as it was: a working switch, «Активен» / «Пауза», no menu', () => {
    const onToggleEnabled = vi.fn()
    render(
      <RepositoryList
        onSyncAccess={vi.fn()}
        onToggleEnabled={onToggleEnabled}
        repositories={mockRepos}
        settingsHref={settingsHref}
      />,
    )

    expect(screen.getByText('Активен')).toBeTruthy()
    expect(screen.getByText('Пауза')).toBeTruthy()
    expect(screen.queryByText('Нет доступа')).toBeNull()
    expect(screen.queryByRole('button', { name: /когда доступ вернётся/ })).toBeNull()
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

  it.each([
    [ENABLE_CHOICE, true],
    [KEEP_OFF_CHOICE, false],
  ])('calls onToggleEnabled with the value of the menu item «%s»', async (label, value) => {
    const onToggleEnabled = vi.fn()
    render(unreachableList({ onToggleEnabled }))

    fireEvent.click(choiceTrigger())
    expect(await screen.findByRole('menuitem', { name: ENABLE_CHOICE })).toBeTruthy()
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
    expect(screen.getByRole('menuitem', { name: KEEP_OFF_CHOICE })).toBeTruthy()
    expect(onToggleEnabled).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('menuitem', { name: label }))

    expect(onToggleEnabled).toHaveBeenCalledExactlyOnceWith(UNREACHABLE_ID, value)
  })

  it('keeps the switch off and without a spinner, and the trigger loading, while a choice saves', () => {
    // The optimistic update keeps `enabled` off for such a repository too; the row does not rely
    // on it.
    render(
      unreachableList({
        repositories: [{ ...UNREACHABLE_REPO, enabled: true }],
        updatingRepoIds: new Set([UNREACHABLE_ID]),
      }),
    )

    expect(unreachableSwitch().getAttribute('aria-checked')).toBe('false')
    expect(unreachableSwitch().hasAttribute('disabled')).toBe(true)
    expect(unreachableSwitch().className).not.toContain('ant-switch-loading')
    expect(choiceTrigger().className).toContain('ant-btn-loading')
    expect(screen.getByText('Нет доступа')).toBeTruthy()
    expect(screen.queryByText('Пауза')).toBeNull()
    expect(screen.queryByText('Активен')).toBeNull()
  })

  it('does not open the menu while the row saves', () => {
    render(unreachableList({ updatingRepoIds: new Set([UNREACHABLE_ID]) }))

    fireEvent.click(choiceTrigger())

    expect(screen.queryByRole('menuitem')).toBeNull()
  })

  it('puts the focus back on the trigger once the save is over, if it held it before the menu opened', async () => {
    const view = render(unreachableList({ onToggleEnabled: vi.fn() }))
    const trigger = choiceTrigger()
    trigger.focus()

    await chooseFromMenu(ENABLE_CHOICE)
    view.rerender(
      unreachableList({ onToggleEnabled: vi.fn(), updatingRepoIds: new Set([UNREACHABLE_ID]) }),
    )
    dropFocusToBody()
    expect(document.activeElement).toBe(document.body)

    view.rerender(unreachableList({ onToggleEnabled: vi.fn(), updatingRepoIds: new Set() }))

    expect(document.activeElement).toBe(trigger)
  })

  it('leaves the focus on <body> when the trigger did not hold it before the menu opened', async () => {
    const view = render(unreachableList({ onToggleEnabled: vi.fn() }))

    await chooseFromMenu(KEEP_OFF_CHOICE)
    view.rerender(
      unreachableList({ onToggleEnabled: vi.fn(), updatingRepoIds: new Set([UNREACHABLE_ID]) }),
    )
    dropFocusToBody()
    view.rerender(unreachableList({ onToggleEnabled: vi.fn(), updatingRepoIds: new Set() }))

    expect(document.activeElement).toBe(document.body)
  })

  it('leaves the focus where the user moved it during the save', async () => {
    const view = render(unreachableList({ onToggleEnabled: vi.fn() }))
    choiceTrigger().focus()

    await chooseFromMenu(ENABLE_CHOICE)
    view.rerender(
      unreachableList({ onToggleEnabled: vi.fn(), updatingRepoIds: new Set([UNREACHABLE_ID]) }),
    )
    const search = screen.getByPlaceholderText('Поиск по названию...')
    search.focus()
    view.rerender(unreachableList({ onToggleEnabled: vi.fn(), updatingRepoIds: new Set() }))

    expect(document.activeElement).toBe(search)
  })

  it.each([
    ['at once: the row is never seen saving (0 ms)', 'instant'],
    ['while the closing menu item still holds the focus (a fast save, 100 ms)', 'fast'],
    ['after the closing menu is gone (a slow save, 600 ms)', 'slow'],
  ] as const)('ends with the focus on the trigger when the answer comes %s', async (_, answer) => {
    const onToggleEnabled = vi.fn()
    const view = render(unreachableList({ onToggleEnabled }))
    const trigger = choiceTrigger()
    trigger.focus()

    const item = await pickFromMenu(ENABLE_CHOICE)
    if (answer !== 'instant') {
      view.rerender(
        unreachableList({ onToggleEnabled, updatingRepoIds: new Set([UNREACHABLE_ID]) }),
      )
    }
    if (answer === 'slow') {
      itemLeaves(item)
    }
    if (answer !== 'instant') {
      view.rerender(unreachableList({ onToggleEnabled, updatingRepoIds: new Set() }))
    }
    itemLeaves(item)

    expect(document.activeElement).toBe(trigger)
  })

  it('does not pull the focus to the trigger when it did not hold it before the menu opened', async () => {
    render(unreachableList({ onToggleEnabled: vi.fn() }))

    const item = await pickFromMenu(KEEP_OFF_CHOICE)
    itemLeaves(item)

    expect(document.activeElement).toBe(document.body)
  })

  // The pick moves the focus to the trigger inside the item's `onClick`, which rc-menu fires on the
  // Enter `keydown`. Unless that `keydown` is cancelled, a browser delivers the same key's `keypress`
  // to the trigger, which is focused by then: Enter on a button clicks it and the menu opens again.
  // jsdom does not synthesise the `keypress`, so the cancelled default action is what is pinned.
  it.each([
    [ENABLE_CHOICE, true],
    [KEEP_OFF_CHOICE, false],
  ] as const)(
    'cancels the default action of the Enter that picks «%s», so the menu does not open again',
    async (label, enabled) => {
      const onToggleEnabled = vi.fn()
      render(unreachableList({ onToggleEnabled }))
      choiceTrigger().focus()
      fireEvent.click(choiceTrigger())
      const item = await screen.findByRole('menuitem', { name: label })
      item.focus()

      const notCancelled = fireEvent.keyDown(item, {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
      })

      expect(onToggleEnabled).toHaveBeenCalledWith(UNREACHABLE_ID, enabled)
      expect(notCancelled).toBe(false)
      expect(document.activeElement).toBe(choiceTrigger())
    },
  )
})

describe('RepositoryList when the access comes back during a refetch', () => {
  // A refetch (the window refocus asks again) can say the GitHub App reaches the repository now:
  // the row turns to the usual switch and the trigger leaves the page (review r6, P3-3).
  const reachableRepo: Repository = { ...UNREACHABLE_REPO, installationAvailable: true }

  function list(repo: Repository): React.ReactElement {
    return (
      <RepositoryList
        onSyncAccess={vi.fn()}
        onToggleEnabled={vi.fn()}
        repositories={[repo, ...mockRepos.filter((other) => other.enabled)]}
        settingsHref={settingsHref}
      />
    )
  }

  it('moves the focus to the switch of the row when the trigger held it', () => {
    const view = render(list(UNREACHABLE_REPO))
    choiceTrigger().focus()
    expect(document.activeElement).toBe(choiceTrigger())

    view.rerender(list(reachableRepo))

    expect(screen.queryByRole('button', { name: CHOICE_TRIGGER_NAME })).toBeNull()
    expect(unreachableSwitch().hasAttribute('disabled')).toBe(false)
    expect(document.activeElement).toBe(unreachableSwitch())
  })

  it('moves nothing when the focus is on another control', () => {
    const view = render(list(UNREACHABLE_REPO))
    const search = screen.getByPlaceholderText('Поиск по названию...')
    search.focus()

    view.rerender(list(reachableRepo))

    expect(document.activeElement).toBe(search)
  })

  it('moves nothing when the trigger held the focus earlier and the user has left it since', () => {
    const view = render(list(UNREACHABLE_REPO))
    choiceTrigger().focus()
    // A refetch that changes nothing re-renders the row with the trigger focused.
    view.rerender(list({ ...UNREACHABLE_REPO }))
    act(() => {
      choiceTrigger().blur()
    })
    expect(document.activeElement).toBe(document.body)

    view.rerender(list(reachableRepo))

    expect(document.activeElement).toBe(document.body)
  })

  it('moves nothing when the focus was nowhere', () => {
    const view = render(list(UNREACHABLE_REPO))
    expect(document.activeElement).toBe(document.body)

    view.rerender(list(reachableRepo))

    expect(document.activeElement).toBe(document.body)
  })
})
