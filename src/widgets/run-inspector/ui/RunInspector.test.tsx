// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'

import type { RunSession } from '../../../entities/run'
import { makeDuoActions } from '../../../entities/run/lib/duoActions.fixture'
import { setMockTransport } from '../../../shared/api/client'
import { useRunInspectorStore } from '../model/store'
import { RunInspector } from './RunInspector'

const RUN: RunSession = {
  id: '22222222-2222-4222-8222-000000000001',
  engine: 'deep',
  model: 'claude-sonnet-5',
  status: 'succeeded',
  startedAt: '2026-09-18T11:50:00.000Z',
  finishedAt: '2026-09-18T11:55:12.000Z',
  attempt: 1,
  cancelRequested: false,
  summaryOnly: false,
  pullRequest: {
    repo: 'larchanka-training/dmc-268-ui-t6',
    number: 34,
    title: 'feat: inspector',
    url: 'https://github.com/larchanka-training/dmc-268-ui-t6/pull/34',
    headSha: 'abcdef1234567890abcdef1234567890abcdef12',
  },
  actionCount: 34,
  errorCode: null,
}

const ACTIONS = makeDuoActions(RUN.id)
const NOW = new Date('2026-09-18T12:00:00.000Z')

beforeEach(() => {
  useRunInspectorStore.setState({ expandedKeys: [], selectedActionIndex: null })
  setMockTransport((endpoint) => {
    const match = /^\/runs\/([^/]+)\/actions\/(\d+)\/response$/.exec(endpoint.path)
    if (match && endpoint.method === 'GET') {
      return { content: 'loaded blob response' }
    }
    return undefined
  })
})

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

afterEach(() => {
  cleanup()
  setMockTransport(null)
})

describe('RunInspector', () => {
  it('renders the run header fields and the PR link', () => {
    renderWithQuery(<RunInspector run={RUN} actions={ACTIONS} now={NOW} />)
    expect(screen.getByText('deep')).toBeTruthy()
    expect(screen.getByText('claude-sonnet-5')).toBeTruthy()
    expect(screen.getByText('succeeded')).toBeTruthy()
    expect(screen.getByText('5 мин 12 с')).toBeTruthy()
    const link = screen.getByText('#34 feat: inspector')
    expect(link.closest('a')?.getAttribute('href')).toBe(RUN.pullRequest.url)
  })

  it('collapses groups so nested actions are not visible', () => {
    renderWithQuery(<RunInspector run={RUN} actions={ACTIONS} now={NOW} />)
    expect(screen.getByText('get_tree ×19')).toBeTruthy()
    expect(screen.getByText('get_blob ×11')).toBeTruthy()
    expect(screen.getByText(/#33 post_review/)).toBeTruthy()
    expect(screen.queryByText(/#5 get_tree/)).toBeNull()
  })

  it('expands a group to reveal its actions', () => {
    renderWithQuery(<RunInspector run={RUN} actions={ACTIONS} now={NOW} />)
    act(() => {
      useRunInspectorStore.getState().setExpandedKeys(['group-2'])
    })
    expect(screen.getByText(/#5 get_tree/)).toBeTruthy()
  })

  it('loads action response on demand when responseRef is set', async () => {
    renderWithQuery(<RunInspector run={RUN} actions={ACTIONS} now={NOW} />)
    act(() => {
      useRunInspectorStore.getState().selectAction(24)
    })
    await waitFor(() => {
      expect(screen.getByText(/loaded blob response/)).toBeTruthy()
    })
    act(() => {
      useRunInspectorStore.getState().selectAction(0)
    })
    expect(screen.getByText(/"filesChanged": 35/)).toBeTruthy()
  })

  it('flags a stale running run', () => {
    const staleRun: RunSession = {
      ...RUN,
      status: 'running',
      finishedAt: null,
      startedAt: '2026-09-18T11:20:00.000Z',
    }
    renderWithQuery(<RunInspector run={staleRun} actions={ACTIONS} now={NOW} />)
    expect(screen.getByText('нет ответа > 10 мин')).toBeTruthy()
    expect(screen.getByText('40 мин 0 с')).toBeTruthy()
  })
})
