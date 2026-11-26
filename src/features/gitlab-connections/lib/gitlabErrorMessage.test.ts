import { describe, expect, it } from 'vitest'
import { ZodError, z } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { i18n } from '../../../shared/i18n'
import { gitlabErrorMessage } from './gitlabErrorMessage'

const TOKEN = 'glpat-do-not-repeat'

describe('gitlabErrorMessage', () => {
  it('names an invalid token without repeating the token from the response body', () => {
    const error = new ApiError(400, 'Bad Request', { detail: 'invalid_token', token: TOKEN })
    expect(gitlabErrorMessage(error)).toBe(
      'Токен GitLab недействителен или просрочен. Проверьте токен и область api.',
    )
    expect(gitlabErrorMessage(error)).not.toContain(TOKEN)
  })

  it('uses a fixed format message for a response the schema refuses', () => {
    const parsed = z.object({ status: z.literal('awaiting_webhook') }).safeParse({ status: 'no' })
    if (parsed.success) throw new Error('expected a schema failure')
    expect(gitlabErrorMessage(new ZodError(parsed.error.issues))).toBe(
      'Сервер вернул ответ неожиданного формата. Обновите страницу и повторите.',
    )
    expect(gitlabErrorMessage(new ZodError(parsed.error.issues))).not.toContain('no')
  })

  it('follows the interface language', async () => {
    const error = new ApiError(404, 'Not Found', { detail: TOKEN })
    expect(gitlabErrorMessage(error)).not.toContain(TOKEN)
    try {
      await i18n.changeLanguage('en')
      expect(gitlabErrorMessage(error)).toBe(
        'GitLab project or connection not found. Refresh the list.',
      )
    } finally {
      await i18n.changeLanguage('ru')
    }
  })
})
