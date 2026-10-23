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
  updatedFrame,
} from './runStreamConnect.page.fixture'
import {
  fetchRunActionResponse,
  fetchRunActions,
  fetchRunList,
  runQueryKeys,
} from '../../entities/run'
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

  it('refreshes each mounted endpoint once for one run update', async () => {
    fixture.mountPage()
    await settle()

    fixture.streams[0]?.send(updatedFrame())
    await settle()

    expect(fixture.requestCount(`/api/runs/${RUN_A}`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/diff`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/comments`)).toBe(2)
    expect(Date.now() - NOW.getTime()).toBe(0)
  })

  it.each([
    ['keepalive', ': keepalive\n\n'],
    ['malformed update', 'event: run.updated\ndata: not json\n\n'],
  ])('a %s-only chunk after an update refetches nothing', async (_label, frame) => {
    fixture.mountPage()
    await settle()
    fixture.streams[0]?.send(updatedFrame())
    await settle()

    fixture.streams[0]?.send(frame)
    await settle()

    expect(fixture.requestCount(`/api/runs/${RUN_A}`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/diff`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/comments`)).toBe(2)
    expect(Date.now() - NOW.getTime()).toBe(0)
  })

  it('retains the diff target when another step follows fetch-diff in the same chunk', async () => {
    fixture.mountPage()
    await settle()
    fixture.actions = [action('vcs.fetch_diff')]
    fixture.diffReady = true

    fixture.streams[0]?.send(stepFrame('vcs.fetch_diff') + stepFrame('context.build'))
    await settle()

    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/diff`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}`)).toBe(1)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/comments`)).toBe(1)
    expect(screen.getByText('src/stream.ts')).toBeTruthy()
    expect(Date.now() - NOW.getTime()).toBe(0)
  })

  it('refreshes the mounted list once for two different run updates in one stream chunk', async () => {
    const list = new QueryObserver(queryClient, {
      queryKey: runQueryKeys.list(),
      queryFn: () => fetchRunList(),
    })
    unsubscribe.push(list.subscribe(() => undefined))
    fixture.mountPage()
    await settle()
    expect(fixture.requestCount('/api/runs')).toBe(1)

    fixture.streams[0]?.send(updatedFrame(RUN_A) + updatedFrame(RUN_B))
    await settle()

    expect(fixture.requestCount('/api/runs')).toBe(2)
    expect(list.getCurrentResult().isError).toBe(false)
    expect(Date.now() - NOW.getTime()).toBe(0)
  })

  it.each(['step first', 'update first'])(
    'refreshes each endpoint once for a fetch-diff step and update in one chunk: %s',
    async (order) => {
      const otherRun = new QueryObserver(queryClient, {
        queryKey: runQueryKeys.actions(RUN_B),
        queryFn: () => fetchRunActions(RUN_B),
      })
      unsubscribe.push(otherRun.subscribe(() => undefined))
      fixture.mountPage()
      await settle()
      fixture.actions = [action('vcs.fetch_diff')]
      fixture.diffReady = true
      const step = stepFrame('vcs.fetch_diff')
      const update = updatedFrame()
      fixture.streams[0]?.send(order === 'step first' ? step + update : update + step)
      await settle()

      expect(screen.getByText('src/stream.ts')).toBeTruthy()
      expect(screen.getByText('#1 vcs.fetch_diff (<1 с)')).toBeTruthy()
      expect(fixture.requestCount(`/api/runs/${RUN_A}`)).toBe(2)
      expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)
      expect(fixture.requestCount(`/api/runs/${RUN_A}/diff`)).toBe(2)
      expect(fixture.requestCount(`/api/runs/${RUN_A}/comments`)).toBe(2)
      expect(fixture.requestCount(`/api/runs/${RUN_B}/actions`)).toBe(1)
      expect(otherRun.getCurrentResult().isStale).toBe(false)
    },
  )

  it('keeps different runs separate when a chunk mixes a full update and repeated steps', async () => {
    queryClient.setQueryData(runQueryKeys.detail(RUN_B), { status: 'running' })
    queryClient.setQueryData(runQueryKeys.diff(RUN_B), [])
    queryClient.setQueryData(runQueryKeys.comments(RUN_B), [])
    queryClient.setQueryData(runQueryKeys.actionResponse(RUN_B, 1), { body: 'other response' })
    const otherRun = new QueryObserver(queryClient, {
      queryKey: runQueryKeys.actions(RUN_B),
      queryFn: () => fetchRunActions(RUN_B),
    })
    unsubscribe.push(otherRun.subscribe(() => undefined))
    fixture.mountPage()
    await settle()

    fixture.streams[0]?.send(
      updatedFrame() +
        stepFrame('context.build', RUN_B) +
        stepFrame('future.tool', RUN_B) +
        'event: run.updated\ndata: not json\n\n',
    )
    await settle()

    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_B}/actions`)).toBe(2)
    expect(queryClient.getQueryState(runQueryKeys.detail(RUN_B))?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(runQueryKeys.diff(RUN_B))?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(runQueryKeys.comments(RUN_B))?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(runQueryKeys.actionResponse(RUN_B, 1))?.isInvalidated).toBe(
      false,
    )
    expect(fixture.requestCount(`/api/runs/${RUN_A}`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/diff`)).toBe(2)
    expect(fixture.requestCount(`/api/runs/${RUN_A}/comments`)).toBe(2)
  })

  it('a later chunk refreshes terminal actions even while an older response is pending', async () => {
    fixture.mountPage()
    await settle()
    const finishOldRequest = fixture.delayNextActions()
    fixture.streams[0]?.send(stepFrame('context.build'))
    await settle()
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)

    fixture.actions = [action('llm.generate_review')]
    fixture.run = { ...fixture.run, status: 'succeeded', finishedAt: NOW.toISOString() }
    fixture.streams[0]?.send(updatedFrame(RUN_A, 'succeeded'))
    await settle()

    // Locks the chosen cancel/restart mechanism as well as freshness. A bounded trailing
    // refresh would require revisiting this count and the architecture decision together.
    expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(3)
    expect(screen.getByText('succeeded')).toBeTruthy()
    expect(screen.getByText('#1 llm.generate_review (<1 с)')).toBeTruthy()
    finishOldRequest([action('context.build')])
    await settle()
    expect(screen.queryByText('#1 context.build (<1 с)')).toBeNull()
    expect(screen.getByText('#1 llm.generate_review (<1 с)')).toBeTruthy()
    expect(Date.now() - NOW.getTime()).toBe(0)
  })

  it.each(['without an event cursor', 'with an event cursor'])(
    'recovers the observed journal after reconnect %s before replay or polling',
    async (cursor) => {
      // Query's documented hidden-tab mode suppresses polling ticks; reconnect must recover on its own.
      focusManager.setFocused(false)
      fixture.mountPage()
      await settle()
      expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(1)
      if (cursor === 'with an event cursor') {
        fixture.streams[0]?.send('event: ping\nid: 42\ndata: ignored\n\n')
        await settle()
      }
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
      expect(fixture.requestCount(`/api/runs/${RUN_A}/actions`)).toBe(2)
      expect(fixture.requestCount(`/api/runs/${RUN_A}`)).toBe(2)
      expect(fixture.requestCount(`/api/runs/${RUN_A}/diff`)).toBe(2)
      expect(fixture.requestCount(`/api/runs/${RUN_A}/comments`)).toBe(2)
      expect(screen.getByText('#1 context.build (<1 с)')).toBeTruthy()
      expect(screen.getByTestId('run-progress-analysis').getAttribute('data-stage-state')).toBe(
        'process',
      )
      const streamCalls = vi.mocked(fetch).mock.calls.filter(([input]) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        return url.endsWith('/stream')
      })
      expect(new Headers(streamCalls[1]?.[1]?.headers).get('Last-Event-ID')).toBe(
        cursor === 'with an event cursor' ? '42' : null,
      )
    },
  )
})
