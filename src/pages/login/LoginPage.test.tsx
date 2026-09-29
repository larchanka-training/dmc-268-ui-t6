// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '../../features/auth'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    useAuthStore.setState({
      isAuthenticated: false,
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  it('renders login screen title and buttons', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LoginPage />
      </QueryClientProvider>,
    )
    expect(screen.getByText('AI Code Reviewer')).toBeDefined()
    expect(screen.getByRole('button', { name: /войти через github/i })).toBeDefined()
    expect(screen.queryByRole('button', { name: /демо-вход/i })).toBeNull()
  })

  it('renders error alert when auth store has an error', () => {
    useAuthStore.setState({ error: 'Вход не настроен (VITE_GITHUB_CLIENT_ID)' })
    render(
      <QueryClientProvider client={queryClient}>
        <LoginPage />
      </QueryClientProvider>,
    )
    expect(screen.getByText('Вход не настроен (VITE_GITHUB_CLIENT_ID)')).toBeDefined()
  })
})
