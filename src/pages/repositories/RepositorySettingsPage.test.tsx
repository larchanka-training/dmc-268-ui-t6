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

// A repository whose branch filter is set.
const FULL_REPO: Repository = {
  ...UI_REPO,
  branchFilter: ['main', 'release/*'],
  severityThreshold: 'all',
}

// A valid uuid that no list contains.
const UNKNOWN_ID = 'c3d4e5f6-a7b8-4901-8def-123456789012'

const LIMIT_LABEL = 'Лимит замечаний (1..10)'
const CI_LABEL = 'Ожидание CI'
const VERDICT_LABEL = 'Публикация вердикта'
const SERVER_500_TEXT = 'Внутренняя ошибка сервера (500). Повторите попытку позже.'
const BRANCH_FILTER_LABEL = 'Фильтр веток'
const AUTO_REVIEW_LABEL = 'Автоматическое ревью'
const ENGLISH_422_MSG = 'String should match pattern'
const RADIO_ALL = 'All — critical, high, medium, low, info'
const RADIO_WARN = 'Warn & Crit — critical, high, medium, low'
const RADIO_CRIT = 'Only Critical — critical, high'

interface Backend {
  /** What the next GET /api/repos answers. */
  repos: Repository[]
  /** Makes GET /api/repos answer 500 and PATCH answer 500. */
  failList: boolean
  failPatch: boolean
  /** Overrides the answer to every PATCH (a 422, for one). */
  patchResponse: (() => Response) | null
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
    patchResponse: null,
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
        if (backend.patchResponse !== null) {
          return Promise.resolve(backend.patchResponse())
        }
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

function unprocessable(detail: unknown[]): () => Response {
  return () => new Response(JSON.stringify({ detail }), { status: 422 })
}

function branchFilterField(): HTMLTextAreaElement {
  return screen.getByLabelText<HTMLTextAreaElement>(BRANCH_FILTER_LABEL)
}

function autoReviewSwitch(): HTMLElement {
  return screen.getByRole('switch', { name: AUTO_REVIEW_LABEL })
}

/** Clicks a threshold radio, saves, and waits until the save is over. */
async function saveThreshold(radioName: string, backend: Backend, saves: number): Promise<void> {
  fireEvent.click(screen.getByRole('radio', { name: radioName }))
  await waitFor(() => {
    expect(saveButton().disabled).toBe(false)
  })
  fireEvent.click(saveButton())
  await waitFor(() => {
    expect(backend.patches).toHaveLength(saves)
  })
  await waitFor(() => {
    expect(saveButton().disabled).toBe(true)
  })
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

describe('RepositorySettingsPage: auto-review', () => {
  it('toggles auto-review immediately with PATCH {enabled} only', async () => {
    const backend = stubBackend([UI_REPO, API_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('true')

    // An unsaved edit of the form must not travel with the switch.
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(autoReviewSwitch())

    await screen.findByText('Автоматическое ревью выключено')
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: false } }])
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('false')
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    expect(saveButton().disabled).toBe(false)

    fireEvent.click(autoReviewSwitch())
    await waitFor(() => {
      expect(backend.patches).toHaveLength(2)
    })
    expect(backend.patches[1]).toEqual({ id: UI_REPO.id, body: { enabled: true } })
  })

  it('shows the error under the switch and rolls the switch back when PATCH fails', async () => {
    const backend = stubBackend([UI_REPO])
    backend.failPatch = true
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.click(autoReviewSwitch())

    expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: false } }])
    await waitFor(() => {
      expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('true')
    })
  })

  it('explains why auto-review will not run when installationAvailable is false', async () => {
    const backend = stubBackend([{ ...UI_REPO, installationAvailable: false }])
    renderPage(settingsPath(UI_REPO.id))

    expect(await screen.findByText(/у GitHub App нет доступа к этому репозиторию/i)).toBeTruthy()
    expect(screen.getByText(/автоматическое ревью не запустится/i)).toBeTruthy()
    expect(screen.getByText(/переключатель сохраняет только настройку/i)).toBeTruthy()

    // The switch still saves the preference.
    fireEvent.click(autoReviewSwitch())
    await waitFor(() => {
      expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: false } }])
    })
  })

  it('does not warn about the installation when installationAvailable is true', async () => {
    stubBackend([{ ...UI_REPO, installationAvailable: true }])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    expect(screen.queryByText(/у GitHub App нет доступа/i)).toBeNull()
  })
})

