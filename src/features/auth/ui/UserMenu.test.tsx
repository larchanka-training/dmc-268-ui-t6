// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as userApi from '../../../entities/user'
import { useAuthStore } from '../model/store'
import { UserMenu } from './UserMenu'

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
