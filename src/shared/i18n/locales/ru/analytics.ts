import type { analytics as en } from '../en/analytics'
import type { Translation } from '../types'

export const analytics: Translation<typeof en> = {
  title: 'Аналитика',
  description: 'Качество ревью за выбранный период',
  period: 'Период',
  days7: '7 дней',
  days30: '30 дней',
  repository: 'Репозиторий',
  allRepositories: 'Все репозитории',
  resetRepository: 'Сбросить фильтр',
  empty:
    'В этом периоде нет завершённых прогонов. Учитываются только завершённые ревью в подключённых репозиториях.',
  goToRepositories: 'К репозиториям',
  loadFailedTitle: 'Ошибка загрузки',
  loadFailed: 'Не удалось загрузить сводку',
  retry: 'Повторить',
  runs: 'Прогоны',
  pulls: 'Pull request',
  noVerdict: 'Без вердикта',
  severity: 'Критичность',
  statusSucceeded: 'Успешные',
  statusFailed: 'С ошибкой',
  statusCancelled: 'Отменённые',
  statusSkipped: 'Пропущенные',
  verdictBlocking: 'Блокирующие',
  verdictAttention: 'Требуют внимания',
  verdictClean: 'Чистые',
  severityCritical: 'Критические',
  severityHigh: 'Высокие',
  severityMedium: 'Средние',
  severityLow: 'Низкие',
  severityInfo: 'Информационные',
  categorySecurity: 'Безопасность',
  categoryBug: 'Дефект',
  categoryPerformance: 'Производительность',
  categoryStyle: 'Стиль',
  averageDuration: 'Средняя длительность',
  tokensIn: 'Токены на входе',
  tokensOut: 'Токены на выходе',
  cost: 'Стоимость',
  findingsByDay: 'Находки по дням',
  durationByDay: 'Средняя длительность по дням',
  dailyNumbers: 'Числа по дням',
  day: 'День',
  durationSeconds: 'Длительность, с',
  budgetTitle: 'Бюджет на сегодня',
  spent: 'Потрачено за сутки UTC',
  limit: 'Дневной лимит',
  limitUnset: 'Лимит не задан',
  paused: 'Дневной бюджет исчерпан, ревью на паузе до 00:00 UTC',
  // Tooltips for tiles
  runsSucceededTooltip: 'Число прогонов ревью со статусом «Успешные» за выбранный период',
  runsFailedTooltip: 'Число прогонов ревью со статусом «С ошибкой» за выбранный период',
  runsCancelledTooltip: 'Число прогонов ревью со статусом «Отменённые» за выбранный период',
  runsSkippedTooltip: 'Число прогонов ревью со статусом «Пропущенные» за выбранный период',
  pullsBlockingTooltip:
    'Число pull request с вердиктом «Блокирующие» (хотя бы одна находка critical или high) за выбранный период',
  pullsAttentionTooltip:
    'Число pull request с вердиктом «Требуют внимания» (только находки medium или low) за выбранный период',
  pullsCleanTooltip:
    'Число pull request с вердиктом «Чистые» (полная проверка, нет находок выше info) за выбранный период',
  pullsNoVerdictTooltip:
    'Число pull request без вердикта (прогон с ошибкой, отменён или пропущен; проверка неполная и без находок выше info; проверка только по списку файлов) за выбранный период',
  severityCriticalTooltip:
    'Число критических находок (дают вердикт «Блокирующие») за выбранный период',
  severityHighTooltip:
    'Число находок высокой важности (дают вердикт «Блокирующие») за выбранный период',
  severityMediumTooltip:
    'Число находок средней важности (без более важных дают вердикт «Требуют внимания») за выбранный период',
  severityLowTooltip:
    'Число находок низкой важности (без более важных дают вердикт «Требуют внимания») за выбранный период',
  severityInfoTooltip: 'Число информационных находок (на вердикт не влияют) за выбранный период',
  averageDurationTooltip: 'Средняя длительность по успешным прогонам за выбранный период',
  tokensInTooltip: 'Суммарное число входных токенов за выбранный период',
  tokensOutTooltip: 'Суммарное число выходных токенов за выбранный период',
  costTooltip: 'Суммарная стоимость в долларах США (USD) за выбранный период',
  // Findings count plural
  findingsCount_one: '{{count}} находка',
  findingsCount_few: '{{count}} находки',
  findingsCount_many: '{{count}} находок',
  findingsCount_other: '{{count}} находок',
  // Tooltips for charts
  findingsByDayHelp:
    'График показывает число находок за день (UTC) по четырём категориям: {{security}}, {{correctness}}, {{performance}} и {{style}}. Шкала строится от максимума выбранного периода, поэтому графики разных периодов по высоте не сравнимы.',
  durationByDayHelp:
    'График показывает среднюю длительность успешных прогонов за день (UTC). Шкала строится от максимума выбранного периода, поэтому графики разных периодов по высоте не сравнимы. Значения в секундах; в подсказке точки — минуты и секунды. Линия соединяет дни с успешными прогонами; разрыв линии означает, что в этот день не было успешных прогонов.',
}
