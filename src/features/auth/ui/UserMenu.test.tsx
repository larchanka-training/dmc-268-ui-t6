// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as userApi from '../../../entities/user'
import { useAuthStore } from '../model/store'
import { UserMenu } from './UserMenu'
import styles from './UserMenu.module.css'

// jsdom applies no styles: read the real stylesheet, and verify geometry in the browser.
// Vitest zeroes `.css?raw`; no @types/node here, so load `fs` untyped as in LoginPage.test.tsx.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

const MOCK_USER = {
  id: 114473628,
  login: 'skvertl',
  name: 'Denis Skvertl',
  avatarUrl: 'https://avatars.githubusercontent.com/u/114473628?v=4',
}

describe('UserMenu', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    useAuthStore.setState({ isAuthenticated: true, isInitialized: true, isLoading: false })
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  it('renders fallback trigger with logout available when user is undefined', async () => {
    vi.spyOn(userApi, 'useMe').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof userApi.useMe>)

    render(
      <QueryClientProvider client={queryClient}>
        <UserMenu />
      </QueryClientProvider>,
    )
    const trigger = screen.getByLabelText('Меню пользователя')
    expect(trigger).toBeDefined()
    expect(screen.getByText('Пользователь')).toBeDefined()

    // Click trigger to open dropdown and verify logout button is present
    fireEvent.click(trigger)
    expect(await screen.findByText('Выйти')).toBeDefined()
  })

  it('renders user details when user is loaded', () => {
    vi.spyOn(userApi, 'useMe').mockReturnValue({
      data: { ...MOCK_USER, workspaces: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof userApi.useMe>)

    render(
      <QueryClientProvider client={queryClient}>
        <UserMenu />
      </QueryClientProvider>,
    )
    expect(screen.getAllByText('skvertl').length).toBeGreaterThan(0)
  })

  it.each([false, true])('attaches avatar and trigger classes in compact=%s mode', (compact) => {
    queryClient.setQueryData(userApi.AUTH_ME_QUERY_KEY, { ...MOCK_USER, workspaces: [] })
    render(
      <QueryClientProvider client={queryClient}>
        <UserMenu compact={compact} />
      </QueryClientProvider>,
    )
    const trigger = screen.getByRole('button', { name: 'Меню пользователя' })
    expect(trigger.querySelector('.ant-avatar')?.classList.contains(styles.avatar ?? '')).toBe(true)
    expect(trigger.matches('button.ant-btn.ant-btn-lg')).toBe(true)
    expect(trigger.classList.contains(styles.compact ?? '')).toBe(compact)
    if (compact) {
      expect(screen.queryByText('skvertl')).toBeNull()
    } else {
      expect(screen.getByText('skvertl')).toBeDefined()
    }
  })

  it('opens the menu from a native button and reports it as expanded', async () => {
    vi.spyOn(userApi, 'useMe').mockReturnValue({
      data: { ...MOCK_USER, workspaces: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof userApi.useMe>)

    render(
      <QueryClientProvider client={queryClient}>
        <UserMenu />
      </QueryClientProvider>,
    )
    // The trigger is a real button: the browser turns Enter and Space on it into a click.
    const trigger = screen.getByRole('button', { name: 'Меню пользователя' })
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    trigger.focus()
    fireEvent.click(trigger)
    expect(await screen.findByText('Выйти')).toBeDefined()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })
})

describe('UserMenu.module.css', () => {
  const css = readFileSync('src/features/auth/ui/UserMenu.module.css', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')

  function declarations(selector: string): string {
    const start = css.indexOf(`${selector} {`)
    expect(start, selector).toBeGreaterThanOrEqual(0)
    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  }

  it('prevents avatar shrink and centers the compact large trigger', () => {
    expect(declarations('.avatar')).toContain('flex: none;')
    const compact = declarations('.compact:global(.ant-btn.ant-btn-lg)')
    expect(compact).toContain('justify-content: center;')
    expect(compact).toContain('padding-inline: 0;')
  })
})
