import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { i18n } from '../../../shared/i18n'

export function formatErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ZodError) {
    return i18n.t('common.errors.http.unexpectedFormat')
  }

  if (err instanceof ApiError) {
    if (err.status >= 500) {
      return i18n.t('common.errors.http.server', { status: err.status })
    }
    if (err.status === 400) {
      return i18n.t('common.errors.http.badRequest')
    }
    if (err.status === 401) {
      return i18n.t('common.errors.http.sessionExpired')
    }
    if (err.status === 403) {
      return i18n.t('common.errors.http.forbidden')
    }
    if (err.status === 404) {
      return i18n.t('common.errors.http.notFound')
    }
    if (err.status === 409) {
      return i18n.t('common.errors.http.conflict')
    }
    if (err.status === 422) {
      return i18n.t('common.errors.http.unprocessable')
    }
    if (err.status === 429) {
      return i18n.t('common.errors.http.tooManyRequests')
    }
    if (err.status >= 400 && err.status < 500) {
      return i18n.t('common.errors.http.client', { status: err.status })
    }
    return i18n.t('common.errors.http.other', { status: err.status })
  }

  if (
    err instanceof TypeError ||
    (err instanceof Error && err.message.toLowerCase().includes('fetch'))
  ) {
    return i18n.t('common.errors.http.network')
  }

  return fallback
}
