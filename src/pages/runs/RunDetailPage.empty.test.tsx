// @vitest-environment jsdom
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it } from 'vitest'

import { runQueryKeys } from '../../entities/run'
import { setMockTransport } from '../../shared/api/client'
import { RunDetailPage } from './RunDetailPage'

// A cold offline query is paused with no data and isLoading=false. Preserve the existing
// not-found branch through the real query hook; changing the offline UX is outside #128.
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

it('preserves the existing not-found output when the initial run query is paused offline', () => {
  onlineManager.setOnline(false)
  setMockTransport(() => [])
  const runId = '11111111-1111-4111-8111-000000000001'
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  router = createMemoryRouter([{ path: '/runs/:runId', element: <RunDetailPage /> }], {
    initialEntries: [`/runs/${runId}`],
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  expect(client.getQueryState(runQueryKeys.detail(runId))?.fetchStatus).toBe('paused')
  expect(client.getQueryData(runQueryKeys.detail(runId))).toBeUndefined()
  expect(screen.getByTestId('run-detail-run-error').textContent).toContain('Прогон не найден')
})
