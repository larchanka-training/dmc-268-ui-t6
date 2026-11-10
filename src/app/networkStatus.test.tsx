// @vitest-environment jsdom
import { onlineManager } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { useAuthStore } from '../features/auth'
import { i18n } from '../shared/i18n'
import { createRoutes } from './routes'

const OFFLINE_RU =
  'Нет подключения к сети. Загруженное остаётся на странице, остальное загрузится, когда связь вернётся'
const OFFLINE_EN =
  'No network connection. What is loaded stays on the page; the rest loads once you are back online'

// What the pages show stands for content already loaded.
vi.mock('../pages/repositories/RepositoriesPage', () => ({
  RepositoriesPage: () => createElement('h1', null, 'RepositoriesPage'),
}))
vi.mock('../pages/login/LoginPage', () => ({
  LoginPage: () => createElement('h1', null, 'LoginPage'),
}))

const originalAuth = useAuthStore.getState()
const routers: ReturnType<typeof createMemoryRouter>[] = []

function renderAt(path: string) {
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] })
  routers.push(router)
  render(<App router={router} />)
  return router
}

function goOffline() {
  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
}

function goOnline() {
  act(() => {
    window.dispatchEvent(new Event('online'))
  })
}

beforeEach(() => {
  // The sidebar of the signed-in layout asks for its data; the answer does not matter here.
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
      ),
    ),
  )
})

afterEach(() => {
  cleanup()
  for (const router of routers.splice(0)) router.dispose()
  useAuthStore.setState(originalAuth, true)
  onlineManager.setOnline(true)
  vi.restoreAllMocks()
})

describe('the app-wide network notice', () => {
  it('appears when the network is lost and leaves when it returns, with the page kept', async () => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })
    const router = renderAt('/repositories')
    expect(await screen.findByRole('heading', { name: 'RepositoriesPage' })).toBeTruthy()
    expect(screen.queryByText(OFFLINE_RU)).toBeNull()

    goOffline()

    expect((await screen.findByText(OFFLINE_RU)).closest('[role="alert"]')).toBeTruthy()
    // The loaded page stays as it was, under the notice.
    expect(screen.getByRole('heading', { name: 'RepositoriesPage' })).toBeTruthy()

    goOnline()

    await waitFor(() => {
      expect(screen.queryByText(OFFLINE_RU)).toBeNull()
    })
    expect(screen.getByRole('heading', { name: 'RepositoriesPage' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/repositories')
  })

  it('shows on a page outside the app shell too', async () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false, isInitialized: true })
    renderAt('/login')
    expect(await screen.findByRole('heading', { name: 'LoginPage' })).toBeTruthy()

    goOffline()

    expect(await screen.findByText(OFFLINE_RU)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'LoginPage' })).toBeTruthy()
  })

  it('speaks English for an English user', async () => {
    await i18n.changeLanguage('en')
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })
    renderAt('/repositories')
    expect(await screen.findByRole('heading', { name: 'RepositoriesPage' })).toBeTruthy()

    goOffline()

    expect(await screen.findByText(OFFLINE_EN)).toBeTruthy()
  })
})
