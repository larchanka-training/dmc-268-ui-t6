// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { useAuthStore } from '../features/auth'
import { i18n } from '../shared/i18n'
import { createRoutes } from './routes'

// The page the button leads to; only the address matters here.
vi.mock('../pages/repositories/RepositoriesPage', () => ({
  RepositoriesPage: () => createElement('h1', null, 'RepositoriesPage'),
}))

const originalAuth = useAuthStore.getState()
const routers: ReturnType<typeof createMemoryRouter>[] = []

function renderAt(path: string) {
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] })
  routers.push(router)
  render(<App router={router} />)
  return router
}

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, isInitialized: true })
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
  vi.restoreAllMocks()
})

describe('an unknown address for a signed-in user', () => {
  it.each(['/no-such-page', '/runs/11111111-1111-4111-8111-000000000100/no-such-tab'])(
    '%s shows the 404 page with a link to the repositories and keeps the address',
    async (path) => {
      const router = renderAt(path)

      expect(await screen.findByRole('heading', { name: 'Страница не найдена' })).toBeTruthy()
      expect(
        screen.getByText(
          'Такого адреса в панели нет. Проверьте ссылку или откройте список репозиториев.',
        ),
      ).toBeTruthy()
      expect(screen.getByRole('link', { name: 'К репозиториям' }).getAttribute('href')).toBe(
        '/repositories',
      )
      // The app shell stays: the user can go anywhere from the menu.
      expect(screen.getByRole('navigation', { name: 'Разделы' })).toBeTruthy()
      expect(router.state.location.pathname).toBe(path)
    },
  )

  it('opens the repositories from the 404 page without a page load', async () => {
    const router = renderAt('/no-such-page')

    fireEvent.click(await screen.findByRole('link', { name: 'К репозиториям' }))

    expect(await screen.findByRole('heading', { name: 'RepositoriesPage' })).toBeTruthy()
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/repositories')
    })
  })

  it('speaks English for an English user', async () => {
    await i18n.changeLanguage('en')
    renderAt('/no-such-page')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy()
    expect(
      screen.getByText(
        'There is no such address in the dashboard. Check the link or open the list of repositories.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go to repositories' })).toBeTruthy()
  })
})
