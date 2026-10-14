// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RulesDiagnostic, RulesStatus } from '../../../entities/repository'
import { RulesStatusPanel } from './RulesStatusPanel'

const REPO_A = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
const REPO_B = 'b2c3d4e5-f6a7-4901-bcde-f12345678901'
const SHA_1 = '1111111aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const SHA_2 = '2222222bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const SHA_3 = '3333333ccccccccccccccccccccccccccccccccc'.slice(0, 40)
const CHECKED_AT = '2026-10-14T09:30:15.000Z'
const MISSING_WARNING = 'Используются дефолтные правила, создайте .review/rules.md'
const LOAD_ERROR = 'Не удалось загрузить статус правил'

const diagnostic: RulesDiagnostic = {
  code: 'policy_ignore_pattern_invalid',
  message: 'Маска не принята: не закрыта скобка',
  line: 14,
  column: 5,
  retryable: false,
}

function present(
  overrides: Partial<Extract<RulesStatus, { status: 'present' }>> = {},
): RulesStatus {
  return {
    status: 'present',
    branch: 'release/2.1',
    path: '.review/rules.md',
    checkedAt: CHECKED_AT,
    sha: SHA_1,
    text: '# Rules\nBe kind.',
    ignoreMasks: ['dist/**', '**/*.snap'],
    diagnostics: [],
    ...overrides,
  }
}

const missing: RulesStatus = {
  status: 'missing',
  branch: 'trunk',
  path: '.review/rules.md',
  checkedAt: CHECKED_AT,
  sha: SHA_2,
  defaultsVersion: '2026-10-01',
}

function invalid(text: string | null): RulesStatus {
  return {
    status: 'invalid',
    branch: 'main',
    path: '.review/rules.md',
    checkedAt: CHECKED_AT,
    sha: SHA_1,
    text,
    diagnostics: [diagnostic],
  }
}

function unavailable(retryable: boolean, code = 'policy_access_denied'): RulesStatus {
  return {
    status: 'unavailable',
    branch: 'master',
    path: '.review/rules.md',
    checkedAt: CHECKED_AT,
    sha: null,
    diagnostics: [{ ...diagnostic, code, line: null, column: null, retryable }],
  }
}

type Answer = Response | Error | Promise<Response>

interface Backend {
  /** The requests made, as repository ids. */
  requests: string[]
  /** Answers per repository, one per request; the last one repeats. */
  answers: Record<string, Answer[]>
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

function stubBackend(answers: Record<string, Answer[]>): Backend {
  const backend: Backend = { requests: [], answers }
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>((input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const match = /^\/api\/repos\/([^/]+)\/rules-status$/.exec(url)
      const id = match?.[1] ?? ''
      backend.requests.push(id)
      const queue = backend.answers[id]
      if (queue === undefined || queue.length === 0) {
        return Promise.resolve(new Response('not stubbed', { status: 500 }))
      }
      const index = Math.min(backend.requests.filter((r) => r === id).length, queue.length) - 1
      const answer = queue[index]
      if (answer instanceof Error) {
        return Promise.reject(answer)
      }
      return Promise.resolve(answer ?? new Response('not stubbed', { status: 500 }))
    }),
  )
  return backend
}

function newClient(): QueryClient {
  // The app's staleTime: a fresh answer is not asked again unless the hook insists.
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
}

