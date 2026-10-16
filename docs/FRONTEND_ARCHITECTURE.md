# FRONTEND_ARCHITECTURE — AI Code Reviewer (команда 6)

|                     |                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Статус              | **утверждён**: PR #31 (approve 2026-09-19, смержен 2026-09-20); изменения — PR со строкой Ф-n в §0                                                              |
| Владелец            | инженер 2, frontend-архитектура (роль 5)                                                                                                                        |
| Связанные документы | [`SYSTEM_DESIGN.md`][sd] (роль 1, канон в `dmc-268-api-t6`), `BACKEND_ARCHITECTURE.md` / api PR #4 (роль 6, ERD), тулинг PR #26 (роль 4), инфра PR #28 (роль 3) |
| Нумерация решений   | `Ф-1…` (frontend), не пересекается с `Р-n` [SD §1][sd-1]                                                                                                        |

**Что это.** Документ фиксирует архитектуру клиента `dmc-268-ui-t6`: слои, состояние, UI-кит,
контракт данных и требования к API, которые frontend выставляет backend'у до того, как тот
готов. Каркас (папки, схемы, адаптеры, четыре виджета, мок) уже в `main`;
документ описывает то, что реализовано, и явно помечает, что осталось открытым.

**Стек.** React 19.3.0, Vite 8.3.0 (rolldown), TypeScript 7.0.2 — компилятор `tsc`, рядом 6.0.3
для typescript-eslint (peer `typescript >=4.8.4 <6.1.0`; side-by-side, Ф-11, #47),
pnpm 12, antd 6.6.5, react-diff-view 3.3.3, Zod 4.6.5, Zustand 5.0.15,
TanStack Query 5.103.2, Vitest 5.0.1, jsdom 30.1.1, Testing Library 16.3.3. Версии — самые свежие
стабильные на 2026-09-19, выбраны ролью 5 в отсутствие ответа команды (Ф-11);
TypeScript поднят до 6.0.3 2026-09-24 (#49), компилятор — до 7.0.2 в тот же день (#47);
antd, TanStack Query и jsdom — патчи от 2026-09-24.

---

## 0. Решения

| Ф-n  | Решение                                                                                                                                                              | Причина                                                                                                                                                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ф-1  | FSD (lite) вместо Clean Architecture                                                                                                                                 | UI-клиент без доменной логики; FSD — фронтенд-реализация чистой архитектуры (лекция), см. §1.                                                                                                                              |
| Ф-2  | UI-кит antd 6.6.4                                                                                                                                                    | Tree/Collapse/Descriptions из коробки, peer react ≥ 18, проверено proof-run; подтверждено — [решение техлида][tl-2026-09-24-46] (§3).                                                                                      |
| Ф-3  | RunStatus — 7 значений (`succeeded`, + `publishing/cancelled/skipped`); пересмотрено 2026-09-24                                                                      | UI «зависание/retry/отмена»; согласовано с ERD роли 6 и [SD §6.4][sd-6.4]; `succeeded` — [решение техлида][tl-2026-09-24].                                                                                                 |
| Ф-4  | `RunAction.response \| null` + `responseRef`                                                                                                                         | тела инструментов > 64 КБ выносятся отдельным запросом.                                                                                                                                                                    |
| Ф-5  | Внешний ключ `runId`, тип `RunSession`                                                                                                                               | одно имя во всём контракте: `RunSession` — API-представление `Run` ([SD §12][sd-12]).                                                                                                                                      |
| Ф-6  | Привязка комментария — пара `oldLine \| null` / `newLine \| null`; канон якоря — `path/start_line/line` (+ `side`), уточнено 2026-09-28                              | бэкенд мапит канон в провод по формулам [PIPELINE_SPEC §10][ps-10] (api#20, D6); ключ виджета выводится из пары (§6).                                                                                                      |
| Ф-7  | TanStack Query — серверный кэш; Zustand — UI-состояние, стор живёт в виджете; вид, которым делятся ссылкой (фильтры замечаний), — URL search params                  | `shared` не знает о домене; SSE → invalidateQueries (§2); у фильтров один источник — URL, копии в сторе нет (§2, §6).                                                                                                      |
| Ф-8  | Дифф по проводу — сырой unified diff на файл; парсинг клиентом за адаптером                                                                                          | замена diff-библиотеки = замена одного адаптера (§6).                                                                                                                                                                      |
| Ф-9  | Новый эндпоинт `GET /api/runs/{id}/files?path&offset&limit`                                                                                                          | дочитывание контекста порциями; путь внесён в [SD §12][sd-12] (§5, п. 7).                                                                                                                                                  |
| Ф-10 | JSON на проводе — camelCase                                                                                                                                          | Zod-схемы фронта — источник истины — [SD §12][sd-12]; иначе трансформер на каждом ответе.                                                                                                                                  |
| Ф-11 | Самые свежие стабильные версии (React 19.3, Vite 8.3, Vitest 5.0, TS 7.0.2, линтер — 6.0.3) — решение роли 5 при отсутствии ответа команды; уточнено 2026-09-24      | peer-совместимость проверена по npm registry; у TS 7.0 нет JS API — typescript-eslint (peer `typescript >=4.8.4 <6.1.0`) на 6.0.x, рядом с 7.0 — #47; расхождения с PR #26/#33 — предложениями в их тредах.                |
| Ф-12 | react-router 8 установлен (^8.4.0) для декларативной маршрутизации; Mantine 9 — не установлен                                                                        | SPA-роутер App Shell (/login, /auth/callback, /repositories, /repositories/:repoId/settings, /runs, /review); React 19.3 выполняет peer-требование (≥ 19.2.7).                                                             |
| Ф-13 | Стили: antd tokens для темизации + CSS Modules для layout-контейнеров; Tailwind — нет                                                                                | один источник цветов/отступов, layout без рантайма; stylelint-override для `*.module.css` — [решение техлида][tl-2026-09-24-46] (§3).                                                                                      |
| Ф-14 | SSE — `fetch`-стрим с `Authorization: Bearer`, а не `EventSource`                                                                                                    | `EventSource` не отправляет заголовки, а `/api/stream` требует Bearer ([решение техлида][tl-2026-09-27-api20], api#20 D4); `401` → refresh → переподключение (§2).                                                         |
| Ф-15 | Авторизация — GitHub App user authorization; access-токен только в памяти, refresh — httpOnly-cookie; fail closed                                                    | [решение техлида][tl-2026-09-27-api20], api#20 D4; токен в памяти — дефолт плана api#20; fail closed, общий refresh, старт refresh → `/me` — правила клиента (§11).                                                        |
| Ф-16 | Вердикт (`blocking`/`attention`/`clean`) и `severityCounts` считает сервер; Critical/Warning/Info — группировка в UI                                                 | [решение техлида][tl-2026-09-27-api20], api#20 D3: UI вердикт сам не выводит, API отдаёт пять уровней severity (§4).                                                                                                       |
| Ф-17 | Репозиторий подключается установкой GitHub App; настройки — `PATCH /api/repos/{id}`; уточнено 2026-10-14 (ui#93)                                                     | [решение техлида][tl-2026-09-27-api20], api#20 D10: `POST /api/repos` нет; поля настроек — `enabled`, `defaultEngine`, `waitForCi`, `maxComments`, `reviewEvent` (§11) и поля api#149 из api PR #156 (ниже, §5).           |
| Ф-18 | Синхронная подсветка диффа — бюджет ~1000 строк на файл и на весь дифф; выше — без `tokenize` (worker — follow-up)                                                   | AC ui#65 ч. 1; API `summary_only` >3000 строк; замеры в `docs/plans/65-plan.md` (Refs ui#65).                                                                                                                              |
| Ф-19 | Список PR репозитория (`GET /repos/{id}/pulls`) в UI **не** входит в scope #65; навигация — со страницы репозиториев / внешняя ссылка на GitHub                      | Открытый вопрос плана закрыт: follow-up issue при появлении API в продукте (Refs ui#65).                                                                                                                                   |
| Ф-20 | Дизайн-система Flat Console поверх antd: тема, свои компоненты и правила в `src/shared/ui`, витрина в Storybook; спецификация [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | Единый вид всех экранов без смены UI-кита: Ф-2 и Ф-13 остаются в силе, antd получает нашу тему, а то, что токенами не выражается, собрано в одном файле. Базовые компоненты берутся только из дизайн-системы (Refs ui#98). |
| Ф-21 | Настройки репозитория — страница `/repositories/:repoId/settings`, не модальное окно; история — `/runs?repo=` по курсору; поля — api PR #156, правила — provisional  | ui#93: у настроек свой адрес (ссылка, возврат после входа) и место для блока правил; поля — контракт api#149 (§5); `rules-status` в api нет — его объявил UI, блок правил только на моках (§2, §8, §9).                    |

Ф-11 уточнено 2026-09-24 (#49): TypeScript поднят 5.9.3 → 6.0.3. Потолок — именно 6.0.x, а не
«6.x»: у TypeScript 7.0 нет JS API компилятора, поэтому peer typescript-eslint остаётся
`typescript >=4.8.4 <6.1.0` ([typescript-eslint#10940][tse-10940]) — специфер в `package.json`
тильдовый (`~6.0.3`), каретка пустила бы 6.1.x за пределы диапазона. Переход на 7.x — #47.

Ф-11 уточнено 2026-09-24 (#47): компилятор — TypeScript 7.0.2 по схеме side-by-side из
[анонса TS 7.0][ts-7.0-side-by-side]. В `package.json` два пакета:
`"@typescript/native": "npm:typescript@^7.0.2"` даёт бинарь `tsc`, поэтому `check-types` и `build`
(`tsc -b`) идут на нативном компиляторе, в том числе в Docker-сборке на `node:24-alpine`;
`"typescript": "npm:@typescript/typescript6@~6.0.2"` — обёртка, которая реэкспортирует
`typescript@6.0.3` и ставит только бинарь `tsc6`, так что `require('typescript')` в
typescript-eslint получает JS API 6.0. Тильда — по той же причине, что в #49. Внутренняя
зависимость обёртки (`typescript@^6`) держится на 6.0.3 только lockfile'ом. #47 закрыт этим шагом
(решение техлида 2026-09-24); follow-up без отдельной задачи — убрать обёртку и оставить один
`typescript@7`, когда typescript-eslint поддержит TS 7
([typescript-eslint#10940][tse-10940]; прототип — draft [typescript-eslint#12803][tse-12803]
под API TS 7.1).

Ф-3 пересмотрено 2026-09-24: в [SD §8.2][sd-8.2] `completed` уже означает GitHub `check_suite` /
`check_run completed` («завершён с любым исходом»), и второй смысл у этого слова ведёт к
ошибкам. Поэтому успешный статус прогона — `succeeded` везде: домен, PG enum, API и Zod
фронтенда.

Ф-6 уточнено 2026-09-28 (api#20, D6): канон якоря — `path` / `start_line` / `line` (+ `side`), так
пишут LLM и датасет api#30. БД и Zod не переименовываются, на проводе остаются `file` / `oldLine` /
`newLine` / `endLine`. Формулы и однострочный случай — §6, первоисточник — [PIPELINE_SPEC §10][ps-10].

Ф-10 уточнено 2026-09-28 (api#20, D9 — дефолт, утверждённый с планом): camelCase на проводе
остаётся, но источник истины для путей и форм HTTP теперь [`contracts/openapi.yaml`][openapi] в
api; Zod-схемы — проверка того же контракта на клиенте (§4, §5).

Ф-7 уточнено 2026-10-09 (ui#84): к двум хранилищам добавился третий источник состояния — URL.
Фильтры замечаний над диффом (`file`, `severity`, `q`) живут в `location.search`: ссылка с
фильтрами открывает тот же вид (перезагрузка, новая вкладка, «назад»), а дублировать их в
Zustand или `useState` нельзя — получится два источника правды. Правила — §2 «Состояние в URL»,
семантика — §6 «Фильтры замечаний».

Ф-17 уточнено 2026-10-14 (ui#93): настройки правятся на странице `/repositories/:repoId/settings`,
а не в модальном окне списка (Ф-21). Поля страницы: `enabled` — переключатель «Автоматическое
ревью», отдельный `PATCH { enabled }`; сервер отдаёт итог `enabled AND installationAvailable`
(§5); `waitForCi`, `maxComments`, `reviewEvent` — форма; `defaultEngine` — только текст, не
отправляется. Поля api#149 (контракт api PR #156, §5): `branchFilter`, `severityThreshold` —
форма; обязательное, только для чтения `installationAvailable` — предупреждение у переключателя.

---

## 1. Слои

Feature-Sliced Design (lite): `app → pages → widgets → features → entities → shared`.

```mermaid
flowchart TD
  app --> pages
  pages --> widgets
  widgets --> features
  features --> entities
  entities --> shared
```

Правила:

- импорты — только вниз по стрелке; наверх и «вбок» — нельзя;
- срезы одного слоя друг друга не импортируют (кроме `shared`, у него срезов нет).
  Исключение: `entities/run` импортирует `FindingViewSchema` из `entities/review`
  (разбор `findings[]` в `RunDetail`). `entities/run/api` берёт схему из публичного
  индекса; `entities/run/model/schemas.ts` импортирует файл
  `entities/review/model/schemas.ts` напрямую — генератор снимка Zod в api
  (`tests/generate_ui_zod_contracts.mjs`) грузит схемы в Node ESM, а Node не
  резолвит импорт каталога. ESLint `no-restricted-imports` это допускает;
- `shared` никогда не импортирует `entities` (граница из плана, D18: `shared/api/endpoints.ts` —
  только пути/методы, domain-agnostic; привязка «эндпоинт → Zod-схема» — в `entities/*/api`);
- файл компонента экспортирует только компоненты — следствие `react-refresh` (тулинг PR #26):
  вспомогательные функции и типы выносятся в соседние `lib`/`model` файлы.

Область [SD §2][sd-2] → срез FSD:

| Область [SD §2][sd-2]                            | Срез                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Карточка прогона с диффом и инлайн-комментариями | `entities/{diff,review}`, `features/finding-filters`, `widgets/diff-viewer`, `pages/runs/RunDetailPage` |
| Инспектор трейса (`RunSession → RunAction`)      | `entities/run`, `widgets/run-inspector`, `pages/runs`                                                   |
| История прогонов (`/runs?repo=`)                 | `entities/run`, `features/run-list-filter`, `pages/runs/RunsPage`                                       |
| Аутентификация и App Shell                       | `entities/user`, `features/auth`, `features/theme`, `widgets/app-layout`, `pages/{login,auth}`          |
| Репозитории и их настройки                       | `entities/repository`, `features/repository-settings`, `widgets/repository-list`, `pages/repositories`  |
| Правила: статус `.review/rules.md` (мок)         | `entities/repository`, `widgets/repository-rules`, `pages/repositories/RepositorySettingsPage`          |
| Метрики                                          | не заведено — вне спринта (non-goal)                                                                    |

Границы срезов ui#93:

- карта «порог → уровни, которые он публикует» (`features/repository-settings/lib/severityThreshold.ts`)
  живёт в фиче, а не в `entities/repository`: ей нужен `severityBadgeGroup` из `entities/review`, а
  второго пересечения сущностей, кроме run→review, нет. Фича берёт публичные индексы обеих
  сущностей — это импорт вниз;
- `pages/repositories` (ссылка «История проверок») и `pages/runs` (чтение фильтра) берут
  `runListHref` / `useRunListFilterParams` из `features/run-list-filter` и друг друга не импортируют;
- `widgets/repository-list` не знает о роутере: адрес «Настроить» приходит пропом
  `settingsHref(repo)`, переход без перезагрузки — `onOpenSettings(repo)` (как у `NavMenu` /
  `AppSidebar`); путь собирает страница (`pages/repositories/lib/settingsPath.ts`).

Дерево `src/` (`find src -type f | LC_ALL=C sort`):

```
src/App.returnTo.test.tsx
src/App.test.tsx
src/App.tsx
src/app/layouts/ProtectedLayout.returnTo.test.tsx
src/app/layouts/RouteLayouts.module.css
src/app/layouts/RouteLayouts.tsx
src/app/layouts/RoutePages.test.tsx
src/app/layouts/RoutePages.tsx
src/app/layouts/index.ts
src/app/mocks/app-state.test.ts
src/app/mocks/app-state.ts
src/app/mocks/mockRulesStatus.test.ts
src/app/mocks/mockRulesStatus.ts
src/app/mocks/mockRunReview.test.ts
src/app/mocks/mockRunReview.ts
src/app/mocks/mockRunTimeline.test.ts
src/app/mocks/mockRunTimeline.ts
src/app/mocks/mockRunsList.fixture.test.ts
src/app/mocks/mockRunsList.fixture.ts
src/app/mocks/mockTransport.test.ts
src/app/mocks/mockTransport.ts
src/app/mocks/mockTransport.walkingRun.test.ts
src/app/providers/QueryProvider.tsx
src/app/providers/RunStreamBridge.tsx
src/app/providers/UiProvider.diffTheme.test.tsx
src/app/providers/UiProvider.test.tsx
src/app/providers/UiProvider.tsx
src/app/providers/index.ts
src/app/providers/queryClient.ts
src/app/providers/runStreamConnect.test.ts
src/app/providers/runStreamConnect.ts
src/app/providers/useRunStream.test.tsx
src/app/providers/useRunStream.ts
src/app/routes.tsx
src/entities/diff/api/index.test.ts
src/entities/diff/api/index.ts
src/entities/diff/index.ts
src/entities/diff/lib/commentKey.test.ts
src/entities/diff/lib/commentKey.ts
src/entities/diff/lib/expandContext.test.ts
src/entities/diff/lib/expandContext.ts
src/entities/diff/lib/extractNewSideLines.test.ts
src/entities/diff/lib/extractNewSideLines.ts
src/entities/diff/lib/fileLanguage.ts
src/entities/diff/lib/fromPatch.test.ts
src/entities/diff/lib/fromPatch.ts
src/entities/diff/lib/toHunks.test.ts
src/entities/diff/lib/toHunks.ts
src/entities/diff/model/schemas.test.ts
src/entities/diff/model/schemas.ts
src/entities/repository/api/index.test.ts
src/entities/repository/api/index.ts
src/entities/repository/api/useRepository.test.tsx
src/entities/repository/api/useRepositoryRulesStatus.test.tsx
src/entities/repository/api/useUpdateRepository.test.tsx
src/entities/repository/index.ts
src/entities/repository/model/schemas.rulesStatus.test.ts
src/entities/repository/model/schemas.test.ts
src/entities/repository/model/schemas.ts
src/entities/review/api/index.test.ts
src/entities/review/api/index.ts
src/entities/review/index.ts
src/entities/review/lib/findingAnchor.ts
src/entities/review/lib/reviewCommentToFinding.ts
src/entities/review/lib/severityBadge.test.ts
src/entities/review/lib/severityBadge.ts
src/entities/review/model/schemas.contract.test.ts
src/entities/review/model/schemas.test.ts
src/entities/review/model/schemas.ts
src/entities/run/api/fetchRunActions.test.ts
src/entities/run/api/fetchRunDetail.test.ts
src/entities/run/api/fetchRunList.test.ts
src/entities/run/api/index.test.ts
src/entities/run/api/index.ts
src/entities/run/api/runStreamParse.test.ts
src/entities/run/api/runStreamParse.ts
src/entities/run/api/useRunList.test.tsx
src/entities/run/index.ts
src/entities/run/lib/duoActions.fixture.ts
src/entities/run/lib/groupActions.test.ts
src/entities/run/lib/groupActions.ts
src/entities/run/lib/runProgress.test.ts
src/entities/run/lib/runProgress.ts
src/entities/run/lib/status.test.ts
src/entities/run/lib/status.ts
src/entities/run/model/runDetailSchema.test.ts
src/entities/run/model/schemas.contract.test.ts
src/entities/run/model/schemas.test.ts
src/entities/run/model/schemas.ts
src/entities/user/api/index.ts
src/entities/user/index.ts
src/entities/user/model/schemas.test.ts
src/entities/user/model/schemas.ts
src/features/.gitkeep
src/features/auth/index.ts
src/features/auth/lib/authCallbackErrors.test.ts
src/features/auth/lib/authCallbackErrors.ts
src/features/auth/lib/returnTo.test.ts
src/features/auth/lib/returnTo.ts
src/features/auth/model/store.test.ts
src/features/auth/model/store.ts
src/features/auth/ui/LoginButton.test.tsx
src/features/auth/ui/LoginButton.tsx
src/features/auth/ui/UserMenu.module.css
src/features/auth/ui/UserMenu.test.tsx
src/features/auth/ui/UserMenu.tsx
src/features/finding-filters/index.ts
src/features/finding-filters/model/findingFilters.test.ts
src/features/finding-filters/model/findingFilters.ts
src/features/finding-filters/model/useFindingFiltersParams.test.tsx
src/features/finding-filters/model/useFindingFiltersParams.ts
src/features/finding-filters/model/useQueryText.ts
src/features/finding-filters/ui/FindingFiltersBar.module.css
src/features/finding-filters/ui/FindingFiltersBar.test.tsx
src/features/finding-filters/ui/FindingFiltersBar.tsx
src/features/repository-settings/index.ts
src/features/repository-settings/lib/autoReviewChoice.test.ts
src/features/repository-settings/lib/autoReviewChoice.ts
src/features/repository-settings/lib/serverFieldErrors.test.ts
src/features/repository-settings/lib/serverFieldErrors.ts
src/features/repository-settings/lib/settingsPatch.test.ts
src/features/repository-settings/lib/settingsPatch.ts
src/features/repository-settings/lib/severityThreshold.test.ts
src/features/repository-settings/lib/severityThreshold.ts
src/features/repository-settings/ui/AutoReviewSwitch.module.css
src/features/repository-settings/ui/AutoReviewSwitch.test.tsx
src/features/repository-settings/ui/AutoReviewSwitch.tsx
src/features/repository-settings/ui/RepositorySettingsForm.module.css
src/features/repository-settings/ui/RepositorySettingsForm.test.tsx
src/features/repository-settings/ui/RepositorySettingsForm.tsx
src/features/run-list-filter/index.ts
src/features/run-list-filter/model/runListFilter.test.ts
src/features/run-list-filter/model/runListFilter.ts
src/features/run-list-filter/model/useRunListFilterParams.test.tsx
src/features/run-list-filter/model/useRunListFilterParams.ts
src/features/theme/index.ts
src/features/theme/model/store.test.ts
src/features/theme/model/store.ts
src/main.tsx
src/main.wiring.test.ts
src/pages/auth/CallbackPage.module.css
src/pages/auth/CallbackPage.test.tsx
src/pages/auth/CallbackPage.tsx
src/pages/auth/oauthErrors.test.ts
src/pages/auth/oauthErrors.ts
src/pages/login/HeroGlass.module.css
src/pages/login/HeroGlass.tsx
src/pages/login/LoginPage.module.css
src/pages/login/LoginPage.test.tsx
src/pages/login/LoginPage.tsx
src/pages/repositories/RepositoriesPage.test.tsx
src/pages/repositories/RepositoriesPage.tsx
src/pages/repositories/RepositorySettingsPage.rules.test.tsx
src/pages/repositories/RepositorySettingsPage.test.tsx
src/pages/repositories/RepositorySettingsPage.tsx
src/pages/repositories/lib/formatError.test.ts
src/pages/repositories/lib/formatError.ts
src/pages/repositories/lib/settingsPath.ts
src/pages/repositories/lib/useRepositoryAccessRefresh.ts
src/pages/review/.gitkeep
src/pages/review/ReviewPage.module.css
src/pages/review/ReviewPage.tsx
src/pages/review/ReviewRedirect.test.tsx
src/pages/review/ReviewRedirect.tsx
src/pages/runs/.gitkeep
src/pages/runs/RunDetailPage.filters.test.tsx
src/pages/runs/RunDetailPage.module.css
src/pages/runs/RunDetailPage.progress.test.tsx
src/pages/runs/RunDetailPage.search.test.tsx
src/pages/runs/RunDetailPage.test.tsx
src/pages/runs/RunDetailPage.tsx
src/pages/runs/RunsPage.module.css
src/pages/runs/RunsPage.test.tsx
src/pages/runs/RunsPage.tsx
src/pages/runs/lib/runLoadErrors.test.ts
src/pages/runs/lib/runLoadErrors.ts
src/shared/api/apiErrorMessage.test.ts
src/shared/api/apiErrorMessage.ts
src/shared/api/client.test.ts
src/shared/api/client.ts
src/shared/api/endpoints.test.ts
src/shared/api/endpoints.ts
src/shared/api/schemas.ts
src/shared/api/validationError.test.ts
src/shared/api/validationError.ts
src/shared/config/buildFlags.ts
src/shared/config/demoRun.ts
src/shared/config/env.test.ts
src/shared/config/env.ts
src/shared/config/zodJitless.test.ts
src/shared/config/zodJitless.ts
src/shared/fixtures/highlight.patch.ts
src/shared/fixtures/sample.patch.ts
src/shared/lib/safeHttpUrl.test.ts
src/shared/lib/safeHttpUrl.ts
src/shared/ui/CodeBlock/CodeBlock.module.css
src/shared/ui/CodeBlock/CodeBlock.stories.tsx
src/shared/ui/CodeBlock/CodeBlock.test.tsx
src/shared/ui/CodeBlock/CodeBlock.tsx
src/shared/ui/DataTable/DataTable.module.css
src/shared/ui/DataTable/DataTable.stories.tsx
src/shared/ui/DataTable/DataTable.test.tsx
src/shared/ui/DataTable/DataTable.tsx
src/shared/ui/Logo/Logo.stories.tsx
src/shared/ui/Logo/Logo.test.tsx
src/shared/ui/Logo/Logo.tsx
src/shared/ui/NavMenu/NavMenu.module.css
src/shared/ui/NavMenu/NavMenu.stories.tsx
src/shared/ui/NavMenu/NavMenu.test.tsx
src/shared/ui/NavMenu/NavMenu.tsx
src/shared/ui/PageHeader/PageHeader.module.css
src/shared/ui/PageHeader/PageHeader.stories.tsx
src/shared/ui/PageHeader/PageHeader.test.tsx
src/shared/ui/PageHeader/PageHeader.tsx
src/shared/ui/ProgressSteps/ProgressSteps.module.css
src/shared/ui/ProgressSteps/ProgressSteps.stories.tsx
src/shared/ui/ProgressSteps/ProgressSteps.test.tsx
src/shared/ui/ProgressSteps/ProgressSteps.tsx
src/shared/ui/RowButton/RowButton.module.css
src/shared/ui/RowButton/RowButton.stories.tsx
src/shared/ui/RowButton/RowButton.test.tsx
src/shared/ui/RowButton/RowButton.tsx
src/shared/ui/Spinner/Spinner.module.css
src/shared/ui/Spinner/Spinner.stories.tsx
src/shared/ui/Spinner/Spinner.test.tsx
src/shared/ui/Spinner/Spinner.tsx
src/shared/ui/Tag/Tag.module.css
src/shared/ui/Tag/Tag.stories.tsx
src/shared/ui/Tag/Tag.test.tsx
src/shared/ui/Tag/Tag.tsx
src/shared/ui/TraceTree/TraceTree.module.css
src/shared/ui/TraceTree/TraceTree.stories.tsx
src/shared/ui/TraceTree/TraceTree.test.tsx
src/shared/ui/TraceTree/TraceTree.tsx
src/shared/ui/docs/Overview.module.css
src/shared/ui/docs/Overview.stories.tsx
src/shared/ui/docs/Spec.mdx
src/shared/ui/docs/specText.ts
src/shared/ui/icons/icons.stories.tsx
src/shared/ui/icons/icons.tsx
src/shared/ui/index.ts
src/shared/ui/lib/cx.ts
src/shared/ui/stories/Button.stories.tsx
src/shared/ui/stories/Checkbox.stories.tsx
src/shared/ui/stories/Content.stories.tsx
src/shared/ui/stories/Data.stories.tsx
src/shared/ui/stories/Dropdown.stories.tsx
src/shared/ui/stories/Feedback.stories.tsx
src/shared/ui/stories/Form.stories.tsx
src/shared/ui/stories/Input.stories.tsx
src/shared/ui/stories/Layout.stories.tsx
src/shared/ui/stories/Modal.stories.tsx
src/shared/ui/stories/Segmented.stories.tsx
src/shared/ui/stories/Select.stories.tsx
src/shared/ui/stories/Switch.stories.tsx
src/shared/ui/styles/antd.css
src/shared/ui/styles/antd.form.test.tsx
src/shared/ui/styles/antd.input.test.tsx
src/shared/ui/styles/antd.select.test.tsx
src/shared/ui/styles/antd.steps.test.tsx
src/shared/ui/styles/tokens.css
src/shared/ui/theme/DesignSystemProvider.test.tsx
src/shared/ui/theme/DesignSystemProvider.tsx
src/shared/ui/theme/buildTheme.test.ts
src/shared/ui/theme/buildTheme.ts
src/shared/ui/theme/palette.ts
src/test/responsiveSelectLayout.ts
src/test/setup.ts
src/vite-env.d.ts
src/widgets/app-layout/index.ts
src/widgets/app-layout/ui/AppLayout.module.css
src/widgets/app-layout/ui/AppLayout.test.tsx
src/widgets/app-layout/ui/AppLayout.tsx
src/widgets/app-layout/ui/AppSidebar.test.tsx
src/widgets/app-layout/ui/AppSidebar.tsx
src/widgets/diff-viewer/index.ts
src/widgets/diff-viewer/lib/contextChunkSize.test.ts
src/widgets/diff-viewer/lib/contextChunkSize.ts
src/widgets/diff-viewer/lib/diffTheme.test.ts
src/widgets/diff-viewer/lib/diffTheme.ts
src/widgets/diff-viewer/lib/findingCardKey.ts
src/widgets/diff-viewer/lib/mergeFindings.test.ts
src/widgets/diff-viewer/lib/mergeFindings.ts
src/widgets/diff-viewer/lib/refractorForDiffView.test.ts
src/widgets/diff-viewer/lib/refractorForDiffView.ts
src/widgets/diff-viewer/lib/tokensForHunks.test.ts
src/widgets/diff-viewer/lib/tokensForHunks.ts
src/widgets/diff-viewer/model/store.ts
src/widgets/diff-viewer/model/types.ts
src/widgets/diff-viewer/ui/DiffSuggestion.test.tsx
src/widgets/diff-viewer/ui/DiffSuggestion.tsx
src/widgets/diff-viewer/ui/DiffViewer.test.tsx
src/widgets/diff-viewer/ui/DiffViewer.theme.test.tsx
src/widgets/diff-viewer/ui/DiffViewer.tsx
src/widgets/diff-viewer/ui/InlineComment.test.tsx
src/widgets/diff-viewer/ui/InlineComment.tsx
src/widgets/diff-viewer/ui/LoadMoreContext.tsx
src/widgets/diff-viewer/ui/RunDiff.filters.test.tsx
src/widgets/diff-viewer/ui/RunDiff.test.tsx
src/widgets/diff-viewer/ui/RunDiff.tsx
src/widgets/diff-viewer/ui/diff-layout.css
src/widgets/diff-viewer/ui/diff-theme.css
src/widgets/repository-list/index.ts
src/widgets/repository-list/ui/RepositoryList.module.css
src/widgets/repository-list/ui/RepositoryList.test.tsx
src/widgets/repository-list/ui/RepositoryList.tsx
src/widgets/repository-rules/index.ts
src/widgets/repository-rules/lib/rulesStatusView.test.ts
src/widgets/repository-rules/lib/rulesStatusView.ts
src/widgets/repository-rules/ui/RulesStatusDetails.tsx
src/widgets/repository-rules/ui/RulesStatusPanel.module.css
src/widgets/repository-rules/ui/RulesStatusPanel.test.tsx
src/widgets/repository-rules/ui/RulesStatusPanel.tsx
src/widgets/run-inspector/index.ts
src/widgets/run-inspector/lib/format.ts
src/widgets/run-inspector/model/store.ts
src/widgets/run-inspector/ui/ActionTree.module.css
src/widgets/run-inspector/ui/ActionTree.tsx
src/widgets/run-inspector/ui/RunControls.test.tsx
src/widgets/run-inspector/ui/RunControls.tsx
src/widgets/run-inspector/ui/RunHeader.test.tsx
src/widgets/run-inspector/ui/RunHeader.tsx
src/widgets/run-inspector/ui/RunInspector.module.css
src/widgets/run-inspector/ui/RunInspector.test.tsx
src/widgets/run-inspector/ui/RunInspector.tsx
src/widgets/run-inspector/ui/RunProgressBar.test.tsx
src/widgets/run-inspector/ui/RunProgressBar.tsx
```

**Ф-1.** FSD вместо Clean Architecture. Лектор курса называет FSD «фронтенд-реализацией чистой
архитектуры»: отдельно данные, отдельно сервисы, отдельно интерфейсы
(`base/prerecorded/architecture/zvonok-arkhitektura-servisov-06af8d40.md:71-76`). Это не
альтернатива, а специализация идей Clean Architecture под UI — противопоставление «FSD или Clean»
ложно. Порты/адаптеры Clean Architecture в чистом виде избыточны для UI-клиента без доменной
логики: у нас нет бизнес-правил, которые нужно защищать от фреймворка. Единственный адаптер,
который мы всё же держим осознанно, — граница diff-библиотеки: `fromPatch`/`toHunks` в
`src/entities/diff/lib/` изолируют `react-diff-view` так, что замена библиотеки — это замена
одного адаптера, а не переписывание виджета (`src/widgets/diff-viewer/ui/DiffViewer.tsx` работает
только с типом `FileDiff`, откуда бы он ни пришёл).

---

## 2. Состояние

| Данное                                | Где живёт                                                                                                                  | Инвалидация                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Список прогонов                       | TanStack Query, `useInfiniteQuery`, ключ `['runs', 'list', { repo }]`, страница — 20 (`RUN_LIST_PAGE_SIZE`)                | `staleTime: 30s` + `run.updated` (по префиксу)     |
| Прогон (детали)                       | TanStack Query, ключ `['runs', id]`                                                                                        | `run.updated` для этого `runId`                    |
| Действия прогона                      | TanStack Query, ключ `['runs', id, 'actions']`                                                                             | `run.updated` + опрос 3 с, пока прогон активен     |
| Дифф прогона                          | TanStack Query, ключ `['runs', id, 'diff']`                                                                                | `run.updated` / SSE (Refs ui#65)                   |
| Комментарии ревью                     | TanStack Query, ключ `['runs', id, 'comments']`                                                                            | вместе с прогоном                                  |
| Событие шага пайплайна                | нет: события шага в api пока нет (api#97); ход прогона виден по опросу `/actions`                                          | —                                                  |
| Дочитанные срезы файла                | `useState` на `RunDetailPage` (слияние в `FileDiff`); ключ Query `diffQueryKeys.fileSlice` зарезервирован, не используется | не инвалидируется (append-only, живёт с страницей) |
| `viewType` (unified/split)            | Zustand, `widgets/diff-viewer/model/store.ts`                                                                              | — (UI-состояние, не сервер)                        |
| `selectedFile` (diff-viewer)          | Zustand, `widgets/diff-viewer/model/store.ts`                                                                              | —                                                  |
| `expandedKeys`, `selectedActionIndex` | Zustand, `widgets/run-inspector/model/store.ts`                                                                            | —                                                  |
| Фильтры замечаний                     | URL search params `file`, `severity` (повторяются), `q`; хук `useFindingFiltersParams` (`features/finding-filters`)        | — (источник — URL; другой прогон начинает чисто)   |
| Фильтр истории прогонов               | URL search param `repo` (одно значение); хук `useRunListFilterParams` (`features/run-list-filter`)                         | — (источник — URL)                                 |
| Репозитории                           | TanStack Query, ключ `['repos']` (`useRepositories`; `useRepository(id)` — тот же ключ + `select`)                         | фокус окна и открытие (`'always'`) + мутация       |
| Статус `.review/rules.md`             | TanStack Query, ключ `['repoRulesStatus', id]` — вне `['repos']` (ниже); запрос только на моках                            | открытие (`'always'`), `gcTime: 0`, «Обновить»     |
| Черновик настроек репозитория         | `useState` в `RepositorySettingsForm`: снимок на открытии (baseline) и правки пользователя, не копия кэша                  | — (живёт с формой; `key={repoId}`, `resetTo`)      |
| Черновики комментариев                | —                                                                                                                          | future (не реализовано в этом спринте)             |

**Состояние в URL.** Вид, которым делятся ссылкой, живёт в `location.search`, а не в сторе. Сейчас
это фильтры замечаний страницы прогона (§6): `file` (повторяется), `severity` (повторяется;
`critical` / `warning` / `info` — группы D3) и `q` (один), — и фильтр истории прогонов `repo` на
`/runs` (ниже, «Фильтр истории прогонов»). Правила фильтров замечаний:

- Zod на входе. `parseFindingFilters(params)` (`features/finding-filters/model/findingFilters.ts`)
  проверяет каждое значение отдельно и молча отбрасывает негодное: `file` — непустая строка до 1024
  символов, `severity` — одна из трёх групп, `q` — первое значение, обрезается до 200 символов;
  повторы убираются, `severity` идёт в каноническом порядке групп. Парсер не бросает, поэтому
  произвольный URL (в том числе с битым `%`-кодированием) не роняет рендер.
- Санитайзинг только при чтении, обратно в URL не пишется. `file=` с файлом, которого нет в прогоне
  (или `/diff` ещё грузится), остаётся в строке адреса: при чтении его отсекает
  `effectiveFileFilter` (пересечение с файлами прогона; пустое пересечение — фильтра нет). Иначе
  ссылка с `file=` теряла бы файл, пока грузится `/diff`. Мусор (`severity=bogus`, пустой `file=`) не
  применяется, но и не вычищается из адреса: URL переписывает только действие пользователя. Первое
  же изменение пересобирает `file` / `severity` / `q` из разобранных значений (мусор уходит),
  остальные параметры сохраняются (`writeFindingFilters`).
- Выбор в селектах и сброс — `push` (новая запись истории, «назад» возвращает прежние фильтры).
  Селектор шлёт только свои поля и набранный текст (`FindingFiltersChange`), а `setFilters` сливает
  их поверх URL, записанного хуком последним: два выбора подряд до коммита сохраняют оба.
- Поиск — отдельный случай: текст живёт в локальном состоянии поля (`useQueryText`), а в URL `q`
  пишется с паузой 250 мс после последнего символа и с `replace` — набор текста не засоряет историю.
  Привязывать поле прямо к `location.search` нельзя: react-router 8.4 фиксирует состояние роутера
  внутри `React.startTransition`, и пока переход не закоммичен, React возвращает в controlled-поле
  старое значение — быстрые символы пропадают, каретка прыгает в конец (замечено в браузере и
  ревью; `flushSync` не взяли: на большом диффе рендер страницы стал бы задержкой нажатия клавиши).
  Отложенная запись трогает только `q` (`setQuery`), остальные параметры сохраняются. Выбор в
  селекторе при ещё не записанном тексте несёт этот текст в свою же навигацию, а таймер отменяется;
  сброс очищает поле и отменяет запись; размонтирование поля отменяет таймер (когда оно уже
  закоммичено — см. «Ограничение» ниже).
  Поле подтягивает `q` из URL, когда он стал значением, которого поле не писало («назад» /
  «вперёд», сброс, ссылка); когда URL догоняет то, что уже набрано, поле не трогается, иначе пауза
  вернула бы потерю символов. Длина текста ограничена полем (`maxLength` = 200, как и обрезка при
  чтении).
- Навигация не от хука сбрасывает набранное. Если закоммиченный адрес сменился (`location.key`) не
  записью самого `useFindingFiltersParams` — это «назад» / «вперёд» (`useNavigationType() === 'POP'`)
  либо PUSH / REPLACE на search, которого хук не писал (ссылка, другой компонент), — хук меняет
  `navigationKey`, а поле отменяет таймер и показывает `q` нового адреса, даже если сам `q` тот же.
  Иначе набор, начатый перед «назад» на запись, что отличается только селектом, через паузу
  записался бы поверх неё. Свои записи (`q` по паузе, селекты, сброс) хук запоминает по search и
  ключ не меняет; следующая запись после чужой навигации строится уже на ней. Только публичный API
  react-router: `useLocation`, `useNavigationType`.
- Другой прогон начинает с чистых фильтров: содержимое `RunDetailPage` ключуется `runId`, а
  `/runs/<другой>` приходит без query. Отфильтрованный URL переживает вход: `ProtectedLayout`
  сохраняет `pathname + search` в `returnTo`, редирект на `/login` и возврат из OAuth приводят на тот
  же адрес (`app/layouts/ProtectedLayout.returnTo.test.tsx`).
- react-router 8.4: `setSearchParams((prev) => …, { replace })` отдаёт апдейтеру копию параметров
  последнего _отрисованного_ URL и, в отличие от `setState`, не ставит вызовы в очередь — два вызова
  в одном такте строятся на одном `prev`, а пока переход не закоммичен, `prev` устарел. Поэтому
  `useFindingFiltersParams` не опирается на `prev`: он строит следующий URL поверх того, что сам
  записал последним (`ref`, синхронизируется с `location.search` после коммита), и отложенная запись
  `q` не откатывает выбор в селекторе, который ещё не дошёл до экрана.

**Ограничение.** Пока роутер уже перешёл, а React ещё не закоммитил (большой дифф, первая загрузка
lazy-страницы), отложенная запись `q` (до 250 мс после последнего символа) или нажатие клавиши
строятся на старой базе: запись может дописать `?q=` в открываемую страницу или откатить «назад»,
который ещё коммитится. Закрыть окно можно только подпиской на роутер (внутренний
`UNSAFE_DataRouterContext`); владелец решил брать только публичный API, поэтому окно описано, а не
закрыто. Задача: #86.

**Фильтр истории прогонов (Refs ui#93).** `/runs?repo=<owner/name>` показывает прогоны одного
репозитория; ссылку «История проверок» на странице настроек строит
`runListHref({ repo: repository.fullName })` (§9). Правила те же, что у фильтров замечаний, в меньшем
объёме:

- Zod на входе. `parseRunListFilter(params)` (`features/run-list-filter/model/runListFilter.ts`)
  берёт первое значение `repo` и проверяет его `z.string().min(1).max(512)` — теми же границами, что
  `RunListQuerySchema.repo`, поэтому принятое значение всегда уходит в запрос. Пустое, слишком
  длинное или отсутствующее значение — «без фильтра»; парсер не бросает.
- Санитайзинг только при чтении, адрес не переписывается. `writeRunListFilter(prev, next)` меняет
  только `repo`, остальные параметры сохраняются. «Сбросить фильтр» и «Показать все прогоны» —
  навигация `push` (`resetFilter` из `useRunListFilterParams`): «назад» возвращает фильтр.
- Запрос. `useRunList({ repo })` — `useInfiniteQuery` с ключом `runQueryKeys.listFiltered({ repo })`
  = `['runs', 'list', { repo: repo ?? null }]`, `initialPageParam: null`,
  `getNextPageParam: (page) => page.nextCursor`, `limit` = `RUN_LIST_PAGE_SIZE` (20) в каждом
  запросе, `maxPages` нет. Путь с query собирает `runListEndpoint(query)` в `entities/run/api` после
  `RunListQuerySchema.parse` (пустые параметры опускаются); `endpoints.runs.list()` остаётся путём
  без query.
- Инвалидация. `runQueryKeys.list()` = `['runs', 'list']` остаётся префиксом всех списков:
  `invalidateQueries` из `applyRunUpdated`, `useCancelRun` и `useRerunRun` достаёт и отфильтрованные
  списки. Бесконечный список при инвалидации перезапрашивает все загруженные страницы по очереди,
  с первой (поведение `useInfiniteQuery` в TanStack Query 5): две загруженные страницы — два запроса
  на одно `run.updated`. Повторная инвалидация после переподключения SSE ключи списков по-прежнему
  пропускает: `cachedRunIds` не считает сегмент `'list'` id прогона.
- `RunsPage`. Строки — все загруженные страницы без повторов по `id` (`useMemo`; прогон может
  прийти дважды, если список сдвинулся между запросами). Активный фильтр — в описании страницы и
  outline-`Tag` с кнопкой «Сбросить фильтр». Пусто под фильтром — «Для репозитория X прогонов ещё
  нет» и «Показать все прогоны», без фильтра — по-прежнему «Нет прогонов ревью». «Показать ещё»
  видна, пока `hasNextPage`. Ошибка следующей страницы (`isFetchNextPageError`) оставляет
  загруженные строки и показывает `Alert` с «Повторить»; ошибкой загрузки списка она не считается.
- Фокус. Кнопки, которыми пользовались, исчезают (последняя страница, сброшенный фильтр, заменённое
  пустое состояние), и фокус уходил бы на `<body>`. После «Показать ещё» (и после «Повторить» у
  упавшей страницы) фокус получает ссылка на PR первой новой строки: `loadMore` запоминает `id`
  показанных прогонов до запроса, а `useEffect` по `runSessions` фокусирует ссылку первой строки,
  которой в этом наборе нет. Страница и конец `fetchNextPage` доходят до React в любом порядке, от
  порядка фокус не зависит. Пометка одноразовая и снимается, когда нового нет (ошибка, страница из
  уже показанных прогонов), поэтому позднее обновление страниц фокус не забирает. Упавшая страница
  убирает «Показать ещё» и показывает `Alert`: если у кнопки был фокус, его получает «Повторить»
  (`loadMore` отмечает это до запроса, `useEffect` по `isFetchNextPageError` переносит фокус, когда
  кнопка уже на экране); упавший повтор оставляет фокус на своей кнопке. Последняя страница без
  новой строки (пустая или из уже показанных прогонов) убирает кнопку, и фокусировать нечего:
  заголовок «Прогоны» получает фокус тем же путём, что после сброса. Повтор, который не принёс
  новой строки, но оставил следующую страницу, убирает `Alert` вместе с «Повторить», а «Показать
  ещё» возвращается новой кнопкой: фокус получает она (`moreRef`; страница и кнопка доходят до
  React в любом порядке, поэтому `moreTakesFocus` проверяется и в `loadMore`, и в `useEffect`).
  Если «Показать ещё» сама запросила страницу без новой строки и с остатком, её узел остаётся на
  месте, и фокус остаётся на нём. Эти три переноса условны: фокус переносится, только если им
  владела кнопка, запросившая страницу, и пользователь за время запроса никуда не ушёл; условие у
  каждого своё (`RunsPage.tsx`, `loadMore` и эффекты): «Повторить» получает фокус, только если он
  на `<body>` (запросившая кнопка уже убрана); заголовок — если фокус на кнопке, запросившей
  страницу, или на `<body>`; «Показать ещё» после повтора — только на `<body>`. Перенос на первую
  новую строку и на заголовок после сброса от этого не зависят. После «Сбросить фильтр» и «Показать все прогоны» фокус получает
  заголовок «Прогоны»: `PageHeader` с необязательным `titleRef` отдаёт `<h1>` и ставит ему
  `tabIndex={-1}` (фокус из кода, не остановка Tab). Сброс снимает и пометку: страница, которую
  «Показать ещё» запросил до сброса, фокус с заголовка не уводит. На `:focus-visible` у заголовка кольцо DESIGN_SYSTEM §7 (2px `--rv-link`,
  отступ 2px); селектор `.title[tabindex]:focus-visible` специфичнее сброса antd
  `[tabindex='-1']:focus`, поэтому порядок таблиц стилей не важен, вёрстка не сдвигается.

**Настройки репозитория и статус правил (Refs ui#93).** Страница `/repositories/:repoId/settings`
(§9) заменила модальное окно настроек в `RepositoryList`.

- Данные — `useRepository(id)` (`entities/repository/api`): `useQuery` с ключом списка `['repos']`,
  тем же `queryFn` и `refetchOnWindowFocus: 'always'`, что у `useRepositories`, плюс
  `refetchOnMount: 'always'` и `select: (list) => list.find(…)`. Своего ключа `['repos', id]` нет:
  `useUpdateRepository` пишет точный ключ `['repos']` (оптимистичное обновление, откат, ответ
  сервера), и запрос по отдельному ключу после сохранения показывал бы старые значения.
  `data === undefined` — это и «грузится», и «в списке такого нет»; различает их `isPending`.
- Форма монтируется только после загрузки репозитория и берёт значения один раз
  (`useState(() => toFormValues(repository))`): фоновые перезапросы, оптимистичное обновление и
  откат до полей не доходят. Чтобы значения были актуальными (AC1), страница ждёт запрос, который
  отправило само открытие (`refetchOnMount: 'always'`; при `staleTime` 30 с кэш списка иначе
  считался бы свежим): пока он идёт, показан `Skeleton`, а не значения из кэша. Ожидание кончается
  один раз (`openingRequestDone` в `RepositorySettingsPage`, по `!isFetching`) и не возвращается:
  перезапрос списка после сохранения форму не размонтирует. Приостановленный запрос ожидание тоже
  кончает — форма открывается со значениями из кэша. Упавший — тоже, и над формой появляется
  предупреждение `Alert` «Не удалось обновить настройки. Показаны значения, загруженные ранее.» с
  кнопкой «Повторить попытку» (`notice === 'stale'`: ставится вместе с концом ожидания, если запрос
  кончился ошибкой; сбой после открытия страницы уведомления не показывает). Повтор — `refetch`.
  Снимает предупреждение первый же ответ без ошибки, чей бы он ни был — повтор, возвращение в окно,
  перезапрос после сохранения, и ответ на само успешное сохранение (`handleSave`); решает, что с
  формой, `useEffect` страницы, уже после ответа, а не в момент клика (за время запроса пользователь
  мог набрать), и ждёт, пока идёт сохранение: оптимистичная копия патча в кэше — не ответ сервера.
  Что сохранение идёт, говорит `useIsMutating` по ключу мутации обновления
  (`UPDATE_REPOSITORY_MUTATION_KEY`): он считает сохранение формы и переключатель авто-ревью вместе,
  а `isPending` хука видел бы только последнюю мутацию. Три случая (решение D11):
  правок нет — форма берёт свежие значения на месте (`RepositorySettingsFormHandle.resetTo`:
  `setFields` и новый baseline, без перемонтирования, поэтому поле с фокусом его не теряет), и
  предупреждение уходит; правки есть, а свежие значения отличаются от baseline (поле за полем,
  `differsFromBaseline`) — правки остаются как набраны, baseline прежний (в PATCH уйдёт только
  набранное), а предупреждение заменяет `Alert` `type="info"` «На сервере сохранены другие значения.
  В форме — ваши правки поверх загруженных ранее.» с кнопкой «Загрузить значения с сервера» (под
  текстом, не в слоте `action`: узкий экран схлопнул бы текст); правки есть, а свежие значения равны
  baseline — предупреждение просто уходит. Правкой считается всё набранное, включая опустошённое или
  ещё невалидное поле (`hasDraftChanges` сравнивает сырые значения из хранилища формы с baseline, а
  не спрашивает, ушёл бы PATCH). Кнопка «Загрузить значения с сервера» и «Отменить изменения» в этом
  состоянии (`onCancel` формы) кладут в поля последние значения сервера (`resetTo`), а не прежний
  baseline, и закрывают уведомление; оно же уходит после успешного сохранения и не пересчитывается
  последующими перезапросами. Пока идёт сохранение, кнопка «Загрузить значения с сервера» недоступна
  (`disabled` под тем же `saving`): иначе в форму попала бы оптимистичная копия патча, и упавшее
  сохранение оставило бы в ней значения, которых нет на сервере. «Отменить изменения» этим не
  держится: форма сама блокирует её на время своего сохранения, а оптимистичная копия переключателя
  авто-ревью полей формы не трогает. Фокус переходит, только когда уходит элемент, на котором он был:
  у кнопки «Повторить попытку» — в первое поле («Ожидание CI», `focusFirstField`) или, если её
  заменило уведомление о других значениях, на «Загрузить значения с сервера»; с этой кнопки и с
  «Отменить изменения» — в первое поле. Момент ухода кнопки видит `ref`-колбэк (`trackNoticeRetry`):
  в нём `activeElement` ещё на ней; если фокус уже у пользователя в другом месте, он остаётся там.
  Упавший повтор оставляет предупреждение и фокус на кнопке. Содержимое страницы ключуется `repoId`
  (как `RunDetailPage`), поэтому другой репозиторий — новая форма и чистое локальное состояние.
- Patch. `buildSettingsPatch(baseline, values)` (`features/repository-settings/lib/settingsPatch.ts`)
  сравнивает поля с baseline — тем, с чем форма открылась, а после успешного сохранения — с ответом
  сервера; маски веток — поэлементно, после очистки текста. После успешного сохранения каждое поле,
  которое всё ещё равно отправленному (`applySavedValues`, сырое сравнение), берёт значение из ответа
  (поле, показывавшее старое значение, получает свежее, и «Сохранить» не предложит затереть его), а
  поле, изменённое за время запроса, сохраняет набранное. Уходят только изменённые поля;
  `defaultEngine` — текст с подсказкой о фазе 3 и в PATCH не попадает. «Сохранить» (единственная
  primary-кнопка страницы) неактивна, пока изменений нет; «Отменить изменения» —
  `setFieldsValue(baseline)`. Любая ошибка сохранения оставляет введённые значения. Фокус: после
  успешного сохранения и после «Отменить изменения» обе кнопки становятся неактивными, поэтому фокус
  уходит в первое поле формы («Ожидание CI», `form.focusField`); после неудачного сохранения
  «Сохранить» остаётся активной и сохраняет фокус.
- Автоматическое ревью — `AutoReviewSwitch` над формой: применяется сразу отдельным
  `PATCH { enabled }` ([`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) §8: `Switch` применяется сразу),
  ошибка — `Alert` под переключателем; оптимистичное обновление и откат — в `useUpdateRepository`.
  Форма `enabled` не отправляет. Переключатель показывает значение сервера — итог
  `enabled AND installationAvailable` (§5). Пока у GitHub App нет доступа
  (`installationAvailable === false`), сохранённую настройку `GET` не возвращает, и UI её не
  показывает (решение D9): переключатель выключен и недоступен (`disabled`), а выбор делают две
  кнопки под текстом предупреждения «Автоматическое ревью недоступно» (у GitHub App нет доступа,
  поэтому ревью не запустится; не в слоте `action` у `Alert`: рядом с кнопками заголовок и текст
  схлопываются): «Включить авто-ревью» — `PATCH { enabled: true }`, «Оставить выключенным» —
  `PATCH { enabled: false }`. Подписи и тексты сообщений — в
  `features/repository-settings/lib/autoReviewChoice.ts`. Ответ на такой `PATCH` с
  `installationAvailable: false` (при любом значении `enabled`) — `message.info` «Выбор сохранён.
  Авто-ревью включится, когда доступ к GitHub App восстановится.» для `true` и «Выбор сохранён.
  Авто-ревью останется выключенным, когда доступ к GitHub App восстановится.» для `false` вместо
  «Автоматическое ревью включено» / «выключено»; ошибки нет. Остальные `PATCH` дают прежние
  сообщения. Пока `PATCH` идёт, переключатель (или обе кнопки, нажатая в `loading`) недоступен и
  браузер уводит с него фокус: после ответа фокус возвращается на нажатый элемент, если он был у него
  в момент клика и пользователь не ушёл дальше. Если рефетч вернул доступ и фокус был у кнопки
  выбора, предупреждение исчезает, и фокус получает переключатель.
  Список репозиториев (`widgets/repository-list`) делает то же для строки без доступа (решение D10):
  переключатель выключен и недоступен, вместо «Пауза» — «Нет доступа», а два выбора лежат в меню
  кнопки «Выбрать» с `DownOutlined` (`Dropdown`; короткий текст держит колонку «Статус» узкой, а
  `aria-label` начинается с него), пока строка сохраняется, кнопка в `loading`. Если фокус был у
  кнопки до открытия меню, при выборе пункта он сразу переходит на неё (пункт держит его, пока меню
  закрывается, и быстрый ответ успел бы кончиться раньше); выбор по Enter отменяет `keydown` пункта,
  иначе `keypress` того же нажатия попал бы на кнопку с уже перешедшим фокусом и снова открыл бы
  меню. Если рефетч вернул доступ, а фокус был у кнопки, его получает переключатель строки. `RepositoriesPage` отвечает тем же `message.info`.
- Ошибка сохранения раскладывается `splitServerError`
  (`features/repository-settings/lib/serverFieldErrors.ts`): 422 с `detail[].loc` на поле формы —
  текст под этим полем, остальное — `Alert` над формой (§5, «Контракт api#149 (api PR #156)»). Ошибка
  поля снимается, когда пользователь меняет это поле (`onValuesChange`).
- Статус правил — `useRepositoryRulesStatus(repoId, { enabled })`, ключ
  `['repoRulesStatus', repoId]` (`repoRulesStatusQueryKey`). Ключ **не** под `['repos']`: мутация
  настроек делает `cancelQueries` и `invalidateQueries` по префиксу `['repos']` и отменяла бы и
  перезапрашивала статус правил на каждом сохранении. `refetchOnMount: 'always'` — каждое открытие
  страницы спрашивает заново, а `gcTime: 0` убирает ответ из кэша, когда его перестают показывать:
  повторное открытие начинается со `Skeleton`, старый sha не виден, пока не пришёл свежий ответ. У
  каждого `repoId` свой ключ и нет `placeholderData`, поэтому ответ другого репозитория, в том числе запоздавший, не показывается.
  «Обновить» — `refetch` (обычная кнопка, не primary); она стоит в любом состоянии включённого
  блока, в том числе при ошибке загрузки и `unavailable`, поэтому неудачное обновление не убирает
  кнопку с фокусом. «Повторить» (ошибка загрузки; `unavailable` с `retryable`) исчезает, когда
  повтор удался: если у неё был фокус, его получает «Обновить» (эффект по `isFetching`, `status`,
  `dataUpdatedAt` и `errorUpdatedAt` — быстрый ответ может дойти до страницы без `isFetching`);
  упавший повтор оставляет фокус на своей кнопке. «Повторить» ошибки загрузки может убрать и
  перезапрос, который она не запускала (возвращение в окно, инвалидация): `ref`-колбэк
  (`trackErrorRetry`) видит в момент ухода кнопки, что фокус на ней, и «Обновить» получает его
  тем же эффектом; если фокус у пользователя в другом месте, он остаётся там (у `unavailable`
  перенос только после клика по своей кнопке). Запрос
  включён только на моках: `enabled = mocksEnabledAtRuntime(isMockMode)` — тот же гейт, что у пункта
  `/review` в `AppSidebar`; вне моков блок показывает одну строку и в сеть не ходит (§5).

TanStack Query — не замена Zustand, а дополнение: серверный кэш и клиентский UI-стейт разнесены
по разным сторонам (issue AC явно требует эту формулировку). Стор Zustand живёт в виджете, а не в
`shared` — UI-состояние принадлежит домену виджета, `shared` о нём не знает (план, D17).

SSE-мост (Ф-14, **реализовано**; Refs ui#65): `RunStreamBridge` внутри `QueryProvider` вызывает
`useRunStreamSubscription` → `runStreamConnect.ts`: `fetch(API_BASE_URL + '/stream')` с
`Authorization: Bearer <accessToken>`, разбор кадров `event:`/`data:` (`runStreamParse.ts`); на
`run.updated` — `applyRunUpdated(event)` (`runStreamConnect.ts`): `invalidateQueries` для `['runs', runId]`,
`['runs', runId, 'actions']`, `['runs', runId, 'diff']` и `['runs', runId, 'comments']` (дифф и комментарии
подтягиваются вместе с прогоном) и для списка `['runs', 'list']` (колонка «Статус» на `/runs` обновляется без
перезагрузки; Refs ui#84). Кадры с другим `event:` (в том числе будущее событие шага) отбрасываются без инвалидации.
`EventSource` не используется (нет Bearer). `401` — refresh с лимитом повторов
(`MAX_STREAM_401_RETRIES`), затем переподключение с backoff (`STREAM_RECONNECT_DELAY_MS`); refresh
не удался — подписка прекращается (fail closed, §11). Keep-alive (`: keepalive` раз в 15 с,
`STREAM_KEEPALIVE_INTERVAL_MS`) ничего не инвалидирует. При переподключении клиент шлёт
`Last-Event-ID` (последний `id:`, непрозрачная строка; пока `id` не было — без заголовка), а после
каждого успешного подключения, кроме самой первой попытки подписки (неудачная попытка тоже
считается: страница уже загрузила данные, а поток был недоступен; refresh-повтор после `401` — та
же попытка), заново инвалидирует те же четыре ключа для каждого прогона с запросами в кэше (не
префикс `['runs']`; список не трогает — он обновится со следующим `run.updated` или при открытии страницы после `staleTime`). Watchdog: после первого
keep-alive тишина дольше двух интервалов (30 с) обрывает соединение и ведёт к обычному
переподключению; api без keep-alive watchdog не включает. В mock-режиме поток не открывается
(`useRunStreamSubscription` выходит сразу); `run.updated` там имитирует `startMockRunEvents` (§8), который
зовёт тот же `applyRunUpdated`. Контракт run session для api#20:
[комментарий в api#20](https://github.com/larchanka-training/dmc-268-api-t6/issues/20#issuecomment-6016069919).

Опрос действий (Refs ui#84): `useRunActions(runId, status)` ставит `refetchInterval: RUN_ACTIONS_POLL_MS`
(3000 мс, `entities/run/api/index.ts` — единственное место) только пока `isActive(status)`
(`queued`/`running`/`publishing`); статус `RunDetailPage` берёт из `useRunDetail`. Пока деталь не загружена
и на терминальном статусе (`succeeded`/`failed`/`cancelled`/`skipped`) опроса нет: журнал
терминального прогона больше не меняется. Что важно знать:

- Ключ деталей `['runs', id]` — префикс ключей `actions`, `diff` и `comments`. Любая инвалидация деталей
  (`run.updated`, `cancel`, `rerun`) заодно перезапрашивает `/actions`: смена статуса даёт один запрос
  сверх опроса. Четыре явных `invalidateQueries` в `applyRunUpdated` остаются — они фиксируют контракт
  и не зависят от формы ключей. Тесты опроса (`RunDetailPage.progress.test.tsx`) считают этот запрос.
- В фоновой вкладке опрос стоит. `refetchIntervalInBackground` нигде не задан (ни в `useRunActions`,
  ни в `queryClient.ts`), а в TanStack Query 5.103 тик интервала пропускается, когда
  `focusManager.isFocused()` ложно, то есть при `document.visibilityState === 'hidden'` (проверено по
  исходникам `query-core`). Окно без фокуса, но с видимой вкладкой, опрашивается. `refetchOnWindowFocus: false`, поэтому
  при возврате на вкладку журнал догоняет ближайший тик (до 3 с) или очередное `run.updated`; SSE-поток
  видимость вкладки не читает.
- Терминальный статус приходит событием `run.updated` → деталь → `status` → `refetchInterval: false`;
  последний журнал забирает та же инвалидация `actions`. Событие шага пайплайна появится с api#97; до
  его контракта прогресс обеспечивает опрос.

`QueryProvider` также регистрирует `setOnLogout` → `queryClient.clear()`. `UiProvider` — antd
`ConfigProvider` (русская локаль), без сети.

```mermaid
sequenceDiagram
  participant SSE as fetch(/api/stream)
  participant Bridge as RunStreamBridge
  participant QC as QueryClient
  participant UI as widgets

  SSE->>Bridge: run.updated { runId, status }
  Bridge->>QC: applyRunUpdated - invalidateQueries(['runs', runId], actions, diff, comments)
  Bridge->>QC: invalidateQueries(['runs', 'list'])
  QC->>QC: refetch активных запросов
  QC-->>UI: новые данные прогона и списка
```

---

## 3. UI-кит

**Ф-2.** UI-кит — **antd 6.6.4**.

Аргументы: `Tree`/`Collapse`/`Descriptions`/`Tag` закрывают инспектор прогонов без вёрстки с нуля
(см. `RunHeader.tsx`, `ActionTree.tsx`); peer `react ≥ 18` — без бампа React; библиотека
проверена в proof-run роли 5 под jsdom (2026-09-18, п. (d); лабораторный отчёт, в репозиторий не
входит); высокая узнаваемость —
ревьюер видит стандартные паттерны, а не самодельные компоненты.

Альтернатива — **Mantine 9.6.1** (peer `react ^19.2` — выполняется после бампа T10): не выбрана,
потому что antd закрывает `Tree`/`Collapse`/`Descriptions` из коробки, а на Mantine эти компоненты
пришлось бы вендорить самостоятельно.

Что теряем, выбирая antd вместо более лёгкой библиотеки:

| Теряем                        | Комментарий                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| Бандл-вес                     | antd крупнее headless-библиотек (Radix/Mantine core); для внутреннего инструмента приемлемо           |
| Свобода кастомизации разметки | компоненты antd навязывают DOM-структуру; кастом — через токены темы, не через переписывание разметки |
| Нейтральность к CSS-парадигме | antd тянет свою систему токенов/`css-in-js`; сосуществование с Tailwind потребует настройки           |

Подтверждено техлидом 2026-09-24 ([комментарий в #46][tl-2026-09-24-46]). Цена отката при
пересмотре — 29 нетестовых файлов с импортом `antd` (не считая 18 историй Storybook): 6 из них — сама
дизайн-система в `shared/ui`, остальные — `app`, страницы, виджеты и фичи; плюс стабы
`matchMedia`/`ResizeObserver` в `src/test/setup.ts` и ширина для чипов `Select` в
`src/test/responsiveSelectLayout.ts`. Тон тега статуса прогона задаёт `statusTone` в
`entities/run/lib/status.ts` для `Tag` дизайн-системы, цветов `Tag` из antd там больше нет.

**Ф-20.** Вид всех экранов задаёт дизайн-система Flat Console в `src/shared/ui`: тема antd
(`theme/buildTheme.ts`), CSS-токены (`styles/tokens.css`), правки поверх antd (`styles/antd.css`)
и свои компоненты
(`Tag`, `Spinner`, `PageHeader`, `DataTable`, `NavMenu`, `RowButton`, `TraceTree`, `ProgressSteps`,
`CodeBlock`, `Logo`). Всё включается одним `DesignSystemProvider`.
Числа, правила и чеклист для нового компонента antd: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
Витрина: `pnpm storybook`. Правило: базовые компоненты берутся только из antd в нашей теме и из
`src/shared/ui`; на экране их не перекрашивают. Вид компонента antd меняется только внутри
`src/shared/ui`; `:global(.ant-…)` в CSS-модуле экрана (Ф-13) остаётся только для раскладки:
внешний отступ, ширина, место в сетке.

**Ф-13.** Стилевая парадигма — **antd tokens для темизации + CSS Modules для layout**-контейнеров
(список/сетка/шапка); решение техлида 2026-09-24 ([комментарий в #46][tl-2026-09-24-46]).

- Тема (цвета, отступы, шрифты) — токены antd: единственная точка конфигурации — `ConfigProvider`
  в `UiProvider`, в компонентах — `theme.useToken()`.
- Layout — `*.module.css` рядом с компонентом; классы в camelCase (`styles.fileHeader`), классы antd
  переопределяются только через `:global(.ant-…)`. `stylelint.config.js` несёт override для
  `**/*.module.css`: camelCase, `ant-*` только внутри `:global(...)` (голый `.ant-btn` — ошибка
  линта), `:local`, `composes`; обычные `.css` остаются под kebab-case `stylelint-config-standard`.
- Цвета диффа и токенов подсветки — тоже токены antd; источник, переменные и причина обычного
  `.css` — §6 «Цвета диффа и подсветки».

Рассмотренные варианты:

- **CSS Modules** — плюсы: изоляция без рантайм-накладных, знакомо всей команде, не зависит от
  UI-кита; минусы: два источника стилей (модули + antd-токены), нет доступа к theme-переменным
  antd напрямую; риск: дублирование отступов/цветов вручную.
- **antd tokens / css-in-js (`ConfigProvider` + `useToken`)** — плюсы: один источник правды по
  цветам/отступам, тема меняется в одном месте; минусы: связывает вёрстку с antd (миграция с
  UI-кита дороже), css-in-js добавляет рантайм-стоимость; риск: неявная связность компонентов с
  темой.
- **Tailwind** — плюсы: скорость вёрстки, консистентность утилитами; минусы:
  `stylelint-config-standard` падает на `@theme`/`@apply`/`import-notation` (проверено
  2026-09-24), нужны плагин и новые зависимости; риск: двойная система стилизации поверх
  antd-классов. Не выбран.

---

## 4. Контракт данных

Источник истины для путей и форм HTTP — [`contracts/openapi.yaml`][openapi] в api (Ф-10, уточнено
2026-09-28). На клиенте тот же контракт проверяют Zod-схемы в
`src/entities/{run,diff,review,repository}/model/schemas.ts`; совпадение ответов API с ними проверяет
`tests/test_ui_zod_contracts.py` в api. Ниже — состав полей Zod (не полный код); объекты не
strict — `z.object` в Zod 4 по умолчанию отбрасывает неизвестные ключи, а не падает на них.

```ts
// entities/run — RunStatus: 7 значений, RunSession, RunAction, RunListPage
RunStatusSchema = enum(queued|running|publishing|succeeded|failed|cancelled|skipped)
RunSession = { id, engine: fast|deep, model, status, trigger: webhook|manual|rerun|dry_run,
  createdAt, startedAt, finishedAt, attempt, cancelRequested, summaryOnly,
  pullRequest: PullRequestRef, actionCount, errorCode }
RunAction = { id, runId, index, tool, request: unknown, response: unknown|null,
  responseRef, startedAt, durationMs }
RunListPage = { items: RunSession[], nextCursor }

// entities/diff — DiffLine, Chunk, FileDiff, RawFileDiff (wire), FileSlice
DiffLine = { type: context|added|removed, oldLine, newLine, content }
FileDiff = { filename, chunks: Chunk[], hasPatch }  // клиентская модель, единственный вход DiffViewer
RawFileDiff = { filename, patch: string|null }      // провод: GET /api/runs/{id}/diff

// entities/review
ReviewComment = { id, file, oldLine, newLine, endLine, body, ruleName,
  severity: critical|high|medium|low|info, category: security|correctness|performance|readability,
  title, createdAt }

// entities/repository — Repository, RepositoryUpdate (api#149, api PR #156), RulesStatus
// (provisional — ui#93, api#150); §5
RepositoryId = uuid                     // RepositoryIdSchema: Repository.id и :repoId в адресе
Repository = { id, fullName, url, defaultBranch, enabled, defaultEngine: fast,
  waitForCi: auto|always|never, maxComments: 1..10, reviewEvent: COMMENT|REQUEST_CHANGES,
  branchFilter: string(1..255)[≤20],
  severityThreshold: all|warning|critical,
  installationAvailable: boolean }      // только чтение
RepositoryUpdate = { enabled?, defaultEngine?, waitForCi?, maxComments?, reviewEvent?,
  branchFilter?, severityThreshold? }   // хотя бы одно поле; installationAvailable нет
RulesStatus = present | missing | invalid | unavailable   // provisional, discriminatedUnion('status')
RulesDiagnostic = { code, message, line: int|null, column: int|null, retryable,
  limit?, actual?, patternIndex? }
```

Инварианты (проверены тестами схем):

- `DiffLine`: `context` ⇒ `oldLine` и `newLine` оба не `null`; `added` ⇒ `oldLine = null`,
  `newLine` не `null`; `removed` ⇒ `newLine = null`, `oldLine` не `null`;
- `ReviewComment`: хотя бы одна из `oldLine`/`newLine` не `null`;
- `RunSession`: `finishedAt ≠ null` ⇒ `status` — терминальный (`succeeded|failed|cancelled|skipped`).
- `RunSession`: `trigger` и `createdAt` обязательны; `createdAt` не бывает `null`, в отличие от
  `startedAt` (Run в `queued` ещё не начат). Значения и диагностика — api PIPELINE_SPEC §1.1.
- `Repository` (api#149, api PR #156): `branchFilter`, `severityThreshold` и `installationAvailable`
  обязательны — ответ без любого из них не разбирается (§5). `severityThreshold` — строгий enum:
  неизвестное значение — ошибка разбора. `branchFilter: []` — все ветки, `null` не принимается, масок
  не больше 20; синтаксис маски Zod не проверяет: его судит сервер, а `updateRepository` разбирает
  ввод `UpdateRepositorySchema` перед PATCH, и проверка синтаксиса на клиенте сделала бы 422
  недостижимым.
- `RepositoryUpdate`: `.refine` — хотя бы одно поле. `installationAvailable` в схеме нет: объект не
  strict, и разбор отбрасывает это поле из ввода.
- В схемах репозитория нет `.transform()`: генератор снимка в api строит JSON Schema
  (`z.toJSONSchema`) из `RepositorySchema` и `UpdateRepositorySchema`. `RulesStatusSchema` и
  `RulesDiagnosticSchema` генератор пока не знает; локальный тест `stays representable as JSON Schema`
  держит все четыре схемы готовыми к снимку.
- `RulesStatus`: общие члены — `branch` (непустой), `path`, `checkedAt` (`z.iso.datetime()`), `sha`
  (40 hex); `sha: null` — только у `unavailable`, `text: null` — только у `invalid`, `diagnostics`
  непуст у `invalid` и `unavailable`.
- `RunListQuery` (в снимок api не входит): `repo` — 1..512 символов, `limit` — целое 1..100.

Summary-only прогон (дифф больше 3 000 строк, Р-15 в [SD §1][sd-1], контракт — [SD §12][sd-12],
решение 10 техлида [от 2026-09-24][tl-2026-09-24-10]): снимок диффа хранит только список файлов,
поэтому `GET /api/runs/{id}/diff` отдаёт `[{ filename, patch: null }]`, а `RunSession` приходит с
`summaryOnly: true`. Отсюда `RawFileDiff.patch` — `string | null` (отсутствие поля по-прежнему
отклоняется), `RunSession.summaryOnly` — обязательный `boolean`, как `cancelRequested`. Связь «`summaryOnly`
⇔ все `patch: null`» схемы не проверяют: это два разных ответа API, её держит UI (§6).

Run detail (Ф-16; [PIPELINE_SPEC §11][ps-11], схема `RunDetail` в [`openapi.yaml`][openapi]): Zod —
`RunDetailSchema` в `entities/run`: все пять полей сверх `RunSession` обязательные, `summary`, `verdict` и
`budget` — nullable, `findings` и `severityCounts` — нет; ответ без них — ошибка разбора.
Элементы `findings[]` валидируются через `FindingViewSchema` из `entities/review` (`entities/run/api/index.ts`) —
единственное осознанное пересечение слайсов run→review на границе парсинга API.
Карточки строятся по `findings` (`FindingView`, якорь `endLine ?? newLine`, §6).
`RunSession` и сверх них `findings` (`FindingView` — поля `ReviewComment` без `createdAt`, плюс
`side`, `suggestion`, `confidence`), `summary { problem, doneWell, effort } | null`,
`verdict: blocking | attention | clean | null`, `severityCounts { critical, high, medium, low, info }`
и `budget | null`. Вердикт считает сервер по опубликованным находкам: есть `critical` или `high` →
`blocking`, иначе есть `medium` или `low` → `attention`, иначе `clean`; `null`, пока прогон не
`succeeded`, и у summary-only прогона. UI вердикт сам не выводит. Бейджи Critical / Warning / Info —
только группировка в UI: `critical` + `high` / `medium` + `low` / `info`; API отдаёт пять уровней.

Отклонения от схем issue:

| Поле issue                       | Стало                                                       | Причина                                                                                           |
| -------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `RunSession.status` — 4 значения | 7 значений                                                  | статусы `publishing`/`cancelled`/`skipped` нужны UI; согласовано с ERD роли 6 и [SD §6.4][sd-6.4] |
| `RunSession.agent`               | `engine: 'fast'\|'deep'`                                    | ERD роли 6 называет поле `Engine`; «agent» — термин из Duo, не наш домен                          |
| `RunSession.jobId`               | удалено                                                     | в системе job = run, поле дублировало бы `id`                                                     |
| `RunSession` +                   | `attempt`, `cancelRequested`, `errorCode`                   | статусы «зависание/retry/отмена» из issue §6 не выразить без этих полей                           |
| `RunAction.sessionId`            | `runId`                                                     | единое имя внешнего ключа во всём контракте                                                       |
| `RunAction.response`             | `response \| null` + `responseRef`                          | тела ответов инструментов > 64 КБ выносятся отдельным запросом                                    |
| `ReviewComment` +                | `endLine`, `severity`, `category`, `title`                  | поля есть в ERD роли 6 (`Finding`); UI показывает severity в списке                               |
| — (новые типы)                   | `RawFileDiff`, `FileSlice`, `RunListPage`, `PullRequestRef` | провод диффа, пагинация списка, дочитывание контекста                                             |

---

## 5. Требования к API

Ниже — 10 пунктов, которые фронт выставляет backend'у. Текст опубликован 2026-09-18
комментариями в [PR #30][req-ui-30] и [api PR #4][req-api-4].

**Статус на 2026-09-24.** Техлид принял требования и внёс их в [SD][sd] (api PR #15, решения —
api#19): п. 2, 4, 6, 7, 8, 9 — в [§12][sd-12]; п. 10 — в [§2][sd-2], [§12][sd-12] и [§14][sd-14] (UI —
nginx-контейнер за edge-Caddy); п. 1 [SD][sd] покрывал и раньше (Zod — источник истины). П. 3 и 5 —
реализация роли 6 (api #17).
Отдельно публиковать комментарии больше не нужно.

**Статус на 2026-09-28 (api#20).** Пути и формы ответов фиксирует
[`contracts/openapi.yaml`][openapi] (OpenAPI 3.1, api PR #36) — это источник истины; пункты ниже —
запись того, что фронт запросил 2026-09-18. Жизненный цикл прогона, якорь и вердикт —
[PIPELINE_SPEC.md][ps]. Что изменилось: п. 3 — `GET /api/runs/{id}` отдаёт `RunDetail` (§4, Ф-16);
п. 5 — формулы якоря в §6 (Ф-6); п. 9 — стрим читается `fetch` с Bearer (Ф-14). Сверх пунктов
ниже: `POST /api/runs/{id}/rerun` (`202` → новый `RunSession` в `queued`; `409`, если у PR уже есть
активный прогон), `/api/auth/*` (Ф-15), `/api/repos`, `/api/repos/{id}` и `/api/repos/{id}/pulls`
(Ф-17). Операции с `x-status: planned` в openapi ещё не реализованы, `x-issue` называет задачу.

1. JSON на проводе — camelCase; Zod-схемы фронта источник истины ([SD §12][sd-12]). — роль 6.
2. `GET /api/runs?status&repo&cursor` возвращает `RunListPage` (конверт с `nextCursor`), а не голый
   массив — поправка к [SD §12][sd-12] (там сейчас `RunSession[]`). — роль 1.
3. `GET /api/runs/{id}` возвращает `RunSession`, собранный из ERD роли 6: `id/status/engine/
attempt/cancelRequested/startedAt/finishedAt/errorCode` из `runs`, `model` из последнего
   `UsageEvent.model`, `actionCount` из `count(run_actions)`, `pullRequest` из `code_changes`. —
   роль 6.
4. `GET /api/runs/{id}/diff` возвращает `RawFileDiff[]`; `patch` — вывод `git diff` на файл,
   обязан начинаться со строки `diff --git a/<path> b/<path>` и содержать `---`/`+++` — без них
   `gitdiff-parser` не привязывает hunks к файлу (подтверждено чтением исходника и proof-run,
   п. (a)). — роль 6.
5. `GET /api/runs/{id}/comments` возвращает `ReviewComment[]`; `side/line_start` → `oldLine/
newLine` (`RIGHT→newLine`, `LEFT→oldLine`), `line_end → endLine`. — роль 6.
6. `GET /api/runs/{id}/actions` возвращает `RunAction[]`; `response` инлайн ≤ 64 КБ, иначе —
   `responseRef` и отдельный `GET /api/runs/{id}/actions/{index}/response`. — роль 6.
7. Новый эндпоинт `GET /api/runs/{id}/files?path&offset&limit` → `FileSlice` для дочитывания
   контекста; для прогонов старше TTL blob-кэша — `404`/`410`, UI покажет «контекст недоступен». —
   роль 6.
8. Статусы в DTO: `publishing` добавить в [SD §12][sd-12]; `POST /cancel` отдаёт
   `RunSession` со `status: cancelled` или `cancelRequested: true`. — роль 1 и роль 6.
9. `GET /api/stream` (SSE `run.updated`) — payload минимум `{ runId, status }`. — роль 6.
10. Неточности [SD][sd], которые нужно поправить или подтвердить: [§2][sd-2] «фронт не парсит
    дифф» — фронт парсит библиотекой (`react-diff-view`) за адаптером, а не вручную; терминология
    `ReviewJob` → `Run` ([§11][sd-11], ERD роли 6) / `RunSession` ([§2][sd-2], [§12][sd-12]) —
    зафиксировать как одну и ту же сущность; [§14][sd-14] (caddy) расходится с PR #28 (nginx) —
    уточнить прод-раздачу. — роль 1.

Координация с ролями 3 и 4 (не входит в 10 пунктов выше, отдельные заметки):

- роль 4: `@types/node` в `tsconfig.node.json` понадобится для чтения `PORT` из `process.env` в
  `vite.config.ts` — follow-up (§11);
- роль 3 (PR #28): `docker/nginx.conf` сейчас не проксирует `/api/` и `/api/stream`; при
  `VITE_API_BASE_URL=/api` (same-origin) нужен `location /api/ { proxy_pass …; proxy_buffering
off; }` для SSE, либо в документе фиксируется cross-origin вариант с CORS на бэкенде — **решено**
  (api#20, 28.09): один origin, хост UI проксирует `/api/*` в API (`proxy_buffering off` для SSE),
  CORS не нужен; настройка — larchanka-training/dmc-268-api-t6#35.

### Контракт api#149 (api PR #156)

**Статус.** Поля настроек репозитория — контракт
[api PR #156](https://github.com/larchanka-training/dmc-268-api-t6/pull/156) (api#149). Zod-схемы
`Repository` / `RepositoryUpdate` с этими полями пришли в UI из PR #106; снимок UI-Zod в api
сгенерирован из его коммита `3d3071e`. Пометок `// provisional (ui#93)` у этих членов нет. UI
разбирает новые поля как обязательные, поэтому UI PR мержится только после деплоя #156. #156 влит в
`main` api 15.10.2026 (`f27d4c2`); `enabled` в нём — итог, а не настройка (решение D8 по ui#93: UI
следует API).

**1. `Repository` (`GET /api/repos`, `GET /api/repos/{id}`)** — три обязательных члена.

- `installationAvailable: boolean` — обязательный, только чтение: есть ли у GitHub App доступ к
  репозиторию. В PATCH не уходит (api отвечает на него `422`).
- `branchFilter: string[]` — glob-маски целевой (base) ветки PR; `[]` — все ветки (по умолчанию),
  `null` не бывает. `*` — в пределах одного сегмента, `**` — через `/`. Маска 1..255 символов, не
  больше 20 масок. Синтаксис проверяет только сервер: `422` на git-ref-небезопасную маску
  (недопустимые символы, `..`, `//`, `/` в начале или в конце, `.lock`, пробелы, управляющие
  символы) и на повтор; на клиенте — только размеры, повторы форма убирает до отправки.
- `severityThreshold: 'all' | 'warning' | 'critical'` — порог публикации над тремя группами D3, по
  умолчанию `all`. Подписи и уровни — по общей карте `severityBadgeGroup` (`entities/review`):

  | Значение   | Подпись в UI  | Публикуются                       |
  | ---------- | ------------- | --------------------------------- |
  | `all`      | All           | critical, high, medium, low, info |
  | `warning`  | Warn & Crit   | critical, high, medium, low       |
  | `critical` | Only Critical | critical, high                    |

- `enabled` — **итог**, а не настройка: сервер отдаёт `GET` и ответ `PATCH` как
  `enabled AND installationAvailable` (api `repository_settings.py:27`; `contracts/openapi.yaml`,
  `Repository.installationAvailable`; api `docs/SYSTEM_DESIGN.md` §6.9, «Автоматическое ревью
  [техлид, 14.10.2026, #149]»). `PATCH { enabled }` сохраняет только настройку, и пока у GitHub App
  нет доступа (`installationAvailable: false`), `GET` её не вернёт: она только для записи, а ответ
  всегда `enabled: false`. `enabled: false` при `installationAvailable: true` — пауза пользователя.
  UI показывает значение сервера как есть (переключатель выключен) и не выводит настройку сам:
  оптимистичное обновление `useUpdateRepository` тоже оставляет `enabled: false` у репозитория без
  доступа; оба выбора без доступа («Включить авто-ревью» и «Оставить выключенным») подтверждаются
  сообщением, что выбор сохранён (§2, «Автоматическое ревью»). Моки отвечают так же (§8).

**2. `RepositoryUpdate` (`PATCH /api/repos/{id}`)** — плюс необязательные `branchFilter` и
`severityThreshold` (те же правила). `installationAvailable` не отправляется; пустой объект
по-прежнему отклоняется. UI шлёт только изменённые поля, `enabled` — отдельным PATCH с переключателя.

**3. `422`** — FastAPI `HTTPValidationError`:
`{ detail: [{ loc: (string|number)[], msg: string, type: string, input?, ctx? }] }`. Схема —
`src/shared/api/validationError.ts`, без домена (`HttpValidationErrorSchema` и
`validationErrorLocations(data)` → `{ path }[]`); раскладка по полям формы —
`features/repository-settings/lib/serverFieldErrors.ts`.

- `['body', 'branchFilter']`: так api PR #156 отвечает на любую отказанную маску и на повтор —
  список проверяет один валидатор, номера маски в ответе нет. Под фильтром — «Сервер не принял
  значение», введённый текст остаётся (то же «другое поле» ниже).
- `['body', 'branchFilter', i]`: api так не отвечает, раскладка оставлена про запас (если api
  начнёт называть маску). `i` — индекс в отправленном списке масок, уже очищенном (обрезка, без
  пустых строк и повторов). Под фильтром — «Маска в строке N не принята сервером», где N — первая
  строка поля (с 1), чей текст после обрезки равен `submitted[i]` (`visibleLineNumber`); не нашлась
  — `i + 1`. Пустые строки и повторы делают индекс списка и номер строки разными числами.
- `['body', 'severityThreshold']` — «Сервер не принял порог»; другое известное поле формы — «Сервер
  не принял значение».
- `msg` сервера (английский текст) не показывается никогда. `loc` без поля формы, `detail` не
  массивом, не-422 — `Alert` над формой с текстом `formatErrorMessage`.
- До отправки клиент проверяет только размеры (`validateBranchFilterText`: маска длиннее 255
  символов, больше 20 масок), чтобы сохранение не падало на Zod в `updateRepository`.

**Решения api#149** (техлид, 14.10; записаны в api `SYSTEM_DESIGN.md` / `PIPELINE_SPEC.md`, api PR
#156):

- (а) авто-ревью — существующая настройка `enabled`, нового флага нет; `installationAvailable`
  отличает паузу авто-ревью от недоступной установки. Лейбл `ai-review` по-прежнему нужен;
- (б) фильтр веток — glob по целевой ветке PR, применяется при каждом claim, в том числе на rerun:
  неподходящий прогон завершается `skipped` / `rule_not_matched`, check-run называет причину;
- (в) порог — находки ниже порога отбрасываются (в тело ревью не уходят), вердикт считается после
  порога: при `critical` `attention` может стать `clean`, `blocking` и `REQUEST_CHANGES` не меняются.
  UI вердикт сам не выводит и не пересчитывает: показывает тот, что отдал сервер (Ф-16).

### Требования UI к api#150 (provisional)

**Статус.** Форму статуса правил UI объявил сам (ui#93), в api её ещё нет: её ждёт
[api#150](https://github.com/larchanka-training/dmc-268-api-t6/issues/150). UI построен на ней на
моках; каждый её член Zod-схемы помечен `// provisional (ui#93)` (`entities/repository/model/schemas.ts`,
`shared/api/endpoints.ts`). Текст подраздела уходит комментарием в api#150.

**1. Статус правил — `GET /api/repos/{repo_id}/rules-status`** (имя — предложение UI;
`endpoints.repos.rulesStatus(id)`). Ответ — `RulesStatusSchema`, `discriminatedUnion('status')`. У
каждого варианта: `branch` — ветка, из которой прочитан файл (UI показывает её, а не
`defaultBranch`), `path` (`.review/rules.md`), `checkedAt` (ISO date-time), `sha` (40 hex; `null` —
только в `unavailable`).

| `status`      | Свои члены                                                                               | Что показывает UI                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `present`     | `text: string` (может быть пустым), `ignoreMasks: string[]`, `diagnostics: Diagnostic[]` | `Tag` «Файл найден», ветка, короткий sha (полный — в `Tooltip`), время проверки; текст в `CodeBlock` простым текстом, не Markdown; маски или «Масок нет»; диагностика |
| `missing`     | `defaultsVersion: string`                                                                | предупреждение «Используются дефолтные правила, создайте .review/rules.md» и версия дефолтов                                                                          |
| `invalid`     | `text: string \| null` (`null` — файл слишком большой или не UTF-8), `diagnostics` (≥ 1) | ошибка «Файл правил содержит ошибки»: диагностика (код, строка:столбец, сообщение) и текст файла                                                                      |
| `unavailable` | `diagnostics` (≥ 1)                                                                      | ошибка «Не удалось прочитать файл правил»: причина по `code`; «Повторить», если у диагностики `retryable`                                                             |

`Diagnostic = { code, message, line: int|null, column: int|null, retryable, limit?, actual?,
patternIndex? }` — RULES_FORMAT_SPEC §9 в camelCase.

Любой сбой HTTP-уровня — сеть, 5xx, 401, 404 (чужой workspace или эндпоинта ещё нет), ответ не по
схеме — пятое состояние: «Не удалось загрузить статус правил» и «Повторить». Предупреждение о
дефолтных правилах — только на `200` со `status: 'missing'`: сломанный запрос не читается как «файла
нет».

**2. Стейджинг.** Блок правил запрашивает статус только на моках
(`mocksEnabledAtRuntime(isMockMode)`); вне моков — строка «Статус правил появится, когда сервер
начнёт его отдавать», запроса нет (`enabled: false`).

---

## 6. Просмотрщик диффа

Компоненты (`src/widgets/diff-viewer/`):

| Компонент         | Файл                     | Props                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DiffViewer`      | `ui/DiffViewer.tsx`      | `file: FileDiff`, `findings?: FindingView[]`, `comments?: ReviewComment[]`, `totalLines?: number`, `diffTotalLines?: number`, `searchActive?: boolean`, `onLoadMore?: (gap: ContextGap) => void`                                                                                                                                                    |
| `InlineComment`   | `ui/InlineComment.tsx`   | `finding: FindingView`, `file?: FileDiff`, `defaultExpanded?: boolean` — находка или комментарий, привязанный к строке диффа (виджет `react-diff-view`); свёрнут, пока не раскрыт или не задан `defaultExpanded`                                                                                                                                    |
| `DiffSuggestion`  | `ui/DiffSuggestion.tsx`  | `filename: string`, `removedLines: string[]`, `addedText: string` — правка из `suggestion` находки, через `<Diff>`                                                                                                                                                                                                                                  |
| `LoadMoreContext` | `ui/LoadMoreContext.tsx` | кнопка дочитывания контекста в зазоре между хунками                                                                                                                                                                                                                                                                                                 |
| `RunDiff`         | `ui/RunDiff.tsx`         | `summaryOnly: boolean`, `files: FileDiff[]`, `findings: FindingView[]`, `comments?: ReviewComment[]`, `budgetFiles?: FileDiff[]`, `fileTotalLines?`, `onLoadMore?`, `filters?: FindingFilters`, `onFiltersChange?`, `onFiltersQueryChange?`, `onFiltersReset?`, `commentsPending?: boolean`, `filtersNavigationKey?: number` — дифф прогона целиком |

Поток данных:

```mermaid
flowchart LR
  A[RawFileDiff] -->|fromPatch| B[FileDiff]
  B -->|toHunks| C[HunkData]
  C -->|Diff viewType hunks| D["Diff-компонент (react-diff-view)"]
  E[FileSlice] -->|expandContext| B
```

`fromPatch` (`src/entities/diff/lib/fromPatch.ts`) прогоняет `patch` через `parseDiff`, берёт
`filename` из `RawFileDiff.filename` (не из распарсенного `newPath` — proof-run показал, что без
`diff --git`-заголовка `newPath` пустой), и валидирует результат `FileDiffSchema`. `toHunks`
(`src/entities/diff/lib/toHunks.ts`) — обратное преобразование, нужное `<Diff>` для рендера и
`expandContext` для дозагрузки. `expandContext` (`src/entities/diff/lib/expandContext.ts`)
строит хунк из `FileSlice.lines` через `textLinesToHunk`, вычисляет `oldStart` смещением от
ближайшего предыдущего хунка и сливает его в существующие через `insertHunk`.

`patch: null` `fromPatch` не парсит: возвращает `{ filename, chunks: [], hasPatch: false }`. Для
строкового `patch` `hasPatch: true`, в том числе у бинарного файла (`chunks: []`), а непарсящаяся
строка по-прежнему бросает ошибку. Флаг отделяет «диффа нет в снимке» от «бинарный или пустой
дифф»: `DiffViewer` проверяет `hasPatch` раньше и показывает «Без диффа».

Summary-only прогон рисует `RunDiff`: при `summaryOnly: true` — `Alert` «Дифф слишком большой»
(больше 3 000 строк, построчного ревью нет) и список имён файлов, без `DiffViewer` и хунков; при
`false` — `DiffViewer` на каждый файл (имя файла он выводит, находки по `finding.file` отбирает сам;
комментарии ревью `RunDiff` заранее сливает с находками через `mergeFindings`, `lib/mergeFindings.ts`).
`RunDiff` получает флаг, а не весь `RunSession`, — виджет не зависит от
`entities/run`. Страница `RunDetailPage` (`/runs/:runId`) передаёт `run.summaryOnly` и
`findings` из `RunDetail` в `RunDiff` (TanStack Query, ключи §2).

Общий бюджет Ф-18 (`highlightBudgetLines`) считает только файлы с грамматикой и только строки
патча как он пришёл (`budgetFiles`, до дозагрузки контекста), а лимит на файл в `tokensForHunks`
по-прежнему видит развёрнутые хунки.

Ключ привязки комментария — `commentKey` (`src/entities/diff/lib/commentKey.ts`), реализует
правило N/I/D:

| Тип строки диффа           | Ключ         |
| -------------------------- | ------------ |
| `context` (есть `oldLine`) | `N<oldLine>` |
| `added` (есть `newLine`)   | `I<newLine>` |
| `removed` (есть `oldLine`) | `D<oldLine>` |

Для `ReviewComment` с `newLine ≠ null` ключ ищется по строке с этим `newLine`: если она `added` —
`I<newLine>`, если `context` — `N<oldLine>` той же строки. Для `oldLine ≠ null` без `newLine` —
поиск по `removed`/`context` аналогично. Если строка не найдена в текущем `FileDiff` (комментарий
вне видимого диффа) — `commentKey` возвращает `null`, виджет для него не рисуется.

Откуда берутся `oldLine` / `newLine` / `endLine` (Ф-6, уточнено 2026-09-28; первоисточник —
[PIPELINE_SPEC §10][ps-10]). Канон якоря — `path` / `start_line` / `line` (+ `side`): так находку
выдаёт LLM и так размечен датасет api#30; `side` в выходе LLM нет, постпроцессор ставит `RIGHT`.
БД и Zod не переименовываются, на проводе — `file` / `oldLine` / `newLine` / `endLine`; `side` есть
только в `FindingView` run detail (§4), в `ReviewComment` его нет. Канон — решение техлида, формулы —
дефолт, утверждённый с планом api#20 ([решения][tl-2026-09-27-api20]):

- БД: `file_path = path`, `line_start = start_line ?? line`,
  `line_end = start_line != null ? line : null`;
- провод: `file = file_path`, `newLine = side == RIGHT ? line_start : null`,
  `oldLine = side == LEFT ? line_start : null`, `endLine = line_end`.

| Случай         | LLM                          | Провод                                      |
| -------------- | ---------------------------- | ------------------------------------------- |
| одна строка 42 | `start_line: null, line: 42` | `newLine: 42, oldLine: null, endLine: null` |
| диапазон 10–14 | `start_line: 10, line: 14`   | `newLine: 10, oldLine: null, endLine: 14`   |

Однострочная находка приходит с `endLine = null`; диапазон строк —
`[newLine ?? oldLine, endLine ?? newLine ?? oldLine]`. `commentKey` ищет строку по `newLine` /
`oldLine` (для диапазона — якорь `endLine ?? newLine`, см. `commentKey.ts`).

«Дочитать контекст» — зазор вычисляется в `DiffViewer.tsx` (`gapBeforeHunk`/`gapAfterLastHunk`):
для каждой пары соседних хунков зазор — это `{ startLine: prev.newStart + prev.newLines, count:
next.newStart - startLine }`; хвостовой зазор после последнего хунка — до `totalLines` файла
(параметр компонента). Зазор с `count ≤ 0` не показывается.

Почему обязателен заголовок `diff --git` — proof-run (a): `gitdiff-parser@0.3.1` открывает новый
файл только по строке `diff --git a/<path> b/<path>`; без неё хунки не привязываются к имени
файла (см. §5, пункт 4).

### Фильтры замечаний

Над диффом `RunDiff` рисует панель `FindingFiltersBar` (`features/finding-filters/ui/`). Панель и
фильтрация включаются только вместе с `onFiltersChange`: без него проп `filters` игнорируется, а
прогон рисуется как раньше. Состояние — в URL (§2 «Состояние в URL»); `RunDetailPage` берёт его
хуком `useFindingFiltersParams` и передаёт `filters` / `onFiltersChange` / `onFiltersQueryChange` /
`onFiltersReset` / `filtersNavigationKey` (его `navigationKey`, §2) (без `onFiltersReset` сброс — `onFiltersChange(EMPTY_FINDING_FILTERS)`; без
`onFiltersQueryChange` текст поиска уходит в `onFiltersChange({ ...filters, query }, { replace: true })`)
и `commentsPending` — `/comments` ещё не ответил.

Панель (`FindingFiltersBar`, props: `filters`, `fileOptions: { file; count }[]`, `shown`, `total`,
`empty?`, `navigationKey?`, `onChange(change: Partial<FindingFilters>, { replace? })`,
`onQueryChange(query)`, `onReset`) — antd `Form layout="inline"` без своего состояния: поля
по-прежнему ведут хуки URL, экземпляра `form` и `name` у полей нет. У каждого поля видимая подпись
(DESIGN_SYSTEM §8 «Поля»): `Form.Item label` «Файлы», «Критичность», «Поиск», связанная с контролом
через `htmlFor` и `id` из `useId`. `aria-label` у контролов остаются («Файлы», «Критичность», «Поиск
по замечаниям»): Chrome включает в доступное имя двоеточие, которое antd рисует после подписи
(«Файлы :»), а имена, по которым поля находят тесты и скринридер, меняться не должны; видимое
«Поиск» входит в имя «Поиск по замечаниям» (WCAG 2.5.3). Отправку формы antd отменяет сам, поэтому
Enter в поле поиска страницу не перезагружает. Плейсхолдеры говорят, что значит пустое поле и что
ищет поиск: «Все файлы», «Все уровни», «Текст, правило». Оба селекта — `maxTagCount="responsive"`:
чипы, которым нет места, сворачиваются в короткий чип «+N» (`maxTagPlaceholder`), и контрол остаётся
в одну строку.

- «Файлы» — `Select mode="multiple"`, вариант `файл (N)`. В чипе — имя файла без каталогов, длиннее
  11 символов (`FILE_TAG_MAX_LENGTH`) — с «...», полный путь — во всплывающей подсказке (`title`
  варианта), так что первый выбранный файл читается при любой ширине панели; список вариантов
  показывает полные пути. N — число показываемых замечаний файла, не зависит от остальных фильтров.
  Файлы прогона — файлы `/diff` ∪ `finding.file`, поэтому файл, которого в диффе нет, тоже можно
  выбрать. `file=` файла, которого в прогоне нет, остаётся чипом в селекте, хотя ничего не
  фильтрует: санитайзинг только при чтении (§2); варианта у него нет, поэтому и подсказка у его чипа
  — только имя;
- «Критичность» — `Select mode="multiple"` по группам D3 (Critical = critical + high, Warning =
  medium + low, Info), подписи — `SEVERITY_BADGE_LABEL`, порядок — `SEVERITY_BADGE_GROUPS`. Селект,
  а не `Checkbox.Group`, хотя вариантов всего три, — осознанное исключение из таблицы выбора
  DESIGN_SYSTEM §8: три флажка с подписями не уместились бы в строку панели рядом с остальными
  полями, а пустой селект с «Все уровни» прямо говорит, что пустой фильтр — это все уровни, тогда
  как три снятых флажка читаются как «ничего»;
- «Поиск» (имя «Поиск по замечаниям») — подстрока в `title`, `body` или `ruleName` без учёта
  регистра (кириллица тоже), пробелы по краям не считаются. Текст — локальное состояние поля, в URL
  `q` пишется с паузой 250 мс и `replace` через `onQueryChange` (§2 «Состояние в URL»); не больше
  200 символов (`maxLength`, `QUERY_MAX_LENGTH`). Выбор в селектах — `push` и несёт набранный текст
  с собой;
- счётчик «Показано N из M замечаний» — вторичным текстом (`type="secondary"`: на палитре
  дизайн-системы контраст 7,6:1 в обеих темах; прежние 3,32:1 были у палитры antd до неё) и с
  `role="status"` (вежливая live-region: скринридер озвучивает число после паузы). Счётчик следует
  за URL, поэтому меняется после паузы, а не на каждый символ;
- «Сбросить фильтры»: кнопка выключена, пока ничего не задано — ни в URL, ни в поле; поиск из одних
  пробелов считается заданным, иначе его нельзя было бы очистить. Сброс очищает и поле, и отложенную
  запись. Кнопка и счётчик — одна группа (`Flex`), которая переносится целиком, поэтому кнопка
  никогда не остаётся одна в строке. После сброса любой из двух кнопок фокус переходит в «Файлы»,
  в начало панели: кнопка панели становится неактивной, а сообщение с его кнопкой исчезает, и
  иначе фокус упал бы на страницу (`.agents/rules/frontend.md` §3b, п. 3).

Раскладка экрана — только ширины и отступы, в `FindingFiltersBar.module.css`. Поля растут от
базовой ширины (вместе с подписью: «Файлы» 252px, «Критичность» 264px, «Поиск» 212px) и не
становятся шире панели; база «Критичности» оставляет место для одного чипа и чипа «+N», а три поля
встают в одну строку только в колонке от 752px. Между строками 8px, между элементами 12px. В
колонке страницы прогона панель занимает две строки на 768–1920px: на 1440 и 1920px (колонка 840 и
1032px) три поля, затем счётчик с кнопкой; на 768, 1024 и 1280px (колонка 676, 728 и 680px)
«Файлы» с «Критичностью», затем поиск, счётчик и кнопка. На экране 390px (колонка 298px) каждое
поле занимает свою строку, без горизонтальной прокрутки. Как подпись стоит у контрола, задаёт
дизайн-система (`shared/ui/styles/antd.css`, правило inline-формы): от 576px подпись рядом с
контролом и сужается только контрол, уже 576px — подпись над контролом во всю ширину, и контролы
выстраиваются по левому краю. Своего нижнего отступа у панели нет: от первого файла её отделяет
отступ 12px сетки `.run-diff`.

Кнопки очистки обоих селектов (`allowClear`) — остановки табуляции с именами «Очистить выбор
файлов» и «Очистить выбор критичности» (rc-select назвал бы их «Clear»; иконка — та же
`CloseCircleFilled` antd, передана явно). Получив фокус с клавиатуры,
кнопка видна и обведена кольцом фокуса из DESIGN_SYSTEM §7 (2px `--rv-link`), стрелка под ней
скрыта (правило `styles/antd.css`), а Enter или пробел очищают селект, как щелчок. Порядок
табуляции: «Файлы», его очистка, «Критичность», её очистка, поиск, очистка поиска (когда в поле
есть текст; имя «Очистить поиск» несёт её иконка, иначе кнопку звали бы «close-circle»), «Сбросить
фильтры».

Семантика (`matchesFindingFilters`): И между тремя фильтрами, ИЛИ внутри `file` и внутри `severity`.
Фильтр файлов — `effectiveFileFilter(file, файлы прогона)`; если пересечение пусто (в прогоне нет
ни одного из выбранных файлов), он не действует, а `file=` остаётся в URL (§2).

Множество M — то, что показывается без фильтров, ровно то, что рисовалось и раньше:

- обычный прогон: `run.findings` ∪ комментарии ревью (`/comments`) файлов, у которых есть патч и
  чанки, слитые по `id` (`mergeFindings`; находка из `findings` важнее комментария с тем же `id`).
  Комментарии к файлам без диффа или отсутствующим в `/diff` по-прежнему не рисуются и в M не входят;
- summary-only прогон: только `run.findings` — эта ветка комментариев не рисует.

Что рисуется под фильтром:

- выбран файл (эффективный фильтр не пуст) — дифф и находки только этих файлов;
- задан содержательный фильтр (критичность или непустой поиск) — файлы без подходящей находки
  скрыты: дифф, блок «Замечания вне диффа» и строка в списке summary-only. Если скрыты все
  строки, списка нет вовсе — второго пустого состояния antd `List` не появляется;
- блок «Замечания вне диффа» (у файла и общий по прогону) рисуется, только когда в нём есть
  подходящая находка;
- поиск задан — все показанные карточки развёрнуты: `InlineComment` получает `defaultExpanded`, ключ
  карточки — `${id}:q` при поиске и `${id}:` без него, поэтому включение и выключение поиска
  перемонтирует карточки, а ввод следующих символов — нет (ручное сворачивание сохраняется);
- ничего не подходит, а фильтр действует (эффективный фильтр файлов не пуст или задан содержательный
  фильтр) — сообщение «Нет замечаний, подходящих под фильтры» с кнопкой сброса; рисует его сама
  панель (`empty`), чтобы кнопка в сообщении очищала и поле поиска. Одинокий `file=` неизвестного
  файла и прогон без замечаний при пустых фильтрах сообщения не вызывают. В summary-only ветке
  сообщение стоит под панелью, выше «Дифф слишком большой». Пока `/comments` не
  ответил, сообщения нет: набор ещё неполон, и запрос, который подходит только комментарию, не
  должен мигать «ничего нет» (счётчик при этом может поменяться, когда комментарии придут);
- бюджет подсветки Ф-18 считается по всем файлам, как пришли (`budgetFiles ?? files`), а не по
  видимым: фильтр не включает и не выключает подсветку.

Закреплено тестами: `features/finding-filters/model/findingFilters.test.ts` (разбор, запись,
предикаты, пары и тройка фильтров, кириллица), `ui/FindingFiltersBar.test.tsx` (подписи и их связь
с контролами, плейсхолдеры, чипы по имени файла с подсказкой, Enter без отправки, счётчик и кнопка
одной группой; в jsdom нет раскладки, поэтому ширину для чипов `Select` даёт
`src/test/responsiveSelectLayout.ts`, в узкий селект — один чип и «+N»),
`widgets/diff-viewer/ui/RunDiff.filters.test.tsx` (каждый фильтр, сочетания, блоки «вне диффа»,
summary-only, бюджет подсветки), `pages/runs/RunDetailPage.filters.test.tsx` (URL: загрузка,
мусор, `push` / `replace`, другой прогон, сброс, ожидание `/comments`),
`pages/runs/RunDetailPage.search.test.tsx` (поле поиска на `RouterProvider` из `react-router/dom` —
роутер приложения: два нативных `input` подряд без `act`, каретка при вставке в середину, «назад»,
сброс, выбор при ещё не записанном тексте, «назад» / «вперёд» и чужая навигация при наборе) и
`model/useFindingFiltersParams.test.tsx` (запись поверх ещё не доехавшего URL, слияние выборов,
`navigationKey`).

### Цвета диффа и подсветки

Источник — токены antd активной темы (Ф-13, Refs ui#74); литералов цвета нет ни в TS, ни в CSS.

Зачем перекрытие: `react-diff-view/style/index.css` объявляет все `--diff-*` на `:root` со
значениями **только для светлой темы**, а `--diff-text-color: initial` отдаёт тексту цвет `body`
(`ThemeBodySync` в `UiProvider`). В тёмной теме это светлый текст на `#eaffee` (≈ 1,04:1).
Классов `.token.*` библиотека не стилизует вовсе — без своих правил подсветка невидима в обеих темах.

Цепочка:

```mermaid
flowchart LR
  A["theme.useToken()"] --> B["diffThemeVars(token)"]
  B -->|inline style| C[".diff-theme (корень DiffViewer / DiffSuggestion)"]
  C --> D["--diff-* перекрывают :root библиотеки"]
  C --> E["--diff-token-* → diff-theme.css → правила .token.*"]
```

- `diffThemeVars(token: GlobalToken)` (`lib/diffTheme.ts`) — чистая функция: карта CSS-переменных
  (все цветовые `--diff-*` библиотеки + палитра `--diff-token-*`).
- `useDiffThemeStyle()` (там же) читает `theme.useToken()` **во время рендера** (без `useEffect`) и
  возвращает `{ className: 'diff-theme', style }`, `style` мемоизирован по `token`. Применяется на
  корне `DiffViewer` (обёртка `<div>`) и на корне `DiffSuggestion`: находки «вне диффа» (`RunDiff`)
  рисуют `InlineComment` в `Alert` вне любого `DiffViewer`. Вложенное повторение безвредно.
- Инлайновые переменные на корне побеждают `:root` библиотеки по наследованию. Каждый
  `*-text-color` задан явно: библиотека разрешает `var(--diff-text-color)` на `:root`, поэтому
  перекрытие одного `--diff-text-color` до них не дошло бы. `--diff-font-family` не трогаем.

Токен antd → переменная → что красит:

| Токен antd                | Переменная                                                                          | Красит                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `colorBgContainer`        | `--diff-background-color`                                                           | фон `.diff`                                                                           |
| `colorText`               | `--diff-text-color` и все `--diff-*-text-color`                                     | текст `.diff`, строк, гаттеров, выделения                                             |
| `colorSuccessBg`          | `--diff-code-insert-background-color`                                               | добавленная строка (`.diff-code-insert`)                                              |
| `colorErrorBg`            | `--diff-code-delete-background-color`                                               | удалённая строка (`.diff-code-delete`)                                                |
| `colorSuccessBgHover`     | `--diff-gutter-insert-background-color`, `--diff-code-insert-edit-background-color` | гаттер добавленной строки; изменённый фрагмент внутри неё (`.diff-code-edit`)         |
| `colorErrorBgFilledHover` | `--diff-gutter-delete-background-color`                                             | гаттер удалённой строки                                                               |
| `colorErrorBgActive`      | `--diff-code-delete-edit-background-color`                                          | изменённый фрагмент внутри удалённой строки                                           |
| `colorWarningBg`          | `--diff-code-selected-background-color`                                             | `.diff-code-selected` (приложение `selectedChanges` не передаёт — задано для полноты) |
| `colorWarningBgHover`     | `--diff-gutter-selected-background-color`                                           | `.diff-gutter-selected` (так же)                                                      |
| `colorPrimaryBgHover`     | `--diff-selection-background-color`                                                 | выделение мышью (`.diff::selection`)                                                  |
| `colorError`              | `--diff-omit-gutter-line-color`                                                     | линия пропуска (`.diff-gutter-omit:before`)                                           |

Палитра подсветки — восемь слотов, классы refractor сгруппированы по слотам; каждый класс стоит
ровно в одном правиле `diff-theme.css`, порядок правил цвет не решает:

| Слот `--diff-token-*` | Токен antd          | Классы `.token.*`                                                                |
| --------------------- | ------------------- | -------------------------------------------------------------------------------- |
| `keyword`             | `magenta7`          | `keyword`, `operator`, `important`, `rule`                                       |
| `string`              | `orange7`           | `string`, `template-string`, `triple-quoted-string`, `char`, `url`, `attr-value` |
| `number`              | `blue7`             | `number`, `boolean`, `constant`                                                  |
| `function`            | `cyan7`             | `function`, `class-name`, `builtin`                                              |
| `tag`                 | `volcano7`          | `tag`, `selector`                                                                |
| `attribute`           | `geekblue7`         | `attr-name`, `property`, `key`                                                   |
| `special`             | `purple7`           | `decorator`, `annotation`, `regex`                                               |
| `comment`             | `colorTextTertiary` | `comment`                                                                        |

Индекс 7 пресет-палитры — единственный шаг, читаемый на обоих фонах: тёмный и насыщенный под
`defaultAlgorithm`, под `darkAlgorithm` antd пересчитывает палитры светлее. Остальные классы
(`punctuation`, `null`, `interpolation`, `atrule`, `title`, …) остаются цветом текста;
`punctuation` не стилизуется намеренно: Prism алиасит его на декораторы и интерполяцию, а те
должны сохранить свой цвет.

Тема переключается без перезагрузки: выбор в меню пользователя → `setPreference()` →
`useThemeStore.mode` → `UiProvider` отдаёт `DesignSystemProvider` другой `mode` → `theme.useToken()` в `DiffViewer` /
`DiffSuggestion` возвращает новый токен → `diffThemeVars` → новый inline `style` в том же коммите,
без `useEffect` и вспышки старых цветов. `data-theme` и `@media (prefers-color-scheme)` не нужны.
С пустым `localStorage` и тёмной ОС тема тёмная уже в первом рендере: `getInitialTheme()`
(`features/theme/model/store.ts`) выполняется при создании стора — до рендера — и читает
`dmc_theme_mode`, затем `matchMedia('(prefers-color-scheme: dark)')`; `UiProvider` с первого кадра
даёт `darkAlgorithm`, `useToken()` — тёмные токены.

`ui/diff-theme.css` — **обычный** kebab-case `.css`, не `*.module.css`: override стилелинта для
`**/*.module.css` (Ф-13) разрешает только camelCase и `ant-*`, поэтому `.diff-theme` и
`.token.class-name` / `.token.attr-name` / `.token.template-string` падают на
`selector-class-pattern` даже внутри `:global(...)` (проверено). Классы `token.*` ставит
refractor, а не компонент — CSS Modules их всё равно пришлось бы выносить в `:global`. Файл — первый
авторский обычный `.css` проекта; в нём только правила
`.diff-theme .token.<класс> { color: var(--diff-token-<слот>) }` и ни одного цветового литерала.
Импортируется из `DiffViewer.tsx` и `DiffSuggestion.tsx` — каждый самодостаточен при code-split.

`DiffSuggestion` рисуется через тот же `<Diff>`, не собственной таблицей: из `removedLines` и
`addedText` собирается синтетический `FileDiff` с одним чанком (удалённые строки, затем
добавленные, обе стороны нумеруются с 1; заголовок — `formatHunkHeader`) → `toHunks` →
`tokensForHunks(filename, hunks)` → `<Diff diffType="modify" viewType="unified" gutterType="none">`;
всё это в `useMemo` по `filename`, содержимому `removedLines` и `addedText` (массив
`removedLines` на каждом рендере новый). Классы строк и токенов, переменные и `diff-theme.css` — те
же, что у основного диффа. `filename` приходит из `InlineComment` (`file?.filename ?? finding.file`);
бюджет Ф-18 действует и здесь — на файл, внутри `tokensForHunks` (> 1000 строк — без токенов, но
строки рисуются), неизвестное расширение — `tokens` не строится, без ошибки. Текст идёт через
React, без `innerHTML`.

Новых зависимостей нет и темы Prism нет: цвета берутся из токенов antd, а CDN и внешние стили
режет CSP (`default-src 'self'`, `docker/nginx.conf`).

Что закреплено тестами: `lib/diffTheme.test.ts` — контраст (WCAG, альфа-цвета сперва кладутся на
фон контейнера) в обеих темах: текст на каждой поверхности диффа (контейнер, строки, гаттеры,
`-edit`, выделение) ≥ 4,5:1, цвет каждого слота на фоне контейнера и строк добавления / удаления
≥ 3:1, ни один слот не равен цвету текста; литеральные роли токенов (добавление — `colorSuccessBg*`,
удаление — `colorErrorBg*`, текст — `colorText`, линия пропуска — `colorError`); набор из восьми
слотов `--diff-token-*` задан в тесте литералом, и с ним сверяются и маппер, и CSS; согласованность
`diff-theme.css` с `diffThemeVars` (нет цветовых литералов, у каждого класса ровно одно правило, на
каждую переменную палитры есть ссылка и наоборот, пары `.token.keyword` / `string` / `comment` /
`number` / `function` → одноимённый слот) и подключение: `DiffViewer.tsx` и `DiffSuggestion.tsx`
содержат `import './diff-theme.css'`. `ui/DiffViewer.theme.test.tsx` — значения переменных на
`.diff-theme` различаются под светлым и тёмным `ConfigProvider` и равны ролям antd
(`colorSuccessBg` …), а не результату маппера (так же в `DiffSuggestion.test.tsx` и
`RunDiff.test.tsx`); первый кадр в тёмной теме и смена после `setPreference()` без перемонтирования
(настоящий `UiProvider`) — в `app/providers/UiProvider.diffTheme.test.tsx`;
`ui/DiffSuggestion.test.tsx` — тот же корень `.diff-theme` вне `DiffViewer`, подсветка `.ts` /
`.py` правки и отсутствие токенов выше бюджета в 1000 строк. jsdom CSS не загружает, поэтому
проверяются inline-значения и классы, а не вычисленные стили (отсюда и отдельный тест файла CSS
с диска).

---

## 7. Инспектор прогонов

`RunHeader` (`src/widgets/run-inspector/ui/RunHeader.tsx`) — поля шапки: движок, модель, статус
(`Tag` + предупреждение о «зависании»), пометка «Перезапущен вручную» (только `trigger = rerun`;
`webhook`, зарезервированные `manual`/`dry_run` — без пометки), время создания, время начала,
длительность, PR (ссылка), попытка, число действий, код ошибки.

`ActionTree` (`src/widgets/run-inspector/ui/ActionTree.tsx`) — дерево действий поверх antd `Tree`.
Ключи узлов: группа — `group-<firstIndex>` (индекс первого действия в группе), одиночное действие
и лист группы — `action-<index>`.

Группировка — `groupActions` (`src/entities/run/lib/groupActions.ts`): подряд идущие действия с
одним `tool` схлопываются в узел `{ kind: 'group', tool, count, actions }`, если длина серии
`≥ 3` (`MIN_GROUP_SIZE`); короче — каждое действие остаётся отдельным узлом `{ kind: 'action' }`.

7 статусов и их разбиение (`src/entities/run/model/schemas.ts`, `src/entities/run/lib/status.ts`):

| Группа                      | Статусы                                       |
| --------------------------- | --------------------------------------------- |
| Активные (`isActive`)       | `queued`, `running`, `publishing`             |
| Терминальные (`isTerminal`) | `succeeded`, `failed`, `cancelled`, `skipped` |

Тон `Tag` из дизайн-системы (`statusTone`): `queued → neutral`, `running → info`,
`publishing → info`, `succeeded → success`, `failed → danger`, `cancelled → warning`,
`skipped → neutral`. У активных статусов точка пульсирует.

«Зависший» `running` — `isStaleRunning`: `status === 'running'`, `finishedAt === null`,
`startedAt` старше 10 минут (`STALE_RUNNING_MS`) — порог совпадает с порогом реконсилера в [SD §6.4][sd-6.4]
(`queued` старше 10 мин без сообщения → повтор публикации).

Хуки под cancel/retry в контракте уже есть, UI для них — вне спринта: `cancelRequested: boolean`
(флаг отмены до подтверждения бэкендом) и `attempt: number` (номер попытки при retry) на
`RunSession`.

### Прогресс-бар (Refs ui#84)

Под карточкой прогона, во всю ширину над журналом действий и диффом, — три этапа: «Сбор контекста»
(`context`), «Анализ LLM» (`analysis`), «Публикация» (`publishing`). Модель — чистая функция
`runProgress(run, actions)` (`src/entities/run/lib/runProgress.ts`, экспорт через `entities/run`):
`Pick<RunSession, 'status' | 'errorCode'>` и `RunAction[]` → `RunProgress | null`; для `skipped` — `null`,
бара нет. Этап — `{ key, label, state, errorCode }`, `state` — `wait`, `process`, `finish`, `error` или
`stopped`; `errorCode` (из `run.errorCode`) есть только у этапа `error`/`stopped`. Отрисовка —
`RunProgressBar` (`src/widgets/run-inspector/ui/RunProgressBar.tsx`) через `ProgressSteps` из
`src/shared/ui` — обёртку дизайн-системы над antd `Steps` ([DESIGN_SYSTEM](DESIGN_SYSTEM.md) §2 и §10,
история «Свои компоненты/ProgressSteps»). `RunInspector` ставит бар отдельной строкой своей сетки `.root`
(`RunInspector.module.css`): сразу после `Card` с `RunHeader` и перед `headerExtra` (место для блока во
всю ширину; `RunDetailPage` его сейчас не передаёт), то есть над колонками журнала и диффа. Отступ сверху
и снизу — `gap: 18px` этой сетки, своего отступа у бара нет. `Tag` статуса и строка «Ошибка» в шапке
остаются.

Карта «инструмент → этап» (поле `tool` журнала `/actions`; `RunActionSchema.tool` остаётся `z.string()`):

| Этап         | `tool`                                                                   |
| ------------ | ------------------------------------------------------------------------ |
| `context`    | `vcs.fetch_diff`, `context.build`, `llm.repo_conventions`                |
| `analysis`   | `llm.call`, `llm.review_output`, `review.postprocess`, `engine.fallback` |
| `publishing` | `github.publish_review`                                                  |

Любой другой `tool` игнорируется целиком: не двигает бар и не делит попытки.

Состояния по статусу `RunSession`:

| Статус                                       | «Сбор контекста»     | «Анализ LLM»         | «Публикация»         |
| -------------------------------------------- | -------------------- | -------------------- | -------------------- |
| `queued` (журнал не смотрим)                 | `wait`               | `wait`               | `wait`               |
| `running`, контекст не готов                 | `process`            | `wait`               | `wait`               |
| `running`, контекст готов                    | `finish`             | `process`            | `wait`               |
| `publishing`                                 | `finish`             | `finish`             | `process`            |
| `succeeded` (журнал не смотрим)              | `finish`             | `finish`             | `finish`             |
| `failed` / `cancelled`                       | см. «Остановка» ниже | см. «Остановка» ниже | см. «Остановка» ниже |
| `skipped` (бара нет, `runProgress` → `null`) | —                    | —                    | —                    |

Остановка (`failed`, `cancelled`): этап остановки — `publishing`, если в текущей попытке есть
`llm.review_output`, `review.postprocess` или `github.publish_review`; иначе `analysis`, если контекст
готов; иначе `context`. Этапы до него — `finish`, после — `wait`, сам этап — `error` (`failed`) или
`stopped` (`cancelled`). Контекст готов, если в текущей попытке есть `context.build`, чей `response` не
объект с ключом `error` (так api пишет упавший шаг, `run_trace`); больше ничто контекст готовым не
делает — в том числе `llm.call` за conventions до `context.build`.

Текущая попытка. В `RunAction` нет номера попытки, а `RunSession.startedAt` ставится только при первом
захвате и границей попытки быть не может. Поэтому журнал читается по `index`, только известные `tool`, и
новая попытка начинается с действия, которое либо относится к более раннему этапу, чем предыдущее
известное действие (регресс этапа), либо является вторым `llm.repo_conventions` в текущем отрезке; берётся
последний отрезок. Второе правило — по коду api: шаг conventions выполняется при каждом захвате
(`process_run.py`, `prepare()`, в том числе когда снимок диффа уже есть), а `conventions_unit_of_work.py`
пишет ровно одну строку `llm.repo_conventions` на вызов, то есть по одной на попытку. Без него ретрай,
у которого прежняя попытка остановилась сразу после успешного `context.build` (например, потеряна
аренда), не давал регресса этапа, и старый `context.build` держал «контекст готов» для новой попытки:
`failed` или `cancelled` показывали `analysis` вместо `context`. Ретрай (T9/T12) идёт
`running → queued → running`, действия прежних попыток остаются в списке.

Вид. Бар только переводит этапы в шаги `ProgressSteps` — `{ key, title, state, note }`: `state` этапа
совпадает с состоянием шага, `note` у `error` — `errorCode`, у `stopped` — «Остановлено» (с
`: <errorCode>`, если код есть). antd-статус `stopped` нет: `ProgressSteps` показывает его как `wait`
со своей отметкой, поэтому остановка не красная. Состояние этапа в DOM — `data-stage-state` и
`data-testid="run-progress-<key>"` на заголовке этапа (у `ProgressSteps` на заголовке и отметке ещё
`data-state`); обёртка бара — `data-testid="run-progress"` с `role="group"` и именем «Этапы прогона». Бар
не задаёт ни цветов, ни отметок сам: ни `theme.useToken()`, ни инлайн-`style`, ни своих классов (Ф-13,
Ф-20).

Активный шаг. antd помечает активным шаг `current`, поэтому без правки у `queued` первый этап выглядел бы
идущим, а у `succeeded` последний отличался бы от остальных готовых. `ProgressSteps` делает активным только
шаг в работе (`process`), с ошибкой (`error`) или остановленный (`stopped`); когда все шаги `wait`
(`queued`) или все `finish` (`succeeded`), активного шага нет — `current` указывает за последний шаг
(`.ant-steps-item-active` не появляется).

Отметки и цвета задаёт `ProgressSteps` (`ProgressSteps.module.css`), по дизайн-ревью createunix (PR #85):
одна отметка на все состояния — кольцо 20×20px, рамка 1.5px, без заливки (Chrome рисует рамку 1px),
внутри значок 12px со штрихом 1.5 или номер 11px/600. `wait` — кольцо `--rv-border-strong`, номер
`--rv-text-3`, заголовок `--rv-text-2`/400; `process` — кольцо и номер `--rv-link`, заголовок
`--rv-text`/500; `finish` — кольцо `--rv-border-strong`, галочка `--rv-success`, заголовок `--rv-text`/400;
`error` — кольцо и крестик `--rv-danger`, заголовок `--rv-text`/500, `errorCode` строкой ниже `--rv-text-2`;
`stopped` — кольцо и черта `--rv-warning`, заголовок `--rv-text`/500, «Остановлено» строкой ниже
`--rv-text-2`. Залитых кругов нет (DESIGN_SYSTEM §8), акцента `--rv-accent` нет: что antd ещё красит
основным цветом (коробку вокруг своей отметки), `components.Steps` в `buildTheme.ts` переводит на
`--rv-link`. Линия между этапами — правила `antd.css`: `--rv-border-strong`, перед готовым этапом
`--rv-success`. Кольцо — индикатор состояния, а не контрол и не иконка из DESIGN_SYSTEM §5; серое кольцо
`wait` и `finish` (около 1.4:1) состояние не несёт — его несут номер (не ниже 4.9:1) и галочка. Контраст
заголовков и описаний не ниже 4.5:1, цветных колец и значков — не ниже 3:1 в обеих темах (держат
`theme/buildTheme.test.ts` и `ProgressSteps.test.tsx`).

Журнал недоступен. Бар не гадает по пустому списку: если запрос `/actions` упал и данных нет,
`RunDetailPage` передаёт `actionsUnavailable`, и бар не рисуется для статусов, которые читают журнал, —
`running`, `failed`, `cancelled` (их называет `runProgressReadsLog`, рядом с `runProgress`). `queued`,
`publishing` и `succeeded` журнал не читают, для них бар остаётся. Данные последнего удачного запроса при сбое очередного опроса
журналом считаются: бар остаётся. Инспектор смонтирован всегда: пока журнал грузится, `RunDetailPage`
передаёт `actionsLoading`, и `Spin` заменяет только дерево действий в колонке «Сессия ревью»; бар в это
время получает `actionsUnavailable || actionsLoading` и для тех же статусов не рисуется, иначе на первой
загрузке он гадал бы по пустому списку (`running` — контекст в работе, `failed`/`cancelled` — остановка на
контексте). `actionsLoading` — `isLoading && errorUpdateCount === 0`, только первая загрузка: запрос,
который ни разу не удался, снова `pending` на каждом опросе (TanStack сбрасывает `status` и `error`, пока
данных нет), и без этой оговорки колонка мигала бы спиннером каждые 3 с; при недоступном журнале в ней
остаётся пустое дерево. По той же причине `actionsUnavailable` считается как `errorUpdateCount > 0` без
данных, а не по `isError`: во время опроса `isError` ложен, и бар показал бы догадку по пустому списку.

Число действий в шапке. «Действий» в `RunHeader` — `Math.max(run.actionCount, длина журнала)`: число из
деталей отстаёт от опрашиваемого журнала (деталь обновляется по `run.updated`, журнал — раз в 3 с).
`RunInspector` передаёт длину журнала в `RunHeader` необязательным пропом `loggedActions`; без него шапка
работает по `run.actionCount`.

Ограничения:

- **Граница попытки видна по журналу, а не по номеру.** После повторного захвата, пока новая попытка не
  записала строку, которая режет отрезок (строку более раннего этапа или свой `llm.repo_conventions`),
  бар показывает этап прежней попытки (`queued` между попытками — все `wait`). Порядок записи в попытке:
  `vcs.fetch_diff` (на ретрае его нет — снимок есть), при промахе кэша `llm.call` за conventions, затем
  `llm.repo_conventions`, затем `context.build`. Поэтому при промахе кэша первая строка новой попытки —
  `llm.call` за conventions (тоже `analysis`): если последняя строка прежней попытки этапа `analysis`
  (включая `llm.review_output` и `review.postprocess`), регресса нет и бар остаётся на прежнем этапе до
  `llm.repo_conventions` новой попытки. При попадании в кэш первой строкой идёт сам `llm.repo_conventions`
  и режет отрезок сразу. Если прежняя попытка кончилась строкой этапа `publishing`
  (`github.publish_review`), разрыв закрывает любая первая строка новой; если строкой этапа `context`, кроме
  успешного `context.build`, — разрыва нет, бар и так на `context`; успешный `context.build` разобран в
  следующем пункте.
- **Ретрай после успешного `context.build` при промахе кэша conventions.** Прежняя попытка кончилась
  успешным `context.build` (аренда потеряна сразу после него), а на ретрае кэш conventions не сработал
  (изменился его ключ, например `agents.md` или версия промпта; если ключ тот же, кэш уже записан первой
  попыткой, и первой строкой идёт `llm.repo_conventions`, который режет отрезок сразу). Тогда первая строка
  новой попытки — `llm.call` за conventions (`analysis`), регресса нет, и старый `context.build` держит
  «контекст готов»: пока идёт `running`, бар показывает `analysis` до `llm.repo_conventions` новой попытки.
  Если эта попытка упала или была отменена внутри `llm.call` за conventions, `llm.repo_conventions` не
  появится, и итоговый бар покажет `analysis` вместо `context` (`finish`/`error`/`wait` или
  `finish`/`stopped`/`wait`). По строкам журнала это неотличимо от настоящей ошибки анализа
  (`vcs.fetch_diff`, `llm.repo_conventions`, `context.build`, `llm.call` с `response.error`), поэтому
  исправить это в UI нельзя: нужен маркер попытки на каждом действии в api.
- По той же карте при промахе кэша внутри одной попытки порядок `vcs.fetch_diff` → `llm.call` →
  `llm.repo_conventions` — регресс `analysis → context`: отрезок режется на `llm.repo_conventions`.
  Безвредно: отброшенные строки не отмечают ни «контекст готов», ни выход на публикацию.
- `llm.review_output` и `review.postprocess` api фиксирует в той же транзакции, что и переход в
  `publishing`, поэтому при `running` их в журнале нет.
- Склеенные события (`running → succeeded` без `publishing`, пропущенный `queued`) — норма: бар строится по
  текущему статусу, не по истории событий.
- Прогон, застрявший в `publishing` (например, без GitHub App), — не ошибка UI: бар честно показывает
  публикацию «в работе».

---

## 8. Мок

Файл: `src/app/mocks/app-state.ts`. Содержит:

- `mockRunSessions` — 7 сессий, по одной на каждый статус (включая «зависший» `running`);
- `mockFileDiffs` — 2 диффа, полученных прогоном фикстур-патчей через `fromPatch`;
- `mockSummaryOnlyRun` + `mockSummaryOnlyDiff` — summary-only прогон (`summaryOnly: true`) и его
  провод `/diff`: 3 файла с `patch: null`; в `mockRunSessions` не входит (там по одному прогону на статус);
- `mockReviewComments` — 3 комментария (два — с `ruleName`, один — без);
- `mockRunActions` — 34 действия в Duo-подобной последовательности (`makeDuoActions`,
  `src/entities/run/lib/duoActions.fixture.ts`: `get_pull_request`, `get_diff`, 19× `get_tree`,
  11× `get_blob`, `get_pull_request`, `post_review`), 2 действия с `responseRef` вместо `response`;
- `mockUiState` — состояние виджетов (выбранный прогон/файл, раскрытые узлы дерева);
- `mockRepositories` — 4 репозитория с полями настроек api#149 (ниже, «Репозитории, правила и
  история»).

Фрагмент одного `RunSession`:

```json
{
  "id": "11111111-1111-4111-8111-000000000004",
  "engine": "deep",
  "status": "succeeded",
  "startedAt": "2026-09-18T11:50:00.000Z",
  "finishedAt": "2026-09-18T11:55:12.000Z",
  "attempt": 1,
  "cancelRequested": false,
  "summaryOnly": false,
  "actionCount": 34,
  "errorCode": null
}
```

### Идущий и упавший прогоны (Refs ui#84)

Файл `src/app/mocks/mockRunTimeline.ts`. Оба прогона в `mockRunSessions` не входят (там по-прежнему 7), а
добавлены в `mockRunsListPage.items` (`mockRunsList.fixture.ts`); тесты `app-state.test.ts` с 7 сессиями и
34 действиями не затронуты.

Старые мок-прогоны (`mockRunSessions`) отдают журнал `makeDuoActions` с прежними именами инструментов
(`get_pull_request`, `get_tree`, …), которых нет в карте этапов (§7): бар по ним строится только по
статусу, и, например, `cancelled`-прогон «останавливается» на «Сборе контекста». Это артефакт мока, не
поведение модели; идущий и упавший прогоны ниже используют имена конвейера.

- **Идущий прогон** `11111111-1111-4111-8111-000000000011` (PR #41): чистая `walkingRunAt(elapsedMs, originMs?)`
  → `{ session, actions }`. Шкала: `queued` до 2 с; `running` с 2 с, по новому действию каждые 1,5 с —
  `vcs.fetch_diff`, `llm.call`, `llm.repo_conventions`, `context.build`, `llm.call`, `llm.call`; `publishing`
  с 11 с (в этот момент появляются сразу `llm.review_output` и `review.postprocess`); `github.publish_review`
  в 12,5 с; `succeeded` с 14 с. `finishedAt` задан только у терминального, `actionCount = actions.length`,
  `attempt: 1`, `trigger: 'webhook'`, `createdAt` — начало шкалы (раньше `startedAt` на 2 с очереди).
  Метки времени отсчитываются от реального старта, поэтому «зависшим» (§7) прогон не выглядит.
- **Часы** стартуют на первом запросе деталей или `/actions` этого прогона (`startWalkingRun`; повторный
  старт игнорируется). Запрос списка, диффа или комментариев часы не запускает: в списке прогон остаётся
  `queued`, пока его не откроют. Список отдаёт текущий статус прогона. `initMockTransport()` часы сбрасывает
  (`resetWalkingRun`) и таймеров не запускает.
- **Дифф** — демо-дифф с самого начала (снимок существует после `vcs.fetch_diff`). **Находки** пусты до
  `succeeded`, затем — 8 демо-находок и вердикт `blocking`. **Комментарии ревью** — `[]` до `succeeded`,
  затем 3 демо-комментария: до публикации инлайн-комментариев быть не должно.
- **Упавший прогон** `11111111-1111-4111-8111-000000000012` (PR #42), статичный: `failed`,
  `errorCode: 'llm_timeout'`, действия `vcs.fetch_diff`, `llm.repo_conventions`, `context.build` и `llm.call`
  с `response.error`; бар — `finish` / `error` / `wait`. `trigger: 'webhook'`, `createdAt` за минуту до
  `startedAt`, как у остальных мок-прогонов (#96). Комментариев нет.
- **`startMockRunEvents()`** (`mockTransport.ts`) стоит вместо SSE-потока, который на моках не открывается:
  интервал 500 мс (`MOCK_RUN_EVENTS_INTERVAL_MS`) и на каждую смену статуса идущего прогона вызов
  `applyRunUpdated({ runId, status })` из `runStreamConnect.ts`. Первое событие — начальный `queued`, затем
  по разу `running`, `publishing`, `succeeded`. Возвращает функцию остановки. Вызывается из `main.tsx`
  сразу после `initMockTransport()` внутри того же условия и того же динамического `import()`, поэтому в
  прод-бандл не попадает; из `useRunStream` его вызывать нельзя — там это протащило бы мок-код в прод.
  `verify:prod-bundle` ловит префиксы фикстурных id и чанк `mockTransport-*.js`; в `dist/assets` нет ни
  `000000000011`, ни `startMockRunEvents`.

### Репозитории, правила и история (Refs ui#93)

- **Репозитории** (`mockRepositories`, `app-state.ts`) — по одному на каждый случай страницы настроек:

  | Репозиторий (id `22222222-2222-4222-8222-…`) | `branchFilter`          | `severityThreshold` | Особенность                                                                                                       |
  | -------------------------------------------- | ----------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
  | `dmc-268-ui-t6` (`…0001`)                    | `['main', 'release/*']` | `all`               | статус правил `present`                                                                                           |
  | `dmc-268-api-t6` (`…0002`)                   | `[]`                    | `critical`          | статус правил `invalid`; 25 прогонов в истории                                                                    |
  | `dmc-268-infra-t6` (`…0003`)                 | `[]`                    | `warning`           | `installationAvailable: false`, `enabled`: фикстура `true`, отдаётся `false`; правила `unavailable`; прогонов нет |
  | `dmc-268-docs-t6` (`…0004`)                  | `[]`                    | `all`               | правила `missing`                                                                                                 |

  Рабочая копия мока хранит настройку `enabled` как есть (infra-t6 — `true`), а `GET` и ответ
  `PATCH` отдают итог `enabled AND installationAvailable` (`serveRepository`, как api `repository_settings.py:27`), поэтому
  infra-t6 читается с `enabled: false`, а `PATCH { enabled: true | false }` для неё отвечает
  `false` и сохраняет настройку (снаружи её не видно: она только для записи). У доступного репозитория ответ —
  настройка. `GET` и `PATCH` отдают копии (`structuredClone`), экспорт `mockRepositories` не
  меняется.

- **Статус правил** — `mockRulesStatuses` (`src/app/mocks/mockRulesStatus.ts`), по id репозитория:
  ui-t6 — `present`, текст с блоком `review-ignore` и три маски, ветка `release/2.1` (не
  `defaultBranch`); api-t6 — `invalid`, `policy_ignore_pattern_invalid` на строке 14 текста; infra-t6
  — `unavailable`, `policy_access_denied`, `retryable: false`, `sha: null`; docs-t6 — `missing`,
  `defaultsVersion`. «Файл изменился» (другой sha при втором запросе), временные сбои и `404`
  моделируют тесты через `withMockTransportOverlay`, а не мок.
- **Маршруты транспорта.** `GET /repos/{id}/rules-status` сверяется регуляркой раньше
  `GET /repos/{id}` (тот теперь тоже регулярка `^/repos/([^/]+)$`, а не `startsWith`), иначе
  `…/rules-status` читался бы как id; репозиторий не из мока — `404`.
- **`GET /runs`** (`listMockRuns`): путь режется по `?`, query разбирает `RunListQuerySchema`
  (негодный параметр — `422` с `loc: ['query', <поле>]`); фильтр по `pullRequest.repo`, `limit` по
  умолчанию 50 (умолчание api и его потолок мок повторяет: `limit` 1..100 через
  `RunListQuerySchema`, иначе `422`), курсор — непрозрачный `mock:<offset>`, чужой курсор — `422`.
  Режется полный `mockRunsListPage`, поэтому тесты фикстуры (`nextCursor: null`) остаются верны;
  идущий прогон по-прежнему подменяется текущим состоянием.
- **История api-t6** — 25 завершённых прогонов `larchanka-training/dmc-268-api-t6` в
  `mockRunsListPage` (`mockRunsList.fixture.ts`, `apiRepoRun`): PR #140…#116, id
  `11111111-1111-4111-8111-000000000100`…`…0124`, новые первыми, статусы `succeeded` / `failed` /
  `cancelled` / `skipped`, активных нет, движок только `fast` (продукт fast-only с PR #71). Под
  фильтром это две страницы (20 и 5); у infra-t6 прогонов нет — пустой отфильтрованный список.
- **`PATCH /repos/{id}`** (`validatePatchBody`): `UpdateRepositorySchema.safeParse` вместо `parse`;
  нарушение схемы — `422` с `loc: ['body', …путь Zod]` (нарушения `branchFilter` — пустая или
  длинная маска, больше 20 масок — сводятся к одному элементу `['body', 'branchFilter']`), затем
  мок-проверка масок по слитому контракту api (`contracts/openapi.yaml`, `RepositoryUpdate.branchFilter`
  и `_pattern_error` из api PR #156: пробелы, управляющие символы и одиночные суррогаты,
  `\ ~ ^ : ? [ ] { } !`, `..`, `//`, `***`, сегмент с точки, начало с `/` или `-`, конец на `/`, `.`
  или `.lock`, одиночный `@`; `*` и `**` допустимы) и повтор маски — `422` с одним элементом
  `loc: ['body', 'branchFilter']` без номера маски, как у api PR #156 (список проверяет один
  валидатор); под фильтром это «Сервер не принял значение». Настоящую грамматику судит api; мок
  повторяет его отказы, чтобы путь 422 был виден на моках. После `422` сохранённый репозиторий не
  меняется.

Валидация — тестом: `src/app/mocks/app-state.test.ts` прогоняет весь мок через Zod-схемы
(`RunSessionSchema`, `FileDiffSchema`, `ReviewCommentSchema`, `RunActionSchema`, `RepositorySchema`)
и проверяет, что `parse` не бросает исключение; статусы правил — `RulesStatusSchema` в
`mockRulesStatus.test.ts`.

---

## 9. Логирование / конфиг / роутер

**Логирование.** Библиотека — **pino** (browser mode). Названа как решение, **не установлена** —
issue прямо выносит подключение логирования за рамки спринта (non-goal).

**Конфигурация.** `VITE_API_BASE_URL` (`src/shared/config/env.ts`, Zod-схема `EnvSchema`, default
`/api`) — same-origin по умолчанию, требует на проде `location /api/` в nginx (координация с
ролью 3, см. §5). `PORT` для dev/preview — **зафиксированное в этом документе требование**, не
код: чтение `process.env.PORT` в `vite.config.ts` нуждается в `@types/node` в
`tsconfig.node.json` — follow-up (§11). Прод-порт
— зона ответственности инфры (роль 3, PR #28, сейчас `:8080` захардкожен).

**Роутер.** Установлен **react-router 8** (^8.4.0, peer react ≥ 19.2.7 — выполняется), настроен в `src/app/routes.tsx`. Лэйауты (`AppLayoutRoute`, `ProtectedLayout`, `PageFallback`, `RouteErrorFallback`) и обёртки страниц (`RoutedRepositoriesPage` и др.) вынесены в `src/app/layouts/`, чтобы файл роутера оставался чистой конфигурацией маршрутов без отключения правил Fast Refresh (`react-refresh/only-export-components`).

**Маршрут настроек репозитория (Refs ui#93).** `/repositories/:repoId/settings` — дочерний маршрут
`AppLayoutRoute` за `ProtectedLayout`; ленивая страница `RepositorySettingsPage` подключена обёрткой
`RoutedRepositorySettingsPage` (`src/app/layouts/RoutePages.tsx`). `repoId` — внешний ввод:
`RepositoryIdSchema` (`z.uuid()`) разбирает его до любого запроса. Не uuid — `Empty` «Некорректная
ссылка на репозиторий» с кнопкой-ссылкой «К списку репозиториев», запроса нет; валидный id, которого
нет в списке, — «Репозиторий не найден или недоступен». Содержимое страницы ключуется `repoId` (§2).
Боковое меню оставляет текущим раздел «Репозитории» (`AppSidebar` сравнивает адрес через
`startsWith`), `isSafeAuthReturnPath` адрес принимает, и вход возвращает на него
(`App.returnTo.test.tsx`). На страницу ведут «Настроить» в `RepositoryList` и прямой адрес; кнопка
«История проверок» в шапке ведёт на `/runs?repo=<fullName>` (§2, «Фильтр истории прогонов»).

**Сборка и чанки.** `vite.config.ts`: `build.rolldownOptions.output.codeSplitting`
(`vendor-react`, `vendor-query`, `vendor-zod`, `includeDependenciesRecursively: false`);
antd раскладывается по ленивым страницам, как на `main`. `chunkSizeWarningLimit: 500`.
Первая загрузка (script + modulepreload JS): ~961 кБ / ~310 кБ gzip vs `main` ~944 кБ / ~298 кБ gzip
(+~4 % gzip за живой SSE в корне, решение техлида).
Prod без демо: `pnpm build && pnpm verify:prod-bundle` (Refs #65, AC 3.3 / 3.5).

**CSP (`docker/nginx.conf`) и zod JIT (Refs #74, AC 2.6).** К заголовку добавлено `object-src 'none'`,
`img-src` сужен с `https:` до `https://avatars.githubusercontent.com` (решение техлида): единственная
удалённая картинка — аватар GitHub (`UserMenu`, `avatar_url` из OAuth-профиля). Остальное в заголовке
не менялось. zod 4.6.5 при создании первой `z.object` (на загрузке модуля, не на первом `parse`) пробует
`new Function('')`; под `script-src 'self'` это одно `securitypolicyviolation` (`blockedURI=eval`) на
загрузку документа. `src/shared/config/zodJitless.ts` (`z.config({ jitless: true })`) — первый импорт
`src/main.tsx` — отключает зонд. Одного первого импорта в бандле мало: Rolldown клал модуль в entry-чанк,
а `shared/config/env.ts` (первая `z.object`) — в общий чанк, который entry импортирует и исполняет
раньше, так что схема строилась до `jitless` (в Chrome по-прежнему одно нарушение `eval`). Поэтому
группа `vendor-zod` в `vite.config.ts` держит zod и `zodJitless.ts` в одном чанке (бандл −363 Б к
сборке без группы); `zodJitless.test.ts` проверяет, что её `test` ловит оба файла и не ловит `env.ts`.
Альтернатива, не принятая: `output.strictExecutionOrder: true` (+92 КБ, +5,6 %). Проба в Chrome 155 на prod
`dist` с настоящим заголовком из `nginx-unprivileged` (`docker run`): новый заголовок + новая сборка —
0 нарушений при загрузке `/`, аватар GitHub грузится без нарушений, `<img>` с другого https-хоста даёт
`img-src`, `<object>` (`data:` и same-origin) — `object-src`; старый заголовок + сборка без `jitless` —
одно нарушение `script-src` (`eval`), `img`/same-origin `object` не блокируются (`data:`-`object` режет и
старый заголовок через `default-src`). Замеры приложены к PR #81 (Refs #74).

**`sideEffects` убран (Refs #74, AC 2.20).** Ключ `"sideEffects": ["**/*.css"]` из `package.json`
удалён: выигрыша нет (`dist/assets` на тех же исходниках: с ключом 1 639 166 Б в 36 файлах, без ключа
1 638 001 Б в 33 файлах, −1 165 Б, −0,07 %; на исходниках до `zodJitless` −1 170 Б), а ключ молча
выкидывает импорты не-CSS модулей ради побочного эффекта — вызов `z.config` из `zodJitless.ts` пропадал
из бандла.

---

## 10. Тесты и гейты

Что покрыто тестами:

- схемы (`*.model.schemas.test.ts`) — фикстуры на принятие и отклонение по каждому инварианту §4;
- адаптеры диффа — round-trip `fromPatch`/`toHunks` (`fromPatch.test.ts`, `toHunks.test.ts`),
  `commentKey.test.ts`, `expandContext.test.ts`;
- `groupActions` на 34-действенной Duo-фикстуре — ожидание 6 узлов (2 группы: `get_tree`×19,
  `get_blob`×11 + 4 одиночных: `get_pull_request`×2, `get_diff`, `post_review`);
- `src/app/mocks/app-state.test.ts` — валидация всего мока схемами;
- тесты компонентов под jsdom: `DiffViewer.test.tsx`, `RunDiff.test.tsx`, `RunInspector.test.tsx`,
  `RunHeader.test.tsx`, `InlineComment.test.tsx`, `App.test.tsx`, `LoginPage.test.tsx`,
  `CallbackPage.test.tsx`, `RepositoriesPage.test.tsx`, `RepositoryList.test.tsx`,
  `RunsPage.test.tsx`, `UserMenu.test.tsx`, `AppSidebar.test.tsx`;
- тесты сторов и утилит: `auth/model/store.test.ts`, `theme/model/store.test.ts` (включая `getInitialTheme`),
  `client.test.ts`, `formatError.test.ts`, `zodJitless.test.ts` (`jitless` включён, первый импорт
  `main.tsx`, группа `vendor-zod` в `vite.config.ts`).

Гейты (`AGENTS.md`): `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test` (`vitest run`),
`pnpm build`. Итого 239 тестов в 43 файлах (`pnpm test`, 2026-10-03).

CI (`.github/workflows/ci-cd.yml`, job `UI quality`) гоняет те же гейты по порядку, последний шаг после
`Build` — `Verify prod bundle` (`pnpm verify:prod-bundle`, `scripts/verify-prod-bundle.sh`): падает без
`dist`, на демо-тексте/токене и на префиксах фикстур `11111111-…`, `22222222-…`, `33333333-…`, а также
когда чанк с `env.ts` не импортирует единственный чанк с вызовом zod `jitless` (и это не один файл с
вызовом впереди): порядок «`jitless` раньше первой схемы» зависит от раскладки чанков, а не от исходников.

Vitest настроен без `globals`, поэтому RTL не чистит DOM сама — в jsdom-тестах (`DiffViewer.test.tsx`,
`RunDiff.test.tsx`, `RunInspector.test.tsx`) `afterEach(cleanup)` вызывается явно.

jsdom-стабы (`src/test/setup.ts`, подключён через `test.setupFiles` в `vite.config.ts`;
proof-run, п. (d)): `window.matchMedia` (нужен `Descriptions`/`useBreakpoint`
antd) и `ResizeObserver` (нужен `Tree` через `@rc-component/virtual-list`) — jsdom 30.1.0 их не
предоставляет.

---

## 11. Действующие контракты и follow-up задачи

- **TypeScript 7, остаток** — компилятор уже 7.0.2 (#47 закрыт), но typescript-eslint работает на 6.0.3
  через обёртку `@typescript/typescript6` (Ф-11); убрать её, когда typescript-eslint поддержит TS 7
  ([typescript-eslint#10940][tse-10940]). Отдельной задачи нет; сигнал —
  `npm view typescript-eslint peerDependencies` начинает допускать 7.x.
- **`steiger`** — FSD-линтер, форматирует нарушения правил §1 автоматически; не подключён.
- **`PORT` в `vite.config.ts`** — нужен `@types/node` в `tsconfig.node.json` (роль 4); не сделано.
  С TS 6.0 `types` по умолчанию `[]`, поэтому пакет придётся назвать в `types` явно.
- **SSE-мост** (§2, Ф-14) — реализован: `RunStreamBridge`, `runStreamConnect.ts`, лимит `401`,
  reconnect, `Last-Event-ID`, keep-alive watchdog; см. §2 и [`docs/plans/65-api20-comment.md`](plans/65-api20-comment.md).
- **Прогресс-бар шагов и живой список прогонов (ui#84)** — реализовано (§2, §7, §8): три этапа по статусу и
  журналу `/actions`, опрос `/actions` раз в 3 с, пока прогон активен, `run.updated` обновляет и список.
  Остаётся: событие шага пайплайна — его в api пока нет (api#97), до контракта ход виден по опросу;
  граница попытки определяется по журналу — регресс этапа или второй `llm.repo_conventions` (§7,
  «Ограничения»); список после переподключения SSE обновляется только со следующим `run.updated` или по
  `staleTime`.
- **`pages/review/ReviewPage.tsx`** — файл сохранён, но маршрут `/review` монтирует redirect
  (mock → demo run, prod → `/runs`); полноценная страница не в прод-маршрутизации (Refs ui#65).
- **Fetch-клиент и авторизация** (Ф-15) — контракт авторизации и сессии ([решение техлида api#20 D4][tl-2026-09-27-api20] и `/api/auth/*` в [`openapi.yaml`][openapi], реализован в PR #55 и #63):
  - вход — GitHub App user authorization без OAuth scopes; `state` SPA генерирует сама, хранит в
    `sessionStorage` и сверяет на `/auth/callback`;
  - `POST /api/auth/github/callback { code }` → `AuthSession`
    (`{ accessToken, tokenType: 'Bearer', expiresIn, user }`) и ротируемый refresh-токен в
    httpOnly-cookie `refresh_token` (`Path=/api/auth`);
  - access-токен (JWT, 15 мин) хранится только в памяти (дефолт, утверждённый с планом api#20), не
    в `localStorage`/`sessionStorage`; на остальных `/api/*` — `Authorization: Bearer`;
  - запросы к `/api/auth/*` идут с `credentials: 'include'`;
  - `401` → один общий на все запросы `POST /api/auth/refresh`, затем один повтор исходного
    запроса; refresh не удался — выход;
  - старт приложения — `POST /api/auth/refresh`, затем `GET /api/auth/me` (`Me`: пользователь и
    `workspaces`); выход — `POST /api/auth/logout`, затем сброс токена в памяти;
  - fail closed: ошибка callback, refresh или `/me` оставляет пользователя неавторизованным.
- **Контракт репозиториев** (Ф-17) — [`openapi.yaml`][openapi], реализация — api#34; в UI реализовано в PR #55 и #63:
  - подключение — ссылка на установку GitHub App; `POST /api/repos` нет;
  - список — `GET /api/repos` → `Repository[]` (массив без обёртки);
  - настройки — `PATCH /api/repos/{id}` (`RepositoryUpdate`, все поля необязательны): `enabled`,
    `defaultEngine`, `waitForCi: auto | always | never`, `maxComments` 1..10,
    `reviewEvent: COMMENT | REQUEST_CHANGES`; с ui#93 они правятся на странице
    `/repositories/:repoId/settings` (§2, §9), а не в модальном окне списка; `defaultEngine` UI
    показывает текстом и не отправляет;
  - настройки ревью (api#149, контракт api PR #156; §5, «Контракт api#149 (api PR #156)»):
    обязательные `branchFilter`, `severityThreshold` и только для чтения `installationAvailable` в
    `Repository`, первые два — в `RepositoryUpdate`; Zod-схемы — из PR #106;
  - provisional (ui#93; §5, «Требования UI к api#150»): `GET /api/repos/{id}/rules-status`. Пока api
    его не отдаёт, блок правил вместо запроса показывает строку;
  - история репозитория — `GET /api/runs?repo&cursor&limit` (`repo` = `fullName`): UI листает по
    `nextCursor`, по 20 за запрос (§2);
  - follow-up ui#93: после ответа api#150 сверить схему статуса правил с сервером и снять пометки
    `// provisional (ui#93)`, включить блок правил вне моков (гейт `mocksEnabledAtRuntime` в
    `RepositorySettingsPage`); решения (а)–(в) api#149 — в §5;
  - PR репозитория — `GET /api/repos/{id}/pulls?state&cursor` → `{ items, nextCursor }`, у
    элемента `latestRun { id, status, verdict } | null` (в клиенте пока не реализовано, открытый follow-up).
- **Экраны 4–5** (правила, метрики) — области [SD §2][sd-2]. Правила — частично (ui#93): статус
  `.review/rules.md` на странице настроек репозитория, на моках до api#150 (§2, §5); редактора
  правил и экрана метрик нет. `src/pages/` содержит экраны для реализованных областей (вход, коллбэк,
  репозитории и их настройки, прогоны, ревью).
- **Summary-only прогоны** (diff > 3000 строк, [SD §12][sd-12]) — схемы, адаптер и `RunDiff` поддерживают
  с #42 (§4, §6); страница `/runs/:runId` (`RunDetailPage`) передаёт `run.summaryOnly` и findings в `RunDiff`.
- **Фильтры замечаний** (ui#84, часть про фильтры) — реализованы: файлы, критичность D3 и поиск над
  диффом, состояние в URL (§2, §6). Остаются как были и в эту задачу не входят: комментарии к файлам
  без диффа или отсутствующим в `/diff` по-прежнему не рисуются; `selectedFile` в
  `useDiffViewerStore` по-прежнему не используется; `pages/review/ReviewPage` не подключена к
  маршрутам. Во время набора страница не перерисовывается: рисуется только поле, а страница — раз
  за паузу, когда `q` записан в URL (все `DiffViewer` без мемоизации); замеров на больших диффах не
  делали.
- **antd `List` на summary-only прогоне** пишет в консоль предупреждение об устаревании. Так было
  с #42, к фильтрам это не относится; follow-up — заменить `List` в `RunDiff` (отдельной задачей).
- **`POST /api/runs/{id}/rerun`** — есть в [`openapi.yaml`][openapi] (реализация — api#34): `202` →
  новый `RunSession` в `queued` для того же PR и `headSha`; `409`, если у PR уже есть активный
  прогон. В `src/shared/api/endpoints.ts` его нет (`endpoints.runs` содержит только `cancel`) —
  добавить эндпоинт в контракт до реализации UI повторного запуска.

---

## 12. Покрытие issue #17

| Пункт AC/DoD issue #17                                                                  | Где в этом документе / коде                                                  |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `FRONTEND_ARCHITECTURE.md` подан пул-реквестом                                          | этот файл, PR #31                                                            |
| Структура слоёв обоснована, есть схема и правила зависимостей                           | §1                                                                           |
| Разделение состояния: Zustand vs серверный кэш, TanStack Query — дополнение, не замена  | §2                                                                           |
| UI-кит назван и обоснован, альтернатива рассмотрена, выбор — на команду                 | §3; выбор подтверждён техлидом в #46 — Ф-2                                   |
| Zod-схемы `DiffLine`, `FileDiff`, `ReviewComment`, `RunSession`, `RunAction` выписаны   | §4; код — `src/entities/{diff,review,run}/model/schemas.ts`                  |
| Отдельный раздел с требованием к API, передан ролям 6 и 1                               | §5; опубликовано комментариями в PR #30 и api PR #4                          |
| Компоненты просмотрщика диффа: подсветка, инлайн-комментарий, дозагрузка контекста      | §6; код — `src/widgets/diff-viewer/`                                         |
| Инспектор прогонов: шапка, дерево, схлопывание, статусы queued/running/succeeded/failed | §7; код — `src/widgets/run-inspector/` (статусов фактически 7, см. §4 и Ф-3) |
| Мок состояния приложения с заполненными данными                                         | §8; код — `src/app/mocks/app-state.ts`                                       |
| Базовые компоненты для кодовых блоков и диффов (или структура папок)                    | §6, §1 (дерево `src/widgets/diff-viewer/`)                                   |
| Логирование фронтенда названо, конфигурация через env зафиксирована                     | §9                                                                           |
| Пул-реквест отревьюен минимум одним участником команды                                  | PR #31: approve `createunix` 2026-09-19                                      |
| `FRONTEND_ARCHITECTURE.md` смержен в `main`                                             | PR #31, 2026-09-20                                                           |
| Базовые компоненты/структура папок для диффов в репозитории                             | `src/widgets/diff-viewer/`, см. §1                                           |
| Мок состояния в репозитории                                                             | `src/app/mocks/app-state.ts`                                                 |
| ПР отревьюен, замечания учтены/отклонены в треде                                        | PR #31: approve без замечаний, тредов нет                                    |
| Требование к API диффа передано ролям 6 и 1 письменно                                   | §5; комментарии в PR #30 и api PR #4 (2026-09-18)                            |
| Линтеры и сборка проходят на ветке (в объёме, настроенном ролью 4)                      | проходят в `main` — гейты §10                                                |
| Статус задачи в Projects #12 обновлён                                                   | issue #17 закрыт 2026-09-20, в Projects — Done                               |
| Решения, требующие консенсуса (UI-кит, стилевая парадигма), вынесены на команду         | вынесены в #46, решены техлидом 2026-09-24 — Ф-2, Ф-13 (§0, §3)              |

[sd]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md
[sd-1]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md#1-решения
[sd-2]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md#2-границы-ответственности
[sd-6.4]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md#64-состояния-run
[sd-8.2]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md#82-github-события-и-права
[sd-11]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md#11-данные-согласование-с-erd-роли-6
[sd-12]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md#12-контракт-api--ui
[sd-14]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/SYSTEM_DESIGN.md#14-развёртывание-v1
[ps]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/PIPELINE_SPEC.md
[ps-10]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/PIPELINE_SPEC.md#10-якорь-находки-d6
[ps-11]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/docs/PIPELINE_SPEC.md#11-вердикт-и-бейджи-d3
[openapi]: https://github.com/larchanka-training/dmc-268-api-t6/blob/main/contracts/openapi.yaml
[tse-10940]: https://github.com/typescript-eslint/typescript-eslint/issues/10940
[tse-12803]: https://github.com/typescript-eslint/typescript-eslint/pull/12803
[ts-7.0-side-by-side]: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0
[tl-2026-09-24]: https://github.com/larchanka-training/dmc-268-api-t6/issues/19#issuecomment-5813179201
[tl-2026-09-24-10]: https://github.com/larchanka-training/dmc-268-api-t6/issues/19#issuecomment-5817060000
[tl-2026-09-24-46]: https://github.com/larchanka-training/dmc-268-ui-t6/issues/46#issuecomment-5819780647
[tl-2026-09-27-api20]: https://github.com/larchanka-training/dmc-268-api-t6/issues/20#issuecomment-5860133963
[req-ui-30]: https://github.com/larchanka-training/dmc-268-ui-t6/pull/30#issuecomment-5725153632
[req-api-4]: https://github.com/larchanka-training/dmc-268-api-t6/pull/4#issuecomment-5725153769
