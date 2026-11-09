// @vitest-environment jsdom
import { currentCompletions, startCompletion } from '@codemirror/autocomplete'
import { EditorView } from '@codemirror/view'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from 'antd'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock mode on: the page asks the mock transport, as it does in `pnpm dev` with mocks.
vi.mock('../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/config/env')>()
  return { ...actual, USE_MOCKS: true, isMockMode: () => true }
})

import { mockRepositories } from '../../app/mocks/app-state'
import { mockRulesStatuses } from '../../app/mocks/mockRulesStatus'
import { initMockTransport, withMockTransportOverlay } from '../../app/mocks/mockTransport'
import type { RulesStatus } from '../../entities/repository'
import { ApiError, setMockTransport } from '../../shared/api/client'
import { PlaygroundPage } from './PlaygroundPage'

const [UI_REPO, API_REPO, INFRA_REPO, DOCS_REPO] = mockRepositories
if (!UI_REPO || !API_REPO || !INFRA_REPO || !DOCS_REPO) {
  throw new Error('the playground tests expect four mock repositories')
}

const REPOSITORY = 'Репозиторий (оплачивает)'
const RULES_SOURCE = 'Правила'
const RULES_TEXT = 'Текст правил'
const CODE = 'Код'
const MISSING_WARNING = 'Используются дефолтные правила, создайте .review/rules.md'
const DEFAULTS_ONLY = 'Применяются только дефолтные правила сервиса.'
const NOTE =
  'Правки правил здесь не сохраняются в репозиторий и не влияют на ревью PR. Симуляция оплачивается из дневного бюджета workspace выбранного репозитория.'

function fixtureText(id: string): string {
  const status = mockRulesStatuses[id]
  if (status?.status !== 'present' && status?.status !== 'invalid') {
    throw new Error(`no rules text in the fixture of ${id}`)
  }
  return status.text ?? ''
}

// jsdom has no layout, and CodeMirror measures text through `Range`.
beforeAll(() => {
  Range.prototype.getClientRects = () => Object.assign([], { item: () => null })
  Range.prototype.getBoundingClientRect = () => new DOMRect()
})

beforeEach(() => {
  initMockTransport()
})

afterEach(() => {
  cleanup()
  setMockTransport(null)
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        path: '/playground',
        element: (
          <QueryClientProvider client={client}>
            <App>
              <PlaygroundPage />
            </App>
          </QueryClientProvider>
        ),
      },
      { path: '/repositories', element: <h1>Репозитории</h1> },
    ],
    { initialEntries: ['/playground'] },
  )
  return { router, ...render(<RouterProvider router={router} />) }
}

function editor(name: string): EditorView {
  const found = EditorView.findFromDOM(screen.getByRole('textbox', { name }))
  if (!found) {
    throw new Error(`no editor ${name}`)
  }
  return found
}

function editorText(name: string): string {
  return editor(name).state.doc.toString()
}

/** A keystroke as CodeMirror sees it: an edit by the user, reported through `onChange`. */
function typeInto(name: string, text: string): void {
  const view = editor(name)
  const end = view.state.doc.length
  view.dispatch({
    changes: { from: end, insert: text },
    selection: { anchor: end + text.length },
    userEvent: 'input.type',
  })
}

async function choose(field: string, option: string): Promise<void> {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: field }))
  const item = await waitFor(() => {
    const found = [...document.querySelectorAll('.ant-select-item-option')].find(
      (candidate) =>
        candidate.textContent === option &&
        candidate.closest('.ant-select-dropdown-hidden') === null,
    )
    if (found === undefined) {
      throw new Error(`option ${option} is not rendered`)
    }
    return found
  })
  fireEvent.click(item)
}

function selected(field: string): string | null | undefined {
  return screen
    .getByRole('combobox', { name: field })
    .closest('.ant-select')
    ?.querySelector('.ant-select-content, .ant-select-selection-item')?.textContent
}

function rulesStatus(): HTMLElement {
  return screen.getByRole('region', { name: 'Правила ревью' })
}

