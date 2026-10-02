import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { formatErrorMessage } from './formatError'

describe('formatErrorMessage', () => {
  it('formats ZodError to localized user friendly message', () => {
    const zodError = new ZodError([])
    expect(formatErrorMessage(zodError, 'Fallback')).toBe(
      'Неожиданный формат данных от сервера. Пожалуйста, обновите страницу.',
    )
  })

  it('formats ApiError 500 to server error message', () => {
    const apiError = new ApiError(500, 'Internal Server Error', null)
    expect(formatErrorMessage(apiError, 'Fallback')).toBe(
      'Внутренняя ошибка сервера. Повторите попытку позже.',
    )
  })

  it('formats ApiError 401 to session expired message', () => {
    const apiError = new ApiError(401, 'Unauthorized', null)
    expect(formatErrorMessage(apiError, 'Fallback')).toBe(
      'Сессия истекла. Пожалуйста, выполните вход повторно.',
    )
  })

  it('formats ApiError 403 to forbidden message', () => {
    const apiError = new ApiError(403, 'Forbidden', null)
    expect(formatErrorMessage(apiError, 'Fallback')).toBe(
      'Недостаточно прав для выполнения операции.',
    )
  })

  it('formats ApiError 404 to not found message', () => {
    const apiError = new ApiError(404, 'Not Found', null)
    expect(formatErrorMessage(apiError, 'Fallback')).toBe('Запрашиваемый ресурс не найден.')
  })

  it('formats network error to network failure message', () => {
    const networkError = new TypeError('Failed to fetch')
    expect(formatErrorMessage(networkError, 'Fallback')).toBe(
      'Ошибка сети. Проверьте подключение к интернету.',
    )
  })

  it('returns fallback message for unknown error', () => {
    expect(formatErrorMessage(null, 'Fallback error')).toBe('Fallback error')
  })
})
