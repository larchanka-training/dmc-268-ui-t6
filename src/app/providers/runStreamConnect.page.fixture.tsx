import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'

import { queryClient } from './queryClient'
import { runStreamUntilAborted } from './runStreamConnect'
import type { RunAction, RunDetail, RunStatus } from '../../entities/run'
import { RunDetailPage } from '../../pages/runs/RunDetailPage'

export const RUN_A = '11111111-1111-4111-8111-00000000000a'
export const RUN_B = '11111111-1111-4111-8111-00000000000b'
const STARTED_AT = '2026-09-18T10:00:00.000Z'
export const NOW = new Date('2026-09-18T10:00:01.000Z')
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

export function action(tool: string): RunAction {
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

export function stepFrame(tool: string, runId = RUN_A): string {
  return `event: run.step\ndata: ${JSON.stringify({
    runId,
    tool,
    index: 1,
    ok: true,
    startedAt: STARTED_AT,
    durationMs: 5,
  })}\n\n`
}

export function updatedFrame(runId = RUN_A, status: RunStatus = 'running'): string {
  return `event: run.updated\ndata: ${JSON.stringify({ runId, status })}\n\n`
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

interface RunStreamPageFixture {
  actions: RunAction[]
  run: RunDetail
  delayNextActions(): (actions: RunAction[]) => void
  diffReady: boolean
  requests: string[]
  streams: ReturnType<typeof openStream>[]
  streamAbort: AbortController
  streamDone: Promise<void> | undefined
  requestCount(path: string): number
  mountPage(): void
}

/** Per-test HTTP/SSE state; the page and bridge share the production query client. */
export function createRunStreamPageFixture(): RunStreamPageFixture {
  const delayedActions: Promise<Response>[] = []
  const fixture: RunStreamPageFixture = {
    run: { ...runningRun },
    delayNextActions() {
      let complete: ((response: Response) => void) | undefined
      delayedActions.push(
        new Promise<Response>((resolve) => {
          complete = resolve
        }),
      )
      return (actions) => {
        complete?.(Response.json(actions))
      }
    },
    actions: [],
    diffReady: false,
    requests: [],
    streams: [],
    streamAbort: new AbortController(),
    streamDone: undefined,
    requestCount(path) {
      return fixture.requests.filter((request) => request === path).length
    },
    mountPage(): void {
      const router = createMemoryRouter([{ path: '/runs/:runId', element: <RunDetailPage /> }], {
        initialEntries: [`/runs/${RUN_A}`],
      })
      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      )
      fixture.streamDone = runStreamUntilAborted(fixture.streamAbort.signal, 'stream_token')
    },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const path = new URL(url, 'http://localhost').pathname
      fixture.requests.push(path)
      if (path === '/api/stream') {
        const stream = openStream(init?.signal)
        fixture.streams.push(stream)
        return Promise.resolve(
          new Response(stream.body, { headers: { 'content-type': 'text/event-stream' } }),
        )
      }
      if (path === '/api/runs') {
        return Promise.resolve(Response.json({ items: [], nextCursor: null }))
      }
      if (path === `/api/runs/${RUN_A}`) {
        return Promise.resolve(Response.json(fixture.run))
      }
      if (path === `/api/runs/${RUN_A}/actions`) {
        return delayedActions.shift() ?? Promise.resolve(Response.json(fixture.actions))
      }
      if (path === `/api/runs/${RUN_A}/diff`) {
        return Promise.resolve(
          Response.json(fixture.diffReady ? [{ filename: 'src/stream.ts', patch: null }] : []),
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
  return fixture
}
