// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { App } from 'antd'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock mode on: the page talks to the mock transport, which builds an index after a switch-on, as
// it does in `pnpm dev` with mocks.
vi.mock('../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/config/env')>()
  return { ...actual, USE_MOCKS: true, isMockMode: () => true }
})

import { mockRepositories } from '../../app/mocks/app-state'
import {
  initMockTransport,
  MOCK_RAG_INDEXED_SHA,
  withMockTransportOverlay,
} from '../../app/mocks/mockTransport'
import { setMockTransport } from '../../shared/api/client'
import { advance } from '../../test/advanceTimers'
import { RepositorySettingsPage } from './RepositorySettingsPage'

const DOCS_REPO = mockRepositories[3]
if (DOCS_REPO?.ragEnabled !== false) {
  throw new Error('the RAG page tests expect the fourth mock repository with RAG off')
}

function renderPage(entry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  const router = createMemoryRouter(
    [
      {
        path: '/repositories/:repoId/settings',
        element: (
          <QueryClientProvider client={client}>
            <App>
              <RepositorySettingsPage />
            </App>
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: [entry] },
  )
  return { client, router, ...render(<RouterProvider router={router} />) }
}

function settingsPath(id: string): string {
  return `/repositories/${id}/settings`
}

function ragSwitch(): HTMLElement {
  return screen.getByRole('switch', { name: 'RAG' })
}

/** The RAG section: the switch, the hint and the status of the index. */
function ragSection(): HTMLElement {
  return screen.getByRole('region', { name: 'RAG' })
}

/**
 * Counts the repository GETs (the list, one repository) that reach the mock transport, which
 * answers them as before. The rules status has its own polling and is not counted.
 */
function countRepositoryGets(): { count: number } {
  const counter = { count: 0 }
  withMockTransportOverlay((endpoint) => {
    if (endpoint.method === 'GET' && /^\/repos(\/[^/]+)?$/.test(endpoint.path)) {
      counter.count += 1
    }
    return undefined
  })
  return counter
}

beforeEach(() => {
  initMockTransport()
})

afterEach(() => {
  cleanup()
  setMockTransport(null)
  vi.useRealTimers()
})

// Fake timers: the page is read with `getBy*` after an `advance`, never with `findBy*`/`waitFor`.
describe('RepositorySettingsPage: RAG on mocks', () => {
  it('builds the index after a switch-on and stops polling once it is ready', async () => {
    vi.useFakeTimers()
    const gets = countRepositoryGets()
    renderPage(settingsPath(DOCS_REPO.id))
    await advance(0)
    expect(ragSwitch().getAttribute('aria-checked')).toBe('false')
    expect(within(ragSection()).getByText('Выключен')).toBeTruthy()

    fireEvent.click(ragSwitch())
    await advance(0)
    // The refetch that ends the switch-on is the first GET of the build.
    expect(ragSwitch().getAttribute('aria-checked')).toBe('true')
    expect(within(ragSection()).getByText('Строится…')).toBeTruthy()
    const afterSwitchOn = gets.count

    await advance(5000)
    expect(gets.count).toBe(afterSwitchOn + 1)
    expect(within(ragSection()).getByText('Строится…')).toBeTruthy()

    await advance(5000)
    expect(gets.count).toBe(afterSwitchOn + 2)
    // TanStack hands the answer to the page from a zero-delay timer set once the request is over.
    await advance(1)
    expect(within(ragSection()).getByText('Готов')).toBeTruthy()
    expect(within(ragSection()).getByText(MOCK_RAG_INDEXED_SHA.slice(0, 7))).toBeTruthy()

    await advance(60_000)
    expect(gets.count).toBe(afterSwitchOn + 2)
  })

  it('stops asking the mock transport when the page is left mid-build', async () => {
    vi.useFakeTimers()
    const gets = countRepositoryGets()
    const view = renderPage(settingsPath(DOCS_REPO.id))
    await advance(0)

    fireEvent.click(ragSwitch())
    await advance(0)
    expect(within(ragSection()).getByText('Строится…')).toBeTruthy()
    const atLeave = gets.count

    view.unmount()
    await advance(60_000)

    expect(gets.count).toBe(atLeave)
  })
})
