// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { REPOSITORIES_QUERY_KEY, type Repository } from '../../entities/repository'
import { RepositorySettingsPage } from './RepositorySettingsPage'

const UI_REPO: Repository = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  fullName: 'larchanka-training/dmc-268-ui-t6',
  url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
  defaultBranch: 'main',
  enabled: true,
  defaultEngine: 'fast',
  waitForCi: 'auto',
  maxComments: 10,
  reviewEvent: 'COMMENT',
  branchFilter: [],
  severityThreshold: 'all',
  installationAvailable: true,
}

const API_REPO: Repository = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  fullName: 'larchanka-training/dmc-268-api-t6',
  url: 'https://github.com/larchanka-training/dmc-268-api-t6',
  defaultBranch: 'master',
  enabled: false,
  defaultEngine: 'fast',
  waitForCi: 'never',
  maxComments: 4,
  reviewEvent: 'REQUEST_CHANGES',
  branchFilter: [],
  severityThreshold: 'all',
  installationAvailable: true,
}

// A valid uuid that no list contains.
const UNKNOWN_ID = 'c3d4e5f6-a7b8-4901-8def-123456789012'

const LIMIT_LABEL = 'Лимит замечаний (1..10)'
const CI_LABEL = 'Ожидание CI'
const VERDICT_LABEL = 'Публикация вердикта'
const SERVER_500_TEXT = 'Внутренняя ошибка сервера (500). Повторите попытку позже.'

interface Backend {
  /** What the next GET /api/repos answers. */
  repos: Repository[]
  /** Makes GET /api/repos answer 500 and PATCH answer 500. */
  failList: boolean
  failPatch: boolean
  gets: number
  patches: { id: string; body: unknown }[]
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>
}

function urlOf(input: Parameters<typeof fetch>[0]): URL {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return new URL(href, 'http://localhost')
}

/** Stands in for the network: the repository list and the PATCH of one repository. */
function stubBackend(repos: Repository[]): Backend {
  const backend: Backend = {
    repos,
    failList: false,
    failPatch: false,
    gets: 0,
    patches: [],
    fetchMock: vi.fn<typeof fetch>((input, init) => {
      const url = urlOf(input)
      if (init?.method === 'PATCH') {
        const id = url.pathname.split('/').pop() ?? ''
        const body = JSON.parse(typeof init.body === 'string' ? init.body : '{}') as Record<
          string,
          unknown
        >
        backend.patches.push({ id, body })
        if (backend.failPatch) {
          return Promise.resolve(new Response('Server Error', { status: 500 }))
        }
        const saved = { ...backend.repos.find((repo) => repo.id === id), ...body }
        backend.repos = backend.repos.map((repo) => (repo.id === id ? (saved as Repository) : repo))
        return Promise.resolve(new Response(JSON.stringify(saved), { status: 200 }))
      }
      backend.gets += 1
      if (backend.failList) {
        return Promise.resolve(new Response('Server Error', { status: 500 }))
      }
      return Promise.resolve(new Response(JSON.stringify(backend.repos), { status: 200 }))
    }),
  }
  vi.stubGlobal('fetch', backend.fetchMock)
  return backend
}

function renderPage(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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
      { path: '/repositories', element: <div data-testid="repositories-route">list</div> },
      { path: '/runs', element: <div data-testid="runs-route">runs</div> },
    ],
    { initialEntries: [entry] },
  )
  return { client, router, ...render(<RouterProvider router={router} />) }
}

function settingsPath(id: string): string {
  return `/repositories/${id}/settings`
}

function inputValue(label: string): string {
  return screen.getByLabelText<HTMLInputElement>(label).value
}

/** The text a Select shows as its chosen value (the open dropdown repeats the options). */
function selectedText(label: string): string | null | undefined {
  return screen.getByLabelText(label).closest('.ant-select')?.querySelector('.ant-select-content')
    ?.textContent
}

function saveButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Сохранить' })
}

