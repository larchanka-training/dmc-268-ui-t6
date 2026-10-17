# Implementation Plan: #110 — сохранять mock rerun

Refs: [larchanka-training/dmc-268-ui-t6#110](https://github.com/larchanka-training/dmc-268-ui-t6/issues/110).

## Overview

Сохранить новый mock-прогон в памяти транспорта, чтобы переход после
«Перезапустить» открывал queued-прогон, а последующие GET detail/list находили
тот же объект до перезагрузки страницы. Контракт API и зависимости не меняются.

## Baseline, approval and ownership

- Ветка `fix/110-mock-rerun` создана от актуального
  `origin/main@5150ddc70572cc5638c755586c08250814924c71` (2026-10-16).
- Исходный untracked `.pnpm-store/` и чужие документы плана #86 не изменять.
- Пользователь заранее одобрил план и agent-loop; повторное одобрение не нужно.
  Описание PR написать по-русски, заголовки `What` / `Why` / `How to verify` /
  `Refs` сохранить. Не закрывать issue и не выполнять merge.
- Пересечение с открытыми PR согласовано до правок:
  [PR #106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106#issuecomment-6225490836),
  [PR #109](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109#issuecomment-6225491914).
  Перед review/publication повторить ownership check и rebase на main.

## Current behavior and dependency path

`RunControls` вызывает entity rerun mutation и переходит на `/runs/{id}`;
страница запрашивает detail через Zod boundary. `mockTransport` возвращает из
POST новый queued session с постоянным ID `…0099`, но `findRunSession` и GET list
читают только статические fixtures. Поэтому новый detail получает 404; повторный
rerun не видит созданного active-прогона. Изменять навигацию или Query cache не нужно.

До первого изменения кода воспроизвести это в mock-режиме браузера на terminal
fixture `…0004`: нажать «Перезапустить», записать новый URL и ошибку detail.
Это обязательный первый verification step; статическое чтение кода не заменяет
browser reproduction.

## Architecture decisions and acceptance criteria

1. Завести рабочую копию sessions в `src/app/mocks/mockTransport.ts` по аналогии
   с существующим `repositories`; reset через `initMockTransport`, fixtures не
   мутировать. GET detail, GET list и active-run check используют один источник;
   walking-run по-прежнему получает живое состояние из timeline.
2. У каждого успешного rerun новый валидный UUID; сохранить PR/engine/model,
   увеличить attempt, выставить `status: 'queued'`, `trigger: 'rerun'`, текущий
   `createdAt`, `startedAt: null`, `finishedAt: null`, `cancelRequested: false`.
   Сбросить результаты предыдущего запуска (`actionCount: 0`, `errorCode: null`).
   `rerun` — существующий wire enum в UI schema и API OpenAPI; `manual_rerun`
   не является значением контракта. UI использует camelCase для timestamps.
3. Новый session находится в GET `/runs/{id}` и GET `/runs` до re-init/page
   reload; ответы не дают потребителю изменять рабочую копию. Повторный POST
   для того же PR, пока есть queued/running/publishing run, возвращает
   `ApiError(409, 'Conflict', { detail: 'Active run already exists' })`.
   PR идентифицировать по repo + number; другие PR не блокировать.
   Проверяем terminal source из основного flow; существующее исключение source ID
   в active-sibling проверке сохраняется.

Очередной detail использует существующий builder: findings пусты, summary,
verdict и budget отсутствуют как результат ревью. Автопрогресс, изменение cancel,
localStorage, фильтрация/пагинация списка, fixture redesign и новые UI элементы
в scope не входят. При необходимости затронуть соседнее поведение сначала
обосновать его зависимость от AC.

## Test-first slice and verification

Подробные tasks и evidence: [110-todo.md](110-todo.md).

- Один cohesive slice: browser reproduction → RED transport regression →
  минимальная реализация → GREEN. Public seam: `apiClient` + `endpoints` после
  `initMockTransport`, без экспорта внутреннего хранилища.
- Обязательный regression POST rerun → GET returned ID, дополнительно GET list,
  точные queued-поля, повторный 409, разные PR/UUID, reset и fixture immutability.
  Ожидания — literal contract values; время фиксировать через Vitest.
- Проверить пользовательскую навигацию, возврат к списку, повторное открытие
  нового detail и reset после reload в браузере; desktop/390px, обе темы и
  применимые keyboard/focus/reduced-motion проверки frontend rules §3b.
- Все gates: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`,
  `pnpm build`, затем `pnpm verify:prod-bundle`.
- Независимые Standards/Spec reviews после GREEN; исправления повторно
  проверить, затем publisher создаёт PR с русским описанием.
- Полный suite выявил связанные ожидания в `src/pages/runs/RunDetailPage.test.tsx`:
  три теста привязаны к старому постоянному ID, ещё один меняет экспортированный
  fixture для имитации server update. По согласованию координатора добавлен
  только этот тестовый файл: UUID фиксируется на границе случайности, статус
  подменяется через transport overlay. Production scope не расширен;
  открытые PR #106/#109 этим файлом не владеют.

## Risks and reset strategy

| Risk                                                | Mitigation                                                                                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Shared fixture mutation leaks between tests         | Clone on initialization, copy responses, regression for unchanged fixtures and reset                                              |
| Working snapshot freezes walking timeline           | Preserve live walking-session accessor for list/detail/conflict detection; run timeline regressions                               |
| Constant IDs overwrite other reruns                 | Generate unique UUID, test successful reruns of two different PRs                                                                 |
| Active conflict compares number across repositories | Compare repo + number and active statuses against current sessions                                                                |
| Untracked store breaks raw format gate              | Record exact baseline failure, use temporary external ignore only for repository-only evidence; do not alter store or repo ignore |
| Concurrent PR changes shared mocks                  | Coordinating comments already posted; keep diff narrow, recheck ownership and rebase before review                                |

Reset is page reload or `initMockTransport()`; created sessions must disappear
and original fixtures remain intact. If a change fails verification, revert only
the issue's hunks, leaving preexisting untracked paths untouched. No open questions.

## PR #124: follow-up по трём review comments (2026-10-17)

Ветка rebased на `origin/main@6cf6139`. Пользователь поручил исправить все
замечания и обновить этот же PR через agent-loop. Follow-up план и public test
seams одобрены пользователем 2026-10-17: «Да, выполнить весь план».
Следующий scope дополняет исходное исключение cancel: отмена должна
сохранять состояние созданного rerun. UI, API contract и зависимости не меняются.
Исходный untracked `.pnpm-store/` остаётся вне работы.

Fixed baseline для follow-up review: `83e903e731face546a88b95b656d751525b338e7`.
Ownership проверен координатором: открытый PR #123 не владеет mock transport и
его тестом. Backend contract подтверждает persistent queued → cancelled и порядок
`created_at DESC, id DESC`; backend edits не требуются.

Подтверждаемые public test seams: `initMockTransport()`, `apiClient` + `endpoints`
из существующего transport suite; экспортированные `rerunRun`, `cancelRun`,
`fetchRunDetail`, `fetchRunList`, `fetchRunActions` доступны для проверки client
contract. Внутреннее хранилище не экспортировать; comments проверять через
существующий endpoint. In-memory transport не требует HTTP/Postman setup.

1. **Сохранить отмену.** RED regression через public transport: rerun terminal
   fixture → cancel созданного queued run → GET detail/list сохраняют
   `status: 'cancelled'`, `cancelRequested: true` → следующий rerun того же PR
   успешен. Сохранить изменение в рабочей коллекции без мутации fixtures/ответов;
   walking session продолжает принадлежать timeline.
2. **Не выдавать чужие результаты.** Созданные этим транспортом rerun sessions
   получают пустые `/actions` и `/comments`; detail уже имеет пустые findings и
   `actionCount: 0`. RED regression проверяет эти ответы до и после отмены;
   отдельные assertions сохраняют существующие fixture results и walking
   progression. Различать созданные sessions и fixtures по происхождению, а не
   только по статусу или `trigger`.
3. **Показывать новый run первым.** Добавлять rerun в начало рабочей коллекции.
   RED regression создаёт два run разных PR и проверяет первые два ID в GET list
   в обратном порядке создания, сохраняя относительный порядок fixtures.

Все три исправления затрагивают общий transport, поэтому выполнять последовательно
test-first в `src/app/mocks/mockTransport.ts` и co-located test; существующий
walking timeline suite служит проверкой совместимости. После GREEN выполнить
шесть frontend gates, независимые Standards/Spec reviews и повторную проверку
после исправлений. Проверить ownership открытых PR перед product edits и повторно
перед публикацией; rebase на свежий main. Publisher обновляет существующий PR #124
с русским описанием и отвечает в каждом из трёх threads с SHA исправления,
не разрешая threads и не выполняя merge/закрытие issue. Подробные AC и evidence
продолжаются в [110-todo.md](110-todo.md).
