// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import App from '../App'
import { useAuthStore } from '../features/auth'
import { createRoutes } from './routes'

const OFFLINE_RU = 'Нет подключения к сети. Страница откроется, когда связь вернётся'
const ERROR_TITLE_RU = 'Произошла непредвиденная ошибка'
const COLLAPSE_MENU_RU = 'Свернуть меню'
const RUN_ID = '11111111-1111-4111-8111-000000000100'

let browserOnline = true

// What `import()` gives for a page: a rejection while the browser is offline, the module after.
function pageModule(exportName: string) {
  if (!browserOnline) throw new TypeError('Failed to fetch dynamically imported module')
  return { [exportName]: () => createElement('h1', null, exportName) }
}

vi.mock('../pages/login/LoginPage', () => pageModule('LoginPage'))
vi.mock('../pages/auth/CallbackPage', () => pageModule('CallbackPage'))
vi.mock('../pages/repositories/RepositoriesPage', () => pageModule('RepositoriesPage'))
vi.mock('../pages/repositories/RepositorySettingsPage', () => pageModule('RepositorySettingsPage'))
vi.mock('../pages/runs/RunsPage', () => pageModule('RunsPage'))
vi.mock('../pages/runs/RunDetailPage', () => pageModule('RunDetailPage'))
vi.mock('../pages/review/ReviewRedirect', () => pageModule('ReviewRedirect'))
vi.mock('../pages/audit/AuditPage', () => pageModule('AuditPage'))
vi.mock('../pages/analytics/AnalyticsPage', () => pageModule('AnalyticsPage'))

const originalAuth = useAuthStore.getState()
const routers: ReturnType<typeof createMemoryRouter>[] = []

beforeEach(() => {
  browserOnline = true
  vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => browserOnline)
  // The sidebar of the signed-in layout asks for its data; only the page chunk matters here.
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

// Each row is the only one to visit its route: a page stays loaded for the rest of the file.
it.each([
  { path: '/login', page: 'LoginPage', signedIn: false, inLayout: false },
  { path: '/auth/callback', page: 'CallbackPage', signedIn: false, inLayout: false },
  { path: '/repositories', page: 'RepositoriesPage', signedIn: true, inLayout: true },
  {
    path: '/repositories/1/settings',
    page: 'RepositorySettingsPage',
    signedIn: true,
    inLayout: true,
  },
  { path: '/runs', page: 'RunsPage', signedIn: true, inLayout: true },
  { path: `/runs/${RUN_ID}`, page: 'RunDetailPage', signedIn: true, inLayout: true },
  { path: '/review', page: 'ReviewRedirect', signedIn: true, inLayout: true },
  { path: '/audit', page: 'AuditPage', signedIn: true, inLayout: true },
  { path: '/analytics', page: 'AnalyticsPage', signedIn: true, inLayout: true },
])(
  '$path: shows the notice offline and opens the page when the network returns',
  async ({ path, page, signedIn, inLayout }) => {
    useAuthStore.setState({ isAuthenticated: signedIn, isLoading: false, isInitialized: true })
    browserOnline = false
    const router = createMemoryRouter(createRoutes(), { initialEntries: [path] })
    routers.push(router)

    render(<App router={router} />)

    expect(await screen.findByText(OFFLINE_RU)).toBeDefined()
    expect(screen.queryByText(ERROR_TITLE_RU)).toBeNull()
    expect(screen.queryByRole('button', { name: COLLAPSE_MENU_RU }) !== null).toBe(inLayout)

    browserOnline = true
    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(await screen.findByRole('heading', { name: page })).toBeDefined()
    expect(screen.queryByText(OFFLINE_RU)).toBeNull()
    expect(router.state.location.pathname).toBe(path)
  },
)
