// @vitest-environment jsdom
import { focusManager, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from './queryClient'
import { runStreamUntilAborted } from './runStreamConnect'
import {
  fetchRunActionResponse,
  fetchRunActions,
  runQueryKeys,
  type RunAction,
  type RunDetail,
} from '../../entities/run'
import { setAccessToken, setMockTransport } from '../../shared/api/client'
import { useDiffViewerStore } from '../../widgets/diff-viewer'
import { useRunInspectorStore } from '../../widgets/run-inspector'
import { RunDetailPage } from '../../pages/runs/RunDetailPage'

const RUN_A = '11111111-1111-4111-8111-00000000000a'
const RUN_B = '11111111-1111-4111-8111-00000000000b'
const STARTED_AT = '2026-09-18T10:00:00.000Z'
const NOW = new Date('2026-09-18T10:00:01.000Z')
const runningRun: RunDetail = {
  id: RUN_A,
  engine: 'fast',
  model: null,
  status: 'running',
  trigger: 'webhook',
  createdAt: STARTED_AT,
  startedAt: STARTED_AT,
  finishedAt: null,
  attempt: 1,
  cancelRequested: false,
  summaryOnly: false,
  pullRequest: {
    repo: 'org/repo',
    number: 113,
    title: 'Stream-driven review',
    url: 'https://github.com/org/repo/pull/113',
    headSha: 'abc123',
  },
  actionCount: 0,
  errorCode: null,
  findings: [],
  summary: null,
  verdict: null,
  severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  budget: null,
}

function action(tool: string): RunAction {
  return {
    id: '22222222-2222-4222-8222-000000000001',
    runId: RUN_A,
    index: 1,
    tool,
    request: {},
    response: { ok: true },
    responseRef: null,
    startedAt: STARTED_AT,
    durationMs: 5,
  }
}

function stepFrame(tool: string): string {
  return `event: run.step\ndata: ${JSON.stringify({
    runId: RUN_A,
    tool,
    index: 1,
    ok: true,
    startedAt: STARTED_AT,
    durationMs: 5,
  })}\n\n`
}

function openStream(signal?: AbortSignal | null) {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  let closed = false
  const body = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value
    },
  })
  signal?.addEventListener(
    'abort',
    () => {
      if (!closed) {
        controller?.error(new DOMException('Aborted', 'AbortError'))
        closed = true
      }
    },
    { once: true },
  )
  return {
    body,
    send(frame: string) {
      controller?.enqueue(new TextEncoder().encode(frame))
    },
    close() {
      controller?.close()
      closed = true
    },
  }
}

let actions: RunAction[]
let diffReady: boolean
let requests: string[]
let streams: ReturnType<typeof openStream>[]
let streamAbort: AbortController
let streamDone: Promise<void> | undefined
let unsubscribe: (() => void)[]

