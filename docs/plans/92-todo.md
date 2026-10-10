# Todo: #92 — bounded repository refresh after OAuth

Plan: [92-plan.md](92-plan.md). Refs: larchanka-training/dmc-268-ui-t6#92.

## Task 1: Save refresh-access intent at OAuth kickoff

**Description:** Сохранить отдельное pending намерение при клике «Обновить
доступ», сохранив существующий return route и авторизованную сессию.

**Acceptance criteria:**

- [x] Клик сохраняет pending intent, `/repositories` и вызывает GitHub OAuth
      ровно один раз без logout; ordinary login не создаёт ready intent.
- [x] Публичные helpers проверяют неизвестные данные хранилища через Zod,
      допускают безопасные peek/clear и не падают при недоступном storage.
- [x] Уже существующее поведение страницы и обычного обновления сохраняется.

**Verification:** Один падающий тест → минимальная реализация; targeted tests
auth helpers и страницы, затем обязательные gates перед отметкой done.
Ручная проверка: клик запускает GitHub и сохраняет return route.

**Dependencies:** None.

**Files likely touched:** `src/features/auth/lib/returnTo.ts`,
`src/features/auth/lib/returnTo.test.ts`,
`src/pages/repositories/RepositoriesPage.tsx`,
`src/pages/repositories/RepositoriesPage.test.tsx`.

**Estimated scope:** Medium, 4 files.

- [x] Task 1 complete.

**Task 1 evidence (2026-10-10):** RED page assertion expected `pending`, received
`null`; GREEN after saving the explicit intent before OAuth. Public peek and clear
helpers also received individual RED/GREEN checks. Targeted tests: 24 passed;
full suite: 71 files / 572 tests passed. Lint, typecheck, build and production
bundle verification passed. Raw `pnpm format:check` encounters the preexisting
untracked `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791563001124/package.json` formatting
error. The check passed with a temporary ignore file preserving all repository
ignores and adding `.pnpm-store/`; that directory and `.prettierignore` were left
untouched. Dependencies installed from the unchanged lockfile with pinned pnpm
12.4.1 / Node 24.20.0 and command-local public registry override (the configured
personal registry was unavailable). Remaining tasks verify callback and polling.

## Task 2: Activate intent after successful OAuth

**Description:** Только после успешного обмена кода callback подготавливает
one-time ready intent для страницы; все ошибки убирают намерение.

**Acceptance criteria:**

- [x] Success переводит только pending refresh-access intent в ready перед
      onSuccess/redirect; обычный успешный вход оставляет intent отсутствующим.
- [x] OAuth denial, missing code и rejected callback очищают намерение.
- [x] StrictMode обрабатывает callback один раз и не дублирует activation.

**Verification:** RED/GREEN тесты `CallbackPage`, auth helper tests, все
обязательные gates перед done. Ручная проверка: возврат после refresh доступа
сохраняет маршрут; ошибка показывает существующий Result.

**Dependencies:** Task 1.

**Files likely touched:** `src/pages/auth/CallbackPage.tsx`,
`src/pages/auth/CallbackPage.test.tsx`,
`src/features/auth/ui/LoginButton.tsx`,
`src/features/auth/lib/returnTo.ts`,
`src/features/auth/lib/returnTo.test.ts`.

**Estimated scope:** Medium, 5 files (ordinary login also clears abandoned intent).

- [x] Task 2 complete.
- [x] Checkpoint: callback success/errors and ordinary login verified.

**Task 2 evidence (2026-10-10):** Individual RED/GREEN callback tests covered
successful activation before `onSuccess`, denial, missing code and rejected
exchange. Real auth flow with external mock transport verifies ordinary successful
login leaves intent absent, malformed successful responses clear intent, and
StrictMode performs one exchange / one success notification with ready intent.
Helpers validate activation only from pending. Targeted tests: 26 passed; full
suite: 71 files / 575 tests passed. Lint, typecheck, build, production bundle and
format check with the unchanged Task 1 temporary ignore adjustment passed.

**Task 2 review correction:** Added a public flow regression for abandoned pending
refresh → logout → ordinary `LoginButton` click → successful callback. RED left
`ready` intent; GREEN clears abandoned intent at ordinary login kickoff. Explicit
repository refresh still retains pending intent. Ownership rechecked before
editing `LoginButton`; no open PR collision.
Correction validation: 35 targeted tests, full suite 71 files / 576 tests; lint,
typecheck, build, production bundle and adjusted format check all passed.

## Task 3: Poll within a visible bounded waiting window

**Description:** Запустить немедленное обновление и интервал 5 секунд при ready
intent, показывая waiting в течение 120 секунд. Добавить deadline/manual refresh
и отмену при уходе через Query lifecycle.

**Acceptance criteria:**

