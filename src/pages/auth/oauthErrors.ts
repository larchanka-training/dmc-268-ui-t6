const OAUTH_ERROR_MESSAGES = {
  access_denied: 'Доступ отклонён пользователем на стороне GitHub',
  redirect_uri_mismatch: 'Неверный redirect URI приложения GitHub',
  invalid_scope: 'Запрошены недопустимые права OAuth',
} as const

export function oauthCallbackErrorMessage(code: string): string {
  if (!Object.prototype.hasOwnProperty.call(OAUTH_ERROR_MESSAGES, code)) {
    return 'Не удалось войти через GitHub'
  }
  return OAUTH_ERROR_MESSAGES[code as keyof typeof OAUTH_ERROR_MESSAGES]
}
