import type { playground as en } from '../en/playground'
import type { Translation } from '../types'

export const playground: Translation<typeof en> = {
  title: 'Песочница правил',
  description:
    'Правки правил здесь не сохраняются в репозиторий и не влияют на ревью PR. Симуляция оплачивается из дневного бюджета workspace выбранного репозитория.',
  repository: 'Репозиторий (оплачивает)',
  rulesSource: 'Правила',
  fromRepository: 'Из .review/rules.md репозитория',
  defaultsOnly: 'Только дефолтные правила сервиса',
  defaultsOnlyNote: 'Применяются только дефолтные правила сервиса.',
  mode: 'Режим',
  modeCode: 'Код',
  modeDiff: 'Дифф',
  fileName: 'Имя файла',
  fileNamePlaceholder: 'src/app.py',
  code: 'Код',
  rulesText: 'Текст правил',
  result: 'Результат симуляции',
  resultEmpty: 'Здесь появятся замечания симуляции.',
  repositoriesFailed: 'Не удалось загрузить репозитории',
  retry: 'Повторить',
  empty: 'Нет подключённых репозиториев. Подключите репозиторий, чтобы проверить на нём правила.',
  goToRepositories: 'К репозиториям',
}
