import type { layout as en } from '../en/layout'
import type { Translation } from '../types'

export const layout: Translation<typeof en> = {
  nav: {
    label: 'Разделы',
    repositories: 'Репозитории',
    runs: 'Прогоны',
    audit: 'Аудит',
    analytics: 'Аналитика',
    playground: 'Песочница',
    review: 'Ревью',
  },
  expandMenu: 'Развернуть меню',
  collapseMenu: 'Свернуть меню',
  theme: {
    title: 'Тема',
    system: 'Как в системе',
    light: 'Светлая',
    dark: 'Тёмная',
  },
  docs: 'Документация',
  workspace: {
    title: 'Workspace',
    current: 'Workspace: {{name}}',
    installation: 'ID установки: {{id}}',
  },
  userMenu: {
    label: 'Меню пользователя',
    fallbackLogin: 'Пользователь',
    logout: 'Выйти',
  },
  routeError: {
    title: 'Произошла непредвиденная ошибка',
    fallbackMessage: 'Непредвиденная ошибка приложения',
    backToDashboard: 'Вернуться в панель управления',
  },
  rootError: {
    title: 'Произошла непредвиденная ошибка',
    description: 'Приложение остановилось из-за ошибки. Перезагрузите страницу, чтобы продолжить.',
    reload: 'Перезагрузить',
  },
  notFound: {
    title: 'Страница не найдена',
    description: 'Такого адреса в панели нет. Проверьте ссылку или откройте список репозиториев.',
    toRepositories: 'К репозиториям',
  },
  routeOffline: 'Нет подключения к сети. Страница откроется, когда связь вернётся',
}
