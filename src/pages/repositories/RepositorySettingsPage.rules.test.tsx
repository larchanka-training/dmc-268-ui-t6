// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from 'antd'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock mode on: the rules block asks the mock transport, as it does in `pnpm dev` with mocks.
vi.mock('../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/config/env')>()
  return { ...actual, USE_MOCKS: true, isMockMode: () => true }
})

import { mockRepositories } from '../../app/mocks/app-state'
import { mockRulesStatuses } from '../../app/mocks/mockRulesStatus'
import { initMockTransport, withMockTransportOverlay } from '../../app/mocks/mockTransport'
import { setMockTransport } from '../../shared/api/client'
import { RepositorySettingsPage } from './RepositorySettingsPage'

const [UI_REPO, API_REPO, INFRA_REPO, DOCS_REPO] = mockRepositories
if (!UI_REPO || !API_REPO || !INFRA_REPO || !DOCS_REPO) {
  throw new Error('the page tests expect four mock repositories')
}

const MISSING_WARNING = 'Используются дефолтные правила, создайте .review/rules.md'
const PENDING_DOCS_TEXT = `Проверяем .review/rules.md в ветке ${mockRulesStatuses[DOCS_REPO.id]?.branch ?? ''}…`

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

async function rulesBlock(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Правила ревью' })
}

beforeEach(() => {
  initMockTransport()
})

afterEach(() => {
  cleanup()
  setMockTransport(null)
})

describe('RepositorySettingsPage: rules status on mocks', () => {
  it.each([
    [UI_REPO.id, 'Файл найден'],
    [API_REPO.id, 'Файл правил содержит ошибки'],
    [INFRA_REPO.id, 'Не удалось прочитать файл правил'],
  ])('shows the rules state of repository %s', async (id, text) => {
    renderPage(settingsPath(id))

    const block = await rulesBlock()

    expect(await within(block).findByText(text)).toBeTruthy()
  })

  it('shows a newly connected repository as pending, and its missing status once the page is reopened', async () => {
    const first = renderPage(settingsPath(DOCS_REPO.id))

    const block = await rulesBlock()
    expect(await within(block).findByText(PENDING_DOCS_TEXT)).toBeTruthy()
    expect(within(block).queryByText(MISSING_WARNING)).toBeNull()
    first.unmount()

    renderPage(settingsPath(DOCS_REPO.id))

    expect(await within(await rulesBlock()).findByText(MISSING_WARNING)).toBeTruthy()
  })

  it('shows the branch from the response, not defaultBranch', async () => {
    renderPage(settingsPath(UI_REPO.id))

    const block = await rulesBlock()
    await within(block).findByText('Файл найден')

    const rules = mockRulesStatuses[UI_REPO.id]
    expect(rules?.branch).toBe('release/2.1')
    expect(UI_REPO.defaultBranch).toBe('main')
    expect(within(block).getByText('release/2.1')).toBeTruthy()
    expect(within(block).queryByText('main')).toBeNull()
  })

  it('puts the block below the form and keeps «Сохранить» the only primary button', async () => {
    const { container } = renderPage(settingsPath(UI_REPO.id))

    const block = await rulesBlock()
    await within(block).findByText('Файл найден')

    const form = container.querySelector('form')
    if (!form) {
      throw new Error('the settings form is missing')
    }
    expect(form.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const primaries = container.querySelectorAll('.ant-btn-primary')
    expect(primaries).toHaveLength(1)
    expect(primaries[0]?.textContent).toBe('Сохранить')
  })

  it('does not cancel or refetch rules on a settings save', async () => {
    let rulesRequests = 0
    withMockTransportOverlay((endpoint) => {
      if (endpoint.path.endsWith('/rules-status')) {
        rulesRequests += 1
      }
      return undefined
    })
    renderPage(settingsPath(UI_REPO.id))
    const block = await rulesBlock()
    await within(block).findByText('Файл найден')
    expect(rulesRequests).toBe(1)

    fireEvent.change(screen.getByLabelText('Лимит замечаний (1..10)'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await screen.findByText('Настройки репозитория успешно сохранены')
    // The save settles with an invalidation of the repositories; let it run.
    await waitFor(() => {
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Сохранить' }).disabled).toBe(
        true,
      )
    })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(rulesRequests).toBe(1)
    expect(within(block).getByText('Файл найден')).toBeTruthy()
  })

  it('never renders the late response of the previous repository', async () => {
    let releaseUi: () => void = () => undefined
    const uiHeld = new Promise<void>((resolve) => {
      releaseUi = resolve
    })
    // A promise only for the held endpoint: the overlay must answer `undefined` at once for the
    // rest, which falls through to the mock handler.
    withMockTransportOverlay((endpoint) =>
      endpoint.path === `/repos/${UI_REPO.id}/rules-status`
        ? uiHeld.then(() => mockRulesStatuses[UI_REPO.id])
        : undefined,
    )
    const { router } = renderPage(settingsPath(UI_REPO.id))
    await screen.findByRole('heading', { name: 'Настройки репозитория' })

    await act(async () => {
      await router.navigate(settingsPath(DOCS_REPO.id))
    })
    await screen.findByText(PENDING_DOCS_TEXT)
    const block = screen.getByRole('region', { name: 'Правила ревью' })

    releaseUi()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(within(block).queryByText('Файл найден')).toBeNull()
    expect(within(block).queryByText('release/2.1')).toBeNull()
    expect(within(block).getByText(PENDING_DOCS_TEXT)).toBeTruthy()
  })
})
