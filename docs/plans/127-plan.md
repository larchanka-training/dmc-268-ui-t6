# План #127: бейдж находки по точному уровню

## Статус и границы

Development завершён, 20.10.2026: preparation, tasks1–5 и QA выполнены. Финальный независимый
review всех source/docs/browser proof: Standards=0 / Spec=0. Все UI gates, Storybook build
и четыре API gates passed; API serial rerun — 4025 passed / 863 skipped.
Сохранён [browser proof](127-browser-proof.md), включая D3 URL/history/reset обеих тем.
Publisher начал публикацию двух ready PR без назначения reviewer: свежий fetch и rebase
подтвердили обе сохранённые базы main. Файлы переданы без коммитов и push development.
Внешние Before merge проверки остаются pending; итоговые ссылки и CI-статус фиксируются в PR.
Источник: https://github.com/larchanka-training/dmc-268-ui-t6/issues/127.

Пользователь утвердил план и палитру в чате agent-loop. Обязательное решение техлида
проверено через GitHub API и сохранено:
https://github.com/larchanka-training/dmc-268-ui-t6/issues/127#issuecomment-6291809919.
Решение подтверждает всю таблицу ниже; critical dark `#f87171`, light `#b91c1c`.

Подготовлены из свежего `origin/main` отдельные worktree; исходные checkout и их untracked
файлы не изменялись:

| Репозиторий | Worktree               | Ветка                             | SHA базы review                            |
| ----------- | ---------------------- | --------------------------------- | ------------------------------------------ |
| UI          | `/tmp/dmc-268-ui-127`  | `feat/127-severity-badge-palette` | `ec628dd02bf0f59611e94ae6d3d742bb79472019` |
| API         | `/tmp/dmc-268-api-127` | `docs/127-severity-badge-palette` | `2326273e6ab7fcea89d1cf3b94b88a4be66ca5e9` |

Пересечения повторно проверены: UI `docs/FRONTEND_ARCHITECTURE.md` — #106/#109;
API `docs/PIPELINE_SPEC.md` — #220/#227/#228/#229. Для трёх исходных файлов task1
пересечений нет. После ответа пользователя «Да» координатор опубликовал согласующие
комментарии; узкие docs-правки применены после них:

