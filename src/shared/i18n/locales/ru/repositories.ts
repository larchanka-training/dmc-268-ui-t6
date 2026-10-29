import type { repositories as en } from '../en/repositories'
import type { Translation } from '../types'

export const repositories: Translation<typeof en> = {
  title: 'Репозитории',
  summary: 'Подключено: {{total}}, ревью включено в {{active}}',
  summaryEmpty: 'Пока ничего не подключено',
  refresh: 'Обновить',
  refreshTooltip: 'После добавления репозиториев в установку нажмите «Обновить доступ»',
  refreshAccess: 'Обновить доступ',
  refreshAccessTooltip:
    'Повторная авторизация через GitHub обновит список ваших установок GitHub App. Откроется GitHub, затем вы вернётесь на эту страницу',
  refreshAccessUnavailable: 'Обновление доступа недоступно: не задан VITE_GITHUB_CLIENT_ID',
  connect: 'Подключить GitHub-репозиторий',
  installApp: 'Установить GitHub App',
  installTooltip:
    'После установки GitHub App на новый аккаунт нажмите «Обновить доступ»: откроется GitHub, затем вы вернётесь сюда. Репозиторий может появиться с задержкой до нескольких минут',
  installUnavailable: 'Инсталляция недоступна: не задан VITE_GITHUB_APP_SLUG',
  empty:
    'Репозитории ещё не подключены. Для GitHub установите GitHub App или добавьте репозитории в существующую установку, затем нажмите «Обновить доступ». Для Bitbucket Cloud используйте блок «Bitbucket Cloud» ниже.',
  searchPlaceholder: 'Поиск по названию...',
  filter: {
    label: 'Фильтр репозиториев',
    all: 'Все ({{count}})',
    active: 'Активные ({{count}})',
  },
  nothingFound: 'Ничего не найдено',
  columns: {
    branch: 'Ветка',
    engine: 'Движок',
    waitForCi: 'Ожидание CI',
    limit: 'Лимит',
    repository: 'Репозиторий',
    review: 'Ревью',
    verdict: 'Вердикт',
    settings: 'Настройки',
  },
  waitForCi: {
    auto: 'Авто',
    always: 'Всегда',
    never: 'Никогда',
  },
  engine: {
    fast: 'DiffEngine (быстрый)',
  },
  // An abbreviation: the same for every count.
  comments_one: '{{count}} комм.',
  comments_few: '{{count}} комм.',
  comments_many: '{{count}} комм.',
  comments_other: '{{count}} комм.',
  limitShort: 'лимит {{count}}',
  verdict: {
    requestChanges: 'Запрос изменений',
    comment: 'Комментарий',
  },
  reviewFor: 'Ревью для {{name}}',
  noAccess: 'Нет доступа',
  noAccessLabel: 'Нет доступа у {{accessName}} к {{name}}: открыть настройки',
  configure: 'Настроить',
  settingsFor: 'Настройки {{name}}',
  accessRefresh: {
    loading: 'Загрузка репозиториев',
    timeoutPrompt: 'Нужного репозитория нет?',
    timeoutAction: 'Обновить список',
    timeoutAnnouncement: 'Нужного репозитория нет? Обновите список.',
  },
  statusUpdatedActive: 'Статус репозитория обновлен: активен',
  statusUpdatedPaused: 'Статус репозитория обновлен: на паузе',
  statusUpdateFailed: 'Не удалось изменить статус репозитория',
  loadFailed: 'Не удалось загрузить список репозиториев',
}
