import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'

export function formatErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ZodError) {
    return 'Неожиданный формат данных от сервера. Пожалуйста, обновите страницу.'
  }
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      return 'Внутренняя ошибка сервера. Повторите попытку позже.'
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
    if (err.status === 400 && typeof err.data === 'string' && err.data.trim()) {
      return err.data
    }
    return `Ошибка сервера (${String(err.status)}): ${err.statusText}`
  }
  if (err instanceof Error) {
    if (err.message.toLowerCase().includes('fetch')) {
      return 'Ошибка сети. Проверьте подключение к интернету.'
    }
    return err.message || fallback
  }
  return fallback
}
