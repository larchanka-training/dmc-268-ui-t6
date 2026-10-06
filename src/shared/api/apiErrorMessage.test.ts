import { describe, expect, it } from 'vitest'

import { formatApiErrorMessage } from './apiErrorMessage'
import { ApiError } from './client'

describe('formatApiErrorMessage', () => {
  it('uses detail from JSON error bodies when already Russian', () => {
    expect(formatApiErrorMessage(418, 'Bad Request', { detail: 'Неверный код' })).toBe(
      'Неверный код',
    )
  })

  it('is used as ApiError message', () => {
    const error = new ApiError(400, 'Bad Request', { detail: 'Неверный код' })
    expect(error.message).toBe('Неверный код')
  })

  it('maps OAuth callback error codes to Russian', () => {
    expect(formatApiErrorMessage(400, 'Bad Request', { detail: { code: 'invalid_grant' } })).toBe(
      'Код авторизации недействителен или истёк',
    )
  })

  it('does not surface raw HTML error bodies', () => {
    expect(formatApiErrorMessage(500, 'Error', '<html><body>fail</body></html>')).toBe('Ошибка API')
  })

  it('maps GitHub callback English detail strings to Russian', () => {
    expect(
      formatApiErrorMessage(400, 'Bad Request', { detail: 'invalid GitHub authorization code' }),
    ).toBe('Недействительный код авторизации GitHub')
    expect(
      formatApiErrorMessage(502, 'Bad Gateway', { detail: 'GitHub authentication is unavailable' }),
    ).toBe('Вход через GitHub временно недоступен')
  })

  it('uses a Russian fallback for unknown English callback detail on 400/502', () => {
    expect(formatApiErrorMessage(400, 'Bad Request', { detail: 'some other server message' })).toBe(
      'Не удалось войти через GitHub (код 400)',
    )
  })
})
