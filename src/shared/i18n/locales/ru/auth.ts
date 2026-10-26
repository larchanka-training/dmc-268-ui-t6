import type { auth as en } from '../en/auth'
import type { Translation } from '../types'

export const auth: Translation<typeof en> = {
  login: {
    title: 'Вход в Reviewer',
    subtitle: 'AI-ревью кода для ваших pull request',
    alreadySignedIn: 'Вы уже авторизованы как {{login}}',
    fallbackLogin: 'пользователь',
    goToDashboard: 'Перейти в панель управления',
    note: 'Вход выполняется через GitHub App бота-ревьюера',
  },
  button: {
    github: 'Войти через GitHub',
    notConfigured: 'Вход не настроен (VITE_GITHUB_CLIENT_ID)',
    demoLabel: 'Войти как демо-пользователь',
    demo: 'Демо-вход (Mock)',
  },
  callback: {
    loadingTitle: 'Авторизация через GitHub...',
    loadingText: 'Обмениваем код подтверждения на сессионный токен',
    failedTitle: 'Не удалось войти',
    backToLogin: 'Вернуться к экрану входа',
    missingCode: 'Отсутствует код авторизации (параметр code не найден)',
    failed: 'Не удалось завершить авторизацию',
  },
  errors: {
    signInFailed: 'Не удалось войти через GitHub',
    signInFailedWithCode: 'Не удалось войти через GitHub (код {{status}})',
    invalidGrant: 'Код авторизации недействителен или истёк',
    unauthorizedClient: 'Клиент OAuth не авторизован',
    accessDenied: 'Доступ отклонён',
    invalidGithubCode: 'Недействительный код авторизации GitHub',
    githubUnavailable: 'Вход через GitHub временно недоступен',
    invalidState: 'Недействительный параметр безопасности state (защита от CSRF)',
    oauthAccessDenied: 'Доступ отклонён пользователем на стороне GitHub',
    oauthRedirectUriMismatch: 'Неверный redirect URI приложения GitHub',
    oauthInvalidScope: 'Запрошены недопустимые права OAuth',
  },
}
