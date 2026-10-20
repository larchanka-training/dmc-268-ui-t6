# TODO #127: exact-severity badges

План: [127-plan.md](127-plan.md). Tasks1–5 и QA завершены. Финальный review source/docs/proof:
Standards=0 / Spec=0. Все UI/API gates passed; [browser proof](127-browser-proof.md) сохранён.
Publisher выполняет commit/push и создание двух ready PR без reviewer; окончательные ссылки
и CI-статус фиксируются в PR. После публикации координатор переводит Board 12 в On Review;
внешние Before merge требования pending.

## Условия начала

- [x] Пользователь утвердил план agent-loop и палитру в чате.
- [x] Техлид записал решение по пяти тонам/вариантам и dark critical;
      [permalink](https://github.com/larchanka-training/dmc-268-ui-t6/issues/127#issuecomment-6291809919)
      проверен через GitHub API.
- [x] Таблица подтверждена: critical/solid, critical/dot, high/dot, warning/dot, info/dot;
      dark critical `#f87171`, light `#b91c1c`.
- [x] Повторно проверены open PR; согласованы комментариями UI #106/#109 и API #220/#227/#228/#229,
      если они по-прежнему владеют затрагиваемыми документами.
- [x] Отдельные worktree/ветки из свежего origin/main созданы; SHA баз в плане;
      чужие untracked файлы не затронуты. Док-пересечения перепроверены и согласованы;
      ссылки на опубликованные комментарии сохранены в плане.

## Реализация с TDD

- [x] 1. RED: табличный InlineComment test проверяет literal label/tone/variant пяти уровней.
- [x] 1. GREEN: прямой five-level mapping, без изменения D3 helper/filter; поправлен только
      устаревший комментарий о цвете в severityBadge.ts.
- [x] 1. Mutation check: сломанный high/medium mapping делает тест красным.
- [x] 2. RED: literal test утверждённого critical; GREEN: palette.ts и tokens.css синхронны.
- [x] Checkpoint: InlineComment/theme/severityBadge/finding-filters/RunDiff filters tests зелёные.
- [x] 3. Tag Severity story и Overview отражают итоговую палитру.
- [x] 3. Browser computed colors/contrast на diff и warning Alert в обеих темах; critical solid
      22% tint, dot/text и alpha-compositing проверены отдельно.
- [x] 3. Если нужен contrast fix, он сделан в shared Tag, проверен meaningful regression/browser
      proof, без screen raw colours; при расширении более 5 файлов задача разбита.
- [x] 4. DESIGN_SYSTEM таблица/§8 и FRONTEND_ARCHITECTURE Ф-16/абзац бейджей синхронизированы.
- [x] 5. API PIPELINE_SPEC §11 и связанная строка таблицы уточнены в отдельном API worktree;
      backend verdict/counts и D3 filter сохранены.

## Проверка и публикация

- [x] Browser: critical красный в обеих темах; текст ≥4.5:1; точки ≥3:1 на реальном фоне.
- [x] Browser: inline diff, outside-diff warning Alert, summary-only, контекстные/added/deleted
      поверхности, темы, focus/keyboard, 390px; сохранены computed colors, ratios и screenshots.
- [x] Browser: D3 filter имеет три прежние группы и прежние URL; back/forward/reset работают.
- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check`
- [x] `pnpm test` на финальном code diff tasks1–3: 1467 passed
- [x] `pnpm build`
- [x] `pnpm verify:prod-bundle` после build
- [x] `pnpm build-storybook` для изменённых stories
- [x] API docs PR: `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy .`, `uv run pytest`
- [x] Review: Standards / Spec без findings, актуальный diff относительно сохранённой базы.
- [x] Publisher: полный diff/status проверен; свежий fetch/rebase подтвердил обе сохранённые
      базы main. Пользователь явно указал «готов к ревью сам назначу»: оба PR ready,
      reviewer пользователь назначит сам.
- [ ] Publisher: commit/push и отдельные UI/API docs PR с What / Why / How to verify / Refs,
      cross-repo `Refs larchanka-training/dmc-268-ui-t6#127`, без closing keyword/Development link;
      этот snapshot сохранён до commit, результат публикации и ссылки фиксируются в PR.
- [ ] Board 12: перевод In Progress → On Review после публикации выполняет координатор;
      Done остаётся после приёмки.
- [ ] Перед merge: повторный rebase на актуальный main, approve текущего head, все review
      threads resolved; техлид принимает AC и закрывает issue.

## Task1 evidence (20.10.2026)

Task1–3 ниже — исторические checkpoints; текущие результаты и оставшаяся публикация указаны выше.

- Public seam утверждён в плане: DOM `InlineComment`, literal labels + `data-tone`/
  `data-variant`; internal mocks не добавлены.
- RED, старая реализация: 2 failed / 10 passed. High получал solid вместо dot;
  medium warning вместо high. Лог: `/tmp/127-task1-red.log`.
- GREEN: 12 passed после прямого exhaustive mapping `Severity` → props `Tag`.
  Лог: `/tmp/127-task1-green.log`.
- Mutation: временный возврат high/solid и medium/warning дал 2 failed / 10 passed;
  правильный mapping восстановлен. Лог: `/tmp/127-task1-mutation.log`.
- После восстановления targeted run InlineComment/theme/severityBadge/finding-filters/
  RunDiff.filters: 9 files / 258 tests passed. Лог: `/tmp/127-task1-targeted.log`.
- Использованы Node 24.20.0 и pnpm 12.4.1, `pnpm install --frozen-lockfile`;
  manifest/lockfile не изменены.
- Full UI gates пока фиксируют task1 snapshot; после следующих задач результаты должны
  соответствовать финальному diff. Storybook/browser и API gates ещё не запускались.
- Все шесть UI gates passed: lint, check-types, format:check, test (112 files / 1465 tests),
  build, verify:prod-bundle (22 clean assets). Логи `/tmp/127-{lint,types,format,test,build,bundle}.log`.
- После task1 остановиться для независимого review; palette/tokens, stories, browser proof
  и документы задач 2–5 ещё pending. API worktree остаётся без изменений.

## Task2 evidence (20.10.2026)

- Task1 независимый review: Standards=0 / Spec=0; координатор разрешил только task2.
- RED: literal expected critical dark `#f87171` / light `#b91c1c` в обоих источниках
  палитры. На старом dark `#f97316`: 1 failed / 43 passed.
  Лог: `/tmp/127-task2-red.log`.
- GREEN: dark critical синхронно изменён в `palette.ts` и `tokens.css`; light critical,
  high/danger/warning и прочие tokens сохранены. Shared Tag CSS/stories не менялись.
- Targeted GREEN: buildTheme/InlineComment/Tag/severityBadge/finding-filters/RunDiff.filters —
  10 files / 267 tests passed. Лог: `/tmp/127-task2-green.log`.
- `pnpm lint`, `pnpm check-types`, `pnpm format:check` passed;
  логи `/tmp/127-task2-{lint,types,format}.log`.
- `pnpm build`, затем `pnpm verify:prod-bundle` passed (22 clean assets);
  логи `/tmp/127-task2-{build,bundle}.log`.
- Полный suite не повторяется до финального diff по инструкции координатора; task1
  snapshot сохранён выше. Browser/contrast остаётся task3, API worktree чистый.

## Task3 evidence (20.10.2026)

- Прочитан frontend-review skill. CUA browsers inventory пуст; использован Playwright
  с установленным Chrome и отдельным temporary profile. Dev Storybook координатора
  на 6127 не останавливался.
- Tag Severity и Overview теперь показывают все пять утверждённых label/tone/variant;
  добавлена постоянная SeverityOnWarning story для регрессионного Alert-фона.
- Browser RED: actual dark outside/summary critical solid 4.3930:1. Смесь 75% всё ещё
  провалила warning:hover (4.4381:1); final fix только critical solid text mix 70%,
  approved token, tint 22% и weight 500 сохранены.
- Browser GREEN: 190 наблюдений, включая 150 actual InlineComment в context/added/removed/
  outside/summary, обе темы и rest/hover/pressed. Минимумы: text 4.662165195:1 на dark
  warning:hover; dot 3.676603105:1 для light Low warning:pressed. Theme toggle,
  Tab/Shift+Tab/Enter, focus ring 2px, фокус после раскрытия/сворачивания и 390px passed.
- [Browser proof](127-browser-proof.md) содержит вычисленные цвета/alpha/контраст,
  воспроизводимый script, ограничения и пять PNG (~490 KiB); raw JSON остаётся в /tmp.
- Targeted tests: 10 files / 267 passed. Полный финальный code suite по followup
  координатора: 112 files / 1467 passed. Lint/types/build/bundle/Storybook passed;
  format check passed после сохранения evidence. Логи `/tmp/127-final-*.log`.
- Tasks4/5 не выполнялись; browser D3 URLs/back/forward/reset ещё pending для task6.
  Source review task3: Standards=0 / Spec=0. Никаких commits, push или PR comments.

## Tasks4/5 и итоговая проверка (20.10.2026)

- DESIGN_SYSTEM таблица/§8 фиксируют пять точных уровней, palette critical и mix70%/tint22%.
  FRONTEND_ARCHITECTURE меняет только Ф-16 и абзац badge/filter; API PIPELINE_SPEC —
  badge bullet §11, ссылку на группы фильтра в пороге и связанную строку §13.
  Backend verdict/counts/coverage и соседние решения не менялись.
- Сначала подготовлены reviewable `/tmp/127-ui-architecture.patch` и
  `/tmp/127-api-pipeline.patch`, оба прошли `git apply --check`. После разрешения пользователя
  и публикации координатором согласующих комментариев (permalinks в плане) patches применены.
- D3 browser proof на existing mock app, light/dark: Critical=3, Warning=6, Info=2,
  combined=9, reset=11; URL/history back/forward и серверные counts проверены.
  17 snapshots, browser pageerror=0, HTTP ≥400=0. Детали в [proof](127-browser-proof.md).
- API gates запущены на чистом baseline `2326273e6ab7fcea89d1cf3b94b88a4be66ca5e9`
  перед docs-only patch; Python source/manifest/lockfile не менялись. `uv sync --frozen`.
  Ruff check passed; format check: 518 files; mypy: 515 source files passed.
- Первый полный API pytest: 4024 passed / 863 skipped / 1 failed (466.45s).
  Только performance assertion в `test_code_index_resolution.py:682`: elapsed1.015394291s
  при лимите0.75s. Изолированный диагностический run файла — 29 passed (2.58s).
  Первый прогон выполнялся под параллельной нагрузкой; threshold/код не менялись.
  Логи `/tmp/127-api-{lint,format,types,test,baseline-failure}.log`.
- После D3 свой Vite остановлен; полный API pytest повторён без наших параллельных
  browser/build tasks: **4025 passed / 863 skipped / 2 warnings, 438.43s**, exit0.
  Лог `/tmp/127-api-test-serial.log`. Performance assertion тоже прошла в полном rerun.
  Итог всех четырёх API gates зелёный; первый timing failure сохранён в evidence.
- Full UI suite после docs-only не повторялся; `pnpm format:check` после docs passed.
  Финальные Standards/Spec review всех частей, включая D3 proof и команду Storybook: 0/0.
  Source/docs заморожены для publisher; commits/push development не выполнял.