describe('PlaygroundPage: repository and rules source', () => {
  it('says what the playground changes and who pays, under its title', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Песочница правил' })).toBeTruthy()
    expect(screen.getByText(NOTE)).toBeTruthy()
  })

  it('takes the first connected repository, and offers each of them by name', async () => {
    renderPage()

    await waitFor(() => {
      expect(selected(REPOSITORY)).toBe(UI_REPO.fullName)
    })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: REPOSITORY }))
    await waitFor(() => {
      const names = [...document.querySelectorAll('.ant-select-item-option')].map(
        (option) => option.textContent,
      )
      expect(names).toEqual(mockRepositories.map((repo) => repo.fullName))
    })
  })

  it('sends a user without connected repositories to the repositories page', async () => {
    withMockTransportOverlay((endpoint) =>
      endpoint.method === 'GET' && endpoint.path === '/repos' ? Promise.resolve([]) : undefined,
    )
    const { router } = renderPage()

    expect(
      await screen.findByText(
        'Нет подключённых репозиториев. Подключите репозиторий, чтобы проверить на нём правила.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: CODE })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'К репозиториям' }))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/repositories')
    })
  })

  it('says the repositories did not load and asks again on Retry', async () => {
    let failing = true
    withMockTransportOverlay((endpoint) =>
      failing && endpoint.method === 'GET' && endpoint.path === '/repos'
        ? Promise.reject(new ApiError(500, 'Internal Server Error', null))
        : undefined,
    )
    renderPage()

    expect(await screen.findByText('Не удалось загрузить репозитории')).toBeTruthy()
    failing = false
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))

    await waitFor(() => {
      expect(selected(REPOSITORY)).toBe(UI_REPO.fullName)
    })
  })

  it('reads the rules of the repository by default, with the texts of the settings page', async () => {
    renderPage()

    expect(
      await within(await screen.findByRole('region', { name: 'Правила ревью' })).findByText(
        'Файл найден',
      ),
    ).toBeTruthy()
    expect(selected(RULES_SOURCE)).toBe('Из .review/rules.md репозитория')
    // The text is in the editor, not repeated under the status.
    expect(rulesStatus().querySelector('pre')).toBeNull()
  })

  it.each([
    [API_REPO, 'Файл правил содержит ошибки'],
    [INFRA_REPO, 'Не удалось прочитать файл правил'],
  ])('shows the status of $fullName in the words of the settings page', async (repo, text) => {
    renderPage()
    await waitFor(() => {
      expect(selected(REPOSITORY)).toBe(UI_REPO.fullName)
    })

    await choose(REPOSITORY, repo.fullName)

    expect(await within(rulesStatus()).findByText(text)).toBeTruthy()
  })
})

describe('PlaygroundPage: rules editor', () => {
  it('puts the text of a present file in the rules editor', async () => {
    renderPage()

    await waitFor(() => {
      expect(editorText(RULES_TEXT)).toBe(fixtureText(UI_REPO.id))
    })
    expect(
      screen.getByRole('textbox', { name: RULES_TEXT }).getAttribute('aria-readonly'),
    ).not.toBe('true')
  })

  it('keeps the rules editor empty and editable for a missing file, under the defaults warning', async () => {
    renderPage()
    await screen.findByRole('textbox', { name: RULES_TEXT })

    await choose(REPOSITORY, DOCS_REPO.fullName)
    // The first answer of a new repository is `pending`; reopening is not needed: the hook polls.
    expect(await within(rulesStatus()).findByText(MISSING_WARNING)).toBeTruthy()

    expect(editorText(RULES_TEXT)).toBe('')
    typeInto(RULES_TEXT, '# Security')
    expect(editorText(RULES_TEXT)).toBe('# Security')
  })

  it('shows the text of an invalid file with the error on its line, in the words of the dictionary', async () => {
    renderPage()
    await screen.findByRole('textbox', { name: RULES_TEXT })

    await choose(REPOSITORY, API_REPO.fullName)

    await waitFor(() => {
      expect(editorText(RULES_TEXT)).toBe(fixtureText(API_REPO.id))
    })
    const messages = [...document.querySelectorAll('.cm-rv-diagnostic')].map(
      (node) => node.textContent,
    )
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('В блоке review-ignore недопустимая маска.')
    expect(messages[0]).not.toContain('Mask')
    expect(screen.getByRole('textbox', { name: RULES_TEXT }).getAttribute('aria-invalid')).toBe(
      'true',
    )
  })

  it('leaves the editor empty, with the error, when an invalid file came without its text', async () => {
    const invalidWithoutText: RulesStatus = {
      status: 'invalid',
      branch: 'main',
      path: '.review/rules.md',
      checkedAt: '2026-10-14T09:30:15.000Z',
      sha: '1111111aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      text: null,
      diagnostics: [
        {
          code: 'policy_document_too_large',
          message: 'Too large',
          line: null,
          column: null,
          retryable: false,
        },
      ],
    }
    withMockTransportOverlay((endpoint) =>
      endpoint.path === `/repos/${UI_REPO.id}/rules-status`
        ? Promise.resolve(invalidWithoutText)
        : undefined,
    )
    renderPage()

    await waitFor(() => {
      expect(document.querySelector('.cm-rv-diagnostic')?.textContent).toContain(
        'Документ правил превышает 64 КиБ.',
      )
    })
    expect(editorText(RULES_TEXT)).toBe('')
  })

  it('keeps the editor available while the file of a repository cannot be read', async () => {
    renderPage()
    await screen.findByRole('textbox', { name: RULES_TEXT })

    await choose(REPOSITORY, INFRA_REPO.fullName)
    await within(rulesStatus()).findByText('Не удалось прочитать файл правил')

    typeInto(RULES_TEXT, '# Style')
    expect(editorText(RULES_TEXT)).toBe('# Style')
  })

  it('does not replace what the user typed with rules that arrive later', async () => {
    let asked = 0
    const pending: RulesStatus = {
      status: 'pending',
      branch: 'main',
      path: '.review/rules.md',
      sha: null,
      checkedAt: null,
    }
    withMockTransportOverlay((endpoint) => {
      if (endpoint.path !== `/repos/${UI_REPO.id}/rules-status`) return undefined
      asked += 1
      return Promise.resolve(asked === 1 ? pending : mockRulesStatuses[UI_REPO.id])
    })
    renderPage()
    expect(
      await within(await screen.findByRole('region', { name: 'Правила ревью' })).findByText(
        'Проверяем .review/rules.md в ветке main…',
      ),
    ).toBeTruthy()

    typeInto(RULES_TEXT, '# Mine')
    // The hook asks again after RULES_STATUS_POLL_MS and gets the present file.
    expect(await within(rulesStatus()).findByText('Файл найден')).toBeTruthy()

    expect(editorText(RULES_TEXT)).toBe('# Mine')
  })

  it('puts the text of the next repository in the editor when the user picks it', async () => {
    renderPage()
    await waitFor(() => {
      expect(editorText(RULES_TEXT)).toBe(fixtureText(UI_REPO.id))
    })
    typeInto(RULES_TEXT, '\n# Mine')

    await choose(REPOSITORY, API_REPO.fullName)

    await waitFor(() => {
      expect(editorText(RULES_TEXT)).toBe(fixtureText(API_REPO.id))
    })
  })

  it('empties and locks the rules editor for the service defaults, without the file status', async () => {
    renderPage()
    await waitFor(() => {
      expect(editorText(RULES_TEXT)).toBe(fixtureText(UI_REPO.id))
    })

    await choose(RULES_SOURCE, 'Только дефолтные правила сервиса')

    await waitFor(() => {
      expect(editorText(RULES_TEXT)).toBe('')
    })
    expect(screen.getByText(DEFAULTS_ONLY)).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Правила ревью' })).toBeNull()
    expect(screen.getByRole('textbox', { name: RULES_TEXT }).getAttribute('aria-readonly')).toBe(
      'true',
    )
    // A completion would write into the locked editor and leave a draft for the repository.
    expect(startCompletion(editor(RULES_TEXT))).toBe(false)
  })

  it('suggests the recommended headings and the review-ignore block', async () => {
    renderPage()
    await screen.findByRole('textbox', { name: RULES_TEXT })
    await choose(REPOSITORY, INFRA_REPO.fullName)
    await within(rulesStatus()).findByText('Не удалось прочитать файл правил')
    typeInto(RULES_TEXT, '#')

    startCompletion(editor(RULES_TEXT))

    await waitFor(() => {
      // CodeMirror orders equal matches by label.
      expect(currentCompletions(editor(RULES_TEXT).state).map((item) => item.label)).toEqual([
        '# Performance',
        '# Security',
        '# Style',
      ])
    })
    typeInto(RULES_TEXT, '\n```rev')
    startCompletion(editor(RULES_TEXT))
    await waitFor(() => {
      expect(currentCompletions(editor(RULES_TEXT).state).map((item) => item.label)).toEqual([
        '```review-ignore',
      ])
    })
  })
})

