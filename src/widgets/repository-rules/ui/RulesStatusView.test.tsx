// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useRepositoryRulesStatusRetry, type RulesStatus } from '../../../entities/repository'
import { RulesStatusView } from '../index'

const REPO = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
const SHA = '1111111aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const CHECKED_AT = '2026-10-14T09:30:15.000Z'

const present: RulesStatus = {
  status: 'present',
  branch: 'release/2.1',
  path: '.review/rules.md',
  checkedAt: CHECKED_AT,
  sha: SHA,
  text: '# Rules\nBe kind.',
  ignoreMasks: ['dist/**'],
  diagnostics: [],
}

function invalid(text: string | null): RulesStatus {
  return {
    status: 'invalid',
    branch: 'main',
    path: '.review/rules.md',
    checkedAt: CHECKED_AT,
    sha: SHA,
    text,
    diagnostics: [
      {
        code: 'policy_ignore_pattern_invalid',
        message: 'Mask not accepted',
        line: 14,
        column: 5,
        retryable: false,
      },
    ],
  }
}

function answer(status: RulesStatus): void {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(status)))),
  )
}

function Host({ showFileText }: { showFileText?: boolean }) {
  const rules = useRepositoryRulesStatusRetry(REPO)
  return <RulesStatusView provider="github" rules={rules} showFileText={showFileText} />
}

function renderView(showFileText?: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <Host showFileText={showFileText} />
    </QueryClientProvider>,
  )
}

function region(): HTMLElement {
  return screen.getByRole('region', { name: 'Правила ревью' })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RulesStatusView', () => {
  it('shows the file text of a present file by default, as the settings panel does', async () => {
    answer(present)

    renderView()

    expect(await within(region()).findByText('Файл найден')).toBeTruthy()
    expect(region().querySelector('pre')?.textContent).toBe('# Rules\nBe kind.')
  })

  it('leaves out the text of a present file where it is shown elsewhere, keeping the rest', async () => {
    answer(present)

    renderView(false)

    const view = within(region())
    expect(await view.findByText('Файл найден')).toBeTruthy()
    expect(view.getByText('release/2.1')).toBeTruthy()
    expect(view.getByText('dist/**')).toBeTruthy()
    expect(view.queryByText('Текст файла')).toBeNull()
    expect(region().querySelector('pre')).toBeNull()
  })

  it.each([
    ['with', 'src/[generated/**'],
    ['without', null],
  ])('leaves out the text of an invalid file %s it, keeping the errors', async (_, text) => {
    answer(invalid(text))

    renderView(false)

    const view = within(region())
    expect(await view.findByText('Файл правил содержит ошибки')).toBeTruthy()
    expect(view.getByText('В блоке review-ignore недопустимая маска.')).toBeTruthy()
    expect(view.queryByText('Текст файла')).toBeNull()
    expect(view.queryByText('Текст файла недоступен')).toBeNull()
    expect(region().querySelector('pre')).toBeNull()
  })
})
