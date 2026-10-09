import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/config/env', () => ({
  USE_MOCKS: true,
  isMockMode: () => true,
  env: { VITE_USE_MOCKS: true },
  API_BASE_URL: '/api',
  GITHUB_CLIENT_ID: '',
  GITHUB_APP_SLUG: '',
}))

vi.mock('../providers/runStreamConnect', () => ({ applyRunUpdated: vi.fn() }))

import type { RunAction, RunDetail, RunListPage, RunSession } from '../../entities/run'
import { apiClient, setMockTransport } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { applyRunUpdated } from '../providers/runStreamConnect'
import { initMockTransport, startMockRunEvents } from './mockTransport'

const WALKING_ID = '11111111-1111-4111-8111-000000000011'
const FAILED_ID = '11111111-1111-4111-8111-000000000012'

function detail(id: string): Promise<RunDetail> {
  return apiClient<RunDetail>(endpoints.runs.detail(id))
}

function actions(id: string): Promise<RunAction[]> {
  return apiClient<RunAction[]>(endpoints.runs.actions(id))
}

async function listedStatus(id: string): Promise<RunSession['status'] | undefined> {
  const page = await apiClient<RunListPage>(endpoints.runs.list())
  return page.items.find((run) => run.id === id)?.status
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(applyRunUpdated).mockClear()
  initMockTransport()
})

afterEach(() => {
  vi.useRealTimers()
  setMockTransport(null)
})

