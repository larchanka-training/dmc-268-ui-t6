# Implementation Plan: #105 — сообщение конфликта повторного запуска

Refs: [larchanka-training/dmc-268-ui-t6#105](https://github.com/larchanka-training/dmc-268-ui-t6/issues/105).

## Overview

Уточнить фиксированное русское сообщение HTTP 409 только для `rerun`, перечислив
все четыре возможные причины отказа. Контракт не различает причины, поэтому
клиент не разбирает английский `detail`. Изменение ограничено функцией
`runMutationErrorMessage`, её entity/widget regression tests и этими документами плана.

## Baseline and ownership

- Проверено 2026-10-15: текущий checkout — `fix/92-refresh-access@d62981d`;
  единственный исходный untracked путь `.pnpm-store/` оставить нетронутым.
- Актуальный remote UI `main`: `24af7b75e6c20a6526a9cf31955aa220c1fde87b`.
  В нём сохранено исходное сообщение 409. Перед разработкой обновить main и
  создать отдельную ветку `fix/105-rerun-conflict-message` от него; не включать
  историю задачи #92 и не сбрасывать существующую ветку.
- Открыты UI PR #106 и #107. PR #107 меняет
  `src/entities/run/api/index.ts`, хотя его изменения относятся к списку прогонов.
  До редактирования этого файла требуется координационный комментарий в PR #107.
  Согласованный комментарий отправлен до правки:
  [PR #107](https://github.com/larchanka-training/dmc-268-ui-t6/pull/107#issuecomment-6193119135).
- `fetchRunActions.test.ts`, `RunControls.test.tsx` и новые `docs/plans/105-*`
  с открытыми PR не пересекаются.
  `docs/FRONTEND_ARCHITECTURE.md` принадлежит PR #107; обновление документации
  этой задачи ограничено планом и todo. Повторить ownership check перед правками
  и публикацией.

## Verified API contract

Проверен текущий API `main@7d3a16c5a9cbc329e71938c3b212bf6ca050001c`
через GitHub API. Связанный API PR #132 уже merged.

- `app/main.py`, обработчик rerun: `RerunConflict` возвращает HTTP 409 с одним
  `detail`: `the pull request has an active run or is closed, or repository reviews are paused or unavailable`.
- `contracts/openapi.yaml` описывает те же причины и общий `ErrorResponse`.
  Отдельного кода причины нет.
- `docs/PIPELINE_SPEC.md`, T3: PR открыт, активного Run нет, Repository не
  приостановлен, App доступна; иначе 409.
- UI `ApiError` находится в `src/shared/api/client.ts`; mapper должен продолжать
  выбирать безопасный фиксированный текст по статусу и действию.

## Architecture decisions and proposed copy

1. В существующей ветке `case 409` различать `action`. Для `rerun` вернуть:

   > Нельзя перезапустить ревью: у PR уже есть активный прогон, PR закрыт, ревью репозитория приостановлено или GitHub App недоступна

   Перечень выражает альтернативы и не выдаёт одну причину за установленную.

2. Для `cancel` сохранить текущий текст 409:
   `У этого PR уже есть активный прогон или PR закрыт`.
   404, оба сообщения 422 и общий fallback также сохранить.
3. Не менять общий `ApiError`, транспорт, Zod-схемы, API/backend, UI-компоненты,
   зависимости или FSD-границы. Точное объяснение причины требует отдельного
   изменения контракта и находится вне scope.

## Test seams and AC traceability

Одобрение плана одновременно согласует публичный seam TDD:
`runMutationErrorMessage(error, action)` → русская строка. Использовать существующий
co-located `src/entities/run/api/fetchRunActions.test.ts`; ожидаемый текст задавать
литералом, не импортировать его из реализации. Полный suite выявил зависимый
literal в существующем `src/widgets/run-inspector/ui/RunControls.test.tsx`:
его rerun 409 expectation также обновлён, cancel expectation сохранён.

| Acceptance criterion                           | Verification                                                                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Rerun 409 допускает все четыре причины         | RED/GREEN test с точным предложенным русским литералом                                                                              |
| `detail` не определяет и не раскрывает причину | Тот же литерал для актуального backend detail и другого английского detail                                                          |
| Cancel и другие ошибки не регрессируют         | Литеральный cancel 409; сохранить существующие 404/422/500/503 и non-ApiError tests, дополнить fallback для rerun при необходимости |
| Все UI gates и документация                    | Шесть gates, результаты в todo; независимый Standards/Spec review                                                                   |

## Task list and dependency order

Подробные AC и checklist находятся в [105-todo.md](105-todo.md).

1. После одобрения плана и координационного комментария: на ветке от main
   выполнить узкий RED → GREEN цикл для mapper и защитных regression tests.
2. Выполнить все gates, независимые Standards/Spec reviews, исправить findings,
   обновить доказательства и опубликовать PR через publisher.

Оба шага последовательны; независимые reviewer-проверки могут выполняться
параллельно. Двух задач достаточно для изменения mapper и двух test-файлов.
Перед публикацией обязателен browser checklist из frontend rules §3b:
desktop/390px, обе темы, keyboard/focus, computed contrast и reduced motion.

## Risks and mitigations

| Risk                                        | Mitigation                                                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Общая ветка 409 случайно меняет cancel      | Явный action branch и literal regression для cancel                                                                                            |
| Конфликт файла с PR #107                    | Комментарий до правки, узкий diff, повторный ownership check и rebase перед review                                                             |
| Старая feature-ветка попадает в новый PR    | Создать новую ветку от актуального main до разработки                                                                                          |
| Форматтер проверяет прежний untracked store | Выполнить сырой gate; при исходном сбое задокументировать точные пути и отдельно проверить с временным ignore, не менять store или repo ignore |

## Approval checkpoint

Пользователь одобрил план, предложенный русский текст, seam TDD,
порядок работ и отправку следующего комментария в PR #107 до правки:

> Для UI #105 планирую узкое изменение `src/entities/run/api/index.ts`: уточнить только фиксированное сообщение HTTP 409 для rerun, добавив паузу ревью репозитория и недоступность GitHub App. Поведение cancel, API-контракт и изменения списка прогонов из этого PR сохраняются. Regression-тесты будут в `src/entities/run/api/fetchRunActions.test.ts`. Refs #105.

Реализация выполнена на `fix/105-rerun-conflict-message` от
`origin/main@24af7b75e6c20a6526a9cf31955aa220c1fde87b`: изменена только ветка
rerun 409, закреплены literal regression tests для обоих действий. RED/GREEN и
gates фиксируются в todo. Merge и закрытие issue не входят в публикацию.
Пользователь выбрал готовый к review PR и прямо сообщил, что назначит reviewer
сам позже. Publisher создаёт ready PR без назначения reviewer.

## Final verification

Independent Standards and Spec reviews report zero findings. All 1186 tests
pass across 101 files; lint, types, build and production bundle checks pass.
The raw format gate encounters only five preexisting untracked store files;
the repository-only check with an external temporary ignore passes. Details
and exact paths are recorded in the todo evidence.

Browser QA confirms the full rerun 409 toast on desktop (1440px) and mobile
(390px), in both themes, with keyboard activation, visible focus, no horizontal
overflow, reduced motion, and computed contrast of 18.72:1 / 16.35:1. Remote
main and open PR ownership were rechecked before publication; the branch is
based on current main. Publication status is recorded in the todo.
