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
- [x] Ветка rebased на актуальный main, ownership перепроверен, PR опубликован
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
- [x] Rebase, final diff и ownership check; publisher возвращает ссылку на PR.

**Dependencies:** Task 1.

**Files likely touched:**

- `docs/plans/110-plan.md`
- `docs/plans/110-todo.md`

**Estimated scope:** Small: verification and publication; no additional product slice.

## Checkpoint: Complete

- [x] Все AC issue подтверждены evidence ниже.
- [x] Все исправления verified и Draft PR опубликован; merge/issue closure не выполнять.

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
- Publication: `origin/main` повторно fetched, остаётся `5150ddc`; rebase
  `--autostash` подтвердил up-to-date. Комментарии согласования PR #106/#109
  проверены; новый PR #122 не владеет intended файлами. Коммит `70541ba`
  содержит только пять intended файлов; source/tests byte-identical к snapshot.
  Обычные pre-commit и pre-push hooks прошли без bypass. Опубликован
  [Draft PR #124](https://github.com/larchanka-training/dmc-268-ui-t6/pull/124)
  с русским описанием и `Refs #110`, без reviewer (default после optional вопроса).
  Merge и issue closure не выполнялись; approving review на текущем head остаётся
  условием последующего merge.

## Follow-up Task 3: Сохранить отмену созданного rerun

- [x] Follow-up план и public test seams из `110-plan.md` одобрены пользователем
      2026-10-17: «Да, выполнить весь план».

**Description:** Исправить потерю состояния cancel после refetch и снять ложный
active conflict для следующего запуска того же PR.

**Acceptance criteria:**

- [x] После rerun → cancel созданный queued run остаётся `cancelled` с
      `cancelRequested: true` в GET detail и GET list.
- [x] Следующий rerun того же PR успешно создаёт новый queued run с другим ID;
      пока он активен, очередной rerun по-прежнему получает 409.
- [x] Ответ cancel изолирован от сохранённого session; fixtures не мутируют,
      walking timeline сохраняет своё существующее поведение.

**Verification:** RED regression через `apiClient`/`endpoints` до product edit,
затем GREEN в transport suite и существующем walking timeline suite.

**Dependencies:** Завершённые Task 1–2; ownership check перед product edits.

**Files likely touched:** `src/app/mocks/mockTransport.ts`,
`src/app/mocks/mockTransport.test.ts`.

**Estimated scope:** Small: 2 файла.

## Follow-up Task 4: Пустые результаты нового rerun

**Description:** Не показывать fixture actions и review comments у sessions,
созданных rerun в текущем mock transport.

**Acceptance criteria:**

- [x] `/actions` и `/comments` созданного rerun возвращают `[]` до и после отмены;
      detail сохраняет `findings: []`, `actionCount: 0`.
- [x] Существующие fixture results и живые walking actions/comments сохраняются;
      принадлежность к созданным sessions не выводится только из `trigger`/status.

**Verification:** RED regression на пустые коллекции через public transport,
затем GREEN; targeted assertions для fixture/walking compatibility.

**Dependencies:** Task 3; общий transport изменяется последовательно.

**Files likely touched:** `src/app/mocks/mockTransport.ts`,
`src/app/mocks/mockTransport.test.ts`.

**Estimated scope:** Small: 2 файла.

## Follow-up Task 5: Новые rerun в начале списка

**Description:** Согласовать порядок созданных run с сортировкой mock list:
последний созданный session виден первым.

**Acceptance criteria:**

- [x] После создания двух rerun разных PR GET list начинает со второго ID,
      затем первого ID; относительный порядок исходных fixtures не меняется.

**Verification:** RED list regression перед заменой вставки, затем GREEN
focused suites, включая reset и fixture isolation.

**Dependencies:** Task 4; общий transport изменяется последовательно.

**Files likely touched:** `src/app/mocks/mockTransport.ts`,
`src/app/mocks/mockTransport.test.ts`.

**Estimated scope:** Small: 2 файла.

## Follow-up checkpoint: Проверка и обновление PR #124

- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check` (clean intended snapshot; raw store blocker ниже)
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm verify:prod-bundle` после build.
- [x] Независимые Standards/Spec reviews без unresolved findings; recheck после
      исправлений. Записать RED/GREEN и итоговые gate evidence ниже.
- [x] Перепроверить ownership и rebase на свежий main; сохранить `.pnpm-store/`.
- [ ] Publisher обновляет этот же PR #124 и его русское описание, отвечает во всех
      трёх review threads с SHA исправления, не разрешая threads.
- [ ] Merge/закрытие issue не выполнять; отмечать follow-up завершённым только
      после review и публикации.

## Follow-up evidence (2026-10-17)

- Task 3 RED: `pnpm test src/app/mocks/mockTransport.test.ts -t 'persists cancellation'`
  — exit 1, 1 failed / 11 skipped. После cancel GET detail вернул
  `status: 'queued'`, `cancelRequested: false` вместо `cancelled` / `true`.
  GREEN после сохранения cloned session в рабочую коллекцию:
  `pnpm test src/app/mocks/mockTransport.test.ts src/app/mocks/mockRunTimeline.test.ts`
  — exit 0, 2 files / 65 tests, 2.28s. Regression проверяет GET detail/list,
  изоляцию cancel response, следующий успешный rerun и последующий 409,
  неизменность exported fixtures.
- Task 4 RED: `pnpm test src/app/mocks/mockTransport.test.ts -t 'serves empty results'`
  — exit 1, 1 failed / 13 skipped; четыре soft assertions показали 34 fixture
  actions и 3 review comments вместо `[]` до и после cancel. GREEN после учёта
  ID созданных sessions (set очищается на init): тот же focused двухфайловый
  suite — exit 0, 67 tests, 2.03s. Отдельный regression подтверждает 34 actions
  и 3 comments у исходных fixtures, включая queued fixture с `trigger: 'rerun'`,
  и walking progression: 0 → 1 → 9 actions, comments появляются только в конце.
- Task 5 RED: `pnpm test src/app/mocks/mockTransport.test.ts -t 'lists reruns newest first'`
  — exit 1, 1 failed / 14 skipped; первые два ID принадлежали fixtures `…0001`,
  `…0002`, а не созданным rerun. GREEN после `unshift`: focused suite — exit 0,
  2 files / 68 tests, 2.30s; новый порядок second/first и относительный порядок
  всех fixtures подтверждены.
- Runtime: Node 24.20.0 / pnpm 12.4.1 через PATH Node 24. Sandboxed pnpm не
  выдаёт output; проверки запущены с разрешённым elevated execution.
- Raw checkout gates: `pnpm lint`, `pnpm check-types` — exit 0; `pnpm test` —
  exit 0, **105 files / 1266 tests**, 90.67s; `pnpm build` — exit 0;
  `pnpm verify:prod-bundle` после build — exit 0, 22 assets clean.
- Raw `pnpm format:check` после форматирования intended files — exit 1 только
  из-за пяти исходных `.pnpm-store/v11/.tmp/pnpm-12.4.1-*/package.json`
  (суффиксы `1791563001124`, `1791633279571`, `1791633279572`,
  `1791633279576`, `1791633279581`). Store и repo ignore не изменялись.
- Clean snapshot `/private/tmp/dmc-268-ui-110-followup.ZQcKwn`: `git archive HEAD`
  плюс четыре intended source/docs файла и symlink на установленный
  `node_modules`; untracked store отсутствует. Все шесть неизменённых gates —
  exit 0: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`
  (**105 files / 1266 tests**, 42.45s), `pnpm build`, затем
  `pnpm verify:prod-bundle` (22 assets clean). Build/test выполнялись
  последовательно. Оба build выдали существующий Vite warning о chunk >500 kB;
  suite вывел существующие jsdom diagnostics для styles/canvas/navigation.
- Coordinator получил fresh independent Standards и Spec reviews после GREEN:
  **0 findings** в обоих; дополнительных source edits после review не было.
- Browser follow-up (coordinator, localhost mock): rerun terminal `…0004`
  создал queued `429d48dc…`, actions/comments — 0. Cancel сохранил `cancelled`
  после перехода в список, «Обновить» и повторного открытия detail. Следующий
  rerun исходного run успешно создал `027b8de4…`; в списке новый queued идёт
  перед cancelled, затем fixtures. Пока sibling активен, повторный rerun
  исходного run показывает ожидаемый русский toast для 409.
- Browser follow-up mobile 390px: dark — Enter на cancel сохранил cancelled;
  light — Enter на rerun создал queued `8a46…`, attempt 3 и пустые результаты.
  Desktop также проверен. Mobile `scrollWidth = clientWidth = 375` при
  `innerWidth = 390`: горизонтального overflow нет; console errors отсутствуют.
  Contrast, reduced motion и focus restoration отдельно не измерялись;
  UI/CSS не менялись. Live backend не проверялся.
- Publisher ownership/rebase check: повторный fetch подтвердил
  `origin/main@6cf61393f305f74e64b13309689a8afef6039827` и прежний PR head
  `ff0f425175bde3f228544891b333df61b28e99fc`; rebase `--autostash` — up to date.
  Открытые PR #122/#123 не владеют intended файлами; пересечения #106/#109
  по transport/test покрыты существующими coordination comments, проверенными
  перед публикацией. Untracked `.pnpm-store/` не включён в change.
