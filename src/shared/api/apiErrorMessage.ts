import { ZodError } from 'zod'

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
    return 'Ошибка API'
  }
  if (HTML_LIKE.test(trimmed)) {
    return 'Ошибка API'
  }
  return trimmed
}

function messageFromDetail(detail: unknown, status: number): string | null {
  if (typeof detail === 'string' && detail.length > 0) {
    const mapped = API_DETAIL_RU[detail]
    if (mapped) {
      return mapped
    }
    if ((status === 400 || status === 502) && !/[а-яА-ЯёЁ]/.test(detail)) {
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
      return sanitizeUserFacingText(detail.message)
    }
  }
  return null
}

export function formatApiErrorMessage(status: number, statusText: string, data: unknown): string {
  if (data instanceof ZodError) {
    return 'Ответ сервера не прошёл проверку схемы'
  }
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const fromDetail = messageFromDetail(data.detail, status)
    if (fromDetail) {
      return fromDetail
    }
  }
  if (typeof data === 'string' && data.length > 0) {
    return sanitizeUserFacingText(data)
  }
  return `Ошибка API (${String(status)}${statusText ? `: ${statusText}` : ''})`
}
