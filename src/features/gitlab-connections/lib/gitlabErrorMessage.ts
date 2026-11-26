import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { i18n } from '../../../shared/i18n'

function detailCode(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('detail' in data)) return null
  return typeof data.detail === 'string' ? data.detail : null
}

/** Fixed text. Provider bodies and parser output never reach the screen: a token can sit in them. */
export function gitlabErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return i18n.t('gitlab.errors.responseFormat')
  }
  if (error instanceof ApiError) {
    const code = detailCode(error.data)
    if (
      (error.status === 400 || error.status === 401 || error.status === 422) &&
      (code === 'invalid_token' || code === 'invalid_credential')
    ) {
      return i18n.t('gitlab.errors.invalidToken')
    }
    if (error.status === 401) return i18n.t('gitlab.errors.sessionExpired')
    if (error.status === 403) return i18n.t('gitlab.errors.forbidden')
    if (error.status === 404) return i18n.t('gitlab.errors.notFound')
    if (error.status === 429) return i18n.t('gitlab.errors.rateLimited')
    if (error.status === 400 || error.status === 422) return i18n.t('gitlab.errors.validation')
    if (error.status >= 500) return i18n.t('gitlab.errors.serviceUnavailable')
    return i18n.t('gitlab.errors.operationFailed')
  }
  if (error instanceof TypeError) return i18n.t('gitlab.errors.network')
  return i18n.t('gitlab.errors.operationFailed')
}
