import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { i18n } from '../../../shared/i18n'

function detailCode(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('detail' in data)) return null
  return typeof data.detail === 'string' ? data.detail : null
}

/** Fixed, user-facing text: provider details and parser internals never enter a toast or Alert. */
export function bitbucketErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return i18n.t('bitbucket.errors.responseFormat')
  }
  if (error instanceof ApiError) {
    const code = detailCode(error.data)
    if (error.status === 400 && code === 'invalid_credential') {
      return i18n.t('bitbucket.errors.invalidCredential')
    }
    if (error.status === 409 && code === 'credential_rotation_required') {
      return i18n.t('bitbucket.errors.rotationRequired')
    }
    if (error.status === 422 && code === 'repository_inaccessible') {
      return i18n.t('bitbucket.errors.repositoryInaccessible')
    }
    if (error.status === 401) return i18n.t('bitbucket.errors.sessionExpired')
    if (error.status === 403) return i18n.t('bitbucket.errors.forbidden')
    if (error.status === 404) {
      return i18n.t('bitbucket.errors.notFound')
    }
    if (error.status === 429) return i18n.t('bitbucket.errors.rateLimited')
    if (error.status === 502) return i18n.t('bitbucket.errors.providerUnavailable')
    if (error.status === 503) {
      return i18n.t('bitbucket.errors.credentialUnavailable')
    }
    if (error.status === 409) {
      return i18n.t('bitbucket.errors.conflict')
    }
    if (error.status === 400 || error.status === 422) {
      return i18n.t('bitbucket.errors.validation')
    }
    if (error.status >= 500) return i18n.t('bitbucket.errors.serviceUnavailable')
    return i18n.t('bitbucket.errors.operationFailed')
  }
  if (error instanceof TypeError) return i18n.t('bitbucket.errors.network')
  return i18n.t('bitbucket.errors.operationFailed')
}