function requestCount(path: string): number {
  return requests.filter((request) => request === path).length
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function settle(): Promise<void> {
  for (let round = 0; round < 5; round += 1) {
    await advance(0)
  }
}

function mountPage(): void {
  const router = createMemoryRouter([{ path: '/runs/:runId', element: <RunDetailPage /> }], {
    initialEntries: [`/runs/${RUN_A}`],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  streamDone = runStreamUntilAborted(streamAbort.signal, 'stream_token')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  queryClient.clear()
  focusManager.setFocused(true)
  actions = []
  diffReady = false
  requests = []
  streams = []
  unsubscribe = []
  streamAbort = new AbortController()
  streamDone = undefined
  setMockTransport(null)
  setAccessToken('stream_token')
  useDiffViewerStore.setState({ viewType: 'unified' })
  useRunInspectorStore.setState({ expandedKeys: [], selectedActionIndex: null })
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const path = new URL(url, 'http://localhost').pathname
      requests.push(path)
      if (path === '/api/stream') {
        const stream = openStream(init?.signal)
        streams.push(stream)
        return Promise.resolve(
          new Response(stream.body, { headers: { 'content-type': 'text/event-stream' } }),
        )
      }
      if (path === `/api/runs/${RUN_A}`) {
        return Promise.resolve(Response.json(runningRun))
      }
      if (path === `/api/runs/${RUN_A}/actions`) {
        return Promise.resolve(Response.json(actions))
      }
      if (path === `/api/runs/${RUN_A}/diff`) {
        return Promise.resolve(
          Response.json(diffReady ? [{ filename: 'src/stream.ts', patch: null }] : []),
        )
      }
      if (path === `/api/runs/${RUN_A}/comments` || path === `/api/runs/${RUN_B}/actions`) {
        return Promise.resolve(Response.json([]))
      }
      if (path === `/api/runs/${RUN_A}/actions/1/response`) {
        return Promise.resolve(Response.json({ body: 'cached response' }))
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`))
    }),
  )
})

afterEach(async () => {
  streamAbort.abort()
  await streamDone
  cleanup()
  for (const stop of unsubscribe) {
    stop()
  }
  queryClient.clear()
  focusManager.setFocused(undefined)
  setAccessToken(null)
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('RunDetailPage live step stream', () => {
  it('shows a new journal entry and analysis stage before polling, leaving other queries fresh', async () => {
    const otherRun = new QueryObserver(queryClient, {
      queryKey: runQueryKeys.actions(RUN_B),
      queryFn: () => fetchRunActions(RUN_B),
    })
    const response = new QueryObserver(queryClient, {
      queryKey: runQueryKeys.actionResponse(RUN_A, 1),
      queryFn: () => fetchRunActionResponse(RUN_A, 1),
    })
    unsubscribe.push(
      otherRun.subscribe(() => undefined),
      response.subscribe(() => undefined),
    )
    mountPage()
    await settle()
    expect(screen.getByTestId('run-progress-context').getAttribute('data-stage-state')).toBe(
      'process',
    )
    expect(screen.getByTestId('run-progress-analysis').getAttribute('data-stage-state')).toBe(
      'wait',
    )
    expect(screen.queryByText('#1 context.build (<1 с)')).toBeNull()
    expect(requestCount(`/api/runs/${RUN_A}/actions`)).toBe(1)

    actions = [action('context.build')]
    streams[0]?.send(stepFrame('context.build'))
    await settle()

    expect(
      within(screen.getByRole('region', { name: 'Сессия ревью' })).getByText(
        '#1 context.build (<1 с)',
      ),
    ).toBeTruthy()
    expect(screen.getByTestId('run-progress-context').getAttribute('data-stage-state')).toBe(
      'finish',
    )
    expect(screen.getByTestId('run-progress-analysis').getAttribute('data-stage-state')).toBe(
      'process',
    )
    expect(Date.now() - NOW.getTime()).toBe(0)
    expect(requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)
    expect(requestCount(`/api/runs/${RUN_B}/actions`)).toBe(1)
    expect(otherRun.getCurrentResult().isStale).toBe(false)
    expect(requestCount(`/api/runs/${RUN_A}/actions/1/response`)).toBe(1)
    expect(response.getCurrentResult().isStale).toBe(false)
    expect(requestCount(`/api/runs/${RUN_A}`)).toBe(1)
    expect(requestCount(`/api/runs/${RUN_A}/diff`)).toBe(1)
    expect(requestCount(`/api/runs/${RUN_A}/comments`)).toBe(1)
    expect(screen.getByText('running')).toBeTruthy()
  })

  it('shows fetched files on a page opened before fetch-diff while the run remains running', async () => {
    mountPage()
    await settle()
    expect(screen.queryByText('src/stream.ts')).toBeNull()
    expect(requestCount(`/api/runs/${RUN_A}/diff`)).toBe(1)

    actions = [action('vcs.fetch_diff')]
    diffReady = true
    streams[0]?.send(stepFrame('vcs.fetch_diff'))
    await settle()

    expect(screen.getByText('src/stream.ts')).toBeTruthy()
    expect(screen.getByText('#1 vcs.fetch_diff (<1 с)')).toBeTruthy()
    expect(screen.getByText('running')).toBeTruthy()
    expect(Date.now() - NOW.getTime()).toBe(0)
    expect(requestCount(`/api/runs/${RUN_A}/diff`)).toBe(2)
    expect(requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)
    expect(requestCount(`/api/runs/${RUN_A}`)).toBe(1)
    expect(requestCount(`/api/runs/${RUN_A}/comments`)).toBe(1)
  })

  it('recovers the observed journal after reconnect without replay or a polling refetch', async () => {
    // Query's documented hidden-tab mode suppresses polling ticks; reconnect must recover on its own.
    focusManager.setFocused(false)
    mountPage()
    await settle()
    expect(requestCount(`/api/runs/${RUN_A}/actions`)).toBe(1)
    await advance(3000)
    await settle()
    expect(requestCount(`/api/runs/${RUN_A}/actions`)).toBe(1)

    actions = [action('context.build')]
    streams[0]?.close()
    await settle()
    await advance(2999)
    expect(requestCount('/api/stream')).toBe(1)
    expect(requestCount(`/api/runs/${RUN_A}/actions`)).toBe(1)
    await advance(1)
    await settle()
    // Query notifications scheduled during the reconnect timer flush on the following turn.
    await advance(1)
    await settle()

    expect(requestCount('/api/stream')).toBe(2)
    expect(requestCount(`/api/runs/${RUN_A}/actions`)).toBeGreaterThan(1)
    expect(screen.getByText('#1 context.build (<1 с)')).toBeTruthy()
    expect(screen.getByTestId('run-progress-analysis').getAttribute('data-stage-state')).toBe(
      'process',
    )
  })
})
