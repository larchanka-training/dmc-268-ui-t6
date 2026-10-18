export const ACCESS_REFRESH_LOADING_TEXT = 'Загрузка репозиториев'
export const ACCESS_REFRESH_TIMEOUT_PROMPT = 'Нужного репозитория нет?'
export const ACCESS_REFRESH_TIMEOUT_ACTION_TEXT = 'Обновить список'
const ACCESS_REFRESH_TIMEOUT_ANNOUNCEMENT = `${ACCESS_REFRESH_TIMEOUT_PROMPT} Обновите список.`

export function resolveAccessRefreshPresentation(
  status: 'idle' | 'waiting' | 'timedOut',
  refreshing: boolean,
) {
  if (status === 'timedOut') {
    return { kind: 'timedOut', announcement: ACCESS_REFRESH_TIMEOUT_ANNOUNCEMENT } as const
  }
  if (status === 'waiting' && refreshing) {
    return { kind: 'loading', announcement: ACCESS_REFRESH_LOADING_TEXT } as const
  }
  return { kind: 'empty', announcement: '' } as const
}
