import { ZodError } from 'zod'

import { i18n } from '../i18n'

const HTML_LIKE = /<[a-z][\s\S]*>/i

function sanitizeUserFacingText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return i18n.t('common.errors.api')
  }
  if (HTML_LIKE.test(trimmed)) {
    return i18n.t('common.errors.api')
  }
  return trimmed
}

function messageFromDetail(detail: unknown): string | null {
  if (typeof detail === 'string' && detail.length > 0) {
    return sanitizeUserFacingText(detail)
  }
  if (typeof detail === 'object' && detail !== null && !Array.isArray(detail)) {
    if ('message' in detail && typeof detail.message === 'string') {
      return sanitizeUserFacingText(detail.message)
    }
  }
  return null
}

export function formatApiErrorMessage(status: number, statusText: string, data: unknown): string {
  if (data instanceof ZodError) {
    return i18n.t('common.errors.schema')
  }
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const fromDetail = messageFromDetail(data.detail)
    if (fromDetail) {
      return fromDetail
    }
  }
  if (typeof data === 'string' && data.length > 0) {
    return sanitizeUserFacingText(data)
  }
  return statusText
    ? i18n.t('common.errors.apiWithStatusText', { status, statusText })
    : i18n.t('common.errors.apiWithStatus', { status })
}
