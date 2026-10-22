// @vitest-environment jsdom
import { focusManager, QueryObserver } from '@tanstack/react-query'
import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient } from './queryClient'
import {
  action,
  createRunStreamPageFixture,
  NOW,
  RUN_A,
  RUN_B,
  stepFrame,
} from './runStreamConnect.page.fixture'
import { fetchRunActionResponse, fetchRunActions, runQueryKeys } from '../../entities/run'
import { setAccessToken, setMockTransport } from '../../shared/api/client'
import { useDiffViewerStore } from '../../widgets/diff-viewer'
import { useRunInspectorStore } from '../../widgets/run-inspector'
import { advance, settle } from '../../test/advanceTimers'

let fixture: ReturnType<typeof createRunStreamPageFixture>
let unsubscribe: (() => void)[]

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  queryClient.clear()
  focusManager.setFocused(true)
  fixture = createRunStreamPageFixture()
  unsubscribe = []
  setMockTransport(null)
  setAccessToken('stream_token')
  useDiffViewerStore.setState({ viewType: 'unified' })
  useRunInspectorStore.setState({ expandedKeys: [], selectedActionIndex: null })
})

afterEach(async () => {
  fixture.streamAbort.abort()
  await fixture.streamDone
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
    fixture.mountPage()
    await settle()
    expect(screen.getByTestId('run-progress-context').getAttribute('data-stage-state')).toBe(
      'process',
    )
    expect(screen.getByTestId('run-progress-analysis').getAttribute('data-stage-state')).toBe(
      'wait',
    )
    expect(screen.queryByText('#1 context.build (<1 с)')).toBeNull()
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(1)

    fixture.actions = [action('context.build')]
    fixture.streams[0]?.send(stepFrame('context.build'))
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
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_B}/actions`)).toBe(1)
    expect(otherRun.getCurrentResult().isStale).toBe(false)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions/1/response`)).toBe(1)
    expect(response.getCurrentResult().isStale).toBe(false)
    expect(fixture.requestCount(`/api/runs/${RUN_A}`)).toBe(1)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/diff`)).toBe(1)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/comments`)).toBe(1)
    expect(screen.getByText('running')).toBeTruthy()
  })

  it('shows fetched files on a page opened before fetch-diff while the run remains running', async () => {
    fixture.mountPage()
    await settle()
    expect(screen.queryByText('src/stream.ts')).toBeNull()
    expect(fixture.requestCount(`/api/runs/${RUN_A}/diff`)).toBe(1)

    fixture.actions = [action('vcs.fetch_diff')]
    fixture.diffReady = true
    fixture.streams[0]?.send(stepFrame('vcs.fetch_diff'))
    await settle()

    expect(screen.getByText('src/stream.ts')).toBeTruthy()
    expect(screen.getByText('#1 vcs.fetch_diff (<1 с)')).toBeTruthy()
    expect(screen.getByText('running')).toBeTruthy()
    expect(Date.now() - NOW.getTime()).toBe(0)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/diff`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}`)).toBe(1)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/comments`)).toBe(1)
  })

  it('recovers the observed journal after reconnect without replay or a polling refetch', async () => {
    // Query's documented hidden-tab mode suppresses polling ticks; reconnect must recover on its own.
    focusManager.setFocused(false)
    fixture.mountPage()
    await settle()
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(1)
    await advance(3000)
    await settle()
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(1)

    fixture.actions = [action('context.build')]
    fixture.streams[0]?.close()
    await settle()
    await advance(2999)
    expect(fixture.requestCount('/api/stream')).toBe(1)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(1)
    await advance(1)
    await settle()
    // Query notifications scheduled during the reconnect timer flush on the following turn.
    await advance(1)
    await settle()

    expect(fixture.requestCount('/api/stream')).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBeGreaterThan(1)
    expect(screen.getByText('#1 context.build (<1 с)')).toBeTruthy()
    expect(screen.getByTestId('run-progress-analysis').getAttribute('data-stage-state')).toBe(
      'process',
    )
  })
})
