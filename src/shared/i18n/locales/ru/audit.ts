import type { audit as en } from '../en/audit'
import type { Translation } from '../types'

export const audit: Translation<typeof en> = {
  title: 'Аудит',
  description: 'Кто запустил ревью и сколько оно стоило',
  descriptionForRepo: 'Прогоны репозитория {{repo}}',
  resetFilter: 'Сбросить фильтр',
  statusFilter: 'Статус',
  statusAll: 'Все',
  columns: {
    started: 'Начат',
    repository: 'Репозиторий',
    pullRequest: 'PR',
    trigger: 'Тип запуска',
    startedBy: 'Запустил',
    status: 'Статус',
    duration: 'Длительность',
    tokensIn: 'Токены на входе',
    tokensOut: 'Токены на выходе',
    cost: 'Стоимость',
  },
  empty: 'Нет прогонов ревью',
  loadFailedTitle: 'Ошибка загрузки',
  loadFailed: 'Не удалось загрузить журнал',
  nextPageFailed: 'Не удалось загрузить следующую страницу',
  retry: 'Повторить',
  showMore: 'Показать ещё',
}