- [x] За 120 секунд новый репозиторий появляется без reload как после `[]`,
      так и после устаревшего непустого списка; свежий кеш не мешает первому GET.
- [x] На deadline spinner/опрос прекращаются; понятное сообщение и кнопка
      «Обновить список» выполняют одиночный refetch без нового OAuth/loop.
- [x] Уход со страницы убирает timers/опрос и отменяет активный GET; ordinary
      mount/revisit не начинает новый цикл. StrictMode и медленные запросы не
      удваивают запросы и не продлевают окно.

**Verification:** Последовательные RED/GREEN page tests через fake timers,
буквальные 5000/120000, deferred GET и preseeded Query cache; все gates перед
done. Ручная проверка: waiting → новая строка → конец окна/ручной refetch,
navigation прекращает запросы. Ошибки используют существующий error Alert.

**Dependencies:** Task 2.

**Files likely touched:** `src/pages/repositories/RepositoriesPage.tsx`,
`src/pages/repositories/RepositoriesPage.test.tsx`,
`src/pages/repositories/lib/useRepositoryAccessRefresh.ts` (if extracted),
`src/entities/repository/api/index.ts`,
`src/entities/repository/api/index.test.ts`,
`src/widgets/repository-list/ui/RepositoryList.tsx` (manual refresh pending state).

**Estimated scope:** Medium, 6 files. Lifecycle hook is tested through
page behavior; no private-helper test suite.

- [x] Task 3 complete.
- [x] Checkpoint: delayed empty/nonempty lists, timeout, one-shot manual action,
      cleanup, StrictMode and ordinary login regressions green.

**Task 3 evidence (2026-10-10):** RED/GREEN page slices verified missing waiting
and fresh-cache refresh, the extra GET at 120000 before deadline handling,
missing network AbortSignal at unmount, and missing ordinary refresh spinner.
Page/API regression suite: 27 tests passed, including initially empty/nonempty
lists, delayed repository additions, one-shot manual action, hung GETs, delayed
background ticks, network errors, ordinary mount/revisit, last-observer
cancellation, and mutation invalidation during waiting. Root StrictMode verifies
one rehearsal cancellation, 24 completed GETs and at most one active request.
Query remains enabled throughout; repository data lives only in its cache.
Full suite: 71 files / 589 tests passed. Lint, typecheck, build, production bundle
and adjusted format check passed after the final timeout layout change; the
unchanged preexisting `.pnpm-store` formatter exception is documented in Task 1.

Coordinator browser smoke verified mock OAuth → waiting with three existing rows
→ timeout after 120 seconds → manual refresh without a new waiting window, plus
navigation away/back without restarting. Desktop 1265×712 and mobile 390×844
were checked; the timeout button now sits below the text so the message stays
readable at mobile width. Console warnings/errors were empty. Local evidence
(outside the repository): `/private/tmp/dmc-268-ui-92-waiting.jpg`,
`/private/tmp/dmc-268-ui-92-timeout.jpg`,
`/private/tmp/dmc-268-ui-92-timeout-mobile.jpg`.
Delayed worker completion is covered deterministically at the public page/API
boundaries; an actual staging-worker race was not exercised.

## Task 4: Validate, review and publish

**Description:** Обновить документацию плана по фактическому решению, проверить
полную сборку и тесты, пройти независимые Standards/Spec reviews и открыть PR.

**Acceptance criteria:**

- [x] Все frontend gates выполнены; результаты и известное исходное исключение
      formatter для `.pnpm-store/` записаны.
- [x] Reviewer сообщает 0 Standards/Spec findings; все предыдущие findings
      исправлены с повторной проверкой.
- [x] После ownership/main check publisher создал ветку, commit, push и PR с
      `Refs #92`, без closing keyword, merge и посторонней `.pnpm-store/`.

**Verification:** Полные команды ниже; финальная проверка diff/status; ссылка PR
и краткое описание того, как проверены AC.

**Dependencies:** Task 3.

**Files likely touched:** `docs/plans/92-plan.md`, `docs/plans/92-todo.md`.

**Estimated scope:** Small documentation; full review/publishing checkpoint.

- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check` — executed; baseline exception and adjusted pass below.
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm verify:prod-bundle`
- [x] Standards review: 0 findings.
- [x] Spec review: 0 findings.
- [x] Recheck open PR file ownership and current main; rebase if required.
- [x] Docs reflect final implementation; prior untracked files untouched.
- [x] Commit/push/PR complete; PR URL returned and attached to chat.
- [x] Task 4 complete.

