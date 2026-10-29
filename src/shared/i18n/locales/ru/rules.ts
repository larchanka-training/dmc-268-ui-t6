import type { rules as en } from '../en/rules'
import type { Translation } from '../types'

export const rules: Translation<typeof en> = {
  title: 'Правила ревью',
  loadFailed: 'Не удалось загрузить статус правил',
  retry: 'Повторить',
  missing: 'Используются дефолтные правила, создайте .review/rules.md',
  defaultsVersion: 'Версия дефолтных правил: {{version}}',
  fileFound: 'Файл найден',
  fileText: 'Текст файла',
  fileTextLabel: 'Текст файла правил',
  fileTextUnavailable: 'Текст файла недоступен',
  fileEmpty: 'Файл пуст',
  ignoredPaths: 'Игнорируемые пути',
  noMasks: 'Масок нет',
  diagnostics: 'Диагностика',
  checking: 'Проверяем .review/rules.md в ветке {{branch}}…',
  checked: 'Проверено: {{date}}',
  invalid: 'Файл правил содержит ошибки',
  unavailable: 'Не удалось прочитать файл правил',
  limit: 'допустимо {{limit}}, фактически {{actual}}',
  limitLowerBound: 'допустимо {{limit}}, фактически более {{actual}}',
  mask: 'маска',
  // A diagnostic text that differs from the run text of its code (reasons.*): no run here.
  statusTexts: {
    policy_document_too_large:
      'Документ правил превышает 64 КиБ. Ревью с ним не выполнится; уменьшите документ.',
  },
  reasons: {
    policy_access_denied: 'У GitHub App нет доступа к репозиторию',
    policy_revision_unavailable:
      'Ревизия default branch недоступна: GitHub не подтвердил, есть ли файл правил.',
    policy_fetch_transient: 'GitHub временно не отвечает',
    policy_rate_limited: 'GitHub ограничил число запросов',
    fallback: 'Сервер не смог прочитать файл правил',
  },
  providerReasons: {
    policy_access_denied: 'У {{accessName}} нет доступа к репозиторию',
    policy_revision_unavailable:
      'Ревизия default branch недоступна: {{name}} не подтвердил, есть ли файл правил.',
    policy_fetch_transient: '{{name}} временно не отвечает',
    policy_rate_limited: '{{accessName}} ограничил число запросов',
  },
}
