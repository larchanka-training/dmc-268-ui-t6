# #127: дельта после review, 22.10.2026

Продолжение [утверждённого плана](127-plan.md), не новое решение о палитре.
Пользователь запросил исправление замечаний, конфликтов UI и обновление API-ветки.
Сохраняется [решение техлида](https://github.com/larchanka-training/dmc-268-ui-t6/issues/127#issuecomment-6291809919):
critical/solid, critical/dot, high/dot, warning/dot, info/dot; dark critical `#f87171`,
light `#b91c1c`; три D3-группы, серверные counts/verdict без изменений.

## Проверенный baseline

Refs и GitHub проверены после fetch 22.10.2026. Worktree и ветки прежние.

| Repo                       | HEAD до обновления                         | Исходный merge-base                        | Новый origin/main                          |
| -------------------------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------ |
| UI `/tmp/dmc-268-ui-127`   | `07b6573a5d419ad9e7cb47d0ca39fc2b52f72e40` | `ec628dd02bf0f59611e94ae6d3d742bb79472019` | `5e9456797422087bfa2e558a834dd64b7baa3a3f` |
| API `/tmp/dmc-268-api-127` | `71f7cbfe4f83828f74ee1686f99ed1300f8ac9bf` | `2326273e6ab7fcea89d1cf3b94b88a4be66ca5e9` | `8a621798d01bd72a5ce6c343addc0d00661af724` |

`git merge-tree --write-tree --name-only HEAD origin/main` без изменения веток/index/worktree:
UI — единственный конфликт `docs/FRONTEND_ARCHITECTURE.md`, соседние строки Ф-16/Ф-17;
API — конфликтов нет. GitHub: [UI PR157](https://github.com/larchanka-training/dmc-268-ui-t6/pull/157)
DIRTY, [API PR232](https://github.com/larchanka-training/dmc-268-api-t6/pull/232) BEHIND.
В обоих PR один APPROVED на прежнем HEAD, review threads отсутствуют. Diff-changing push
сбросит approve; новый review назначает пользователь. Merge не входит в эту работу.

## Обработка четырёх замечаний

Источник: [неблокирующие замечания](https://github.com/larchanka-training/dmc-268-ui-t6/pull/157#issuecomment-6315543991).

| Замечание              | Минимальное действие                                                                                                                                                        | Проверяемый результат                                                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Глобальный critical    | Обновить browser evidence для всех применений shared Tag, не только InlineComment. Source менять только при воспроизведённом дефекте.                                       | Tag Severity, SeverityOnWarning, Solid и Playground critical; Overview палитра, таблица critical-count, блок тегов в обеих темах. Literal и вычисленные цвета, текст ≥4.5:1, значимые точки ≥3:1.                                                                                           |
| critical = danger dark | Коротко явно пояснить в DESIGN_SYSTEM §3, что совпадение `#f87171` утверждено, токены имеют разные роли, возможное разведение — отдельная задача. Новую палитру не вводить. | Таблица и код совпадают с решением; Solid/Overview показывают рядом семантику Critical и danger/failed.                                                                                                                                                                                     |
| SEVERITY_TAG в widget  | Оставить текущую карту в InlineComment, записать обоснование в evidence.                                                                                                    | На новом main единственный экранный потребитель пятиуровневого оформления — InlineComment. Storybook — демонстрация shared Tag; новый `features/repository-settings/lib/severityThreshold.ts` использует только D3 helper, не оформление. Нет нового entity → shared/ui импорта/абстракции. |
| API companion          | Rebase существующей API docs-ветки; сохранить узкий diff PIPELINE_SPEC §11/§13, взаимные PR-ссылки и решение.                                                               | PR232 обновлён на текущий main, docs only; backend severity/threshold/counts/verdict не меняются. Приёмка #127 учитывает оба PR.                                                                                                                                                            |

## Последовательность задач

### 1. Обновить базы (S, UI один конфликтный файл; API без конфликта)

Сначала сохранить эти plan/todo отдельно от rebase и зафиксировать прежние remote HEAD;
повторить fetch перед операцией. Выполнить rebase обеих существующих веток на origin/main.
В UI сохранить Ф-16 из #127 и Ф-17 из нового main, всю таблицу Ф-1…Ф-21 и остальные разделы
нового main; сохранить five-level абзац #127. Не выбирать весь файл через ours/theirs.
AC: нет conflict markers; diff относительно нового main содержит только целевую дельту.
Проверка: `git diff origin/main...HEAD`, `git diff --check`, сверка таблицы и §4.
Зависимости: нет. Не трогать исходные checkout.

Сохранить [согласование с UI #113/PR156](https://github.com/larchanka-training/dmc-268-ui-t6/pull/157#issuecomment-6315190641):
не потерять state table и изменения run.step/actions/diff, если они появятся в свежей базе.
На проверенном main PR156 ещё открыт; не переносить его незамерженный код в #127.

### 2. Закрыть замечания доказательствами и пояснением (S, 2 файла)

`docs/DESIGN_SYSTEM.md` — пояснение совпадения семантических токенов;
`docs/plans/127-browser-proof.md` — датированная новая проверка shared Tag/Overview и аудит
потребителей с новым baseline, сохраняя исторические измерения. Screenshots добавлять только
для полезного нового evidence. AC: все 4 замечания имеют fix или обоснованный no-change;
нет новых raw colours, dependencies, FSD-регрессий. Проверка — browser матрица ниже и diff.
Зависимости: 1. Новые source/stories/test-правки — только если обнаружен реальный дефект.

### Checkpoint после 1–2

Targeted regression и browser проверка зелёные; оба docs diff узкие, исходное решение сохранено.

### 3. Финальная проверка и обновление PR (M, evidence/PR bodies)

После последних изменений выполнить все gates, независимый Standards/Spec review и сохранить
результаты. Обновить существующие PR157/PR232 через publisher, push с проверкой ожидаемого
remote SHA и `--force-with-lease` для rebase; без `--no-verify`. PR bodies сохраняют
What / Why / How to verify / Refs, взаимные ссылки, актуальные SHA/результаты, no dependencies.
Не назначать reviewer, не merge, не закрывать issue, не resolve чужие threads.
Ответ на замечания с SHA/no-change публиковать только в пределах явного разрешения пользователя
на GitHub-сообщения; локальное evidence и PR updates готовятся независимо.
AC: обе ветки актуальны, CI зелёный, все замечания отражены в evidence/PR.
Зависимости: 1–2.

## Проверки после rebase

- Targeted: `pnpm exec vitest run src/widgets/diff-viewer/ui/InlineComment.test.tsx src/shared/ui/Tag/Tag.test.tsx src/shared/ui/theme/buildTheme.test.ts src/entities/review/lib/severityBadge.test.ts src/features/finding-filters src/widgets/diff-viewer/ui/RunDiff.filters.test.tsx src/features/repository-settings/lib/severityThreshold.test.ts`.
- Browser: обе темы; shared Tag/Overview области выше, пять actual InlineComment уровней на context/added/removed, outside-diff warning Alert и summary-only; rest/hover/pressed, computed colours и alpha-composition; theme toggle, keyboard/focus, 390px без horizontal overflow. D3 Critical=critical/high, Warning=medium/low, Info=info, URL/back/forward/reset. Новая repository threshold логика остаётся D3.
- UI: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`, затем `pnpm verify:prod-bundle`; `pnpm build-storybook` и browser preview.
- API: `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy .`, `uv run pytest`; полный pytest отдельно от тяжёлых browser/build запусков из-за прежнего timing flake. Не ослаблять threshold.

## Владение файлами и границы

На 22.10 новые plan/todo, browser evidence, DESIGN_SYSTEM и shared Tag/stories не пересекаются
с другими открытыми PR. FRONTEND_ARCHITECTURE пересекается с UI109/156; согласование UI109 есть
в исходном плане. В PR156 комментария о #127 при проверке не найдено; уведомление о координации
есть только в PR157. Перед правкой общего файла нужен комментарий именно в PR156 согласно
AGENTS. Готовый текст: «Обновляем ui#127 / PR157 на main: сохраняем полную таблицу состояния и
Ф-17 из main, меняем только Ф-16 и абзац badge/filter по утверждённому решению #127. Изменения
run.step/actions/diff из PR156 не затрагиваем; после rebase проверим итоговый diff документации».
Публикация этого сообщения требует явного разрешения пользователя на GitHub-сообщения.
API PIPELINE_SPEC пересекается с 220/227/228/229;
исходные согласующие комментарии сохранены в [127-plan](127-plan.md), scope не расширяется.
Повторить overlap check только при появлении новых файлов/PR перед правкой.

Планирование изменило только эти два новых документа: без rebase, source edits, commit, push,
GitHub-сообщений или тяжёлых gates. Новых вопросов, требующих решения о палитре, нет.

## Выполнение 1–2: checkpoint до browser-проверки, 22.10.2026

Оригиналы новых plan/todo сохранены и проверены SHA-256 в
`/tmp/dmc-268-127-review-update-backup/` до rebase. Повторный fetch подтвердил базы из таблицы:
UI `5e9456797422087bfa2e558a834dd64b7baa3a3f`, API
`8a621798d01bd72a5ce6c343addc0d00661af724`. Ожидаемые remote HEAD для будущего
`--force-with-lease`: UI `07b6573a5d419ad9e7cb47d0ca39fc2b52f72e40`, API
`71f7cbfe4f83828f74ee1686f99ed1300f8ac9bf`; external updates отсутствовали.

Ownership notice в PR156 опубликован координатором после разрешения пользователя:
[comment](https://github.com/larchanka-training/dmc-268-ui-t6/pull/156#issuecomment-6336082463).
UI rebased HEAD `bd2e0f672cbf821f673d3244c2d3305236d85fdf`, API rebased HEAD
`4d0567b87ddffd656a648f433c28f3c33cefebdf`. Единственный конфликт разрешён по строкам:
Ф-16 из #127, Ф-17 из main. Diff `FRONTEND_ARCHITECTURE.md` относительно нового main —
только Ф-16 и абзац пятиуровневого оформления; вся актуальная таблица Ф-1…Ф-23, state table и остальной
документ нового main сохранены. API diff — только `PIPELINE_SPEC.md` §11/§13.

DESIGN_SYSTEM §3 теперь поясняет намеренное dark critical=danger. Аудит текущих потребителей
и действие по всем четырём замечаниям записаны в [browser proof](127-browser-proof.md):
`SEVERITY_TAG` остаётся в единственном экранном потребителе, repository settings использует
только D3 helper. Source, stories, тесты и зависимости в этом продолжении не менялись.
Новая browser-проверка и полные gates следуют после независимого review этого checkpoint.
Дополнительных commit и push пока нет; rebase переписал только прежние feature/docs commits.

Targeted regression после rebase: 11 files / 271 tests passed
(`/tmp/127-review-update-targeted.log`); `pnpm check-types` passed
(`/tmp/127-review-update-types.log`); `pnpm lint` passed
(`/tmp/127-review-update-lint.log`). Формат четырёх изменённых docs и `git diff --check`
passed. Browser-проверка и полные gates не заявляются выполненными этим checkpoint.

## QA после checkpoint review, 22.10.2026

Независимый checkpoint review: Standards 0 / Spec 0. Свежие browser measurements на rebased
коде завершены и сохранены в [browser proof](127-browser-proof.md): 234 observations,
минимум текста 4.662165195:1 и точки 3.676603105:1; supplemental Overview row-hover,
critical/danger roles, reduced motion и 17 D3 states с неизменными counts/Blocking passed.
Два новых Overview PNG показывают глобальные применения critical; историческое evidence
20.10 сохранено. Source/stories/tests/dependencies не менялись, SHA-256 всех tracked `src`
сверен с `/tmp/127-review-update-source-freeze.sha256`.

Все UI gates прошли последовательно на этом source: `pnpm lint`, `pnpm check-types`,
`pnpm format:check`, `pnpm test` (136 files / 2054 tests), `pnpm build`,
`pnpm verify:prod-bundle` (29 clean assets); затем `pnpm build-storybook` passed.
Логи — `/tmp/127-review-update-full-{lint,types,format,test,build,bundle,storybook}.log`,
результаты команд — `/tmp/127-review-update-ui-gates.json`.
Build сообщает warning о chunks >500 kB (основной ui chunk 667.41 kB); Storybook тоже
выдаёт chunk-size warning. Тесты проходят с известными jsdom not-implemented messages
(canvas, navigation, pseudo-element styles). Эти ограничения не скрываются и не меняют scope.

Browser — установленный Chrome, существующий mock transport; реальные backend/VCS вызовы
этой проверкой не покрываются. Supplemental console audit: Storybook favicon.ico 404;
server warning о deprecated antd List. Подробности и численные результаты — в proof.
Оба собственных dev-сервера (6127/5127), Chrome и UI builds остановлены до API gates.
API gates прошли последовательно после остановки UI-нагрузки: `uv run ruff check .`,
`uv run ruff format --check .`, `uv run mypy .` (517 source files), `uv run pytest`
(4038 passed / 866 skipped / 2 warnings, 541.61s). Порог timing-теста не менялся.
866 skipped остаются ограничением покрытия этого запуска; skipped проверки не заявляются
пройденными. Два предупреждения — существующие Starlette TestClient/httpx и BlockingPortal
deprecations. Логи — `/tmp/127-review-update-api-{lint,format,types,test}.log`, результаты
команд — `/tmp/127-review-update-api-gates.json`. API working tree чистый, diff относительно
main по-прежнему только `PIPELINE_SPEC.md` §11/§13.
Финальный independent review завершён: Standards 0 / Spec 0 actionable findings, включая
rebase, пояснения и свежие 234 browser observations/D3 proof. Финальные docs format и diff
check passed; source SHA-256 соответствует freeze. Публикация существующих PR и новая
актуальная approve остаются отдельными шагами. Дополнительных GitHub-сообщений, commit или
push этим checkpoint не выполнено.
