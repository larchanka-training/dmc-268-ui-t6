// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  disabledRagIndex,
  type Repository,
  type UpdateRepositoryInput,
} from '../../../entities/repository'
import { ApiError } from '../../../shared/api/client'
import { i18n } from '../../../shared/i18n'
import { RepositorySettingsForm } from './RepositorySettingsForm'

const REPOSITORY: Repository = {
  provider: 'github',
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
  ragEnabled: false,
  ragIndex: disabledRagIndex,
}

const LIMIT_LABEL = 'Лимит замечаний (1..10)'
const CI_LABEL = 'Ожидание CI'
const VERDICT_LABEL = 'Публикация вердикта'
const NEVER_OPTION = 'Никогда (запускать ревью без ожидания CI)'
const REQUEST_CHANGES_OPTION = 'Запрос изменений (при блокирующих)'

type OnSave = (patch: UpdateRepositoryInput) => Promise<Repository>

afterEach(() => {
  cleanup()
})

/** The text a Select shows as its chosen value (the open dropdown repeats the options). */
function selectedText(label: string): string | null | undefined {
  return screen.getByLabelText(label).closest('.ant-select')?.querySelector('.ant-select-content')
    ?.textContent
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

describe('RepositorySettingsForm: after a successful save', () => {
  it('keeps a field changed while the request ran and takes the answer for the others', async () => {
    let answer: (saved: Repository) => void = () => undefined
    const onSave = vi.fn<OnSave>(
      () =>
        new Promise<Repository>((resolve) => {
          answer = resolve
        }),
    )
    render(
      <RepositorySettingsForm
        describeError={() => 'error'}
        onSave={onSave}
        repository={REPOSITORY}
      />,
    )

    await chooseOption(CI_LABEL, NEVER_OPTION)
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
    })
    expect(onSave).toHaveBeenCalledWith({ waitForCi: 'never' })

    // The user does not wait for the answer: the limit is changed while the request runs.
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    // The answer holds other values for the fields the user did not touch (the verdict, which
    // was submitted as it was opened) and for the one they changed meanwhile (the limit).
    await act(async () => {
      answer({
        ...REPOSITORY,
        waitForCi: 'never',
        maxComments: 7,
        reviewEvent: 'REQUEST_CHANGES',
      })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(selectedText(VERDICT_LABEL)).toBe(REQUEST_CHANGES_OPTION)
    })
    expect(selectedText(CI_LABEL)).toBe(NEVER_OPTION)
    // Typed meanwhile: it stays, and is a change against the answer (7).
    expect(screen.getByLabelText<HTMLInputElement>(LIMIT_LABEL).value).toBe('5')
    // A regular expression: antd adds an icon named «loading» to the name of a loading button,
    // and in jsdom its leaving motion does not end.
    await waitFor(() => {
      expect(screen.getByRole<HTMLButtonElement>('button', { name: /Сохранить/ }).disabled).toBe(
        false,
      )
    })
  })
})

/** The errors under a field, without the ones antd still animates out (jsdom never ends it). */
function shownErrors(field: string): string[] {
  return [
    ...document.querySelectorAll(
      `#${field}_help .ant-form-item-explain-error:not([class*="-leave"])`,
    ),
  ].map((item) => item.textContent)
}

describe('RepositorySettingsForm: after a change of the interface language', () => {
  it('shows the field errors already on screen in the new language', async () => {
    const onSave = vi.fn<OnSave>(() =>
      Promise.reject(
        new ApiError(422, 'Unprocessable Entity', {
          detail: [{ loc: ['body', 'waitForCi'], msg: 'Input should be auto', type: 'enum' }],
        }),
      ),
    )
    render(
      <RepositorySettingsForm
        describeError={() => 'error'}
        onSave={onSave}
        repository={REPOSITORY}
      />,
    )

    // A rule error (the emptied limit) and a server error (the CI wait) at once.
    await chooseOption(CI_LABEL, NEVER_OPTION)
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Сервер не принял значение')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '' } })
    expect(await screen.findByText('Укажите лимит')).toBeTruthy()

    try {
      await act(async () => {
        await i18n.changeLanguage('en')
      })
      await waitFor(() => {
        expect(shownErrors('maxComments')).toEqual(['Enter the limit'])
      })
      expect(shownErrors('waitForCi')).toEqual(['The server did not accept the value'])
    } finally {
      await act(async () => {
        await i18n.changeLanguage('ru')
      })
    }
    // And back.
    await waitFor(() => {
      expect(shownErrors('maxComments')).toEqual(['Укажите лимит'])
    })
    expect(shownErrors('waitForCi')).toEqual(['Сервер не принял значение'])
  })
})