describe('PlaygroundPage: code', () => {
  it('names the mode, the file and the code editor, and starts in Code mode', async () => {
    renderPage()

    const mode = await screen.findByRole('radiogroup', { name: 'Режим' })
    expect(within(mode).getByRole('radio', { name: 'Код' })).toHaveProperty('checked', true)
    expect(screen.getByLabelText('Имя файла')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: CODE })).toBeTruthy()
  })

  it('highlights the code by the file name, and as a diff in Diff mode', async () => {
    renderPage()
    await screen.findByRole('textbox', { name: CODE })
    fireEvent.change(screen.getByLabelText('Имя файла'), { target: { value: 'app.py' } })
    typeInto(CODE, 'def f(): pass')

    await waitFor(() => {
      expect(document.querySelector('.tok-keyword')?.textContent).toBe('def')
    })

    fireEvent.click(screen.getByRole('radio', { name: 'Дифф' }))
    editor(CODE).dispatch({
      changes: { from: 0, to: editor(CODE).state.doc.length, insert: '+added' },
      userEvent: 'input.type',
    })

    await waitFor(() => {
      expect(document.querySelector('.tok-inserted')?.textContent.trim()).toBe('+added')
    })
    expect(editorText(CODE)).toBe('+added')
  })

  it('keeps the code when the user picks another repository', async () => {
    renderPage()
    await screen.findByRole('textbox', { name: CODE })
    typeInto(CODE, 'print(1)')

    await choose(REPOSITORY, API_REPO.fullName)

    expect(editorText(CODE)).toBe('print(1)')
  })

  it('has a result panel that waits for a simulation', async () => {
    renderPage()

    const result = await screen.findByRole('region', { name: 'Результат симуляции' })
    expect(within(result).getByText('Здесь появятся замечания симуляции.')).toBeTruthy()
  })
})
