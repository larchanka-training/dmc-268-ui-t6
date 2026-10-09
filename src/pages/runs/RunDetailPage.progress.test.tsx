// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'

vi.mock('../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/config/env')>()
  return {
    ...actual,
    USE_MOCKS: true,
    isMockMode: () => true,
  }
})

import { mockRunsListPage } from '../../app/mocks/mockRunsList.fixture'
import { buildMockRunDetail } from '../../app/mocks/mockRunReview'
import { initMockTransport, withMockTransportOverlay } from '../../app/mocks/mockTransport'
import { DEMO_RUN_ID } from '../../shared/config/demoRun'
import { setAccessToken, setMockTransport } from '../../shared/api/client'
import { RUN_ACTIONS_POLL_MS, runQueryKeys } from '../../entities/run'
import type { RunStatus } from '../../entities/run'
import { useAuthStore } from '../../features/auth'
import { useDiffViewerStore } from '../../widgets/diff-viewer'
import { useRunInspectorStore } from '../../widgets/run-inspector'
import { RunDetailPage } from './RunDetailPage'

// The run is the demo run with the status under test: its diff, comments and actions are served
// by the default mock transport, only the detail and the `/actions` request count are ours.
const FINISHED_AT = '2026-09-18T12:05:00.000Z'

let currentStatus: RunStatus = 'running'
let actionsRequests = 0

function installTransport(): void {
  const session = mockRunsListPage.items.find((run) => run.id === DEMO_RUN_ID)
  if (!session) {
    throw new Error('demo run missing from mock list')
  }
  withMockTransportOverlay((endpoint) => {
    if (endpoint.path === `/runs/${DEMO_RUN_ID}/actions` && endpoint.method === 'GET') {
      actionsRequests += 1
      return undefined
    }
    if (endpoint.path === `/runs/${DEMO_RUN_ID}` && endpoint.method === 'GET') {
      const terminal = ['succeeded', 'failed', 'cancelled', 'skipped'].includes(currentStatus)
      return {
        ...buildMockRunDetail(session),
        status: currentStatus,
        finishedAt: terminal ? FINISHED_AT : null,
      }
    }
    return undefined
  })
}

function renderRunDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/runs/:runId', element: <RunDetailPage /> }], {
    initialEntries: [`/runs/${DEMO_RUN_ID}`],
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return client
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

// A few zero-length rounds let the requests, the query notifications and React renders drain.
async function settle(): Promise<void> {
  for (let round = 0; round < 5; round += 1) {
    await advance(0)
  }
}

describe('RunDetailPage actions polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    actionsRequests = 0
    currentStatus = 'running'
    initMockTransport()
    setAccessToken('mock_jwt_token_skvertl_dmc')
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    })
    useDiffViewerStore.setState({ viewType: 'unified', selectedFile: null })
    useRunInspectorStore.setState({ expandedKeys: [], selectedActionIndex: null })
    installTransport()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
    setAccessToken(null)
    setMockTransport(null)
  })

  it('exposes a 3-second poll interval', () => {
    expect(RUN_ACTIONS_POLL_MS).toBe(3000)
  })

  it('polls /actions every 3 seconds while the run is running', async () => {
    renderRunDetail()
    await settle()
    expect(screen.getByTestId('run-detail-page')).toBeTruthy()
    expect(actionsRequests).toBe(1)

    await advance(2999)
    expect(actionsRequests).toBe(1)
    await advance(1)
    expect(actionsRequests).toBe(2)

    await advance(3000)
    expect(actionsRequests).toBe(3)
    await advance(3000)
    expect(actionsRequests).toBe(4)
  })

  it.each<RunStatus>(['queued', 'running', 'publishing'])(
    'keeps polling /actions while the run is %s',
    async (status) => {
      currentStatus = status
      renderRunDetail()
      await settle()
      expect(actionsRequests).toBe(1)

      await advance(3 * 3000)
      expect(actionsRequests).toBe(4)
    },
  )

  it.each<RunStatus>(['succeeded', 'failed', 'cancelled', 'skipped'])(
    'does not poll /actions for a %s run',
    async (status) => {
      currentStatus = status
      renderRunDetail()
      await settle()
      expect(screen.getByTestId('run-detail-page')).toBeTruthy()
      expect(actionsRequests).toBe(1)

      await advance(5 * 3000)
      expect(actionsRequests).toBe(1)
    },
  )

  it('stops polling /actions once the run turns terminal', async () => {
    const client = renderRunDetail()
    await settle()
    await advance(3000)
    expect(actionsRequests).toBe(2)

    currentStatus = 'succeeded'
    // `detail(id)` is the prefix of the actions key, so this one call also refetches the log once,
    // the way a stream event does.
    void client.invalidateQueries({ queryKey: runQueryKeys.detail(DEMO_RUN_ID) })
    await settle()
    expect(actionsRequests).toBe(3)

    await advance(5 * 3000)
    expect(actionsRequests).toBe(3)
  })

  it('starts polling /actions when the run status turns active', async () => {
    currentStatus = 'succeeded'
    const client = renderRunDetail()
    await settle()
    await advance(2 * 3000)
    expect(actionsRequests).toBe(1)

    currentStatus = 'queued'
    void client.invalidateQueries({ queryKey: runQueryKeys.detail(DEMO_RUN_ID) })
    await settle()
    expect(actionsRequests).toBe(2)

    await advance(2999)
    expect(actionsRequests).toBe(2)
    await advance(1)
    expect(actionsRequests).toBe(3)
    await advance(3000)
    expect(actionsRequests).toBe(4)
  })
})
