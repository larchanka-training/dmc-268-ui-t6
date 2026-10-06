import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { formatAuthCallbackApiMessage, formatAuthCallbackFailure } from './authCallbackErrors'

describe('formatAuthCallbackApiMessage', () => {
  it('maps GitHub callback English detail strings to Russian', () => {
    expect(
      formatAuthCallbackApiMessage(400, 'Bad Request', {
        detail: 'invalid GitHub authorization code',
      }),
    ).toBe('Недействительный код авторизации GitHub')
  })

  it('uses a Russian fallback for unknown English detail on any status', () => {
    expect(
      formatAuthCallbackApiMessage(429, 'Too Many Requests', { detail: 'Too many requests' }),
    ).toBe('Не удалось войти через GitHub (код 429)')
  })

  it('does not surface raw HTML bodies', () => {
    expect(formatAuthCallbackApiMessage(502, 'Bad Gateway', '<html>fail</html>')).toBe(
      'Не удалось войти через GitHub',
    )
  })
})

describe('formatAuthCallbackFailure', () => {
  it('maps ZodError to a fixed Russian message', () => {
    const err = new ZodError([])
    expect(formatAuthCallbackFailure(err)).toBe('Ответ сервера не прошёл проверку схемы')
  })

  it('maps network TypeError to Russian', () => {
    expect(formatAuthCallbackFailure(new TypeError('Failed to fetch'))).toBe(
      'Не удалось связаться с сервером. Проверьте подключение к сети',
    )
  })

  it('maps ApiError through callback-specific formatting', () => {
    const err = new ApiError(400, 'Bad Request', { detail: 'invalid GitHub authorization code' })
    expect(formatAuthCallbackFailure(err)).toBe('Недействительный код авторизации GitHub')
  })
})