describe('RepositorySettingsPage: branch filter and severity threshold', () => {
  it('shows the saved masks one per line and the saved threshold', async () => {
    stubBackend([{ ...FULL_REPO, severityThreshold: 'warning' }])
    renderPage(settingsPath(UI_REPO.id))

    await screen.findByLabelText(LIMIT_LABEL)
    expect(branchFilterField().value).toBe('main\nrelease/*')
    expect(screen.getByText(/Пусто — все ветки/)).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: RADIO_WARN }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: RADIO_ALL }).checked).toBe(false)
  })

  it('offers All / Warn & Crit / Only Critical and saves each wire value', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    // Each option names the levels it keeps.
    expect(screen.getByRole('radiogroup', { name: 'Порог важности замечаний' })).toBeTruthy()
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'all',
      'warning',
      'critical',
    ])
    expect(screen.getByRole<HTMLInputElement>('radio', { name: RADIO_ALL }).checked).toBe(true)
    expect(screen.getByRole('radio', { name: RADIO_WARN })).toBeTruthy()
    expect(screen.getByRole('radio', { name: RADIO_CRIT })).toBeTruthy()

    await saveThreshold(RADIO_WARN, backend, 1)
    await saveThreshold(RADIO_CRIT, backend, 2)
    await saveThreshold(RADIO_ALL, backend, 3)

    expect(backend.patches).toEqual([
      { id: UI_REPO.id, body: { severityThreshold: 'warning' } },
      { id: UI_REPO.id, body: { severityThreshold: 'critical' } },
      { id: UI_REPO.id, body: { severityThreshold: 'all' } },
    ])
  })

  it('sends the masks one per line, trimmed and without duplicates', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), {
      target: { value: 'main\n\n  release/* \nmain\nhotfix/*\n' },
    })
    fireEvent.click(saveButton())

    await screen.findByText('Настройки репозитория успешно сохранены')
    expect(backend.patches).toEqual([
      { id: UI_REPO.id, body: { branchFilter: ['main', 'release/*', 'hotfix/*'] } },
    ])
  })

  it('sends an empty filter as []', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: '  \n ' } })
    expect(saveButton().disabled).toBe(false)
    fireEvent.click(saveButton())

    await screen.findByText('Настройки репозитория успешно сохранены')
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { branchFilter: [] } }])
    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })
  })

  it('refuses a list over the size limits before any request', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), {
      target: { value: Array.from({ length: 21 }, (_, i) => `b${String(i)}`).join('\n') },
    })
    fireEvent.click(saveButton())

    expect(await screen.findByText('Не больше 20 масок')).toBeTruthy()
    expect(backend.patches).toEqual([])
  })

  it('shows the 422 under the branch filter with the line number and keeps the masks', async () => {
    const backend = stubBackend([FULL_REPO])
    backend.patchResponse = unprocessable([
      { loc: ['body', 'branchFilter', 1], msg: ENGLISH_422_MSG, type: 'value_error' },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'main\n[oops' } })
    fireEvent.click(saveButton())

    expect(await screen.findByText('Маска в строке 2 не принята сервером')).toBeTruthy()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { branchFilter: ['main', '[oops'] } }])
    // The server's English text is never shown and nothing is reported above the form.
    expect(screen.queryByText(ENGLISH_422_MSG)).toBeNull()
    expect(screen.queryByText('Не удалось сохранить настройки')).toBeNull()
    expect(branchFilterField().value).toBe('main\n[oops')
    expect(saveButton().disabled).toBe(false)

    // Editing the field takes the server's complaint away; the other fields never had one.
    fireEvent.change(branchFilterField(), { target: { value: 'main\n[oops]' } })
    await waitFor(() => {
      expect(screen.queryByText('Маска в строке 2 не принята сервером')).toBeNull()
    })
  })

  it('names the visible line of the refused mask when the text has a blank line and a duplicate', async () => {
    const backend = stubBackend([FULL_REPO])
    // The cleaned list is ['main', '[oops']: the server refuses its second mask.
    backend.patchResponse = unprocessable([
      { loc: ['body', 'branchFilter', 1], msg: ENGLISH_422_MSG, type: 'value_error' },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: '\nmain\nmain\n[oops' } })
    fireEvent.click(saveButton())

    // The mask sits on line 4 of the textarea, not at place 2 of the cleaned list.
    expect(await screen.findByText('Маска в строке 4 не принята сервером')).toBeTruthy()
    expect(screen.queryByText('Маска в строке 2 не принята сервером')).toBeNull()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { branchFilter: ['main', '[oops'] } }])
    expect(branchFilterField().value).toBe('\nmain\nmain\n[oops')
  })

  it('shows the 422 under the threshold', async () => {
    // The UI offers only valid values: the refusal comes from an overlay on the transport.
    const backend = stubBackend([FULL_REPO])
    backend.patchResponse = unprocessable([
      { loc: ['body', 'severityThreshold'], msg: ENGLISH_422_MSG, type: 'enum' },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.click(screen.getByRole('radio', { name: RADIO_CRIT }))
    fireEvent.click(saveButton())

    expect(await screen.findByText('Сервер не принял порог')).toBeTruthy()
    expect(screen.queryByText(ENGLISH_422_MSG)).toBeNull()
    expect(screen.queryByText('Не удалось сохранить настройки')).toBeNull()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: RADIO_CRIT }).checked).toBe(true)

    fireEvent.click(screen.getByRole('radio', { name: RADIO_WARN }))
    await waitFor(() => {
      expect(screen.queryByText('Сервер не принял порог')).toBeNull()
    })
  })

  it('shows a 422 that names no field in the alert above the form', async () => {
    const backend = stubBackend([FULL_REPO])
    backend.patchResponse = unprocessable([
      { loc: ['body', 'branchFilter', 0], msg: ENGLISH_422_MSG, type: 'value_error' },
      { loc: ['body', 'somethingNew'], msg: ENGLISH_422_MSG, type: 'value_error' },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'main' } })
    fireEvent.click(saveButton())

    expect(await screen.findByText('Не удалось сохранить настройки')).toBeTruthy()
    expect(screen.getByText('Некорректные параметры запроса (422).')).toBeTruthy()
    expect(screen.getByText('Маска в строке 1 не принята сервером')).toBeTruthy()
    expect(screen.queryByText(ENGLISH_422_MSG)).toBeNull()
  })

  it('restores the branch filter and the threshold on «Отменить изменения»', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'develop' } })
    fireEvent.click(screen.getByRole('radio', { name: RADIO_CRIT }))
    fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения' }))

    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })
    expect(branchFilterField().value).toBe('main\nrelease/*')
    expect(screen.getByRole<HTMLInputElement>('radio', { name: RADIO_ALL }).checked).toBe(true)
    expect(backend.patches).toEqual([])
  })
})