function Providers({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function renderPanel(props: { repoId?: string; enabled?: boolean } = {}, client = newClient()) {
  const { repoId = REPO_A, enabled = true } = props
  const view = render(
    <Providers client={client}>
      <RulesStatusPanel enabled={enabled} repoId={repoId} />
    </Providers>,
  )
  return {
    client,
    ...view,
    rerenderFor(next: { repoId?: string; enabled?: boolean }) {
      view.rerender(
        <Providers client={client}>
          <RulesStatusPanel enabled={next.enabled ?? enabled} repoId={next.repoId ?? repoId} />
        </Providers>,
      )
    },
  }
}

function panel(): HTMLElement {
  return screen.getByRole('region', { name: 'Правила ревью' })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RulesStatusPanel', () => {
  it('shows a skeleton while the status loads', () => {
    stubBackend({ [REPO_A]: [new Promise<Response>(() => undefined)] })

    const { container } = renderPanel()

    expect(container.querySelector('.ant-skeleton')).not.toBeNull()
    expect(within(panel()).queryByText('Файл найден')).toBeNull()
  })

  it('shows a present file: tag, branch, short sha, time, text, masks', async () => {
    stubBackend({ [REPO_A]: [json(present())] })

    renderPanel()

    expect(await within(panel()).findByText('Файл найден')).toBeTruthy()
    const view = within(panel())
    expect(view.getByText('.review/rules.md')).toBeTruthy()
    expect(view.getByText('release/2.1')).toBeTruthy()
    expect(view.getByText('1111111')).toBeTruthy()
    expect(view.getByText(/2026-10-14 09:30:15 UTC/)).toBeTruthy()
    expect(panel().querySelector('pre')?.textContent).toBe('# Rules\nBe kind.')
    expect(view.getByText('dist/**')).toBeTruthy()
    expect(view.getByText('**/*.snap')).toBeTruthy()
    expect(view.queryByText('Масок нет')).toBeNull()
  })

  it('says there are no masks, and no diagnostics, when the file has none', async () => {
    stubBackend({ [REPO_A]: [json(present({ ignoreMasks: [] }))] })

    renderPanel()

    expect(await within(panel()).findByText('Масок нет')).toBeTruthy()
    expect(within(panel()).queryByText('Диагностика')).toBeNull()
  })

  it('lists the diagnostics of a present file as code, position and message', async () => {
    stubBackend({
      [REPO_A]: [
        json(
          present({
            diagnostics: [{ ...diagnostic, code: 'policy_note', message: 'Совет по файлу' }],
          }),
        ),
      ],
    })

    renderPanel()

    expect(await within(panel()).findByText('Диагностика')).toBeTruthy()
    expect(within(panel()).getByText('policy_note')).toBeTruthy()
    expect(within(panel()).getByText('14:5')).toBeTruthy()
    expect(within(panel()).getByText('Совет по файлу')).toBeTruthy()
  })

  it('says an empty file is empty instead of drawing an empty box', async () => {
    stubBackend({ [REPO_A]: [json(present({ text: '' }))] })

    renderPanel()

    expect(await within(panel()).findByText('Файл пуст')).toBeTruthy()
    expect(panel().querySelector('pre')).toBeNull()
  })

  it('shows the full sha in a tooltip reachable from the keyboard', async () => {
    stubBackend({ [REPO_A]: [json(present())] })

    renderPanel()

    const short = await within(panel()).findByText('1111111')
    expect(short.tabIndex).toBe(0)
    fireEvent.focus(short)

    expect(await screen.findByText(SHA_1)).toBeTruthy()
  })

  it('warns in the exact words when the file is missing, with defaults version, branch and sha', async () => {
    stubBackend({ [REPO_A]: [json(missing)] })

    renderPanel()

    expect(await within(panel()).findByText(MISSING_WARNING)).toBeTruthy()
    const view = within(panel())
    expect(view.getByText(/2026-10-01/)).toBeTruthy()
    expect(view.getByText('trunk')).toBeTruthy()
    expect(view.getByText('2222222')).toBeTruthy()
    expect(view.queryByText('Файл найден')).toBeNull()
    expect(panel().querySelector('.ant-alert-warning')).not.toBeNull()
  })

  it('reports an invalid file with its diagnostics and its text', async () => {
    stubBackend({ [REPO_A]: [json(invalid('src/[generated/**'))] })

    renderPanel()

    expect(await within(panel()).findByText('Файл правил содержит ошибки')).toBeTruthy()
    const view = within(panel())
    expect(view.getByText('policy_ignore_pattern_invalid')).toBeTruthy()
    expect(view.getByText('14:5')).toBeTruthy()
    expect(view.getByText('Маска не принята: не закрыта скобка')).toBeTruthy()
    expect(panel().querySelector('pre')?.textContent).toBe('src/[generated/**')
    expect(panel().querySelector('.ant-alert-error')).not.toBeNull()
  })

  it('says the text is unavailable when an invalid file came without it', async () => {
    stubBackend({ [REPO_A]: [json(invalid(null))] })

    renderPanel()

    expect(await within(panel()).findByText('Текст файла недоступен')).toBeTruthy()
    expect(panel().querySelector('pre')).toBeNull()
  })

  it('names the limit and the actual size of a diagnostic when the server knows them', async () => {
    const tooLarge: RulesStatus = {
      ...invalid(null),
      diagnostics: [
        {
          ...diagnostic,
          code: 'policy_document_too_large',
          line: null,
          column: null,
          limit: 65536,
          actual: 85000,
        },
      ],
    } as RulesStatus
    stubBackend({ [REPO_A]: [json(tooLarge)] })

    renderPanel()

    expect(await within(panel()).findByText(/допустимо 65536, фактически 85000/)).toBeTruthy()
  })

  it('explains an unavailable file by its code and offers no retry when it is not retryable', async () => {
    stubBackend({ [REPO_A]: [json(unavailable(false))] })

    renderPanel()

    expect(await within(panel()).findByText('Не удалось прочитать файл правил')).toBeTruthy()
    const view = within(panel())
    expect(view.getByText('У GitHub App нет доступа к репозиторию')).toBeTruthy()
    expect(view.getByText('policy_access_denied')).toBeTruthy()
    expect(view.queryByRole('button', { name: 'Повторить' })).toBeNull()
    expect(view.queryByText(MISSING_WARNING)).toBeNull()
  })

  it('offers a retry for a retryable unavailable file and asks again on click', async () => {
    const backend = stubBackend({
      [REPO_A]: [json(unavailable(true, 'policy_fetch_transient')), json(present())],
    })

    renderPanel()

    fireEvent.click(await within(panel()).findByRole('button', { name: 'Повторить' }))

    expect(await within(panel()).findByText('Файл найден')).toBeTruthy()
    expect(backend.requests).toEqual([REPO_A, REPO_A])
  })

  describe('treats 404, 500, network and schema errors as load errors, never as missing', () => {
    it.each([
      ['404', () => json({ detail: 'Not Found' }, 404)],
      ['500', () => json({ detail: 'boom' }, 500)],
      ['a network failure', () => new TypeError('Failed to fetch')],
      ['a body that is not a rules status', () => json({ status: 'present' })],
    ])('%s is a load error, not a missing file', async (_name, answer) => {
      stubBackend({ [REPO_A]: [answer(), json(present())] })

      renderPanel()

      expect(await within(panel()).findByText(LOAD_ERROR)).toBeTruthy()
      const view = within(panel())
      expect(view.queryByText(MISSING_WARNING)).toBeNull()
      expect(view.queryByText('Файл найден')).toBeNull()

      fireEvent.click(view.getByRole('button', { name: 'Повторить' }))
      expect(await view.findByText('Файл найден')).toBeTruthy()
      expect(view.queryByText(LOAD_ERROR)).toBeNull()
    })
  })

  it('renders Markdown as plain text', async () => {
    const markdown =
      '# Title\n<script>alert(1)</script>\n**bold** [link](https://example.com)\n<img src=x>'
    stubBackend({ [REPO_A]: [json(present({ text: markdown }))] })

    renderPanel()

    await within(panel()).findByText('Файл найден')
    expect(panel().querySelector('pre')?.textContent).toBe(markdown)
    expect(within(panel()).queryByRole('link')).toBeNull()
    expect(panel().querySelector('script')).toBeNull()
    expect(panel().querySelector('img')).toBeNull()
    expect(panel().querySelector('strong')).toBeNull()
    expect(within(panel()).queryByRole('heading', { name: 'Title' })).toBeNull()
  })

  it('refetches on «Обновить» and shows the new sha', async () => {
    const backend = stubBackend({
      [REPO_A]: [json(present({ sha: SHA_1 })), json(present({ sha: SHA_3 }))],
    })

    renderPanel()

    await within(panel()).findByText('1111111')
    fireEvent.click(within(panel()).getByRole('button', { name: 'Обновить' }))

    expect(await within(panel()).findByText('3333333')).toBeTruthy()
    expect(within(panel()).queryByText('1111111')).toBeNull()
    expect(backend.requests).toEqual([REPO_A, REPO_A])
  })

  it('shows a spinner on «Обновить» while the request runs', async () => {
    let release: (response: Response) => void = () => undefined
    stubBackend({
      [REPO_A]: [
        json(present()),
        new Promise<Response>((resolve) => {
          release = resolve
        }),
      ],
    })

    renderPanel()

    await within(panel()).findByText('1111111')
    const button = within(panel()).getByRole('button', { name: 'Обновить' })
    expect(button.className).not.toContain('ant-btn-loading')
    fireEvent.click(button)

    await waitFor(() => {
      expect(button.className).toContain('ant-btn-loading')
    })
    release(json(present()))
    await waitFor(() => {
      expect(button.className).not.toContain('ant-btn-loading')
    })
  })

  it('keeps «Обновить» a default button so the page keeps one primary', async () => {
    stubBackend({ [REPO_A]: [json(present())] })

    const { container } = renderPanel()

    await within(panel()).findByText('1111111')
    expect(container.querySelector('.ant-btn-primary')).toBeNull()
  })

  it('replaces a shown status with the load error when «Обновить» fails', async () => {
    stubBackend({ [REPO_A]: [json(present()), json({ detail: 'boom' }, 500)] })

    renderPanel()

    await within(panel()).findByText('1111111')
    fireEvent.click(within(panel()).getByRole('button', { name: 'Обновить' }))

    expect(await within(panel()).findByText(LOAD_ERROR)).toBeTruthy()
    expect(within(panel()).queryByText('1111111')).toBeNull()
    expect(within(panel()).queryByText('Файл найден')).toBeNull()
  })

  it('refetches when reopened', async () => {
    const backend = stubBackend({ [REPO_A]: [json(present()), json(present({ sha: SHA_2 }))] })
    const client = newClient()

    const first = renderPanel({}, client)
    await within(panel()).findByText('1111111')
    first.unmount()

    renderPanel({}, client)

    expect(await within(panel()).findByText('2222222')).toBeTruthy()
    expect(backend.requests).toEqual([REPO_A, REPO_A])
  })

  it('never renders the late response of the previous repository', async () => {
    let releaseA: (response: Response) => void = () => undefined
    stubBackend({
      [REPO_A]: [
        new Promise<Response>((resolve) => {
          releaseA = resolve
        }),
      ],
      [REPO_B]: [json(present({ sha: SHA_2, branch: 'repo-b-branch' }))],
    })

    const view = renderPanel({ repoId: REPO_A })
    view.rerenderFor({ repoId: REPO_B })
    expect(await within(panel()).findByText('2222222')).toBeTruthy()

    // A's answer arrives after B's is on screen.
    releaseA(json(present({ sha: SHA_1, branch: 'repo-a-branch' })))
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(within(panel()).queryByText('1111111')).toBeNull()
    expect(within(panel()).queryByText('repo-a-branch')).toBeNull()
    expect(within(panel()).getByText('repo-b-branch')).toBeTruthy()
  })

  it('does not keep the previous repository on screen while the next one loads', async () => {
    stubBackend({
      [REPO_A]: [json(present({ sha: SHA_1 }))],
      [REPO_B]: [new Promise<Response>(() => undefined)],
    })

    const view = renderPanel({ repoId: REPO_A })
    await within(panel()).findByText('1111111')
    view.rerenderFor({ repoId: REPO_B })

    expect(within(panel()).queryByText('1111111')).toBeNull()
    expect(within(panel()).queryByText('Файл найден')).toBeNull()
    expect(view.container.querySelector('.ant-skeleton')).not.toBeNull()
  })

  it('sends no request when the rules API is gated off', async () => {
    const backend = stubBackend({ [REPO_A]: [json(present())] })

    const { container } = renderPanel({ enabled: false })

    expect(
      within(panel()).getByText('Статус правил появится, когда сервер начнёт его отдавать'),
    ).toBeTruthy()
    expect(container.querySelector('.ant-skeleton')).toBeNull()
    expect(within(panel()).queryByRole('button')).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(backend.requests).toEqual([])
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })
})
