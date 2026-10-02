import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'

export function formatErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ZodError) {
    return 'Неожиданный формат данных от сервера. Пожалуйста, обновите страницу.'
  }

  if (err instanceof ApiError) {
    if (err.status >= 500) {
      return `Внутренняя ошибка сервера (${String(err.status)}). Повторите попытку позже.`
    }
    if (err.status === 400) {
      return 'Некорректный запрос (400).'
    }
    if (err.status === 401) {
      return 'Сессия истекла. Пожалуйста, выполните вход повторно.'
    }
    if (err.status === 403) {
      return 'Недостаточно прав для выполнения операции.'
    }
    if (err.status === 404) {
      return 'Запрашиваемый ресурс не найден.'
    }
    if (err.status === 409) {
      return 'Конфликт данных (409).'
    }
    if (err.status === 422) {
      return 'Некорректные параметры запроса (422).'
    }
    if (err.status === 429) {
      return 'Слишком много запросов (429).'
    }
    if (err.status >= 400 && err.status < 500) {
      return `Ошибка запроса (${String(err.status)}).`
    }
    return `Ошибка сервера (${String(err.status)}).`
  }

  if (
    err instanceof TypeError ||
    (err instanceof Error && err.message.toLowerCase().includes('fetch'))
  ) {
    return 'Ошибка сети. Проверьте подключение к интернету.'
  }

  return fallback
}
