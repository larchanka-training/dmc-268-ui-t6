import type { common as en } from '../en/common'
import type { Translation } from '../types'

export const common: Translation<typeof en> = {
  loading: 'Загрузка',
  error: 'Ошибка',
  refresh: 'Обновить',
  save: 'Сохранить',
  cancel: 'Отменить',
  retry: 'Повторить',
  settings: 'Настройки',
  progress: {
    wait: 'Ждёт',
    process: 'Идёт',
    finish: 'Готово',
    error: 'Ошибка',
    stopped: 'Остановлено',
  },
  errors: {
    api: 'Ошибка API',
    apiWithStatus: 'Ошибка API ({{status}})',
    apiWithStatusText: 'Ошибка API ({{status}}: {{statusText}})',
    loadTitle: 'Ошибка загрузки данных',
    tryAgain: 'Повторить попытку',
    http: {
      unexpectedFormat: 'Неожиданный формат данных от сервера. Пожалуйста, обновите страницу.',
      server: 'Внутренняя ошибка сервера ({{status}}). Повторите попытку позже.',
      badRequest: 'Некорректный запрос (400).',
      sessionExpired: 'Сессия истекла. Пожалуйста, выполните вход повторно.',
      forbidden: 'Недостаточно прав для выполнения операции.',
      notFound: 'Запрашиваемый ресурс не найден.',
      conflict: 'Конфликт данных (409).',
      unprocessable: 'Некорректные параметры запроса (422).',
      tooManyRequests: 'Слишком много запросов (429).',
      client: 'Ошибка запроса ({{status}}).',
      other: 'Ошибка сервера ({{status}}).',
      network: 'Ошибка сети. Проверьте подключение к интернету.',
    },
    schema: 'Ответ сервера не прошёл проверку схемы',
    network: 'Не удалось связаться с сервером. Проверьте подключение к сети',
  },
}