async function chooseOption(label: string, optionText: string): Promise<void> {
  fireEvent.mouseDown(screen.getByLabelText(label))
  await waitFor(() => {
    expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0)
  })
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(
    (item) => item.textContent === optionText,
  )
  if (!option) {
    throw new Error(`no option "${optionText}"`)
  }
  fireEvent.click(option)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RepositorySettingsPage', () => {
  it('opens the settings of the repository from the URL', async () => {
    const backend = stubBackend([UI_REPO, API_REPO])

    renderPage(settingsPath(UI_REPO.id))

    expect(await screen.findByRole('heading', { name: 'Настройки репозитория' })).toBeTruthy()
    expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeTruthy()
    expect(inputValue(LIMIT_LABEL)).toBe('10')
    expect(selectedText(CI_LABEL)).toBe('Авто (ожидать CI при наличии проверок)')
    expect(selectedText(VERDICT_LABEL)).toBe('Комментарий (при любых замечаниях)')
    expect(saveButton().disabled).toBe(true)
    // The repository comes from the list: no request of its own.
    expect(backend.fetchMock.mock.calls.map(([input]) => urlOf(input).pathname)).toEqual([
      '/api/repos',
    ])
  })

  it('rejects a non-uuid repoId without a request', async () => {
    const backend = stubBackend([UI_REPO])

    renderPage(settingsPath('not-a-uuid'))

    expect(await screen.findByText('Некорректная ссылка на репозиторий')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'К списку репозиториев' }).getAttribute('href')).toBe(
      '/repositories',
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(backend.fetchMock).not.toHaveBeenCalled()
  })

  it('shows not-found for an unknown repository', async () => {
    stubBackend([UI_REPO, API_REPO])

    renderPage(settingsPath(UNKNOWN_ID))

    expect(await screen.findByText('Репозиторий не найден или недоступен')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'К списку репозиториев' }).getAttribute('href')).toBe(
      '/repositories',
    )
    expect(screen.queryByLabelText(LIMIT_LABEL)).toBeNull()
  })

  it('shows the load error and loads the repository on retry', async () => {
    const backend = stubBackend([UI_REPO])
    backend.failList = true

    renderPage(settingsPath(UI_REPO.id))

    expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
    expect(screen.queryByLabelText(LIMIT_LABEL)).toBeNull()

    backend.failList = false
    fireEvent.click(screen.getByRole('button', { name: 'Повторить попытку' }))

    expect(await screen.findByLabelText(LIMIT_LABEL)).toBeTruthy()
    expect(screen.queryByText(SERVER_500_TEXT)).toBeNull()
  })

  it('saves only the changed fields and never sends defaultEngine', async () => {
    const backend = stubBackend([UI_REPO, API_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    // The engine is read-only text: no control, no phase-3 option.
    expect(screen.queryByLabelText('Движок анализа')).toBeNull()
    expect(screen.getByText('DiffEngine (быстрый синтаксический анализ)')).toBeTruthy()
    expect(
      screen.getByText('SandboxEngine (глубокий анализ в песочнице) появится в фазе 3'),
    ).toBeTruthy()

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    await chooseOption(VERDICT_LABEL, 'Запрос изменений (при блокирующих)')
    expect(saveButton().disabled).toBe(false)
    fireEvent.click(saveButton())

    await screen.findByText('Настройки репозитория успешно сохранены')
    expect(backend.patches).toEqual([
      { id: UI_REPO.id, body: { maxComments: 5, reviewEvent: 'REQUEST_CHANGES' } },
    ])
    expect(saveButton().disabled).toBe(true)
  })

  it('takes the saved values as the baseline of the next save', async () => {
    const backend = stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(saveButton())
    await waitFor(() => {
      expect(backend.patches).toHaveLength(1)
    })
    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })

    // Back to the value the form was opened with: that is a change against the saved 5.
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '10' } })
    await waitFor(() => {
      expect(saveButton().disabled).toBe(false)
    })
    fireEvent.click(saveButton())

    await waitFor(() => {
      expect(backend.patches).toHaveLength(2)
    })
    expect(backend.patches[1]).toEqual({ id: UI_REPO.id, body: { maxComments: 10 } })
  })

  it('keeps entered values when PATCH fails with 500', async () => {
    const backend = stubBackend([UI_REPO])
    backend.failPatch = true
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(saveButton())

    // The error is a message on the page, not a toast that disappears.
    expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { maxComments: 5 } }])
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    expect(saveButton().disabled).toBe(false)
  })

  it('restores the opened values on «Отменить изменения»', async () => {
    const backend = stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    await chooseOption(CI_LABEL, 'Никогда (запускать ревью без ожидания CI)')
    expect(selectedText(CI_LABEL)).toBe('Никогда (запускать ревью без ожидания CI)')
    expect(saveButton().disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения' }))

    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })
    expect(inputValue(LIMIT_LABEL)).toBe('10')
    expect(selectedText(CI_LABEL)).toBe('Авто (ожидать CI при наличии проверок)')
    expect(backend.patches).toEqual([])
  })

  it('does not reset the form on a background refetch', async () => {
    const backend = stubBackend([UI_REPO, API_REPO])
    const { client } = renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    // The server now reports another limit for the same repository.
    backend.repos = [{ ...UI_REPO, maxComments: 7 }, API_REPO]
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    expect(backend.gets).toBe(2)
    expect(client.getQueryData<Repository[]>(REPOSITORIES_QUERY_KEY)?.[0]?.maxComments).toBe(7)
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    expect(saveButton().disabled).toBe(false)
  })

  it('keeps the form when a background refetch fails', async () => {
    const backend = stubBackend([UI_REPO])
    const { client } = renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    backend.failList = true
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    expect(backend.gets).toBe(2)
    expect(client.getQueryState(REPOSITORIES_QUERY_KEY)?.status).toBe('error')
    expect(inputValue(LIMIT_LABEL)).toBe('5')
  })

  it('resets the form when another repository opens', async () => {
    stubBackend([UI_REPO, API_REPO])
    const { router } = renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '3' } })
    expect(inputValue(LIMIT_LABEL)).toBe('3')

    await act(async () => {
      await router.navigate(settingsPath(API_REPO.id))
    })

    expect(await screen.findByText('larchanka-training/dmc-268-api-t6')).toBeTruthy()
    expect(inputValue(LIMIT_LABEL)).toBe('4')
    expect(selectedText(CI_LABEL)).toBe('Никогда (запускать ревью без ожидания CI)')
    expect(saveButton().disabled).toBe(true)
  })

  it('links «История проверок» to /runs?repo=<fullName>', async () => {
    stubBackend([UI_REPO])
    const { router } = renderPage(settingsPath(UI_REPO.id))

    const link = await screen.findByRole('link', { name: 'История проверок' })
    expect(link.getAttribute('href')).toBe('/runs?repo=larchanka-training%2Fdmc-268-ui-t6')

    fireEvent.click(link)

    expect(await screen.findByTestId('runs-route')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/runs')
    expect(router.state.location.search).toBe('?repo=larchanka-training%2Fdmc-268-ui-t6')
  })
})