**Task 4 review/base evidence (2026-10-10):** Final independent review reported
0 Standards / 0 Spec findings; 54 targeted tests passed independently. Ownership
recheck found no overlap with open PRs #85, #90 and #94. Publication fetched main
at `423c164` (the landing workspace and runtime Docker update) and rebased this
change without conflicts. App source was unchanged upstream. Final verification
was repeated on that base before publication: lint, types, 589 tests / 71 files,
build and production bundle verification passed. The new upstream landing CI
checks also passed: types, 15 tests / 2 files, build. Frozen-lockfile workspace
installation added only upstream landing dependencies; no lockfile change.

Raw `pnpm format:check` failed only for the unchanged preexisting untracked
`.pnpm-store/v11/.tmp/pnpm-12.4.1-1791563001124/package.json`.
`pnpm format:check --ignore-path /private/tmp/dmc-268-ui-92-prettierignore`
passed, preserving repository ignores and adding only `.pnpm-store/` in the
temporary file. The directory and repository ignore configuration remain
untouched and uncommitted. Test output includes existing jsdom pseudo-element
and navigation notices; tests passed, and the browser smoke console was clean.

**Publication evidence:** Implementation commit `94eec9f` was pushed to
`fix/92-refresh-access` with normal lint-staged and pre-push hooks. Draft
[PR #95](https://github.com/larchanka-training/dmc-268-ui-t6/pull/95) was created
and attached to the chat. Its body documents verification and limitations,
including the raw formatter exception and untested actual staging-worker race.
No merge, issue closure, Development-panel link, or external PR comment was
performed. Final completion evidence is recorded in a separate docs commit.

## PR #95 review follow-up: preserve settings during access refresh

[Review comment 4237554568](https://github.com/larchanka-training/dmc-268-ui-t6/pull/95#discussion_r4237554568)
identified stale polling GETs overwriting optimistic and confirmed settings
while repository PATCH requests were pending. The immediate access-refresh
microtask and every interval tick now check the current
`UPDATE_REPOSITORY_MUTATION_KEY` mutation count before fetching. The absolute
120-second deadline and normal Query invalidation remain in place; polling
resumes on the next tick only while the original window is still open.

- [x] Public page regression: delayed PATCH retains the optimistic toggle,
      expires at the original deadline, then settles through normal invalidation
      without restarting polling.
- [x] Public page regression: two concurrent PATCH requests retain both the
      confirmed first row and optimistic second row when a delayed stale GET
      would return between their completions; last-mutation invalidation and
      subsequent polling still work.
- [x] Public page regression: a mutation already pending at mount suppresses
      the initial access-refresh microtask and following interval tick.
- [x] Development gates and documentation complete.
- [x] Independent Standards/Spec review: 0 findings; 22 page tests passed.
- [x] Follow-up committed and pushed; PR body updated and reviewer answered
      with the implementation SHA.

**RED/GREEN evidence (2026-10-10):** Without the mutation guard, the delayed-PATCH
test reverted the optimistic switch from `false` to `true` at the first polling
tick. The concurrent-PATCH test also failed after PATCH 1 confirmed `false` and
the prepared stale GET returned `true` while PATCH 2 remained pending. Both pass
with the guard; the initial-microtask regression passes as well. Page/API suite:
30 tests passed. Full suite: 71 files / 592 tests passed. Lint, typecheck, build,
production-bundle verification and adjusted formatting passed. No dependency
or lockfile changes were made.

Raw `pnpm format:check` still fails only inside the untouched, untracked local
`.pnpm-store/`, now listing five generated package manifests:

- `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791563001124/package.json`
- `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791633279571/package.json`
- `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791633279572/package.json`
- `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791633279576/package.json`
- `.pnpm-store/v11/.tmp/pnpm-12.4.1-1791633279581/package.json`

`pnpm format:check --ignore-path /private/tmp/dmc-268-ui-92-prettierignore`
passes. The temporary ignore preserves repository ignores and adds only
`.pnpm-store/`; neither the store nor repository ignore configuration was
changed. Existing jsdom pseudo-element/navigation notices remain in successful
test output. This follow-up changes request scheduling without changing the UI;
the earlier mock browser smoke evidence remains applicable.

**Follow-up review/base evidence:** Independent review reported 0 Standards /
0 Spec findings and passed all 22 page tests. Before publication, ownership was
checked against open PRs #85, #90 and #94 with no collision. Current main remains
`423c164`, already an ancestor of this branch; no additional rebase is needed.

**Follow-up publication evidence:** Commit
[`1d41eef`](https://github.com/larchanka-training/dmc-268-ui-t6/commit/1d41eef)
was pushed with normal commit and pre-push hooks. The PR body now describes the
mutation guard, 592-test full suite and five generated-manifest formatter
exception. [Reply 4237584899](https://github.com/larchanka-training/dmc-268-ui-t6/pull/95#discussion_r4237584899)
answers review comment 4237554568 with that SHA and the regression evidence.
The review thread remains for its reviewer to resolve. PR readiness was
preserved as observed (`isDraft: false`); no merge or issue closure occurred.
