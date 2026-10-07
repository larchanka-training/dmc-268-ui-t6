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

  it('passes through English API detail without GitHub-specific wording', () => {
    expect(formatApiErrorMessage(502, 'Bad Gateway', { detail: 'upstream timeout' })).toBe(
      'upstream timeout',
    )
  })

  it('does not surface raw HTML error bodies', () => {
    expect(formatApiErrorMessage(500, 'Error', '<html><body>fail</body></html>')).toBe('Ошибка API')
  })

  it('falls back to status when detail is missing', () => {
    expect(formatApiErrorMessage(502, 'Bad Gateway', null)).toBe('Ошибка API (502: Bad Gateway)')
  })
})
