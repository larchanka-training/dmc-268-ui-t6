// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, within } from '@testing-library/react'
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
import { ApiError, setAccessToken, setMockTransport } from '../../shared/api/client'
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
let currentErrorCode: string | null = null
let actionsRequests = 0
let detailFails = false
let actionsFail = false
let actionsHang = false

function installTransport(): void {
  const session = mockRunsListPage.items.find((run) => run.id === DEMO_RUN_ID)
  if (!session) {
    throw new Error('demo run missing from mock list')
  }
  withMockTransportOverlay((endpoint) => {
    if (endpoint.path === `/runs/${DEMO_RUN_ID}/actions` && endpoint.method === 'GET') {
      actionsRequests += 1
      if (actionsFail) {
        throw new ApiError(500, 'Internal Server Error', { message: 'actions are down' })
      }
      if (actionsHang) {
        // A request that stays in flight: the page is mid-poll.
        return new Promise(() => undefined)
      }
      return undefined
    }
    if (endpoint.path === `/runs/${DEMO_RUN_ID}` && endpoint.method === 'GET') {
      if (detailFails) {
        throw new ApiError(404, 'Not Found', { message: 'Run not found' })
      }
      const terminal = ['succeeded', 'failed', 'cancelled', 'skipped'].includes(currentStatus)
      return {
        ...buildMockRunDetail(session),
        status: currentStatus,
        finishedAt: terminal ? FINISHED_AT : null,
        errorCode: currentErrorCode,
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

beforeEach(() => {
  vi.useFakeTimers()
  actionsRequests = 0
  currentStatus = 'running'
  currentErrorCode = null
  detailFails = false
  actionsFail = false
  actionsHang = false
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

describe('RunDetailPage actions polling', () => {
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

  it('does not poll /actions when the run detail failed to load', async () => {
    detailFails = true
    renderRunDetail()
    await settle()
    expect(screen.getByTestId('run-detail-run-error')).toBeTruthy()
    expect(actionsRequests).toBe(1)

    await advance(5 * 3000)
    expect(actionsRequests).toBe(1)
  })

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

function stageStates(): (string | null)[] {
  const bar = screen.getByTestId('run-progress')
  return Array.from(bar.querySelectorAll('[data-stage-state]')).map((node) =>
    node.getAttribute('data-stage-state'),
  )
}

describe('RunDetailPage progress bar', () => {
  it('shows the three stages on a running run, working on context', async () => {
    renderRunDetail()
    await settle()
    expect(screen.getByTestId('run-detail-page')).toBeTruthy()

    const bar = screen.getByTestId('run-progress')
    expect(within(bar).getByText('Сбор контекста')).toBeTruthy()
    expect(within(bar).getByText('Анализ LLM')).toBeTruthy()
    expect(within(bar).getByText('Публикация')).toBeTruthy()
    // The demo actions carry no known pipeline tool, so nothing has marked context done.
    expect(stageStates()).toEqual(['process', 'wait', 'wait'])
    // The status tag stays next to the bar.
    expect(screen.getByText('running')).toBeTruthy()
  })

  it('shows no bar on a skipped run', async () => {
    currentStatus = 'skipped'
    renderRunDetail()
    await settle()
    expect(screen.getByTestId('run-detail-page')).toBeTruthy()
    expect(screen.getByText('skipped')).toBeTruthy()
    expect(screen.queryByTestId('run-progress')).toBeNull()
  })

  it('shows the errorCode on the failed stage of a failed run', async () => {
    currentStatus = 'failed'
    currentErrorCode = 'llm_timeout'
    renderRunDetail()
    await settle()

    expect(stageStates()).toEqual(['error', 'wait', 'wait'])
    // The header «Ошибка» row shows the code too; the bar shows it on the stage itself.
    expect(within(screen.getByTestId('run-progress')).getByText('llm_timeout')).toBeTruthy()
  })

  it('shows a cancelled run as stopped, not as an error', async () => {
    currentStatus = 'cancelled'
    renderRunDetail()
    await settle()

    expect(stageStates()).toEqual(['stopped', 'wait', 'wait'])
    expect(within(screen.getByTestId('run-progress')).getByText('Остановлено')).toBeTruthy()
    expect(document.querySelector('.ant-steps-item-error')).toBeNull()
  })

  it('moves the bar when the run status changes', async () => {
    const client = renderRunDetail()
    await settle()
    expect(stageStates()).toEqual(['process', 'wait', 'wait'])

    currentStatus = 'publishing'
    void client.invalidateQueries({ queryKey: runQueryKeys.detail(DEMO_RUN_ID) })
    await settle()
    expect(stageStates()).toEqual(['finish', 'finish', 'process'])

    currentStatus = 'succeeded'
    void client.invalidateQueries({ queryKey: runQueryKeys.detail(DEMO_RUN_ID) })
    await settle()
    expect(stageStates()).toEqual(['finish', 'finish', 'finish'])
  })
})

describe('RunDetailPage progress bar without the action log', () => {
  it.each<RunStatus>(['running', 'failed', 'cancelled'])(
    'shows no bar for a %s run whose /actions request failed',
    async (status) => {
      currentStatus = status
      actionsFail = true
      renderRunDetail()
      await settle()

      expect(screen.getByTestId('run-detail-page')).toBeTruthy()
      expect(screen.queryByTestId('run-progress')).toBeNull()
    },
  )

  it.each<[RunStatus, string[]]>([
    ['queued', ['wait', 'wait', 'wait']],
    ['publishing', ['finish', 'finish', 'process']],
    ['succeeded', ['finish', 'finish', 'finish']],
  ])('still shows the bar for a %s run whose /actions request failed', async (status, expected) => {
    currentStatus = status
    actionsFail = true
    renderRunDetail()
    await settle()

    expect(stageStates()).toEqual(expected)
  })

  it('keeps the bar on the last log when a later refetch of the log fails', async () => {
    const client = renderRunDetail()
    await settle()
    expect(stageStates()).toEqual(['process', 'wait', 'wait'])

    actionsFail = true
    void client.invalidateQueries({ queryKey: runQueryKeys.actions(DEMO_RUN_ID) })
    await settle()
    expect(client.getQueryState(runQueryKeys.actions(DEMO_RUN_ID))?.status).toBe('error')
    expect(stageStates()).toEqual(['process', 'wait', 'wait'])
  })

  it('shows the bar once the next poll brings the log', async () => {
    actionsFail = true
    renderRunDetail()
    await settle()
    expect(screen.queryByTestId('run-progress')).toBeNull()
    expect(actionsRequests).toBe(1)

    actionsFail = false
    await advance(3000)
    // A timer created inside the poll's tick is due 1 ms later on the fake clock, and TanStack
    // tells React through `setTimeout(0)`: without this step the bar only shows after the next poll.
    await advance(1)
    expect(actionsRequests).toBe(2)
    expect(stageStates()).toEqual(['process', 'wait', 'wait'])
  })

  // A query that has only ever failed is `pending` again while a poll is in flight, so the card
  // must not swap the inspector for a spinner on that account: only the first load of the log does.
  it('keeps the inspector and the cancel button mounted while a poll of a failing log is in flight', async () => {
    actionsFail = true
    renderRunDetail()
    await settle()
    expect(screen.getByText('Отменить')).toBeTruthy()

    actionsFail = false
    actionsHang = true
    await advance(3000)
    await advance(1)
    expect(actionsRequests).toBe(2)
    expect(screen.getByText('Отменить')).toBeTruthy()
    expect(screen.getByText('Сессия ревью')).toBeTruthy()
  })

  it('keeps the bar hidden while a poll of a failing log is in flight, not guessing from an empty log', async () => {
    actionsFail = true
    renderRunDetail()
    await settle()
    expect(screen.queryByTestId('run-progress')).toBeNull()

    actionsFail = false
    actionsHang = true
    await advance(3000)
    await advance(1)
    expect(actionsRequests).toBe(2)
    expect(screen.queryByTestId('run-progress')).toBeNull()
  })

  it('shows the spinner on the first load of the log, before any failure', async () => {
    actionsHang = true
    renderRunDetail()
    await settle()
    expect(actionsRequests).toBe(1)
    expect(screen.queryByText('Отменить')).toBeNull()
    expect(screen.queryByTestId('run-progress')).toBeNull()
  })

  it('shows the bar once a refetch brings the log', async () => {
    actionsFail = true
    const client = renderRunDetail()
    await settle()
    expect(screen.queryByTestId('run-progress')).toBeNull()

    actionsFail = false
    void client.invalidateQueries({ queryKey: runQueryKeys.actions(DEMO_RUN_ID) })
    await settle()
    expect(stageStates()).toEqual(['process', 'wait', 'wait'])
  })
})
