# Tasks: #110 — сохранять mock rerun

Baseline: `origin/main@5150ddc70572cc5638c755586c08250814924c71`.
Branch: `fix/110-mock-rerun`. Plan: [110-plan.md](110-plan.md).
План предварительно одобрен пользователем; PR description — по-русски.

## Task 1: Новый mock-прогон доступен после повторного запуска

**Description:** Воспроизвести браузерный 404, затем test-first исправить общий
источник mock sessions для создания, detail/list и active-conflict проверки.

**Acceptance criteria:**

- [x] POST rerun terminal-прогона создаёт новый UUID и GET по этому ID открывает
      queued session: `trigger: 'rerun'`, непустой ISO `createdAt`, `startedAt: null`,
      `finishedAt: null`, incremented attempt, сброшенные cancel/results поля.
- [x] Новый прогон сохраняется в detail/list до re-init; повторный rerun этого PR
      даёт 409 с literal `Active run already exists`, другой PR получает другой ID.
- [x] Fixtures/ответы изолированы от мутаций; init reset удаляет созданный run,
      а walking timeline сохраняет живое поведение.

**Verification:**

- [x] До изменения кода: запустить mock app, открыть `…0004`, нажать
      «Перезапустить», записать URL и видимый 404/error state.
- [x] RED: co-located transport regression POST → GET returned ID падает по
      ожидаемой причине; добавить literal assertions для полей, list, 409 и reset.
- [x] GREEN: минимально реализовать working sessions и повторить focused tests,
      включая существующие walking-run regressions.
- [x] Mutation check: временно убрать сохранение нового session; убедиться,
      что regression становится RED, затем восстановить код и GREEN.

**Dependencies:** None; ownership comments posted before editing.

**Files likely touched:**

- `src/app/mocks/mockTransport.ts`
- `src/app/mocks/mockTransport.test.ts`
- `src/pages/runs/RunDetailPage.test.tsx` — совместимость существующих page tests
  с новым UUID и изоляцией fixtures; production-код страницы не меняется.

**Estimated scope:** Small: 2 mock files и один связанный page test, one implementation slice.

## Task 2: Проверить flow и опубликовать reviewed PR

**Description:** Подтвердить AC в браузере и gates, провести независимые
Standards/Spec reviews и подготовить reviewable PR с русским описанием.

**Acceptance criteria:**

- [x] Браузер переходит на queued detail без ошибки; через клиентскую навигацию
      прогон остаётся в списке и открывается повторно; reload сбрасывает mock state.
- [x] Все шесть gates проходят или конкретный baseline blocker явно отражён;
      Standards/Spec reviews не имеют unresolved findings.
- [ ] Ветка rebased на актуальный main, ownership перепроверен, PR опубликован
      с русским описанием `What` / `Why` / `How to verify` / `Refs` без closing keyword.

**Verification:**

- [x] Browser QA: desktop и 390px, light/dark, применимые keyboard-проверки;
      записать результаты и отсутствие горизонтального overflow, а также
      явно отметить непроверенные focus/reduced-motion пункты.
- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check` (clean issue snapshot; raw workspace baseline failure ниже)
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm verify:prod-bundle` после build
- [x] Independent Standards review и Spec review; recheck после исправлений.
- [ ] Rebase, final diff и ownership check; publisher возвращает ссылку на PR.

**Dependencies:** Task 1.

**Files likely touched:**

- `docs/plans/110-plan.md`
- `docs/plans/110-todo.md`

**Estimated scope:** Small: verification and publication; no additional product slice.

## Checkpoint: Complete

- [x] Все AC issue подтверждены evidence ниже.
- [ ] Все исправления verified и PR готов к review; merge/issue closure не выполнять.

## Evidence

- Browser before (coordinator): IAB, mock app `http://localhost:5177`, baseline
  `5150ddc`; «Перезапустить» на `/runs/11111111-1111-4111-8111-000000000004`
  перевёл на `/runs/11111111-1111-4111-8111-000000000099` с текстом
  «Прогон не найден». Воспроизведено до изменения реализации.
