// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { lazy, Suspense, type FC } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockRunsListPage } from './mocks/mockRunsList.fixture'
import { buildMockRunDetail } from './mocks/mockRunReview'
import { PageFallback } from './layouts/RouteLayouts'
import { UiProvider } from './providers'
import { runQueryKeys } from '../entities/run'
import { ApiError, setMockTransport } from '../shared/api/client'
import { DEMO_RUN_ID } from '../shared/config/demoRun'
import { advance, settle } from '../test/advanceTimers'
import { RunDetailPage } from '../pages/runs/RunDetailPage'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const session = mockRunsListPage.items.find((run) => run.id === DEMO_RUN_ID)
if (!session) throw new Error('demo run missing from fixture')
const run = { ...buildMockRunDetail(session), findings: [] }
let response: ReturnType<typeof deferred<typeof run>>
const clients: QueryClient[] = []
const routers: ReturnType<typeof createMemoryRouter>[] = []

beforeEach(() => {
  vi.useFakeTimers()
  response = deferred<typeof run>()
  // The real query hooks and schema parsers consume this deferred API boundary.
  setMockTransport((endpoint) => (endpoint.path === `/runs/${DEMO_RUN_ID}` ? response.promise : []))
})

afterEach(() => {
  cleanup()
  for (const router of routers.splice(0)) router.dispose()
  for (const client of clients.splice(0)) client.clear()
  setMockTransport(null)
  vi.useRealTimers()
})

function renderPage(
  options: {
    routeChunk?: ReturnType<typeof deferred<{ default: FC }>>
    path?: string
    cached?: boolean
  } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  if (options.cached)
    client.setQueryData(runQueryKeys.detail(DEMO_RUN_ID), { ...run, droppedFindings: 0 })
  const routeChunk = options.routeChunk
  const Page = routeChunk ? lazy(() => routeChunk.promise) : RunDetailPage
  const router = createMemoryRouter(
    [
      {
        path: '/runs/:runId?',
        element: (
          <Suspense fallback={<PageFallback />}>
            <Page />
          </Suspense>
        ),
      },
      { path: '/away', element: <h1>Другая страница</h1> },
    ],
    { initialEntries: [options.path ?? `/runs/${DEMO_RUN_ID}`] },
  )
  routers.push(router)
  const view = render(
    <UiProvider>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </UiProvider>,
  )
  return { ...view, client, router }
}

async function finishRun() {
  act(() => {
    response.resolve(run)
  })
  await settle()
}

async function finishPageFade() {
  // jsdom has no CSS transitions; let content paint, then report the real layer's fade end.
  await advance(16)
  await advance(16)
  fireEvent.transitionEnd(screen.getByTestId('page-loader'), { propertyName: 'opacity' })
}

async function waitWithoutPageRing(ms: number) {
  expect(screen.queryByTestId('page-loader')).toBeNull()
  for (let elapsed = 0; elapsed < ms; elapsed += 16) {
    await advance(Math.min(16, ms - elapsed))
    expect(screen.queryByTestId('page-loader')).toBeNull()
  }
}

