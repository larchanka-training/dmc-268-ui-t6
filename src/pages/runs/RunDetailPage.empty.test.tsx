// @vitest-environment jsdom
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it } from 'vitest'

import { mockRunsListPage } from '../../app/mocks/mockRunsList.fixture'
import { buildMockRunDetail } from '../../app/mocks/mockRunReview'
import { runQueryKeys } from '../../entities/run'
import { setMockTransport } from '../../shared/api/client'
import { DEMO_RUN_ID } from '../../shared/config/demoRun'
import { i18n } from '../../shared/i18n'
import { RunDetailPage } from './RunDetailPage'

// A cold query without network is paused: no data, isLoading=false and no error. The real query
// hook and onlineManager decide it here; only the API boundary is replaced.
const session = mockRunsListPage.items.find((run) => run.id === DEMO_RUN_ID)
if (!session) throw new Error('demo run missing from fixture')
const run = { ...buildMockRunDetail(session), findings: [] }

const originalOnline = onlineManager.isOnline()
let client: QueryClient | undefined
let router: ReturnType<typeof createMemoryRouter> | undefined

afterEach(() => {
  cleanup()
  router?.dispose()
  client?.clear()
  onlineManager.setOnline(originalOnline)
  setMockTransport(null)
})

function renderPage(): QueryClient {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client = queryClient
  router = createMemoryRouter([{ path: '/runs/:runId', element: <RunDetailPage /> }], {
    initialEntries: [`/runs/${DEMO_RUN_ID}`],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return queryClient
}

function renderPausedOffline(): void {
  onlineManager.setOnline(false)
  setMockTransport((endpoint) => (endpoint.path === `/runs/${DEMO_RUN_ID}` ? run : []))
  const queryClient = renderPage()
  expect(queryClient.getQueryState(runQueryKeys.detail(DEMO_RUN_ID))?.fetchStatus).toBe('paused')
  expect(queryClient.getQueryData(runQueryKeys.detail(DEMO_RUN_ID))).toBeUndefined()
}

it('shows the offline message, not "not found", when the initial run query is paused', () => {
  renderPausedOffline()
  expect(screen.getByTestId('run-detail-run-offline').textContent).toBe(
    'Нет подключения к сети. Прогон откроется, когда связь вернётся',
  )
  expect(screen.queryByTestId('run-detail-run-error')).toBeNull()
  expect(screen.queryByText('Прогон не найден')).toBeNull()
})

it('shows the offline message in English', async () => {
  await i18n.changeLanguage('en')
  try {
    renderPausedOffline()
    expect(screen.getByTestId('run-detail-run-offline').textContent).toBe(
      'No network connection. The run will open once you are back online',
    )
    expect(screen.queryByText('Run not found')).toBeNull()
  } finally {
    await i18n.changeLanguage('ru')
  }
})

it('shows the run without a reload when the network returns', async () => {
  renderPausedOffline()
  expect(screen.getByTestId('run-detail-run-offline')).toBeTruthy()
  act(() => {
    onlineManager.setOnline(true)
  })
  expect(await screen.findByTestId('run-detail-page')).toBeTruthy()
  expect(screen.queryByTestId('run-detail-run-offline')).toBeNull()
})

it('keeps "not found" for a query with no data that is not paused', async () => {
  // A cancelled first fetch returns to pending + idle: no data, no error, no pause.
  setMockTransport(() => new Promise(() => undefined))
  const queryClient = renderPage()
  await act(async () => {
    await queryClient.cancelQueries({ queryKey: runQueryKeys.detail(DEMO_RUN_ID) })
  })
  expect(queryClient.getQueryState(runQueryKeys.detail(DEMO_RUN_ID))?.fetchStatus).toBe('idle')
  expect((await screen.findByTestId('run-detail-run-error')).textContent).toContain(
    'Прогон не найден',
  )
  expect(screen.queryByTestId('run-detail-run-offline')).toBeNull()
})
