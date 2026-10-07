import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'

const HTML_LIKE = /<[a-z][\s\S]*>/i

const AUTH_CALLBACK_MESSAGES: Record<string, string> = {
  invalid_grant: 'Код авторизации недействителен или истёк',
  unauthorized_client: 'Клиент OAuth не авторизован',
  access_denied: 'Доступ отклонён',
}

/** Known English `detail` strings from `dmc-268-api-t6` auth callback (Refs #65, AC 3.1). */
const API_DETAIL_RU: Record<string, string> = {
  'invalid GitHub authorization code': 'Недействительный код авторизации GitHub',
  'GitHub authentication is unavailable': 'Вход через GitHub временно недоступен',
}

function sanitizeUserFacingText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return 'Не удалось войти через GitHub'
  }
  if (HTML_LIKE.test(trimmed)) {
    return 'Не удалось войти через GitHub'
  }
  return trimmed
}

function messageFromDetail(detail: unknown, status: number): string | null {
  if (typeof detail === 'string' && detail.length > 0) {
    const mapped = API_DETAIL_RU[detail]
    if (mapped) {
      return mapped
    }
    if (!/[а-яА-ЯёЁ]/.test(detail)) {
      return `Не удалось войти через GitHub (код ${String(status)})`
    }
    return sanitizeUserFacingText(detail)
  }
  if (typeof detail === 'object' && detail !== null && !Array.isArray(detail)) {
    if ('code' in detail && typeof detail.code === 'string') {
      const mapped = AUTH_CALLBACK_MESSAGES[detail.code]
      if (mapped) {
        return mapped
      }
    }
    if ('message' in detail && typeof detail.message === 'string') {
      return `Не удалось войти через GitHub (код ${String(status)})`
    }
  }
  return null
}

export function formatAuthCallbackApiMessage(
  status: number,
  _statusText: string,
  data: unknown,
): string {
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const fromDetail = messageFromDetail(data.detail, status)
    if (fromDetail) {
      return fromDetail
    }
  }
  if (typeof data === 'string' && data.length > 0) {
    if (HTML_LIKE.test(data.trim())) {
      return 'Не удалось войти через GitHub'
    }
    return `Не удалось войти через GitHub (код ${String(status)})`
  }
  return `Не удалось войти через GitHub (код ${String(status)})`
}

export function formatAuthCallbackFailure(err: unknown): string {
  if (err instanceof ApiError) {
    return formatAuthCallbackApiMessage(err.status, err.statusText, err.data)
  }
  if (err instanceof ZodError) {
    return 'Ответ сервера не прошёл проверку схемы'
  }
  if (err instanceof TypeError) {
    return 'Не удалось связаться с сервером. Проверьте подключение к сети'
  }
  if (err instanceof Error && err.message.length > 0) {
    return err.message
  }
  return 'Не удалось войти через GitHub'
}
