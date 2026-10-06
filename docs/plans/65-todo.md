# Task List: Issue #65

Refs: [larchanka-training/dmc-268-ui-t6#65](https://github.com/larchanka-training/dmc-268-ui-t6/issues/65)  
Plan: [`65-plan.md`](./65-plan.md)

Отмечайте задачи в PR body: `Refs #65` + какие AC части закрыты.

---

## Phase 1 — P1 Подсветка

### Task 1.1: Версии refractor / react-diff-view

**Description:** Сверить апстрим (peerDependencies, changelog, README tokenize). Зафиксировать совместимую пару в `package.json` или обосновать адаптер в PR body (строка о dependency обязательна по AC).

**Acceptance criteria:**

- [ ] Документирован выбор версии или адаптера в PR
- [ ] `node -e` / vitest: `tokenize` на `SAMPLE_PATCHES` не даёт `Invalid attempt to iterate non-iterable`

**Verification:**

- [ ] Gates stack rules green
- [ ] Manual: unified diff `.ts` показывает tokens в DOM

**Dependencies:** None

**Files likely touched:** `package.json`, `pnpm-lock.yaml`, возможно новый `src/widgets/diff-viewer/lib/refractorAdapter.ts`

**Estimated scope:** S–M

---

### Task 1.2: Исправить `tokensForHunks` + языки

**Description:** Убрать silent catch; зарегистрировать `python` (и прочие используемые грамматики); решить `jsx` (register или убрать из `fileLanguage.ts`).

**Acceptance criteria:**

- [ ] Ошибка токенизации логируется
- [ ] Unknown language — без throw, без подсветки
- [ ] `jsx` либо работает, либо не в маппинге

**Verification:**

- [ ] Unit-тесты `tokensForHunks` **без** мока `tokenize` (или отдельный файл `tokensForHunks.integration.test.ts`)
- [ ] Gates green

**Dependencies:** Task 1.1

**Files likely touched:** `tokensForHunks.ts`, `fileLanguage.ts`, tests

**Estimated scope:** S

---

### Task 1.3: DOM-тест подсветки (unified + split)

**Description:** Testing Library рендер diff widget с реальным patch для `.ts` и `.py`; assert `span.token` внутри `.diff-code` в обоих view mode.

**Acceptance criteria:**

- [ ] AC «DOM-тест без мока tokenize» для ts + py, unified + split

**Verification:**

- [ ] `pnpm vitest run` для нового теста
- [ ] Manual split toggle на моках

**Dependencies:** Task 1.2

**Files likely touched:** `src/widgets/diff-viewer/**/*.test.tsx`, fixtures

**Estimated scope:** M

---

### Task 1.4: Большие диффы (worker или cutoff)

**Description:** Подключить `useTokenizeWorker` или отключать highlight выше порога (~3000 строк), чтобы вкладка не зависала.

**Acceptance criteria:**

- [ ] AC «до 3000 строк вкладка не подвисает» (тест или perf smoke с порогом)

**Verification:**

- [ ] Manual или тест на synthetic large patch
- [ ] Gates green

**Dependencies:** Task 1.2

**Files likely touched:** diff-viewer UI/hooks

**Estimated scope:** M

---

## Checkpoint A

- [ ] Phase 1 AC #65 отмечены
- [ ] PR-1 готов к review

---

## Phase 2 — P2 Страница прогона

### Task 2.1: Mock-only «Ревью» / DEMO_RUN_ID

**Description:** `/review` и sidebar «Ревью» не ведут на фиктивный UUID без моков; единая функция mock mode.

**Acceptance criteria:**

- [ ] AC: без `VITE_USE_MOCKS` sidebar не ведёт на несуществующий прогон (navigation test)

**Verification:**

- [ ] Vitest routing/sidebar test
- [ ] Manual без моков

**Dependencies:** None (может быть первым PR части 2)

**Files likely touched:** `routes.tsx`, `AppSidebar.tsx`, `demoRun.ts`, `env.ts`

**Estimated scope:** S

---

### Task 2.2: API layer — rerun, hooks

**Description:** Добавить `endpoints.runs.rerun`; `useRunActions`, lazy `actionResponse`, `useRunComments`, `useRunFiles`, mutations `cancel`/`rerun` с Zod и ключами `['runs', id, 'actions']` и т.д.

**Acceptance criteria:**

- [ ] Все перечисленные в Scope #65 части 2 эндпоинты вызываются из UI layer (хотя бы из page/widget)

**Verification:**

- [ ] Unit tests fetch + schema parse (pattern `fetchRunDetail.test.ts`)
- [ ] Mock transport handlers

**Dependencies:** None

**Files likely touched:** `endpoints.ts`, `entities/run/api/index.ts`, `mockTransport.ts`

**Estimated scope:** M

---

### Task 2.3: Смонтировать RunInspector на RunDetailPage

**Description:** Секция или вкладка с логом действий; свёрнутые шаги; response по клику через `actionResponse`.

**Acceptance criteria:**

- [ ] AC: лог на моках и API; expand/collapse; response on demand

**Verification:**

- [ ] Existing `RunInspector.test.tsx` still green
- [ ] Manual mocks

**Dependencies:** Task 2.2

**Files likely touched:** `RunDetailPage.tsx`, возможно tabs layout

**Estimated scope:** M

---

### Task 2.4: Live status — `/api/stream`

**Description:** Hook подписки fetch+Bearer; parse `RunUpdatedEvent`; invalidate `runQueryKeys.detail(id)`; reconnect on token refresh.

**Acceptance criteria:**

- [ ] AC: статус меняется без reload (test with fake stream)

**Verification:**

- [ ] Vitest с mock fetch stream
- [ ] Manual с mock transport SSE

**Dependencies:** Task 2.2

**Files likely touched:** `entities/run/api/` (new hook file), `client.ts` if shared

**Estimated scope:** M

---

### Task 2.5: Rerun / Cancel UI

**Description:** Кнопки в header/inspector; 409 → понятное сообщение; invalidate queries.

**Acceptance criteria:**

- [ ] AC rerun/cancel + 409 message (mock test)

**Verification:**

- [ ] Vitest mutation errors
- [ ] Staging smoke после api#52 (optional follow-up)

**Dependencies:** Task 2.2, 2.4

**Files likely touched:** `RunHeader.tsx` or `RunInspector.tsx`, mutations

**Estimated scope:** S–M

---

### Task 2.6: Diff load-more и comments

**Description:** `RunDiff` / `DiffViewer` — `onLoadMore` через `/files`; published comments через `/comments`.

**Acceptance criteria:**

- [ ] AC Scope: контекст и комментарии подключены

**Verification:**

- [ ] Component tests or integration on mocks
- [ ] Manual expand context

**Dependencies:** Task 2.2

**Files likely touched:** `RunDiff.tsx`, `DiffViewer.tsx`, diff entity api

**Estimated scope:** M

---

### Task 2.7: RunDetailPage.test.tsx (ui#57 matrix)

**Description:** Тесты страницы: mocks + bare RunSession; collapse, DiffSuggestion, Warning/Info badges, anchor `endLine`, split mode, verdicts `attention`/`clean`.

**Acceptance criteria:**

- [ ] AC список из Background части 2 покрыт

**Verification:**

- [ ] `pnpm vitest run src/pages/runs/RunDetailPage.test.tsx`
- [ ] Gates green

**Dependencies:** Tasks 2.3–2.6 (частично можно параллельно с заглушками)

**Files likely touched:** new `RunDetailPage.test.tsx`, fixtures

**Estimated scope:** L → split subtests if needed

---

## Checkpoint B

- [ ] Phase 2 AC #65 отмечены
- [ ] PR(s) 2a–2c merged or ready

---

## Phase 3 — P3 Хвосты

### Task 3.1: Auth errors и callback UX

**Description:** `ApiError` читает `detail`; callback на русском; фиксированный текст по `error` code вместо raw `error_description`.

**Acceptance criteria:**

- [ ] AC часть 3 auth errors

**Verification:**

- [ ] Vitest client + CallbackPage
- [ ] Manual OAuth error URL

**Dependencies:** None

**Files likely touched:** `client.ts`, `CallbackPage.tsx`

**Estimated scope:** S

---

### Task 3.2: Один `/me`, no logout on anonymous

**Description:** Убрать дубль `GET /me`; не вызывать logout при анонимной загрузке.

**Acceptance criteria:**

- [ ] AC тест: один me, zero logout

**Verification:**

- [ ] Vitest store/init
- [ ] Network tab manual

**Dependencies:** None

**Files likely touched:** `store.ts`, `useMe` hook, `client.ts`

**Estimated scope:** S

---

### Task 3.3: Единый `isMockMode()` и prod bundle

**Description:** Одна функция parse `VITE_USE_MOCKS`; «Демо-вход», `DEMO_RUN_ID`, fixtures не в prod bundle (tree-shake / dynamic import / guard).

**Acceptance criteria:**

- [ ] `pnpm build && grep` — нет «Демо-вход» в assets

**Verification:**

- [ ] Script or test in CI
- [ ] Gates green

**Dependencies:** Task 2.1 (overlap)

**Files likely touched:** `env.ts`, `main.tsx`, `LoginButton.tsx`, mock modules

**Estimated scope:** M

---

### Task 3.4: Post-login redirect + UserMenu a11y

**Description:** Return URL после login; keyboard для UserMenu trigger.

**Acceptance criteria:**

- [ ] AC return route + keyboard

**Verification:**

- [ ] Vitest RouteLayouts / UserMenu
- [ ] Manual Tab/Enter

**Dependencies:** None

**Files likely touched:** `RouteLayouts.tsx`, `UserMenu.tsx`

**Estimated scope:** S

---

### Task 3.5: Vendor chunks + CSP

**Description:** Выделить antd vendor chunks, убрать/снизить `chunkSizeWarningLimit` без warning; CSP в `docker/nginx.conf` с проверкой UI.

**Acceptance criteria:**

- [ ] AC antd chunks + build без raised limit justification
- [ ] CSP present; app works

**Verification:**

- [ ] `pnpm build` output sizes
- [ ] preview/docker browser smoke

**Dependencies:** DevOps sign-off on CSP

**Files likely touched:** `vite.config.ts`, `docker/nginx.conf`

**Estimated scope:** M

---

### Task 3.6: Diff findings & error differentiation

**Description:** Findings с `patch: null` и вне `/diff` в блоке «вне диффа»; range beyond hunk → single suggestion; diff load errors vs 404 vs Zod; one bad finding не роняет страницу.

**Acceptance criteria:**

- [ ] AC часть 3 run page bullets + test per case

**Verification:**

- [ ] Vitest DiffViewer, RunDiff, RunDetailPage error cases

**Dependencies:** Phase 2 baseline helpful

**Files likely touched:** `DiffViewer.tsx`, `RunDiff.tsx`, `RunDetailPage.tsx`, `extractNewSideLines.ts`

**Estimated scope:** M

---

### Task 3.7: FSD, query keys, href, docs

**Description:** Убрать deep imports (ESLint rule if feasible); keys = FRONTEND_ARCHITECTURE §2; `RunHeader` http(s) only; fix barrel fixture export; sync FRONTEND_ARCHITECTURE; comment on api#20; decision on `ReviewPage.tsx`.

**Acceptance criteria:**

- [ ] AC lint keys href docs api#20 ReviewPage decision

**Verification:**

- [ ] `pnpm lint`, doc diff review
- [ ] Gates green

**Dependencies:** Tasks 2.7, 3.6

**Files likely touched:** multiple slices, `docs/FRONTEND_ARCHITECTURE.md`, `eslint.config.js`

**Estimated scope:** M

---

### Task 3.8: Test hygiene (mock transport)

**Description:** Test `initMockTransport`; immutable fixtures; modal open vs closing tests.

**Acceptance criteria:**

- [ ] AC из Background auth block (tests)

**Verification:**

- [ ] Vitest

**Dependencies:** Task 3.3

**Files likely touched:** `mockTransport.ts`, related tests

**Estimated scope:** S

---

## Checkpoint C

- [ ] All #65 AC checked
- [ ] Tech lead verification
- [ ] Issue close

---

## Parallelization

| Parallel safe               | Sequential                      |
| --------------------------- | ------------------------------- |
| 1.x vs 3.1–3.4              | 1.1 → 1.2 → 1.3                 |
| 2.1 vs 2.2 start            | 2.2 → 2.3–2.6                   |
| 3.5 CSP vs 3.6 after DevOps | 2.7 after page structure stable |

---

## Pre-implementation checklist (skill verification)

- [x] Every task has acceptance criteria
- [x] Every task has verification
- [x] Dependencies ordered
- [x] No task intentionally >8 files without split
- [x] Checkpoints A/B/C defined
- [x] Human reviewed and approved plan before coding (2026-10-04)
