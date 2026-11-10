// @vitest-environment jsdom
import { currentCompletions, startCompletion } from '@codemirror/autocomplete'
import { EditorView } from '@codemirror/view'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from 'antd'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Flipped by the test of a column that throws while rendering.
const crash = vi.hoisted(() => ({ result: false }))

vi.mock('./ui/SimulationResult', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ui/SimulationResult')>()
  return {
    ...actual,
    SimulationResult: (props: Parameters<typeof actual.SimulationResult>[0]) => {
      if (crash.result) throw new Error('result failed')
      return <actual.SimulationResult {...props} />
    },
  }
})

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
  crash.result = false
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

/**
 * A keystroke as CodeMirror sees it: an edit by the user, reported through `onChange`. The render it
 * causes happens at once, as a browser does before the next click.
 */
function typeInto(name: string, text: string): void {
  const view = editor(name)
  const end = view.state.doc.length
  act(() => {
    view.dispatch({
      changes: { from: end, insert: text },
      selection: { anchor: end + text.length },
      userEvent: 'input.type',
    })
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

  it('takes the errors of an invalid file off the editor once the user edits its text', async () => {
    renderPage()
    await screen.findByRole('textbox', { name: RULES_TEXT })
    await choose(REPOSITORY, API_REPO.fullName)
    await waitFor(() => {
      expect(document.querySelector('.cm-rv-diagnostic')).not.toBeNull()
    })

    typeInto(RULES_TEXT, '\n# Mine')

    // The errors belong to the file the server read, not to the text the user is typing.
    await waitFor(() => {
      expect(document.querySelector('.cm-rv-diagnostic')).toBeNull()
    })
    expect(
      screen.getByRole('textbox', { name: RULES_TEXT }).getAttribute('aria-invalid'),
    ).toBeNull()
    // The status above the editor still names them.
    expect(within(rulesStatus()).getByText('Файл правил содержит ошибки')).toBeTruthy()
    expect(
      within(rulesStatus()).getByText(/В блоке review-ignore недопустимая маска\./),
    ).toBeTruthy()
  })

  it('does not put the errors of a file that arrives later on what the user typed', async () => {
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
      return Promise.resolve(asked === 1 ? pending : mockRulesStatuses[API_REPO.id])
    })
    renderPage()
    await within(await screen.findByRole('region', { name: 'Правила ревью' })).findByText(
      'Проверяем .review/rules.md в ветке main…',
    )

    typeInto(RULES_TEXT, '# Mine')
    // The hook asks again after RULES_STATUS_POLL_MS and gets an invalid file.
    expect(await within(rulesStatus()).findByText('Файл правил содержит ошибки')).toBeTruthy()

    expect(editorText(RULES_TEXT)).toBe('# Mine')
    expect(document.querySelector('.cm-rv-diagnostic')).toBeNull()
    expect(
      screen.getByRole('textbox', { name: RULES_TEXT }).getAttribute('aria-invalid'),
    ).toBeNull()
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

const SIMULATE = 'Симулировать ревью'
const RESULT = 'Результат симуляции'
const SIMULATION_ID = '5a5a5a5a-5a5a-4a5a-8a5a-000000000001'

const findingByRules = {
  path: 'app.py',
  line: 3,
  startLine: 2,
  severity: 'high',
  category: 'security',
  title: 'Query built from user input',
  body: 'The rules ask for parameterized queries.',
  suggestion: null,
  confidence: 0.86,
  ruleName: '.review/rules.md',
}
const findingByDefaults = {
  ...findingByRules,
  line: 1,
  startLine: null,
  severity: 'medium',
  title: 'Error is swallowed',
  body: 'The caller never learns of the failure.',
  confidence: 0.714,
  ruleName: 'service-defaults:E2',
}
const findingByNoRule = {
  ...findingByRules,
  line: 4,
  startLine: 4,
  severity: 'low',
  title: 'Name says little',
  body: 'A name that tells what it holds reads better.',
  confidence: 0.55,
  ruleName: null,
}

function succeeded(findings: object[], costUsd = 0.0123) {
  return {
    id: SIMULATION_ID,
    status: 'succeeded',
    findings,
    tokensIn: 1200,
    tokensOut: 300,
    costUsd,
  }
}

interface SimulationStart {
  repoId: string | undefined
  body: unknown
}

/**
 * Records each POST, which the mock transport still answers, and gives the GETs of a simulation
 * these answers, one per GET, the last one repeating; none leaves the mock's own walk.
 */
function simulationBackend(...answers: object[]): SimulationStart[] {
  const starts: SimulationStart[] = []
  let gets = 0
  withMockTransportOverlay((endpoint, options) => {
    const started = /^\/repos\/([^/]+)\/rules-simulations$/.exec(endpoint.path)
    if (started && endpoint.method === 'POST') {
      starts.push({ repoId: started[1], body: options.body })
      return undefined
    }
    if (answers.length > 0 && endpoint.path.startsWith('/rules-simulations/')) {
      gets += 1
      return Promise.resolve(answers[Math.min(gets, answers.length) - 1])
    }
    return undefined
  })
  return starts
}

function simulateButton(): HTMLElement {
  return screen.getByRole('button', { name: SIMULATE })
}

function resultPanel(): HTMLElement {
  return screen.getByRole('region', { name: RESULT })
}

/** The page with the rules of the first repository read and `code` in the code editor. */
const readyPage = async (code = 'x = 1'): Promise<void> => {
  renderPage()
  await waitFor(() => {
    expect(editorText(RULES_TEXT)).toBe(fixtureText(UI_REPO.id))
  })
  typeInto(CODE, code)
  await waitFor(() => {
    expect(simulateButton()).toHaveProperty('disabled', false)
  })
}

describe('PlaygroundPage: simulation', () => {
  it('sends the mode, the file, the code and the rules text with the selected repository', async () => {
    const starts = simulationBackend()
    await readyPage()
    fireEvent.change(screen.getByLabelText('Имя файла'), { target: { value: 'app.py' } })
    typeInto(RULES_TEXT, '\n# Mine')

    fireEvent.click(simulateButton())

    await waitFor(() => {
      expect(starts).toEqual([
        {
          repoId: UI_REPO.id,
          body: {
            mode: 'code',
            path: 'app.py',
            content: 'x = 1',
            rulesMd: `${fixtureText(UI_REPO.id)}\n# Mine`,
          },
        },
      ])
    })
  })

  it('sends a diff, and empty rules when only the service defaults apply', async () => {
    const starts = simulationBackend()
    await readyPage('+added')
    fireEvent.click(screen.getByRole('radio', { name: 'Дифф' }))
    await choose(RULES_SOURCE, 'Только дефолтные правила сервиса')

    fireEvent.click(simulateButton())

    await waitFor(() => {
      expect(starts).toEqual([
        { repoId: UI_REPO.id, body: { mode: 'diff', path: '', content: '+added', rulesMd: '' } },
      ])
    })
  })

  it('blocks the button and shows the progress while the simulation runs, then the findings', async () => {
    simulationBackend({ id: SIMULATION_ID, status: 'running' }, succeeded([findingByRules]))
    await readyPage()

    fireEvent.click(simulateButton())

    expect(await within(resultPanel()).findByText('Идёт ревью…')).toBeTruthy()
    expect(simulateButton()).toHaveProperty('disabled', true)
    // The next poll, without a reload of the page.
    expect(await within(resultPanel()).findByText('Query built from user input')).toBeTruthy()
    expect(within(resultPanel()).queryByText('Идёт ревью…')).toBeNull()
    expect(simulateButton()).toHaveProperty('disabled', false)
  })

  it('says the simulation is queued until it starts', async () => {
    simulationBackend({ id: SIMULATION_ID, status: 'queued' })
    await readyPage()

    fireEvent.click(simulateButton())

    expect(await within(resultPanel()).findByText('Симуляция в очереди…')).toBeTruthy()
    expect(simulateButton()).toHaveProperty('disabled', true)
  })

  it('shows the severity, title, text, line, rule source and confidence of each finding', async () => {
    simulationBackend(succeeded([findingByRules, findingByDefaults, findingByNoRule]))
    await readyPage()

    fireEvent.click(simulateButton())

    const list = await within(resultPanel()).findByRole('list', { name: 'Замечания симуляции' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'HighQuery built from user inputThe rules ask for parameterized queries.Строки 2–3.review/rules.mdУверенность 86 %',
      'MediumError is swallowedThe caller never learns of the failure.Строка 1Проверка по умолчанию E2Уверенность 71 %',
      'LowName says littleA name that tells what it holds reads better.Строка 4Без правилаУверенность 55 %',
    ])
  })

  it('says there are no findings when the simulation found none', async () => {
    simulationBackend(succeeded([]))
    await readyPage()

    fireEvent.click(simulateButton())

    expect(await within(resultPanel()).findByText('Замечаний нет')).toBeTruthy()
  })

  it('shows the cost and the repository whose workspace paid, as it was when sent', async () => {
    simulationBackend(succeeded([]))
    await readyPage()

    fireEvent.click(simulateButton())

    const cost = `Стоимость симуляции: $0.0123. Списана с дневного бюджета workspace репозитория ${UI_REPO.fullName}.`
    expect(await within(resultPanel()).findByText(cost)).toBeTruthy()

    await choose(REPOSITORY, API_REPO.fullName)
    expect(within(resultPanel()).getByText(cost)).toBeTruthy()
  })

  it('blocks the button until there is code to review', async () => {
    renderPage()
    await waitFor(() => {
      expect(editorText(RULES_TEXT)).toBe(fixtureText(UI_REPO.id))
    })
    expect(simulateButton()).toHaveProperty('disabled', true)

    typeInto(CODE, '  \n')
    await waitFor(() => {
      expect(editorText(CODE)).toBe('  \n')
    })
    expect(simulateButton()).toHaveProperty('disabled', true)
    typeInto(CODE, 'x = 1')
    await waitFor(() => {
      expect(simulateButton()).toHaveProperty('disabled', false)
    })
  })

  it('blocks the button while the rules of the repository are unknown, unless the user typed some', async () => {
    const starts = simulationBackend()
    await readyPage()

    // The status of the repository could not be read: there is no text to send.
    await choose(REPOSITORY, INFRA_REPO.fullName)
    await within(rulesStatus()).findByText('Не удалось прочитать файл правил')
    expect(simulateButton()).toHaveProperty('disabled', true)

    typeInto(RULES_TEXT, '# Mine')
    await waitFor(() => {
      expect(simulateButton()).toHaveProperty('disabled', false)
    })
    fireEvent.click(simulateButton())

    await waitFor(() => {
      expect(starts.map((start) => start.body)).toEqual([
        { mode: 'code', path: '', content: 'x = 1', rulesMd: '# Mine' },
      ])
    })
  })

  it('blocks the button while the rules of the repository are being read', async () => {
    withMockTransportOverlay((endpoint) =>
      endpoint.path === `/repos/${UI_REPO.id}/rules-status`
        ? Promise.resolve({
            status: 'pending',
            branch: 'main',
            path: '.review/rules.md',
            sha: null,
            checkedAt: null,
          })
        : undefined,
    )
    renderPage()
    await within(await screen.findByRole('region', { name: 'Правила ревью' })).findByText(
      'Проверяем .review/rules.md в ветке main…',
    )
    typeInto(CODE, 'x = 1')

    expect(simulateButton()).toHaveProperty('disabled', true)
  })

  it('sends empty rules for a repository without a rules file: the service defaults apply', async () => {
    const starts = simulationBackend()
    await readyPage()
    await choose(REPOSITORY, DOCS_REPO.fullName)
    await within(rulesStatus()).findByText(MISSING_WARNING)

    fireEvent.click(simulateButton())

    await waitFor(() => {
      expect(starts.map((start) => start.body)).toEqual([
        { mode: 'code', path: '', content: 'x = 1', rulesMd: '' },
      ])
    })
  })
})

const EARLIER_ID = '5a5a5a5a-5a5a-4a5a-8a5a-0000000000e1'

/** The POST of a simulation is refused with `error`. */
function refuseStart(error: ApiError): void {
  withMockTransportOverlay((endpoint) =>
    endpoint.method === 'POST' && endpoint.path.endsWith('/rules-simulations')
      ? Promise.reject(error)
      : undefined,
  )
}

describe('PlaygroundPage: simulation errors', () => {
  it('follows the simulation the server says still runs, with its progress and result, not an error', async () => {
    const reads: string[] = []
    withMockTransportOverlay((endpoint) => {
      if (endpoint.method === 'POST' && endpoint.path.endsWith('/rules-simulations')) {
        return Promise.reject(
          new ApiError(409, 'Conflict', { detail: 'active_simulation_exists', id: EARLIER_ID }),
        )
      }
      if (endpoint.path.startsWith('/rules-simulations/')) {
        reads.push(endpoint.path)
        return Promise.resolve(
          reads.length === 1
            ? { id: EARLIER_ID, status: 'running' }
            : { ...succeeded([findingByRules]), id: EARLIER_ID },
        )
      }
      return undefined
    })
    await readyPage()

    fireEvent.click(simulateButton())

    expect(await within(resultPanel()).findByText('Идёт ревью…')).toBeTruthy()
    expect(await within(resultPanel()).findByText('Query built from user input')).toBeTruthy()
    expect(new Set(reads)).toEqual(new Set([`/rules-simulations/${EARLIER_ID}`]))
    expect(within(resultPanel()).queryByRole('alert')).toBeNull()
    expect(
      within(resultPanel()).getByText(
        'Это симуляция, запущенная раньше: её код и правила могли быть другими.',
      ),
    ).toBeTruthy()
    expect(
      within(resultPanel()).getByText(
        'Стоимость симуляции: $0.0123. Списана с дневного бюджета workspace репозитория, на котором её запустили.',
      ),
    ).toBeTruthy()
  })

  it('says the budget is used up, and keeps the code and the rules', async () => {
    refuseStart(new ApiError(409, 'Conflict', { detail: 'budget_paused' }))
    await readyPage()
    typeInto(RULES_TEXT, '\n# Mine')

    fireEvent.click(simulateButton())

    expect(
      await within(resultPanel()).findByText(
        'Дневной бюджет workspace этого репозитория исчерпан: симуляция не запущена.',
      ),
    ).toBeTruthy()
    expect(editorText(CODE)).toBe('x = 1')
    expect(editorText(RULES_TEXT)).toBe(`${fixtureText(UI_REPO.id)}\n# Mine`)
    expect(simulateButton()).toHaveProperty('disabled', false)
  })

  it('marks the errors of rules the server could not parse on their lines, until the user edits them', async () => {
    refuseStart(
      new ApiError(422, 'Unprocessable Entity', {
        detail: 'rules_invalid',
        diagnostics: [
          {
            code: 'policy_ignore_pattern_invalid',
            message: 'Invalid mask',
            line: 9,
            column: 1,
            retryable: false,
          },
        ],
      }),
    )
    await readyPage()

    fireEvent.click(simulateButton())

    expect(await within(resultPanel()).findByText('Правила не разобраны')).toBeTruthy()
    expect(
      within(resultPanel()).getByText(/В блоке review-ignore недопустимая маска\./),
    ).toBeTruthy()
    await waitFor(() => {
      expect(document.querySelector('.cm-rv-diagnostic')).not.toBeNull()
    })
    expect(screen.getByRole('textbox', { name: RULES_TEXT }).getAttribute('aria-invalid')).toBe(
      'true',
    )

    // The lines were those of the text that was sent.
    typeInto(RULES_TEXT, '\n# Mine')

    await waitFor(() => {
      expect(document.querySelector('.cm-rv-diagnostic')).toBeNull()
    })
    expect(
      screen.getByRole('textbox', { name: RULES_TEXT }).getAttribute('aria-invalid'),
    ).toBeNull()
    expect(within(resultPanel()).getByText('Правила не разобраны')).toBeTruthy()
    expect(editorText(CODE)).toBe('x = 1')
  })

  it('says the code is over the limit', async () => {
    refuseStart(new ApiError(422, 'Unprocessable Entity', { detail: 'content_too_large' }))
    await readyPage()

    fireEvent.click(simulateButton())

    expect(
      await within(resultPanel()).findByText('Код больше 64 КиБ. Сократите его и запустите снова.'),
    ).toBeTruthy()
    expect(document.querySelector('.cm-rv-diagnostic')).toBeNull()
    expect(editorText(CODE)).toBe('x = 1')
  })

  it.each([
    ['deadline_exceeded', 'Симуляция не уложилась в отведённое время.'],
    ['provider_error', 'Модель не завершила ревью. Повторите позже.'],
  ])(
    'says why a simulation failed with %s, what it cost, and keeps the input',
    async (errorCode, text) => {
      simulationBackend({ id: SIMULATION_ID, status: 'failed', errorCode, costUsd: 0.004 })
      await readyPage()

      fireEvent.click(simulateButton())

      expect(await within(resultPanel()).findByText(text)).toBeTruthy()
      expect(
        within(resultPanel()).getByText(
          `Стоимость симуляции: $0.0040. Списана с дневного бюджета workspace репозитория ${UI_REPO.fullName}.`,
        ),
      ).toBeTruthy()
      expect(editorText(CODE)).toBe('x = 1')
      expect(simulateButton()).toHaveProperty('disabled', false)
    },
  )

  it('shows a schema error, not an empty result, for an answer of another shape', async () => {
    simulationBackend({ id: SIMULATION_ID, status: 'succeeded', costUsd: 0 })
    await readyPage()

    fireEvent.click(simulateButton())

    expect(
      await within(resultPanel()).findByText('Ответ сервера не прошёл проверку схемы'),
    ).toBeTruthy()
    expect(within(resultPanel()).queryByText('Замечаний нет')).toBeNull()
    expect(simulateButton()).toHaveProperty('disabled', false)
  })
})

describe('PlaygroundPage: a column that fails', () => {
  it('shows the block stub in place of the result column and keeps the inputs working', async () => {
    crash.result = true
    // React reports the error it caught; the boundary is what is under test.
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      renderPage()

      expect(
        await screen.findByText('Не удалось загрузить этот блок, обновите страницу'),
      ).toBeTruthy()
      expect(screen.queryByRole('region', { name: RESULT })).toBeNull()
      await waitFor(() => {
        expect(editorText(RULES_TEXT)).toBe(fixtureText(UI_REPO.id))
      })
      typeInto(CODE, 'x = 1')
      expect(editorText(CODE)).toBe('x = 1')
    } finally {
      report.mockRestore()
    }
  })
})