describe('initMockTransport', () => {
  it('starts no timers', () => {
    initMockTransport()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('the walking run in the mock transport', () => {
  it('is listed as queued, and stays queued until its detail or actions are requested', async () => {
    expect(await listedStatus(WALKING_ID)).toBe('queued')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(await listedStatus(WALKING_ID)).toBe('queued')
  })

  it('walks through the stages from the first detail request', async () => {
    expect((await detail(WALKING_ID)).status).toBe('queued')
    expect(await actions(WALKING_ID)).toEqual([])

    await vi.advanceTimersByTimeAsync(1999)
    expect((await detail(WALKING_ID)).status).toBe('queued')
    await vi.advanceTimersByTimeAsync(1)
    expect((await detail(WALKING_ID)).status).toBe('running')
    expect((await actions(WALKING_ID)).map((action) => action.tool)).toEqual(['vcs.fetch_diff'])

    await vi.advanceTimersByTimeAsync(4500)
    const running = await detail(WALKING_ID)
    expect(running.status).toBe('running')
    expect(running.actionCount).toBe(4)
    expect((await actions(WALKING_ID)).map((action) => action.tool)).toEqual([
      'vcs.fetch_diff',
      'llm.call',
      'llm.repo_conventions',
      'context.build',
    ])

    await vi.advanceTimersByTimeAsync(4500)
    expect((await detail(WALKING_ID)).status).toBe('publishing')
    expect((await actions(WALKING_ID)).map((action) => action.tool).slice(-2)).toEqual([
      'llm.review_output',
      'review.postprocess',
    ])

    await vi.advanceTimersByTimeAsync(1500)
    expect((await actions(WALKING_ID)).map((action) => action.tool).slice(-1)).toEqual([
      'github.publish_review',
    ])

    await vi.advanceTimersByTimeAsync(1500)
    const done = await detail(WALKING_ID)
    expect(done.status).toBe('succeeded')
    expect(done.finishedAt).not.toBeNull()
    expect(done.findings).toHaveLength(8)
  })

  it('starts the clock on an actions request too', async () => {
    await actions(WALKING_ID)
    await vi.advanceTimersByTimeAsync(2000)
    expect((await detail(WALKING_ID)).status).toBe('running')
  })

  it('does not start the clock on a list, diff or comments request', async () => {
    await apiClient(endpoints.runs.list())
    await apiClient(endpoints.runs.diff(WALKING_ID))
    await apiClient(endpoints.runs.comments(WALKING_ID))
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await listedStatus(WALKING_ID)).toBe('queued')
  })

  it('shows its live status in the runs list', async () => {
    await detail(WALKING_ID)
    await vi.advanceTimersByTimeAsync(2000)
    expect(await listedStatus(WALKING_ID)).toBe('running')
    await vi.advanceTimersByTimeAsync(9000)
    expect(await listedStatus(WALKING_ID)).toBe('publishing')
    await vi.advanceTimersByTimeAsync(3000)
    expect(await listedStatus(WALKING_ID)).toBe('succeeded')
  })

  it('serves the demo diff, and comments only once succeeded', async () => {
    await detail(WALKING_ID)
    const diff = await apiClient<{ filename: string }[]>(endpoints.runs.diff(WALKING_ID))
    expect(diff.map((file) => file.filename)).toEqual(
      expect.arrayContaining(['src/a.ts', 'package.json']),
    )
    expect(await apiClient<unknown[]>(endpoints.runs.comments(WALKING_ID))).toEqual([])

    await vi.advanceTimersByTimeAsync(14_000)
    expect(await apiClient<unknown[]>(endpoints.runs.comments(WALKING_ID))).toHaveLength(3)
  })

  it('starts over when the transport is initialised again', async () => {
    await detail(WALKING_ID)
    await vi.advanceTimersByTimeAsync(20_000)
    expect((await detail(WALKING_ID)).status).toBe('succeeded')

    initMockTransport()
    expect(await listedStatus(WALKING_ID)).toBe('queued')
    expect((await detail(WALKING_ID)).status).toBe('queued')
  })
})

describe('the failed run in the mock transport', () => {
  it('is listed as failed', async () => {
    expect(await listedStatus(FAILED_ID)).toBe('failed')
  })

  it('serves a failed detail, its actions, a diff and no comments', async () => {
    const run = await detail(FAILED_ID)
    expect(run.status).toBe('failed')
    expect(run.errorCode).toBe('llm_timeout')
    expect(run.findings).toEqual([])

    const log = await actions(FAILED_ID)
    expect(log.map((action) => action.tool)).toEqual([
      'vcs.fetch_diff',
      'llm.repo_conventions',
      'context.build',
      'llm.call',
    ])
    expect(log[3]?.response).toHaveProperty('error')

    const diff = await apiClient<unknown[]>(endpoints.runs.diff(FAILED_ID))
    expect(diff.length).toBeGreaterThan(0)
    expect(await apiClient<unknown[]>(endpoints.runs.comments(FAILED_ID))).toEqual([])
  })

  it('does not change over time', async () => {
    await vi.advanceTimersByTimeAsync(60_000)
    expect((await detail(FAILED_ID)).status).toBe('failed')
    expect(await actions(FAILED_ID)).toHaveLength(4)
  })
})

describe('startMockRunEvents', () => {
  it('starts one interval and stops it again', () => {
    const stop = startMockRunEvents()
    expect(vi.getTimerCount()).toBe(1)
    stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('emits queued, running, publishing and succeeded once each as the walking run moves', async () => {
    const stop = startMockRunEvents()

    await vi.advanceTimersByTimeAsync(2000)
    await detail(WALKING_ID)
    await vi.advanceTimersByTimeAsync(20_000)
    stop()

    expect(vi.mocked(applyRunUpdated).mock.calls).toEqual([
      [{ runId: WALKING_ID, status: 'queued' }],
      [{ runId: WALKING_ID, status: 'running' }],
      [{ runId: WALKING_ID, status: 'publishing' }],
      [{ runId: WALKING_ID, status: 'succeeded' }],
    ])
  })

  it('emits at the first tick after each change, not before', async () => {
    const stop = startMockRunEvents()
    await vi.advanceTimersByTimeAsync(500)
    expect(vi.mocked(applyRunUpdated)).toHaveBeenCalledTimes(1)

    await detail(WALKING_ID)
    await vi.advanceTimersByTimeAsync(1499)
    expect(vi.mocked(applyRunUpdated)).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(501)
    expect(vi.mocked(applyRunUpdated)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(applyRunUpdated)).toHaveBeenLastCalledWith({
      runId: WALKING_ID,
      status: 'running',
    })
    stop()
  })

  it('emits nothing while the walking run is not started', async () => {
    const stop = startMockRunEvents()
    await vi.advanceTimersByTimeAsync(30_000)
    stop()
    expect(vi.mocked(applyRunUpdated).mock.calls).toEqual([
      [{ runId: WALKING_ID, status: 'queued' }],
    ])
  })

  it('emits nothing for the static runs and nothing after stop', async () => {
    const stop = startMockRunEvents()
    await detail(WALKING_ID)
    await vi.advanceTimersByTimeAsync(20_000)
    stop()
    const calls = vi.mocked(applyRunUpdated).mock.calls.length
    expect(
      vi.mocked(applyRunUpdated).mock.calls.every(([event]) => event.runId === WALKING_ID),
    ).toBe(true)

    initMockTransport()
    await detail(WALKING_ID)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(vi.mocked(applyRunUpdated)).toHaveBeenCalledTimes(calls)
  })
})
