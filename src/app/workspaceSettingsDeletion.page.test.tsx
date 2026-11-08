// @vitest-environment jsdom
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App, ConfigProvider } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../shared/config/env', () => ({
  USE_MOCKS: true,
  isMockMode: () => true,
  env: { VITE_USE_MOCKS: true },
  API_BASE_URL: '/api',
  GITHUB_CLIENT_ID: '',
  GITHUB_APP_SLUG: '',
}))

import { AUTH_ME_QUERY_KEY, MeSchema } from '../entities/user'
import { useAuthStore } from '../features/auth'
import { WorkspaceSettingsPage } from '../pages/settings/WorkspaceSettingsPage'
import { apiClient, setAccessToken, setMockTransport } from '../shared/api/client'
import { endpoints } from '../shared/api/endpoints'
import { initMockTransport } from './mocks/mockTransport'

function SettingsHarness() {
  useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: async () => MeSchema.parse(await apiClient(endpoints.auth.me())),
  })
  return <WorkspaceSettingsPage />
}

describe('Workspace deletion end-to-end with mockTransport', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
    setMockTransport(null)
    setAccessToken(null)
    useAuthStore.setState({ isAuthenticated: false, isLoading: false, isInitialized: false })
  })

  it('deletes owner workspace via mockTransport and switches current workspace via AUTH_ME_QUERY_KEY refetch', async () => {
    localStorage.clear()
    initMockTransport()
    setAccessToken('mock-token')
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <QueryClientProvider client={client}>
          <App>
            <SettingsHarness />
          </App>
        </QueryClientProvider>
      </ConfigProvider>,
    )

    expect(await screen.findByText('larchanka-training')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Удалить этот воркспейс' }))

    const input = await screen.findByPlaceholderText('larchanka-training')
    fireEvent.change(input, { target: { value: 'larchanka-training' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'Я понимаю последствия, удалить воркспейс' }),
    )

    await waitFor(() => {
      expect(screen.queryByText('Удаление воркспейса')).toBeNull()
      // AUTH_ME_QUERY_KEY refetched without the deleted owner workspace; useCurrentWorkspace falls back to dmc-team-admin
      expect(screen.queryByText('larchanka-training')).toBeNull()
      expect(screen.getByText('dmc-team-admin')).toBeTruthy()
    })
  })
})
