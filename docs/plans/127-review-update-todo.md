# TODO #127: review update

План: [127-review-update-plan.md](127-review-update-plan.md). Исходное approval и палитра действуют.

## Планирование — выполнено

- [x] Прочитаны AGENTS/rules, исходные plan/todo и решение техлида.
- [x] Fetch обеих веток/main, SHA и PR comments/reviews/threads проверены.
- [x] UI conflict preview: только FRONTEND_ARCHITECTURE, Ф-16/Ф-17; API без конфликтов.
- [x] Аудит нового main: второго экранного потребителя five-level badge нет; repository settings — D3.
- [x] Действие по каждому из четырёх замечаний и существующие overlaps записаны.

## 1. Rebase — implementation

- [x] Сохранить plan/todo вне rebase, повторить fetch, записать ожидаемые remote HEAD.
- [x] До правки общего документа — разрешённый пользователем ownership notice в PR156: [comment](https://github.com/larchanka-training/dmc-268-ui-t6/pull/156#issuecomment-6336082463).
- [x] UI rebase на main: Ф-16 #127 + Ф-17/полный документ нового main, без ours/theirs всего файла.
- [x] Сохранить five-level абзац, полную state table, имеющиеся run.step/actions/diff изменения; не импортировать открытый PR156.
- [x] API rebase на main; diff только PIPELINE_SPEC §11/§13, прежний backend контракт.
- [x] `git diff --check`, исходный approved mapping и узкие diff относительно новых баз проверены.

## 2. Замечания — implementation/evidence

- [x] DESIGN_SYSTEM явно объясняет намеренное critical=danger dark; палитра не меняется.
- [x] Аудит текущих потребителей и действия по четырём замечаниям записаны в browser proof; локальная карта остаётся в InlineComment, repository settings использует D3 helper.
- [x] Проверить Tag Severity/SeverityOnWarning/Solid/Playground critical и все critical области Overview в обеих темах.
- [x] Browser: actual InlineComment все пять уровней/поверхности/состояния, contrast, theme/focus/keyboard/390px.
- [x] Browser: D3 URL/history/reset и неизменные группы/серверные counts/verdict.
- [x] Дописать browser proof: новые SHA, computed values, области global critical, причина no-change SEVERITY_TAG.
- [x] Targeted checkpoint после rebase: 11 files / 271 tests passed; `pnpm check-types`, `pnpm lint`, формат четырёх изменённых docs и `git diff --check` passed. Свежая browser-матрица 22.10: 234 observations + supplemental Overview audit и 17 D3 states passed.
- [x] Checkpoint: targeted suite из плана зелёный; нет speculative entity extraction или FSD нарушения.

## 3. Проверка и публикация

- [x] Все 6 UI gates и build-storybook; результаты соответствуют финальному source: 136 files / 2054 tests passed, 29 clean production assets. Логи `/tmp/127-review-update-full-{lint,types,format,test,build,bundle,storybook}.log`.
- [x] Независимый checkpoint review после rebase/пояснения: Standards 0 / Spec 0; финальный review свежего browser evidence также Standards 0 / Spec 0.
- [x] Все 4 API gates; полный pytest без параллельной тяжёлой нагрузки: 4038 passed / 866 skipped / 2 warnings, 541.61s; mypy 517 source files. Логи `/tmp/127-review-update-api-{lint,format,types,test}.log`. Skipped проверки не заявляются пройденными, timing threshold не менялся.
- [x] Независимые Standards/Spec review завершены: 0 / 0 actionable findings, включая rebase, пояснения и свежий browser proof. Финальные docs format и diff check passed; source SHA-256 соответствует freeze.
- [ ] Publisher обновляет существующие PR157/232, безопасный force-with-lease после rebase; bodies/crossrefs актуальны.
- [ ] Комментарии с SHA/no-change — только при явном разрешении на сообщения GitHub.
- [ ] CI проверен; прежние approve после diff-changing push больше не считаются актуальными.
- [ ] Reviewer назначает пользователь; merge/issue closure и resolve чужих threads не выполняются.
