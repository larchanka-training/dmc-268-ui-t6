import { i18n } from '../../shared/i18n'

export function oauthCallbackErrorMessage(code: string): string {
  switch (code) {
    case 'access_denied':
      return i18n.t('auth.errors.oauthAccessDenied')
    case 'redirect_uri_mismatch':
      return i18n.t('auth.errors.oauthRedirectUriMismatch')
    case 'invalid_scope':
      return i18n.t('auth.errors.oauthInvalidScope')
    default:
      return i18n.t('auth.errors.signInFailed')
  }
}
