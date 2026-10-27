import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'

function detailCode(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('detail' in data)) return null
  return typeof data.detail === 'string' ? data.detail : null
}

/** Fixed, user-facing text: provider details and parser internals never enter a toast or Alert. */
export function bitbucketErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return 'Неожиданный формат ответа сервера. Обновите страницу и повторите попытку.'
  }
  if (error instanceof ApiError) {
    const code = detailCode(error.data)
    if (error.status === 400 && code === 'invalid_credential') {
      return 'API token Bitbucket недействителен. Проверьте token и его права.'
    }
    if (error.status === 409 && code === 'credential_rotation_required') {
      return 'Сначала обновите общий API token Bitbucket для этого подключения.'
    }
    if (error.status === 422 && code === 'repository_inaccessible') {
      return 'Репозиторий Bitbucket недоступен этому API token. Проверьте права доступа.'
    }
    if (error.status === 401) return 'Сессия истекла. Войдите повторно.'
    if (error.status === 403) return 'Недостаточно прав для подключения Bitbucket.'
    if (error.status === 404) {
      return 'Репозиторий или подключение Bitbucket не найдено. Обновите список.'
    }
    if (error.status === 429) return 'Bitbucket ограничил частоту запросов. Повторите позже.'
    if (error.status === 502) return 'Bitbucket временно недоступен. Повторите позже.'
    if (error.status === 503) {
      return 'Подключение Bitbucket временно недоступно. Повторите позже.'
    }
    if (error.status === 409) {
      return 'Данные подключения Bitbucket изменились. Обновите список и повторите попытку.'
    }
    if (error.status === 400 || error.status === 422) {
      return 'Проверьте данные подключения Bitbucket и повторите попытку.'
    }
    if (error.status >= 500) return 'Сервис временно недоступен. Повторите позже.'
    return 'Не удалось выполнить операцию Bitbucket. Повторите попытку.'
  }
  if (error instanceof TypeError) return 'Ошибка сети. Проверьте подключение к интернету.'
  return 'Не удалось выполнить операцию Bitbucket. Повторите попытку.'
}
