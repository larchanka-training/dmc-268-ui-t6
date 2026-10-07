# Implementation Plan: Issue #65 — подсветка диффа, страница прогона, P3-хвосты

Refs: [larchanka-training/dmc-268-ui-t6#65](https://github.com/larchanka-training/dmc-268-ui-t6/issues/65)

## Overview

Задача объединяет три независимые вертикали с разной серьёзностью (P1 / P2 / P3). Каждая часть сдаётся отдельным PR с `Refs #65` и отметкой чекбоксов AC своей части. Рекомендуемая ветка-префикс: `fix/65-<slug>` (kickoff в issue: `fix/-ui-run-page` — уточнить у техлида единый нейминг).

Текущее состояние репозитория (на момент планирования):

- `refractor ^5.0.0` + `react-diff-view ^3.3.3`: `tokenize` падает; `tokensForHunks.ts` глотает ошибку; тест мокает `tokenize`.
- `RunDetailPage` — только `RunHeader` + `RunDiff`; `RunInspector` / `ActionTree` не смонтированы.
- `endpoints.runs` уже описывает `actions`, `actionResponse`, `comments`, `files`, `cancel`, `stream`; в `runApi` есть схемы, но нет хуков `useRunActions`, rerun, SSE, mutations.
- `rerun` отсутствует в `endpoints.ts`, хотя есть в `dmc-268-api-t6/contracts/openapi.yaml`.
- `/review` всегда редиректит на `DEMO_RUN_ID`.
- Часть 3 — набор auth/layout/build/diff-edge-case правок из ui#62 и ui#57.

## Architecture Decisions

| Решение                 | Варианты                                                             | Выбор                                                                                                                             | Обоснование                           |
| ----------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Совместимость подсветки | Downgrade `refractor` до 3.x; адаптер hast→children; форк `tokenize` | **Адаптер `refractorForDiffView`**: refractor 5 остаётся; `highlight()` отдаёт `root.children` массив для `react-diff-view` 3.3.3 | AC + минимальный риск отката grammars |

**Refractor / react-diff-view (PR #70, P2):** зафиксирована пара `refractor@^5` + `react-diff-view@^3.3.3`.
`refractorForDiffView` (`src/widgets/diff-viewer/lib/refractorForDiffView.ts`) — единственная точка
совместимости: `highlight()` возвращает `root.children` (HAST-массив), который ожидает
`react-diff-view` 3.x `createRoot`, вместо корневого `root`-элемента refractor 5. Downgrade refractor
3.x не выбран (грамматики, lockfile). Регрессия — unit/DOM-тесты `tokensForHunks` без мока `tokenize`.
| Ошибки токенизации | `undefined` + console | **`console.error` (или shared logger) + `undefined`** | AC: не глотать молча; UI без подсветки для unknown lang |
| `jsx` в `fileLanguage.ts` | register `jsx` grammar; map `jsx` → `tsx` | **register или убрать из маппинга** — одно из двух, с тестом на `.jsx` |
| Большие диффы | Worker; отключение highlight | **Синхронный бюджет** `MAX_LINES_FOR_SYNC_HIGHLIGHT` и `MAX_SYNC_HIGHLIGHT_TOTAL_LINES` = 1000 в `tokensForHunks.ts` (~0.4s tokenize в Node); выше — без подсветки. `useTokenizeWorker` — follow-up при регрессии в браузере | AC ui#57 / #65 |
| SSE | `EventSource` | **fetch + ReadableStream / полифил SSE с Bearer** (FRONTEND_ARCHITECTURE §2) | Заголовок Authorization; переподписка после refresh (~15 min) |
| Инвалидация run | `['runs']` prefix | **`['runs', runId]`** для detail; stream invalidates `runQueryKeys.detail(id)`; не инвалидировать весь префикс `['runs']` при disabled diff | Issue «мины» |
| PR «Ревью» в prod | `/runs` list; скрыть пункт | **`DEMO_RUN_ID` и `/review` только при `isMockMode()`**; иначе Navigate `/runs` или убрать пункт sidebar | Отдельный первый PR части 2 допустим |
| CSP | nginx only | **Заголовок в `docker/nginx.conf`**, согласование с DevOps (#65 AC); `style-src` для antd CSS-in-JS | Проверка в браузере обязательна |
| Vendor chunks | Поднять limit | **`manualChunks` / rolldown split для `antd` + `@ant-design/icons`**, убрать оправдание `chunkSizeWarningLimit: 700` | AC часть 3 |
| `ReviewPage.tsx` / сироты | Удалить | **Решение в plan/todo Task 3.x** — не удалять до записи в docs (часть 2 монтирует RunInspector) | Правило репозитория |

## Dependency Graph (между частями)

```
Часть 1 (подсветка)     ── не блокирует ──┐
Часть 2 (run page)      ── не блокирует ──┼──► закрытие #65 (все AC)
Часть 3 (хвосты)        ── частично ─────┘
         │
         └── diff/run edge cases (3.x) логичнее после 2.x API wiring,
             но auth/layout (3.a) параллельны с 1 и 2
```

**Рекомендуемый порядок PR:**

1. **PR-1 (P1):** подсветка + DOM-тесты + refractor/jsx + logging + worker/threshold.
2. **PR-2a (P2, быстрый):** навигация «Ревью» / mock-only demo run.
3. **PR-2b (P2):** endpoints rerun + hooks (actions, response, comments, files, cancel, stream) + монтирование RunInspector + rerun/cancel UI.
4. **PR-2c (P2):** `RunDetailPage.test.tsx` и сценарии ui#57.
5. **PR-3a (P3):** auth/layout/env/vendor/CSP (можно параллельно с 2b после 2a).
6. **PR-3b (P3):** diff/run polish (findings вне диффа, ошибки, FSD keys, href, docs, api#20 comment).

## Phase Structure

### Phase 1 — P1 Подсветка (fail fast)

Цель: в DOM `.diff-code` появляются `span.token` для `.ts` и `.py` в unified и split; регрессия ловится без мока `tokenize`.

Ключевые файлы:

- `src/widgets/diff-viewer/lib/tokensForHunks.ts`
- `src/widgets/diff-viewer/lib/tokensForHunks.test.ts` (+ новый integration/DOM test)
- `src/entities/diff/lib/fileLanguage.ts`
- `package.json` / lockfile (версия refractor)
- `src/widgets/diff-viewer/ui/*` (передача tokens, worker)

### Phase 2 — P2 Страница прогона

Цель: страница сессии как в ui#57 + лекция: лог действий, live status, rerun/cancel, load-more, comments; sidebar без фантомного прогона.

Ключевые файлы:

- `src/pages/runs/RunDetailPage.tsx`
- `src/entities/run/api/index.ts` (+ mutations, stream hook)
- `src/shared/api/endpoints.ts` (+ `rerun`, опционально `repos.pulls`)
- `src/widgets/run-inspector/*`
- `src/widgets/diff-viewer/*` (`onLoadMore`, comments)
- `src/app/routes.tsx`, `AppSidebar.tsx`, `shared/config/demoRun.ts`, `shared/lib/env.ts`
- `src/shared/api/mockTransport.ts` (расширить моки под новые эндпоинты)

Контракт: `dmc-268-api-t6/contracts/openapi.yaml` — `RunAction`, `RunUpdatedEvent`, rerun/cancel 409.

### Phase 3 — P3 Хвосты

**3.A Auth & layout:** `client.ts`, `store.ts`, `CallbackPage.tsx`, `RouteLayouts.tsx`, `UserMenu.tsx`, `LoginButton.tsx`, `main.tsx`, `env.ts`, тесты init/logout/me.

**3.B Build & edge:** `vite.config.ts`, `docker/nginx.conf`, `DiffViewer.tsx`, `RunDiff.tsx`, `RunDetailPage.tsx`, `extractNewSideLines.ts`, ESLint deep-import rule, `RunHeader.tsx`, `entities/run/index.ts`, `FRONTEND_ARCHITECTURE.md`, комментарий в api#20.

## Checkpoints

### Checkpoint A — после Phase 1

- [ ] `pnpm vitest run src/widgets/diff-viewer` — есть тест с реальным refractor/tokenize
- [ ] Ручная проверка: `VITE_USE_MOCKS=true pnpm dev` → `/runs/<id>`, `.ts` / `.py`, unified + split
- [ ] Gates: lint, check-types, format:check, test, build

### Checkpoint B — после Phase 2

- [ ] Моки: actions tree, stream (fake), rerun/cancel, load more, comments
- [ ] Без моков: тест навигации — sidebar не ведёт на несуществующий run
- [ ] `RunDetailPage.test.tsx` зелёный
- [ ] Gates полные

### Checkpoint C — после Phase 3

- [ ] Один `/me`, нет logout на анониме; prod bundle без «Демо-вход»
- [ ] CSP smoke в preview/docker
- [ ] Все AC #65 отмечены; docs синхронизированы
- [ ] Gates + CI на PR

## Risks and Mitigations

| Risk                                          | Impact | Mitigation                                                                      |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| refractor 3.x не ставится с текущим toolchain | High   | Адаптер + тест; задокументировать в PR                                          |
| SSE обрывается при refresh                    | Med    | Подписка в hook с зависимостью от token; reconnect                              |
| Инвалидация `['runs']` сносит list cache      | Med    | Точечные ключи из `runQueryKeys`                                                |
| CSP ломает antd                               | High   | `style-src 'unsafe-inline'` или nonce policy по согласованию DevOps; browser QA |
| 409 rerun/cancel без staging run              | Low    | Мок-тест обязателен; смоук после api#52                                         |
| Параллельные PR конфликтуют в `RunDetailPage` | Med    | Разбивка 2a/2b/2c; rebase order                                                 |

## Open Questions

- [x] Нужен ли в UI список PR репозитория (`GET /repos/{id}/pulls`) или отложить за scope #65? **Вне scope #65** — зафиксировано в FA §0 Ф-19.
- [ ] Единое имя ветки: `fix/65-*` vs `fix/-ui-run-page` из kickoff?
- [ ] CSP: финальная политика от @aleksei-antipin — какие origin для API/ws?
- [ ] Судьба `pages/review/ReviewPage.tsx`: redirect vs delete vs future route — **решение Phase 3:** оставить файл; маршрут `/review` ведёт на `ReviewRedirect` (mock → demo run, prod → `/runs`); полноценная `ReviewPage` не монтируется до отдельного решения продукта (Refs #65).

## External Dependencies (не блокируют merge UI PR)

- ui#66 — CI quality gate (вакуумные тесты)
- api#52 — staging смоук rerun/cancel/stream
- api#54 — SSE auth на сервере
- api#20 — комментарий об изменении контракта (часть 3)

## Definition of Done (issue-level)

- [ ] `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build` зелёные
- [ ] PR на часть: 1 approve, треды закрыты
- [ ] Документация обновлена где затронута
- [ ] Чекбоксы AC #65 отмечены в PR body
- [ ] Issue закрывает техлид после всех частей

## References (codebase)

- `src/widgets/diff-viewer/lib/tokensForHunks.ts` — silent catch
- `src/entities/run/api/index.ts` — ключи уже близки к FRONTEND_ARCHITECTURE §2
- `src/shared/api/endpoints.ts` — нет `rerun`
- `docs/FRONTEND_ARCHITECTURE.md` — stream, actions, invalidate pattern
