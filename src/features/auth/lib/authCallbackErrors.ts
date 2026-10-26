import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { i18n } from '../../../shared/i18n'

const HTML_LIKE = /<[a-z][\s\S]*>/i

function authCallbackMessage(code: string): string | null {
  switch (code) {
    case 'invalid_grant':
      return i18n.t('auth.errors.invalidGrant')
    case 'unauthorized_client':
      return i18n.t('auth.errors.unauthorizedClient')
    case 'access_denied':
      return i18n.t('auth.errors.accessDenied')
    default:
      return null
  }
}

/** Known English `detail` strings from `dmc-268-api-t6` auth callback (Refs #65, AC 3.1). */
function apiDetailMessage(detail: string): string | null {
  switch (detail) {
    case 'invalid GitHub authorization code':
      return i18n.t('auth.errors.invalidGithubCode')
    case 'GitHub authentication is unavailable':
      return i18n.t('auth.errors.githubUnavailable')
    default:
      return null
  }
}

function signInFailed(): string {
  return i18n.t('auth.errors.signInFailed')
}

function signInFailedWithCode(status: number): string {
  return i18n.t('auth.errors.signInFailedWithCode', { status })
}

function sanitizeUserFacingText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return signInFailed()
  }
  if (HTML_LIKE.test(trimmed)) {
    return signInFailed()
  }
  return trimmed
}

function messageFromDetail(detail: unknown, status: number): string | null {
  if (typeof detail === 'string' && detail.length > 0) {
    const mapped = apiDetailMessage(detail)
    if (mapped) {
      return mapped
    }
    // A server text written for people (in Russian) is shown as it is; it is not translated
    // (server texts are out of scope of the interface language). Anything else is a technical
    // detail and gets the generic message.
    if (!/[\u0400-\u04FF]/.test(detail)) {
      return signInFailedWithCode(status)
    }
    return sanitizeUserFacingText(detail)
  }
  if (typeof detail === 'object' && detail !== null && !Array.isArray(detail)) {
    if ('code' in detail && typeof detail.code === 'string') {
      const mapped = authCallbackMessage(detail.code)
      if (mapped) {
        return mapped
      }
    }
    if ('message' in detail && typeof detail.message === 'string') {
      return signInFailedWithCode(status)
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
      return signInFailed()
    }
    return signInFailedWithCode(status)
  }
  return signInFailedWithCode(status)
}

export function formatAuthCallbackFailure(err: unknown): string {
  if (err instanceof ApiError) {
    return formatAuthCallbackApiMessage(err.status, err.statusText, err.data)
  }
  if (err instanceof ZodError) {
    return i18n.t('common.errors.schema')
  }
  if (err instanceof TypeError) {
    return i18n.t('common.errors.network')
  }
  if (err instanceof Error && err.message.length > 0) {
    return err.message
  }
  return signInFailed()
}
