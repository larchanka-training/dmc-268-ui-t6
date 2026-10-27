// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import type { RulesDiagnostic, RulesStatus } from '../../../entities/repository'
import type { VcsProvider } from '../../../shared/model/provider'
import type { RulesStatusDetailsProps } from './RulesStatusDetails'
import { RulesStatusPanel, type RulesStatusPanelProps } from './RulesStatusPanel'

const REPO_A = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
const REPO_B = 'b2c3d4e5-f6a7-4901-bcde-f12345678901'
const SHA_1 = '1111111aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const SHA_2 = '2222222bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const CHECKED_AT = '2026-10-14T09:30:15.000Z'
const MISSING_WARNING = 'Используются дефолтные правила, создайте .review/rules.md'
const LOAD_ERROR = 'Не удалось загрузить статус правил'
const PENDING_TEXT = 'Проверяем .review/rules.md в ветке trunk…'

const diagnostic: RulesDiagnostic = {
  code: 'policy_ignore_pattern_invalid',
  message: 'Mask not accepted: the bracket is not closed',
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
  defaultsVersion: 'v1',
}

const pending: RulesStatus = {
  status: 'pending',
  branch: 'trunk',
  path: '.review/rules.md',
  checkedAt: null,
  sha: null,
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

function renderPanel(
  props: { repoId?: string; provider?: VcsProvider } = {},
  client = newClient(),
) {
  const { repoId = REPO_A, provider = 'github' } = props
  const view = render(
    <Providers client={client}>
      <RulesStatusPanel provider={provider} repoId={repoId} />
    </Providers>,
  )
  return {
    client,
    ...view,
    rerenderFor(next: { repoId?: string }) {
      view.rerender(
        <Providers client={client}>
          <RulesStatusPanel provider={provider} repoId={next.repoId ?? repoId} />
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
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('RulesStatusPanel', () => {
  it('requires the repository provider on panel and details', () => {
    expectTypeOf<RulesStatusPanelProps>().toExtend<{ provider: VcsProvider }>()
    expectTypeOf<RulesStatusDetailsProps>().toExtend<{ provider: VcsProvider }>()
  })

  it.each([
    ['gitlab', 'GitLab'],
    ['bitbucket', 'Bitbucket Cloud'],
  ] as const)('shows %s in unavailable file and rate-limit states', async (provider, access) => {
    const client = newClient()
    stubBackend({ [REPO_A]: [json(unavailable(false, 'policy_revision_unavailable'))] })
    const view = renderPanel({ provider }, client)
    expect(
      await within(panel()).findByText(
        `Ревизия default branch недоступна: ${access} не подтвердил, есть ли файл правил.`,
      ),
    ).toBeTruthy()
    view.unmount()
    client.clear()

    stubBackend({ [REPO_A]: [json(unavailable(false, 'policy_rate_limited'))] })
    renderPanel({ provider })
    expect(await within(panel()).findByText(`${access} ограничил число запросов`)).toBeTruthy()
  })

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
    expect(view.getByText('Проверено: 14.10.2026, 09:30:15')).toBeTruthy()
    expect(panel().textContent).not.toContain('UTC')
    expect(panel().querySelector('pre')?.textContent).toBe('# Rules\nBe kind.')
    expect(view.getByText('dist/**')).toBeTruthy()
    expect(view.getByText('**/*.snap')).toBeTruthy()
    expect(view.queryByText('Масок нет')).toBeNull()
  })

  it('lists a mask that the file repeats once per line, without a key warning', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    stubBackend({ [REPO_A]: [json(present({ ignoreMasks: ['dist/**', 'dist/**'] }))] })

    renderPanel()

    await within(panel()).findByText('Файл найден')
    const warnings = consoleError.mock.calls.length
    consoleError.mockRestore()
    expect(within(panel()).getAllByText('dist/**')).toHaveLength(2)
    expect(warnings).toBe(0)
  })

  it('says there are no masks, and no diagnostics, when the file has none', async () => {
    stubBackend({ [REPO_A]: [json(present({ ignoreMasks: [] }))] })

    renderPanel()

    expect(await within(panel()).findByText('Масок нет')).toBeTruthy()
    expect(within(panel()).queryByText('Диагностика')).toBeNull()
  })

  it('lists the diagnostics of a present file as code, position and server message', async () => {
    stubBackend({
      [REPO_A]: [
        json(
          present({
            diagnostics: [{ ...diagnostic, code: 'policy_note', message: 'A hint about the file' }],
          }),
        ),
      ],
    })

    renderPanel()

    expect(await within(panel()).findByText('Диагностика')).toBeTruthy()
    expect(within(panel()).getByText('policy_note')).toBeTruthy()
    expect(within(panel()).getByText('14:5')).toBeTruthy()
    expect(within(panel()).getByText('A hint about the file')).toBeTruthy()
  })

  it('separates the code, the position and the message of a diagnostic in its text', async () => {
    stubBackend({
      [REPO_A]: [
        json(present({ diagnostics: [{ ...diagnostic, code: 'policy_note', message: 'Hint' }] })),
      ],
    })

    renderPanel()

    const item = (await within(panel()).findByText('policy_note')).closest('li')
    expect(item?.textContent).toBe('policy_note 14:5 Hint')
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
    expect(view.getByText('Версия дефолтных правил: v1')).toBeTruthy()
    expect(view.getByText('trunk')).toBeTruthy()
    expect(view.getByText('2222222')).toBeTruthy()
    expect(view.queryByText('Файл найден')).toBeNull()
    expect(panel().querySelector('.ant-alert-warning')).not.toBeNull()
  })

  it('hides the defaults version line when the repository has no active rule version', async () => {
    const noVersion: RulesStatus = { ...missing, defaultsVersion: 'unknown' }
    stubBackend({ [REPO_A]: [json(noVersion)] })

    renderPanel()

    expect(await within(panel()).findByText(MISSING_WARNING)).toBeTruthy()
    expect(panel().textContent).not.toContain('Версия дефолтных правил')
    expect(panel().textContent).not.toContain('unknown')
    expect(within(panel()).getByText('trunk')).toBeTruthy()
    expect(panel().querySelector('.ant-alert-warning')).not.toBeNull()
  })

  it('shows a pending status as a loading state with the branch, never as missing or an error', async () => {
    stubBackend({ [REPO_A]: [json(pending)] })

    const { container } = renderPanel()

    expect(await within(panel()).findByText(PENDING_TEXT)).toBeTruthy()
    const view = within(panel())
    expect(panel().querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(container.querySelector('.ant-skeleton')).toBeNull()
    expect(view.queryByText(MISSING_WARNING)).toBeNull()
    expect(view.queryByText(LOAD_ERROR)).toBeNull()
    expect(panel().querySelector('.ant-alert')).toBeNull()
    expect(view.queryByText(/Проверено/)).toBeNull()
    expect(view.queryByText('Файл найден')).toBeNull()
    expect(panel().querySelector('code')).toBeNull()
    expect(view.queryByRole('button')).toBeNull()
  })

  it('swaps the pending state for the result when the next poll answers, then stops asking', async () => {
    vi.useFakeTimers()
    const backend = stubBackend({ [REPO_A]: [json(pending), json(present())] })
    const advance = async (ms: number): Promise<void> => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
      })
    }

    renderPanel()
    await advance(0)
    expect(within(panel()).getByText(PENDING_TEXT)).toBeTruthy()
    expect(backend.requests).toEqual([REPO_A])

    await advance(3000)
    await advance(1)

    expect(backend.requests).toEqual([REPO_A, REPO_A])
    expect(within(panel()).getByText('Файл найден')).toBeTruthy()
    expect(within(panel()).queryByText(PENDING_TEXT)).toBeNull()
    await advance(60_000)
    expect(backend.requests).toEqual([REPO_A, REPO_A])
  })

  it('reports an invalid file with its diagnostics and its text', async () => {
    stubBackend({ [REPO_A]: [json(invalid('src/[generated/**'))] })

    renderPanel()

    expect(await within(panel()).findByText('Файл правил содержит ошибки')).toBeTruthy()
    const view = within(panel())
    expect(view.getByText('policy_ignore_pattern_invalid')).toBeTruthy()
    expect(view.getByText('14:5')).toBeTruthy()
    // A known code reads its text from the dictionary, not the English server message.
    expect(view.getByText('В блоке review-ignore недопустимая маска.')).toBeTruthy()
    expect(view.queryByText(diagnostic.message)).toBeNull()
    expect(panel().querySelector('pre')?.textContent).toBe('src/[generated/**')
    expect(panel().querySelector('.ant-alert-error')).not.toBeNull()
  })

  it('quotes the offending mask next to the text of a known code', async () => {
    const withMask: RulesStatus = {
      ...invalid('src/[generated/**'),
      diagnostics: [{ ...diagnostic, excerpt: 'src/[generated/**' }],
    } as RulesStatus
    stubBackend({ [REPO_A]: [json(withMask)] })

    renderPanel()

    const item = (await within(panel()).findByText('policy_ignore_pattern_invalid')).closest('li')
    expect(item?.textContent).toBe(
      'policy_ignore_pattern_invalid 14:5 В блоке review-ignore недопустимая маска. (маска src/[generated/**)',
    )
    expect(item?.querySelectorAll('code')[1]?.textContent).toBe('src/[generated/**')
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

    expect(await within(panel()).findByText(/допустимо 65\s536, фактически 85\s000/)).toBeTruthy()
    // The settings page shows no run, so the text says a review will not run with the file.
    expect(
      within(panel()).getByText(
        'Документ правил превышает 64 КиБ. Ревью с ним не выполнится; уменьшите документ.',
      ),
    ).toBeTruthy()
  })

  it('explains an unavailable file by its code and offers no retry when it is not retryable', async () => {
    stubBackend({ [REPO_A]: [json(unavailable(false))] })

    renderPanel()

    expect(await within(panel()).findByText('Не удалось прочитать файл правил')).toBeTruthy()
    const view = within(panel())
    expect(view.getByText('У GitHub App нет доступа к репозиторию')).toBeTruthy()
    expect(view.queryByText('policy_access_denied')).toBeNull()
    expect(view.queryByRole('button', { name: 'Повторить' })).toBeNull()
    expect(view.queryByText(MISSING_WARNING)).toBeNull()
  })

  it.each([
    [
      'a known code shows its reason and no code',
      'policy_rate_limited',
      'GitHub ограничил число запросов',
      false,
    ],
    [
      'the revision code shows the wording of the api page and no code',
      'policy_revision_unavailable',
      'Ревизия default branch недоступна: GitHub не подтвердил, есть ли файл правил.',
      false,
    ],
    [
      'an unknown code shows the server message and the code',
      'policy_something_new',
      'Mask not accepted: the bracket is not closed',
      true,
    ],
  ])('an unavailable file with %s', async (_name, code, reason, codeShown) => {
    stubBackend({ [REPO_A]: [json(unavailable(false, code))] })

    renderPanel()

    expect(await within(panel()).findByText(reason)).toBeTruthy()
    expect(within(panel()).queryByText(code) !== null).toBe(codeShown)
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

  it('keeps the focus on «Повторить» when the retry fails again', async () => {
    const backend = stubBackend({ [REPO_A]: [json({ detail: 'boom' }, 500)] })
    renderPanel()
    const retry = await within(panel()).findByRole('button', { name: 'Повторить' })

    retry.focus()
    fireEvent.click(retry)
    await waitFor(() => {
      expect(backend.requests).toHaveLength(2)
    })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(within(panel()).getByText(LOAD_ERROR)).toBeTruthy()
    expect(within(panel()).getByRole('button', { name: 'Повторить' })).toBe(retry)
    expect(document.activeElement).toBe(retry)
  })

  it('keeps the focus on «Повторить» of a retryable unavailable file that is still unavailable', async () => {
    const backend = stubBackend({
      [REPO_A]: [
        unavailable(true, 'policy_fetch_transient'),
        unavailable(true, 'policy_fetch_transient'),
      ].map((body) => json(body)),
    })
    renderPanel()
    const retry = await within(panel()).findByRole('button', { name: 'Повторить' })

    retry.focus()
    fireEvent.click(retry)
    await waitFor(() => {
      expect(backend.requests).toHaveLength(2)
    })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(within(panel()).getByRole('button', { name: 'Повторить' })).toBe(retry)
    expect(document.activeElement).toBe(retry)
  })

  describe('when «Повторить» goes away', () => {
    const retryCases: [string, () => Response][] = [
      ['a load error', () => json({ detail: 'boom' }, 500)],
      ['a retryable unavailable file', () => json(unavailable(true, 'policy_fetch_transient'))],
    ]
    const heading = (): HTMLElement =>
      within(panel()).getByRole('heading', { name: 'Правила ревью' })

    it.each(retryCases)(
      'moves the focus to the heading when the retry that had it succeeds: %s',
      async (_name, first) => {
        stubBackend({ [REPO_A]: [first(), json(present())] })
        renderPanel()
        const retry = await within(panel()).findByRole('button', { name: 'Повторить' })

        retry.focus()
        fireEvent.click(retry)

        await within(panel()).findByText('Файл найден')
        expect(within(panel()).queryByRole('button', { name: 'Повторить' })).toBeNull()
        await waitFor(() => {
          expect(document.activeElement).toBe(heading())
        })
        expect(heading().getAttribute('tabindex')).toBe('-1')
      },
    )

    it.each(retryCases)(
      'leaves the focus where it is when the retry that succeeds did not have it: %s',
      async (_name, first) => {
        stubBackend({ [REPO_A]: [first(), json(present())] })
        renderPanel()
        const retry = await within(panel()).findByRole('button', { name: 'Повторить' })
        const elsewhere = document.body.appendChild(document.createElement('button'))
        try {
          elsewhere.focus()

          // A click with the mouse that does not focus the button (Safari).
          fireEvent.click(retry)

          await within(panel()).findByText('Файл найден')
          await new Promise((resolve) => setTimeout(resolve, 20))
          expect(document.activeElement).toBe(elsewhere)
        } finally {
          elsewhere.remove()
        }
      },
    )

    it('does not take the focus later because of a retry that failed again', async () => {
      const backend = stubBackend({
        [REPO_A]: [json({ detail: 'boom' }, 500), json({ detail: 'boom' }, 500), json(present())],
      })
      renderPanel()
      const retry = await within(panel()).findByRole('button', { name: 'Повторить' })
      retry.focus()
      fireEvent.click(retry)
      await waitFor(() => {
        expect(backend.requests).toHaveLength(2)
      })
      await new Promise((resolve) => setTimeout(resolve, 20))
      // The retry failed again and stayed, with the focus. The user moves on.
      expect(within(panel()).getByRole('button', { name: 'Повторить' })).toBe(retry)
      const elsewhere = document.body.appendChild(document.createElement('button'))
      try {
        elsewhere.focus()

        fireEvent.click(retry)

        await within(panel()).findByText('Файл найден')
        await new Promise((resolve) => setTimeout(resolve, 20))
        expect(document.activeElement).toBe(elsewhere)
      } finally {
        elsewhere.remove()
      }
    })

    it('hands the focus to the new «Повторить» when the retry button is swapped for another', async () => {
      stubBackend({
        [REPO_A]: [
          json(unavailable(true, 'policy_fetch_transient')),
          json({ detail: 'boom' }, 500),
        ],
      })
      renderPanel()
      const retry = await within(panel()).findByRole('button', { name: 'Повторить' })
      retry.focus()

      fireEvent.click(retry)

      await within(panel()).findByText(LOAD_ERROR)
      const swapped = within(panel()).getByRole('button', { name: 'Повторить' })
      expect(swapped).not.toBe(retry)
      await waitFor(() => {
        expect(document.activeElement).toBe(swapped)
      })
      expect(document.activeElement).not.toBe(heading())
    })

    it('leaves the focus on the page body when nothing had it', async () => {
      stubBackend({ [REPO_A]: [json({ detail: 'boom' }, 500), json(present())] })
      renderPanel()
      const retry = await within(panel()).findByRole('button', { name: 'Повторить' })

      fireEvent.click(retry)

      await within(panel()).findByText('Файл найден')
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(document.activeElement).toBe(document.body)
    })

    it('moves the focus to the heading when a poll succeeds under the focused «Повторить»', async () => {
      vi.useFakeTimers()
      stubBackend({ [REPO_A]: [json(pending), json({ detail: 'boom' }, 500), json(present())] })
      const advance = async (ms: number): Promise<void> => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(ms)
        })
      }

      renderPanel()
      await advance(0)
      expect(within(panel()).getByText(PENDING_TEXT)).toBeTruthy()
      // The poll fails; the status is still pending, and the block offers a retry.
      await advance(3000)
      await advance(1)
      const retry = within(panel()).getByRole('button', { name: 'Повторить' })
      retry.focus()
      expect(document.activeElement).toBe(retry)

      // The next poll brings the result, nobody clicked.
      await advance(3000)
      await advance(1)

      expect(within(panel()).getByText('Файл найден')).toBeTruthy()
      expect(within(panel()).queryByRole('button', { name: 'Повторить' })).toBeNull()
      expect(document.activeElement).toBe(heading())
    })
  })

  it.each([
    ['while it loads', () => new Promise<Response>(() => undefined), null],
    ['a pending file', () => json(pending), PENDING_TEXT],
    ['a present file', () => json(present()), 'Файл найден'],
    ['a missing file', () => json(missing), MISSING_WARNING],
    ['an invalid file', () => json(invalid('# Rules')), 'Файл правил содержит ошибки'],
    [
      'an unavailable file that can be retried',
      () => json(unavailable(true, 'policy_fetch_transient')),
      'Не удалось прочитать файл правил',
    ],
    ['a load error', () => json({ detail: 'boom' }, 500), LOAD_ERROR],
  ])('has no «Обновить» button: %s', async (_name, answer, marker) => {
    stubBackend({ [REPO_A]: [answer()] })

    renderPanel()

    if (marker !== null) {
      await within(panel()).findByText(marker)
    }
    expect(within(panel()).queryByRole('button', { name: /Обновить/ })).toBeNull()
  })

  it('refetches when reopened', async () => {
    const backend = stubBackend({ [REPO_A]: [json(present()), json(present({ sha: SHA_2 }))] })
    const client = newClient()

    const first = renderPanel({}, client)
    await within(panel()).findByText('1111111')
    first.unmount()

    renderPanel({}, client)

    // Reopening the page is how the status is asked again: a new sha comes from a new GET.
    expect(await within(panel()).findByText('2222222')).toBeTruthy()
    expect(within(panel()).queryByText('1111111')).toBeNull()
    expect(backend.requests).toEqual([REPO_A, REPO_A])
  })

  it('reopening shows no old sha before the fresh answer', async () => {
    let releaseSecond: (response: Response) => void = () => undefined
    stubBackend({
      [REPO_A]: [
        json(present()),
        new Promise<Response>((resolve) => {
          releaseSecond = resolve
        }),
      ],
    })
    const client = newClient()

    const first = renderPanel({}, client)
    await within(panel()).findByText('1111111')
    first.unmount()
    // Some time passes before the page is opened again.
    await new Promise((resolve) => setTimeout(resolve, 20))

    const second = renderPanel({}, client)

    // The second request is under way, and the first answer is nowhere on screen.
    expect(within(panel()).queryByText('1111111')).toBeNull()
    expect(within(panel()).queryByText('Файл найден')).toBeNull()
    expect(second.container.querySelector('.ant-skeleton')).not.toBeNull()

    releaseSecond(json(present({ sha: SHA_2 })))
    expect(await within(panel()).findByText('2222222')).toBeTruthy()
    expect(within(panel()).queryByText('1111111')).toBeNull()
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
})
