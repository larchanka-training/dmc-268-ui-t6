const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Доступ отклонён пользователем на стороне GitHub',
  redirect_uri_mismatch: 'Неверный redirect URI приложения GitHub',
  invalid_scope: 'Запрошены недопустимые права OAuth',
}

export function oauthCallbackErrorMessage(code: string): string {
  return OAUTH_ERROR_MESSAGES[code] ?? 'Не удалось войти через GitHub'
}