- Browser after (coordinator): rerun `…0004` открыл queued detail
  `/runs/3070eaf4-acd1-4ff5-87f9-fcc38739cc6a`, «Запуск: Перезапущен вручную»,
  заполненное «Создан» и «Начат: —». Через «Прогоны» найден новый queued #34;
  ссылка повторно открыла тот же ID. Повторный rerun исходного run показал
  ошибку active run без навигации. Keyboard Enter для rerun cancelled `…0006`
  создал другой queued ID (`483bdb2b…`); reload показал «Прогон не найден».
  Desktop 1280px и mobile 390px, обе темы; mobile `clientWidth = scrollWidth = 375`,
  horizontal overflow отсутствует, console errors пусты. Keyboard Enter на ссылке
  и rerun работает. Широкий audit contrast, reduced motion и focus restoration
  не выполнялся; UI/CSS в этой задаче не менялись. Screenshots:
  `/private/tmp/110-rerun-queued.jpg`, `/private/tmp/110-rerun-mobile-dark.jpg`.
- RED: `pnpm test src/app/mocks/mockTransport.test.ts -t 'serves the newly queued rerun'`
  завершился с exit 1: POST успешен, GET возвращённого ID выбросил `ApiError` 404
  из `mockTransport.ts:106`.
- GREEN: `pnpm test src/app/mocks/mockTransport.test.ts src/app/mocks/mockRunTimeline.test.ts`
  — 2 файла, 64 теста, exit 0; покрыты queued contract, detail/list, 409,
  уникальность UUID, reset, изоляция ответов/fixtures и живой walking timeline.
- Mutation: временное удаление `runSessions.push(rerun)` вернуло тот же RED 404;
  после восстановления повторный focused run — 64 passed.
- Runtime: Node `24.20.0`, pnpm `12.4.1`; sandbox-вызовы pnpm зависали,
  проверки выполняются с разрешённым elevated execution и PATH Node 24.
- `pnpm check-types` — exit 0. `pnpm build` — exit 0; существующее предупреждение
  Vite о chunk >500 kB. `pnpm verify:prod-bundle` — exit 0, 22 assets clean.
- Raw `pnpm format:check` — exit 1: пять исходных `.pnpm-store/v11/.tmp/pnpm-12.4.1-*/package.json`,
  исходный `docs/plans/86-plan.md` и новый `110-plan.md`. Свой plan отформатирован;
  store и документы #86 не изменялись. Repo-only повтор
  `pnpm exec prettier --check . '!**/.pnpm-store/**' '!docs/plans/86-plan.md' '!docs/plans/86-todo.md'`
  — exit 0. Raw `pnpm lint` — exit 0.
- Полный suite до адаптации page tests показал четыре связанных failure:
  три ожидания постоянного rerun ID `…0099`, одно ожидание мутации exported fixture.
  Добавлен только тестовый `RunDetailPage.test.tsx`: deterministic UUID и GET overlay
  для server status update, без изменения production-кода страницы.
- Независимые Standards/Spec reviews (coordinator) — 0 findings в обоих.
  После адаптации page tests follow-up reviews — также 0 findings в обоих.
- После адаптации page tests focused run трёх файлов — 91 passed, exit 0.
  Старый полный run с четырьмя устаревшими ожиданиями остановлен (exit 130).
- Финальный snapshot `/private/tmp/dmc-268-ui-110-verification`: `git archive HEAD`
  плюс пять intended файлов и symlink на существующий `node_modules`; исходные
  untracked store/docs #86 отсутствуют. Неизменённые `pnpm lint`, `pnpm check-types`,
  `pnpm format:check`, `pnpm build` — exit 0. Snapshot full suite: 98 files / 1188
  tests passed; три теста одновременно испытали ~254s паузу и timeout, следующий
  caret test получил cascading assertion; итог 4 failed / 1192 tests. Параллельный
  tool request также задержался на несколько минут. Причины host-паузы не установлены;
  это отдельный неуспешный run, а не объявленный baseline дефект.
- Повторный неизменённый `pnpm test` в том же snapshot отдельно от других gates:
  **101 files / 1192 tests passed**, exit 0, 55.11s. Никаких изменений кода между
  неуспешным и успешным snapshot runs не было. `pnpm verify:prod-bundle` после
  snapshot build — exit 0, 22 assets clean. Итого все шесть неизменённых gates
  на intended snapshot — exit 0; raw workspace format baseline failure сохранён выше.
