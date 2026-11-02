import type { layout as en } from '../en/layout'
import type { Translation } from '../types'

export const layout: Translation<typeof en> = {
  nav: {
    label: 'Разделы',
    repositories: 'Репозитории',
    runs: 'Прогоны',
    audit: 'Аудит',
    analytics: 'Аналитика',
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
}