describe('RunDetailPage initial page wait', () => {
  it('has no instant page Spin and uses the shared host only after 300 ms', async () => {
    const { container } = renderPage()
    expect(container.querySelector('.ant-spin')).toBeNull()
    expect(screen.queryByTestId('page-loader')).toBeNull()
    await advance(299)
    expect(screen.queryByTestId('page-loader')).toBeNull()
    await advance(1)
    expect(screen.getAllByTestId('page-loader')).toHaveLength(1)
    await advance(16)
    expect(screen.getByTestId('page-loader').dataset.state).toBe('shown')
  })

  it('never flashes the page ring when the run arrives before 300 ms', async () => {
    renderPage()
    await waitWithoutPageRing(100)
    await finishRun()
    expect(screen.getByTestId('run-detail-page')).toBeTruthy()
    await waitWithoutPageRing(1000)
  })

  it('keeps the original 300 ms delay when the route chunk hands over to run data', async () => {
    const routeChunk = deferred<{ default: FC }>()
    const { container, client } = renderPage({ routeChunk })
    await advance(200)
    act(() => {
      routeChunk.resolve({ default: RunDetailPage })
    })
    await settle()
    expect(client.isFetching({ queryKey: runQueryKeys.detail(DEMO_RUN_ID), exact: true })).toBe(1)
    expect(container.querySelector('.ant-spin')).toBeNull()
    await advance(99)
    expect(screen.queryByTestId('page-loader')).toBeNull()
    await advance(1)
    expect(screen.getAllByTestId('page-loader')).toHaveLength(1)
  })

  it('keeps the same shown host when the route chunk hands over after 300 ms', async () => {
    const routeChunk = deferred<{ default: FC }>()
    const { container, client } = renderPage({ routeChunk })
    await advance(300)
    await advance(16)
    const host = screen.getByTestId('page-loader')
    expect(host.dataset.state).toBe('shown')
    act(() => {
      routeChunk.resolve({ default: RunDetailPage })
    })
    await settle()
    expect(client.isFetching({ queryKey: runQueryKeys.detail(DEMO_RUN_ID), exact: true })).toBe(1)
    expect(container.querySelector('.ant-spin')).toBeNull()
    expect(screen.getByTestId('page-loader')).toBe(host)
    expect(host.dataset.state).toBe('shown')
    for (let elapsed = 0; elapsed < 1000; elapsed += 16) {
      await advance(16)
      expect(screen.getByTestId('page-loader')).toBe(host)
      expect(host.dataset.state).toBe('shown')
    }
  })

  it('paints a successful run before releasing the shared page wait', async () => {
    renderPage()
    await advance(300)
    await advance(16)
    const host = screen.getByTestId('page-loader')
    await finishRun()
    expect(screen.getByTestId('run-detail-page')).toBeTruthy()
    expect(screen.getByTestId('page-loader')).toBe(host)
    expect(host.dataset.state).toBe('shown')
    await finishPageFade()
    expect(screen.queryByTestId('page-loader')).toBeNull()
  })

  it.each([
    [404, 'Прогон не найден'],
    [500, 'Не удалось загрузить прогон'],
  ])('releases the wait and keeps the existing %i error output', async (status, message) => {
    renderPage()
    await advance(300)
    await advance(16)
    act(() => {
      response.reject(new ApiError(status, 'Error', null))
    })
    await settle()
    expect(screen.getByTestId('run-detail-run-error').textContent).toContain(message)
    await finishPageFade()
    expect(screen.queryByTestId('page-loader')).toBeNull()
  })

  it('releases the wait when navigating away from a pending run', async () => {
    const { router } = renderPage()
    await advance(300)
    await advance(16)
    await act(async () => {
      await router.navigate('/away')
    })
    expect(screen.getByRole('heading', { name: 'Другая страница' })).toBeTruthy()
    await finishPageFade()
    expect(screen.queryByTestId('page-loader')).toBeNull()
    await finishRun()
    await advance(300)
    expect(screen.queryByTestId('page-loader')).toBeNull()
  })

  it('keeps cached run content visible while a background refetch remains pending', async () => {
    const { client } = renderPage({ cached: true })
    await settle()
    expect(client.isFetching({ queryKey: runQueryKeys.detail(DEMO_RUN_ID), exact: true })).toBe(1)
    expect(screen.getByTestId('run-detail-page')).toBeTruthy()
    await advance(1000)
    expect(screen.getByTestId('run-detail-page')).toBeTruthy()
    expect(screen.queryByTestId('page-loader')).toBeNull()
  })

  it('keeps the missing-id output without registering a page wait', async () => {
    renderPage({ path: '/runs' })
    expect(screen.getByText('Не указан id прогона')).toBeTruthy()
    await advance(1000)
    expect(screen.queryByTestId('page-loader')).toBeNull()
  })
})
