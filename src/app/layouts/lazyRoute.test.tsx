// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { Suspense, type FC } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { i18n } from '../../shared/i18n'
import { UiProvider } from '../providers'
import { lazyRoute } from './lazyRoute'
import { PageFallback, RouteErrorFallback } from './RouteLayouts'

const LOADER_ERROR = 'Unable to preload CSS for /assets/RunDetailPage-abc.css'
const OFFLINE_RU = 'Нет подключения к сети. Страница откроется, когда связь вернётся'
const OFFLINE_EN = 'No network connection. The page will open once you are back online'
const ERROR_TITLE_RU = 'Произошла непредвиденная ошибка'
const PAGE_TITLE = 'Страница маршрута'

const Page: FC = () => <h1>{PAGE_TITLE}</h1>
const routeModule = { default: Page }
const routers: ReturnType<typeof createMemoryRouter>[] = []

// What the browser says about the network; the tests move it, `reconnect` also fires the event.
let browserOnline = true

beforeEach(() => {
  browserOnline = true
  vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => browserOnline)
})

afterEach(() => {
  cleanup()
  for (const router of routers.splice(0)) router.dispose()
  vi.restoreAllMocks()
})

function loader() {
  return vi.fn<() => Promise<{ default: FC }>>()
}

function renderRoute(Route: FC) {
  const router = createMemoryRouter(
    [
      {
        errorElement: <RouteErrorFallback />,
        children: [
          {
            path: '/page',
            element: (
              <Suspense fallback={<PageFallback />}>
                <Route />
              </Suspense>
            ),
          },
          { path: '/other', element: <h1>Другая страница</h1> },
        ],
      },
    ],
    { initialEntries: ['/page'] },
  )
  routers.push(router)
  render(
    <UiProvider>
      <RouterProvider router={router} />
    </UiProvider>,
  )
  return router
}

function fireOnline() {
  act(() => {
    window.dispatchEvent(new Event('online'))
  })
}

function reconnect() {
  browserOnline = true
  fireOnline()
}

async function goTo(router: ReturnType<typeof createMemoryRouter>, path: string) {
  await act(async () => {
    await router.navigate(path)
  })
}

it('opens the page when the chunk loads', async () => {
  const load = loader().mockResolvedValue(routeModule)

  renderRoute(lazyRoute(load))

  expect(await screen.findByRole('heading', { name: PAGE_TITLE })).toBeDefined()
  expect(load).toHaveBeenCalledOnce()
})

it('shows the offline notice without the loader text when the chunk fails offline', async () => {
  browserOnline = false
  const load = loader().mockRejectedValue(new Error(LOADER_ERROR))

  renderRoute(lazyRoute(load))

  expect(await screen.findByText(OFFLINE_RU)).toBeDefined()
  expect(screen.queryByText(LOADER_ERROR)).toBeNull()
  expect(screen.queryByText(ERROR_TITLE_RU)).toBeNull()

  await act(async () => {
    await i18n.changeLanguage('en')
  })
  expect(await screen.findByText(OFFLINE_EN)).toBeDefined()
})

it('opens the page without a new navigation when the network returns', async () => {
  browserOnline = false
  const load = loader()
    .mockRejectedValueOnce(new Error(LOADER_ERROR))
    .mockResolvedValue(routeModule)
  const router = renderRoute(lazyRoute(load))
  await screen.findByText(OFFLINE_RU)

  reconnect()

  expect(await screen.findByRole('heading', { name: PAGE_TITLE })).toBeDefined()
  expect(screen.queryByText(OFFLINE_RU)).toBeNull()
  expect(load).toHaveBeenCalledTimes(2)
  expect(router.state.location.pathname).toBe('/page')
})

it('keeps waiting when the import fails again because the network dropped once more', async () => {
  browserOnline = false
  const load = loader()
    .mockRejectedValueOnce(new Error(LOADER_ERROR))
    .mockRejectedValueOnce(new Error(LOADER_ERROR))
    .mockResolvedValue(routeModule)
  renderRoute(lazyRoute(load))
  await screen.findByText(OFFLINE_RU)

  // The event came, but the browser is offline again by the time the import fails.
  fireOnline()
  expect(await screen.findByText(OFFLINE_RU)).toBeDefined()
  expect(load).toHaveBeenCalledTimes(2)

  reconnect()
  expect(await screen.findByRole('heading', { name: PAGE_TITLE })).toBeDefined()
  expect(load).toHaveBeenCalledTimes(3)
})

it('opens the page on the next visit when the network returned after the user left', async () => {
  browserOnline = false
  const load = loader()
    .mockRejectedValueOnce(new Error(LOADER_ERROR))
    .mockResolvedValue(routeModule)
  const router = renderRoute(lazyRoute(load))
  await screen.findByText(OFFLINE_RU)

  await goTo(router, '/other')
  await screen.findByRole('heading', { name: 'Другая страница' })
  reconnect()
  await goTo(router, '/page')

  expect(await screen.findByRole('heading', { name: PAGE_TITLE })).toBeDefined()
  expect(screen.queryByText(OFFLINE_RU)).toBeNull()
})

it('keeps the error screen when the chunk fails with the network on, as a chunk gone after a deploy', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const load = loader().mockRejectedValue(new Error(LOADER_ERROR))

  renderRoute(lazyRoute(load))

  expect(await screen.findByText(ERROR_TITLE_RU)).toBeDefined()
  expect(screen.getByText(LOADER_ERROR)).toBeDefined()
  expect(screen.queryByText(OFFLINE_RU)).toBeNull()
})

it('moves from the notice to the error screen when the chunk is gone after the network returns', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  browserOnline = false
  const load = loader().mockRejectedValue(new Error(LOADER_ERROR))
  renderRoute(lazyRoute(load))
  await screen.findByText(OFFLINE_RU)

  reconnect()

  expect(await screen.findByText(ERROR_TITLE_RU)).toBeDefined()
  expect(screen.queryByText(OFFLINE_RU)).toBeNull()
})

it('keeps the error screen when a loaded page throws while offline', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  browserOnline = false
  const Broken: FC = () => {
    throw new Error('render failed')
  }
  const load = loader().mockResolvedValue({ default: Broken })

  renderRoute(lazyRoute(load))

  expect(await screen.findByText(ERROR_TITLE_RU)).toBeDefined()
  expect(screen.getByText('render failed')).toBeDefined()
  expect(screen.queryByText(OFFLINE_RU)).toBeNull()

  // Nothing waits for the network: a render exception is not retried.
  reconnect()
  expect(load).toHaveBeenCalledOnce()
})
