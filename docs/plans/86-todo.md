# Task List: #86 — гонка поиска и навигации

Brief и точный issue context: [86-plan.md](86-plan.md).

## Task 1: Закрыть гонку поиска при медленном коммите

**Description:** Один vertical slice через оба пользовательских сценария:
доказать гонку тестами, изолировать раннюю подписку, интегрировать защиту
записи, сохранить обычное поведение поиска и обновить FA §2.

**Acceptance criteria:**

- [x] Pending q не попадает на другой прогон, если новый коммит дольше 250 мс.
- [x] POP и ввод до завершения коммита не восстанавливают снятые file/severity;
      старый pending текст не переживает внешнюю навигацию.
- [x] FA §2 описывает закрытое окно, адаптер и fallback/canary; существующие
      сценарии поиска и фильтров работают.

**Ordered implementation checklist:**

- [x] Освежить origin/main, создать отдельный worktree/branch для #86,
      скопировать только 86-plan.md и 86-todo.md. Сохранить исходный checkout.
- [x] Проверить open PR ownership; комментарий для FA в #106 уже опубликован
      ([ссылка](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106#issuecomment-6225476114)).
- [x] Прочитать tdd skill и frontend rules, текущие хуки и существующие tests.
- [x] RED: другой прогон, typed q, fake timers, unresolved Suspense с ручным
      promise. Доказать старый DOM при новой фактической location.
- [x] RED: POP, затем ввод в старое поле при unresolved Suspense. Проверить
      фактический URL до resolve и после коммита, без восстановленных фильтров.
- [x] Checkpoint RED: оба теста падают по утверждению AC на исходном коде.
- [x] Реализовать минимальный изолированный adapter и ранние refs/guard;
      state/subscribe/UNSAFE import не расползаются по feature.
- [x] Интегрировать внешний переход/POP, границу run/pathname, отмену либо
      отклонение устаревших записей; сохранить собственные pending writes.
- [x] Проверить cleanup, fallback и upgrade canary на установленном router.
- [x] GREEN: оба новых сценария и существующие tests проходят; временное
      отключение защиты возвращает RED, затем защита восстановлена.
- [x] Узко обновить FA §2, убрать устаревшее ограничение.
- [x] Checkpoint GREEN: не требуется новая зависимость или изменение App.

**Verification:**

- [x] Узкие regression tests выполнены повторно при обычной параллельной
      нагрузке; записать команды/количество повторений и результаты.
- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm verify:prod-bundle` после build
- [x] Browser: поиск/select/reset/back/forward/другой прогон/reload;
      обе темы, desktop/390px, keyboard/focus, без horizontal overflow.

**Dependencies:** None; передача brief от planning координатором.

**Files likely touched:**

- RED harness: новый co-located `src/features/finding-filters/model/*.test.tsx`
  и/или `src/pages/runs/RunDetailPage.search.test.tsx` (1–2 файла).
- GREEN: `src/features/finding-filters/model/useFindingFiltersParams.ts`,
  новый adapter в том же `model/`; `useQueryText.ts` только при необходимости
  для cancellation seam (2–3 файла).
- Compatibility/docs: tests adapter, `docs/FRONTEND_ARCHITECTURE.md`, эти plans
  (до 5 файлов на подшаг; не расширять scope на другие features).

**Estimated scope:** Medium на каждый последовательный подшаг RED, GREEN,
compatibility/docs. Общий slice проходит единый review, чтобы проверять гонки
и исправление вместе.

## Final checkpoint: независимый review и публикация

- [x] Standards review: 0 actionable findings.
- [x] Spec review: 0 пропущенных AC; review на текущем head после исправлений.
- [x] Обновить main/ownership перед review и публикацией, при изменении кода
      повторить затронутые проверки; сборка и bundle check согласованы.
- [x] Conventional Commit с `(#86)`/`Refs #86`, без closing keywords.
- [x] Draft PR: русский body с What / Why / How to verify / Refs;
      reviewer не назначен, issue не закрыта, Development link не добавлен.
- [x] PR прикреплён к текущему чату; URL возвращён пользователю.

## Evidence

Рабочая ветка `fix/86-filter-query-navigation`, worktree `/private/tmp/dmc-268-ui-86`,
baseline `origin/main` = `5150ddc`. Исходный checkout не менялся. Скопированы только
два документа #86; зависимости установлены без изменения lockfile.

Все pnpm команды запускались с `PATH=/Users/qx/.nvm/versions/node/v24.20.0/bin:$PATH`
и `login=false` (Node 24.20.0, pnpm 12.4.1). Для pnpm потребовался разрешённый запуск
вне sandbox: внутри sandbox даже `pnpm --version` не возвращал вывод.

- Ownership: `gh pr list --repo larchanka-training/dmc-268-ui-t6 --state open --json number,title,files`
  → #106 и #109. Пересечение только FA с #106; прежний комментарий координации
  остаётся применимым. Дополнительные `RunDiff.tsx`, `RunDetailPage.tsx`,
  `FindingFiltersBar.tsx` не входят в эти PR.
- `pnpm install --frozen-lockfile` → PASS, 500 reused, 0 downloaded, lockfile unchanged.
- Initial RED: `pnpm test src/features/finding-filters/model/queryNavigation.test.tsx`
  → 2 failed: другой run получил `?q=pending`; POP вернул
  `?file=a.ts&severity=critical&q=fresh` вместо `?tab=notes&q=fresh`.
  Перед обоими assertions доказаны новая router location и старый DOM при
  unresolved ручном promise (CPU delay отсутствует).
- Initial GREEN: `pnpm test src/features/finding-filters/model/queryNavigation.test.tsx src/features/finding-filters/model/useFindingFiltersParams.test.tsx`
  → 2 files / 19 tests PASS.
- Compatibility + existing search: `pnpm test src/features/finding-filters src/pages/runs/RunDetailPage.search.test.tsx`
  → 6 files / 139 tests PASS, 223.40s под внешней параллельной нагрузкой.
- Отдельный найденный edge: POP → fresh input → 249ms → release до debounce.
  `pnpm test src/features/finding-filters/model/queryNavigation.test.tsx -t 'keeps text entered after POP'`
  с прежним поздним reset → RED (`''` вместо `'fresh'`). Теперь подписанный input
  не повторяет отмену по позднему `navigationKey`: иначе теряется новый ввод.
- Только write guard недостаточен: он блокирует другой pathname, но не отличает
  старый pending текст от нового ввода после POP на том же pathname. Поэтому
  optional subscription проходит по существующему Page → RunDiff → Bar → hook,
  синхронно отменяет старый timer и сохраняет последующий новый ввод.
- Final navigation GREEN после edge fix:
  `pnpm test src/features/finding-filters/model/queryNavigation.test.tsx` → 7/7 PASS (15.92s).
- Mutation RED после GREEN: в адаптере временно принудительно выбран fallback;
  `pnpm test src/features/finding-filters/model/queryNavigation.test.tsx` → 7/7 FAILED
  по пользовательским assertions (q leak, stale filters/text, fresh text).
  Python `finally` восстановил исходный adapter (`ADAPTER_RESTORED`), дальше
  mutation отсутствует. Одна сборка, случайно начатая во время этой пробы,
  отклонена TypeScript; она не является финальным артефактом и перезапущена.
- `pnpm lint` после lint corrections → PASS (eslint + stylelint).
- `pnpm format:check` после форматирования и на финальных docs → PASS.
- Первый полный `pnpm test`: 101 files / 1175 tests PASS, exit1 из-за 2 worker-start
  timeouts до загрузки тестов (`theme/model/store.test.ts`, `RunControls.test.tsx`).
  Никаких упавших assertions. Load averages на машине превышали 60–85;
  повторена полная suite с обычными workers, config/таймбюджеты не менялись.
- Повтор под нагрузкой: `pnpm test src/features/finding-filters/model/queryNavigation.test.tsx src/features/finding-filters/model/routerLocationAdapter.test.tsx`
  → regressions 7/7 PASS; compatibility worker не стартовал (worker-start timeout),
  поэтому этот запуск не считается успешным gate.
- Независимый review координатора на восстановленном diff: Standards 0, Spec 0.
  Отдельная probe q=old → target от Spec reviewer PASS.
- Browser QA координатора на dev server `http://127.0.0.1:5186`, mock mode:
  поиск Retry → 1/11 и q replace; keyboard severity Warning сохраняет q;
  Back удаляет severity, Forward+reload восстанавливают оба; reset очищает;
  keyboard file README → 2/11; clear по Enter возвращает фокус в input.
  Обе темы, mobile390 без горизонтального scroll, desktop1280 без scroll.
  После финального restore: reload → pending-next → меню прогонов → #39:
  адрес `/runs/...009` без query, пустой поиск, 3/3 замечаний.
  Один console error относился к HMR во время временного изменения dependencies
  effect; после финального reload новых runtime ошибок не было.

- Финальный `pnpm check-types` → PASS.
- Финальный `pnpm build` → PASS, 3535 modules; стандартное предупреждение Vite о
  существующем крупном UI chunk (655.76 kB), ошибок сборки нет.
- `pnpm verify:prod-bundle` после этой сборки → PASS, 22 assets clean.
- Полная suite повторно: `pnpm test` → PASS, 103 files / 1195 tests,
  50.29s, exit0. Обычные default workers, без config/timeout изменений.
- Финальный повтор `pnpm test src/features/finding-filters/model/queryNavigation.test.tsx src/features/finding-filters/model/routerLocationAdapter.test.tsx`
  → PASS, 2 files / 9 tests (7 regressions + fallback/canary), 1.93s, exit0.
  Все 7 regression также прошли под нагрузкой в предыдущем повторе и полной suite.
- Финальный `pnpm lint` после explicit HTMLInputElement generic → PASS.
- `git diff --check` → PASS. App, package.json, pnpm-lock.yaml не менялись.

Task 1 завершён: шесть gates, браузерная проверка и независимый review выполнены.
Публикационные пункты final checkpoint остаются publisher/координатору;
commit/push development не выполнял.

- Publisher перед публикацией повторно выполнил `git fetch origin main`:
  `origin/main` и текущий baseline остаются `5150ddc`, rebase не требуется.
  Повторный ownership по files открытых #106 и #109: пересечение только
  `docs/FRONTEND_ARCHITECTURE.md` с #106, согласованное прежним комментарием.
  Просмотрен полный diff, включая новые adapter/tests и оба плановых документа;
  `git diff --check` PASS. До commit/push пункты публикации оставлены открытыми.
- Публикация: implementation commit `1c95f4d`;
  pre-commit (eslint/prettier) и pre-push (tsc/eslint/stylelint) PASS,
  hooks не обходились. [Draft PR #122](https://github.com/larchanka-training/dmc-268-ui-t6/pull/122)
  создан с русским body, reviewer не назначен; опубликован
  [русский комментарий проверок](https://github.com/larchanka-training/dmc-268-ui-t6/pull/122#issuecomment-6226011088).
  PR прикреплён к чату. Issue не закрывалась, Development link не добавлялся.
  На первом snapshot CI `UI quality` и `Docker image build` выполняются;
  их статус не выдаётся за локальный PASS. Эта запись — отдельный docs commit
  evidence, код реализации после проверки не менялся.