- [UI #106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106#issuecomment-6292384464),
  [UI #109](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109#issuecomment-6292385772).
- [API #220](https://github.com/larchanka-training/dmc-268-api-t6/pull/220#issuecomment-6292387207),
  [API #227](https://github.com/larchanka-training/dmc-268-api-t6/pull/227#issuecomment-6292388680),
  [API #228](https://github.com/larchanka-training/dmc-268-api-t6/pull/228#issuecomment-6292389911),
  [API #229](https://github.com/larchanka-training/dmc-268-api-t6/pull/229#issuecomment-6292391315).

Цель — визуально различать пять уровней находки в `InlineComment`, включая карточки вне диффа.
Фильтр «Критичность» продолжает использовать D3: Critical = critical/high, Warning =
medium/low, Info = info. Счётчики, вердикт, API/Zod, severity threshold и api#149 вне scope.
Новые зависимости не нужны.

## Зафиксированный baseline

| Репозиторий | HEAD при планировании                      | Текущая ветка               |
| ----------- | ------------------------------------------ | --------------------------- |
| UI          | `e4a19fe6edc29af3bbf892e246adcfc2d715b6f5` | `fix/110-mock-rerun`        |
| API         | `82cbe4c2f7054dfe3e7301bd137c5eed2136888e` | `fix/111-worker-portal-url` |

Это точки анализа, не основание продолжать посторонние ветки. Отдельные ветки
`feat/127-severity-badge-palette` в UI и `docs/127-severity-badge-palette` в API уже созданы
из актуального main; SHA базы для review записаны выше. Tracked-изменений
в обоих checkout при проверке нет. Не включать в работу чужие untracked планы UI 114–120,
`.pnpm-store/`, untracked планы API 113/117/169. Планирование создаёт только эти два файла #127.

## Архитектура и предложение для решения

`InlineComment.tsx` сейчас выбирает `SEVERITY_TAG[severityBadgeGroup(finding.severity)]`.
Заменить это отдельным исчерпывающим отображением пяти `Severity` на существующие props `Tag`.
Не перемещать UI-тоны в domain/entity helper и не импортировать entity в shared.
`SEVERITY_BADGE_GROUPS`, `SEVERITY_BADGE_LABEL`, тело `severityBadgeGroup` и фильтры сохранить.
В `severityBadge.ts` потребуется только поправить комментарий, который сейчас приписывает
группе цвет бейджа. Подписи остаются `SEVERITY_LABEL`.

**Утверждённая таблица:** решение техлида по permalink выше совпадает с предложением.

| Уровень  | Тон Tag  | Вариант | Цвет точки/базового тона dark               | light     |
| -------- | -------- | ------- | ------------------------------------------- | --------- |
| critical | critical | solid   | `--rv-critical`: `#f87171` вместо `#f97316` | `#b91c1c` |
| high     | critical | dot     | `--rv-critical`: `#f87171`                  | `#b91c1c` |
| medium   | high     | dot     | `--rv-high`: `#fb923c`                      | `#c2410c` |
| low      | warning  | dot     | `--rv-warning`: `#fbbf24`                   | `#a16207` |
| info     | info     | dot     | `--rv-link`: `#60a5fa`                      | `#1d4ed8` |

Имеющихся тонов достаточно: имя `high` у shared-токена означает оранжевый тон и не требует
совпадения с domain severity. Предложенный dark red уже используется как danger, но critical
сохраняет самостоятельный semantic token. Не перекрашивать `--rv-high`, danger или warning.
Светлый low — доступный охристый yellow; не заменять его ярким жёлтым без измерений.

`Tag` выводит нейтральный текст для dot и окрашивает только точку. Solid использует смесь
тона 85% с `--rv-text` для текста; critical имеет отдельную прозрачную заливку 22%.
Поэтому hex токена не равен вычисленному цвету текста и не доказывает контраст.

Проверенный impact search `rv-critical`, `tone="critical"`, `tone: 'critical'` затрагивает
`Tag.module.css`, `InlineComment.tsx`, `palette.ts`, `tokens.css`, `buildTheme.test.ts`,
`Tag.stories.tsx`, `shared/ui/docs/Overview.stories.tsx` и таблицу `DESIGN_SYSTEM.md`.
Перекрасятся все critical-истории; глобальный тон менять только в shared design system.

## Пересечения открытых PR

Проверено через GitHub CLI 20.10.2026. Перед записью повторить проверку: состав PR меняется.
По правилу репозитория до изменения занятого файла оставить согласующий комментарий в PR.
На этапе planning комментарии не отправлялись.

| Файл                               | Открытые PR            | Действие                                                                                        |
| ---------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| UI `docs/FRONTEND_ARCHITECTURE.md` | #106, #109             | Согласовать узкую правку Ф-16 и абзаца бейджей; не менять соседние Ф-12/Ф-17                    |
| API `docs/PIPELINE_SPEC.md`        | #220, #227, #228, #229 | Согласовать §11 и связанную строку таблицы; сохранить параллельные изменения остальных разделов |

Пересечений открытых UI PR с InlineComment, Tag, palette/tokens и DESIGN_SYSTEM не найдено.
UI #155 затрагивает RunStepEvent, не эту задачу. Точные авторы для плана не требуются.

## Задачи

### 0. Разблокировать решение и подготовить базы (S)

**Результат:** сохранён permalink комментария техлида с финальной таблицей, пользователь
утвердил план; пересечения согласованы, чистые отдельные ветки созданы из main.

**AC:** оба условия начала выполнены; таблица плана сверена с решением; актуальные базы и
границы PR записаны. Если решение отличается, сначала обновить план и ожидаемые значения.
**Проверка:** issue comments, PR file lists, git status/merge-base. **Зависимости:** нет.
**Файлы:** этот план, todo (только уточнение статуса/баз).

### 1. Бейдж InlineComment отражает каждый уровень (M, до 3 файлов)

**Результат:** five-level mapping только для внешнего вида карточки; точная подпись сохранена.
**AC:** табличный тест проверяет literal label + `data-tone` + `data-variant` всех пяти
уровней; high больше не solid; D3 helpers/публичные экспорты/URL фильтров не меняются.
**Проверка:** сначала RED обновлённой таблицы на старой реализации, затем GREEN; намеренно
сломать high/medium mapping и убедиться, что тест падает; выполнить существующие тесты фильтра.
**Зависимости:** 0. **Файлы:** `src/widgets/diff-viewer/ui/InlineComment.tsx`,
`InlineComment.test.tsx`, `src/entities/review/lib/severityBadge.ts` (только комментарий).

### 2. Согласовать critical в двух источниках палитры (M, 3 файла)

**Результат:** утверждённый red critical в palette и CSS tokens, обе темы синхронны.
**AC:** dark critical равен утверждённому literal; light critical сохранён либо изменён точно
по решению; тест синхронизации TS/CSS остаётся зелёным, остальные semantic tokens сохранены.
**Проверка:** RED literal-ожидания для утверждённого critical, GREEN после правки обоих
источников; существующий `buildTheme.test.ts`. **Зависимости:** 0 (допустимо отдельно от 1).
**Файлы:** `src/shared/ui/theme/palette.ts`, `src/shared/ui/styles/tokens.css`,
`src/shared/ui/theme/buildTheme.test.ts`.

### Checkpoint после 1–2

Unit-тесты InlineComment, темы и finding-filters зелёные. Нет изменений состава D3,
API-схем/вердикта. Измерения контраста ниже выполняются до признания палитры готовой.

### 3. Витрина и контраст shared Tag (M, до 4 файлов)

**Результат:** Storybook показывает утверждённые пять бейджей, critical остаётся читаемым на
реальных поверхностях. Исправить shared Tag CSS только если измерение выявит проблему.
**AC:** `Tag.stories.tsx` Severity совпадает с пятью уровнями; Overview не показывает
устаревшее сопоставление; solid critical и dot-текст имеют ≥4.5:1, значимые точки ≥3:1 к
непосредственному фону в обеих темах. Не вводить экранные raw colours/override antd.
**Проверка:** browser computed colors по матрице ниже; при исправлении CSS добавить
необходимый regression test публичного поведения, CSS проверить браузером (jsdom стилей
не вычисляет). **Зависимости:** 1–2. **Файлы:** `Tag/Tag.stories.tsx`,
`docs/Overview.stories.tsx` в `src/shared/ui`, при необходимости `Tag/Tag.module.css` и
`Tag/Tag.test.tsx`. Если потребуется больше файлов, выделить отдельную задачу до изменения.

### 4. UI-документы фиксируют разделение badge/filter (S, 2 файла)

**Результат:** таблица цветов и §8 описывают итоговую палитру; Ф-16 и абзац бейджей отделяют
five-level appearance от трёх D3-групп фильтра, с ссылкой на решение #127.
**AC:** документы совпадают с literal-кодом; правила server verdict/counts сохранены;
нет изменений соседних решений, принадлежащих открытым PR.
**Проверка:** сверить таблицу с mapping/токенами, markdown formatting и diff.
**Зависимости:** 0–3, согласование #106/#109. **Файлы:** `docs/DESIGN_SYSTEM.md`,
`docs/FRONTEND_ARCHITECTURE.md`.

### 5. Отдельный API docs PR синхронизирует D3 (S, 1 файл)

**Результат:** §11 говорит, что фильтр по-прежнему группирует пять уровней в три, а badge
находки имеет отдельные цвет/вариант для каждого уровня согласно решению UI #127.
**AC:** исправлена также связанная строка «бейджи Critical / Warning / Info» в таблице §13,
чтобы не оставить противоречие; backend verdict/counts и правила #107 не изменены;
PR отдельный, docs only, `Refs larchanka-training/dmc-268-ui-t6#127` без closing keyword.
**Проверка:** diff §11/таблицы, ссылки на решение и UI PR; backend gates до заявления done.
**Зависимости:** 0, финальная палитра 3, согласование API PR. **Файлы:** API
`docs/PIPELINE_SPEC.md`. Эта задача может выполняться параллельно UI docs после фиксации решения.

### 6. Итоговая проверка и публикация (M, артефакт до 1 файла)

**Результат:** browser proof, зелёные gates, review без Standards/Spec findings, два PR.
**AC:** все issue AC подтверждены; D3 regression зелёный; PR bodies имеют What / Why /
How to verify / Refs; есть approve на текущем head и resolved threads перед merge.
**Проверка:** команды и матрица ниже. **Зависимости:** 1–5. **Файлы:** при сохранении proof
`docs/plans/127-browser-proof.md` (computed values, ratios, screenshots references).
Publisher работает через pull-request skill; перед review/merge rebase на main.
Board 12 обновить в пределах доступных полномочий; issue закрывает техлид после AC.

## Проверка после реализации

Targeted: `pnpm exec vitest run src/widgets/diff-viewer/ui/InlineComment.test.tsx
src/shared/ui/theme/buildTheme.test.ts src/entities/review/lib/severityBadge.test.ts
src/features/finding-filters src/widgets/diff-viewer/ui/RunDiff.filters.test.tsx`.

UI gates: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`,
затем `pnpm verify:prod-bundle`. При правке stories также `pnpm build-storybook`.
API gates даже для отдельного docs PR: `uv run ruff check .`, `uv run ruff format --check .`,
`uv run mypy .`, `uv run pytest`. Во время planning они не запускались: реализация не выполнена.

В настоящем браузере после approval проверить светлую и тёмную темы:

- Все пять уровней в inline diff и в «Замечания вне диффа» внутри warning Alert.
  Дополнительно summary-only карточки, нейтральные/добавленные/удалённые строки и их
  фактический контейнер карточки. Не предполагать, что фон строки равен фону бейджа.
- Записать `getComputedStyle` для текста, точки, background, `--rv-critical` и всех предков
  до непрозрачного фона. Для solid смешать alpha background с фактической поверхностью,
  затем вычислить WCAG relative luminance/ratio; текст ≥4.5:1 (12px), точки ≥3:1.
- Отдельно critical solid на warning Alert: его 22% red tint + смешанный текст. Замена high
  на dot устраняет старую оранжевую заливку high, но не доказывает доступность critical.
  В issue зафиксировано старое high solid 4.35:1 на dark Alert `rgb(41,38,33)`;
  это регрессионный сценарий, а не результат проверки предложенного red.
- Dot-метки: нейтральный текст и цветная точка проверяются независимо. Критический цвет
  должен выглядеть красным в обеих темах; сохранить screenshot и числовой proof.
- Фильтр по-прежнему показывает три пункта и URL `severity=critical|warning|info`:
  Critical включает critical/high, Warning medium/low, Info info; back/forward и reset
  работают. Не создавать пятиуровневый фильтр вслед за five-level бейджами.
- Переключение темы, focus/keyboard разворачивание карточек и 390px без горизонтального
  переполнения. Проверить shared Tag/Overview для всех затронутых critical применений.

## Риски и открытые вопросы

| Риск                                  | Мера                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| Нет решения техлида                   | Не запускать development; запросить полную таблицу и dark hex комментарием в #127         |
| Решение отличается от предложения     | Обновить план, literal-тесты и docs до реализации                                         |
| Red solid на warning Alert не даёт AA | Рано измерить в браузере; исправлять shared Tag по согласованной палитре, не экранный CSS |
| Общий critical перекрашивает витрину  | Проверить весь перечисленный impact, обе темы                                             |
| Документы принадлежат нескольким PR   | Комментарий до правки, узкий diff, свежий main и rebase                                   |
| Случайно меняется D3                  | Mapping живёт отдельно; существующие tests helpers/filter/RunDiff остаются без ослабления |

Решение техлида получено по permalink выше и реализовано. Контраст обеих тем и D3 regression
проверены; UI/API документы синхронизированы. Source/docs review — 0 findings.
Publisher завершает commit/push и создание двух ready PR без reviewer по явному указанию
пользователя «готов к ревью сам назначу». Approve текущего head,
resolved review threads и повторная актуализация main перед merge остаются внешними требованиями;
issue закрывает техлид после приёмки. После публикации координатор переводит Board 12 в On Review.
