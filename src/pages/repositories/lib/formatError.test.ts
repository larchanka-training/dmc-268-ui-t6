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
      'Внутренняя ошибка сервера (500). Повторите попытку позже.',
    )
  })

  it('formats ApiError 400 to bad request message', () => {
    const apiError = new ApiError(400, 'Bad Request', null)
    expect(formatErrorMessage(apiError, 'Fallback')).toBe('Некорректный запрос (400).')
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

  it('formats ApiError 409 to conflict message', () => {
    const apiError = new ApiError(409, 'Conflict', null)
    expect(formatErrorMessage(apiError, 'Fallback')).toBe('Конфликт данных (409).')
  })

  it('formats ApiError 422 to unprocessable entity message', () => {
    const apiError = new ApiError(422, 'Unprocessable Entity', null)
    expect(formatErrorMessage(apiError, 'Fallback')).toBe('Некорректные параметры запроса (422).')
  })

  it('formats other 4xx error with status code', () => {
    const apiError = new ApiError(418, "I'm a teapot", null)
    expect(formatErrorMessage(apiError, 'Fallback')).toBe('Ошибка запроса (418).')
  })

  it('formats network TypeError (e.g. Failed to fetch or Safari Load failed) to network failure message', () => {
    const networkError = new TypeError('Load failed')
    expect(formatErrorMessage(networkError, 'Fallback')).toBe(
      'Ошибка сети. Проверьте подключение к интернету.',
    )
  })

  it('returns fallback message for generic non-network Error', () => {
    const genericError = new Error('Some internal client logic failed')
    expect(formatErrorMessage(genericError, 'Fallback error')).toBe('Fallback error')
  })

  it('returns fallback message for unknown error', () => {
    expect(formatErrorMessage(null, 'Fallback error')).toBe('Fallback error')
  })
})
