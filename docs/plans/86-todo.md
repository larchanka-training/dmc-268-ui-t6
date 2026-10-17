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

## CI follow-up: PR #122, head bd25a23

- RED: [UI quality run 38976969655](https://github.com/larchanka-training/dmc-268-ui-t6/actions/runs/38976969655)
  на опубликованном head `bd25a23`: 103 files / 1195 tests PASS, но exit1 из-за
  6 unhandled `ReferenceError: window is not defined`. Stack указывает на
  `@rc-component/util/lib/hooks/useDelayState.js:39`, origin
  `src/widgets/diff-viewer/ui/RunDiff.filters.test.tsx`.
  Команда исследования: `gh run view 38976969655 --repo larchanka-training/dmc-268-ui-t6 --log-failed`.
- Причина подтверждена installed source: `antd/lib/form/hooks/useDebounce.js`
  вызывает `useDelayState` с 10ms для пустых errors/warnings; util не отменяет
  этот timeout на unmount. Callback `setState` мог сработать после jsdom teardown.
- Ownership для `src/test/setup.ts` согласован до правки:
  [комментарий в PR #106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106#issuecomment-6226062551).
  Прочитан точный patch через
  `gh api repos/larchanka-training/dmc-268-ui-t6/pulls/106/files --paginate --jq '.[] | select(.filename == "src/test/setup.ts") | .patch'`.
- Применён тот же patch из #106: зарегистрированный в setup `afterAll`
  включает real timers и ждёт один 10ms timer после file hooks и последнего
  cleanup. Ранее поставленные antd callbacks выполняются, пока jsdom ещё жив.
  Это test lifecycle fix: production, dependencies, таймбюджеты и обработка
  unhandled errors не менялись; ошибочные assertions/исключения не подавляются.
- Локальный исходный `CI=1 pnpm test src/widgets/diff-viewer/ui/RunDiff.filters.test.tsx`
  → PASS, 50 tests, 5.20s. CI log служит RED evidence непостоянной гонки;
  искусственный тест на внутренний timer не добавлялся.
- После правки `pnpm lint`, `pnpm check-types`, `pnpm build`,
  `pnpm verify:prod-bundle` → PASS; 3535 modules, 22 clean assets.
  `pnpm format:check` → PASS.
- `CI=1 pnpm test src/widgets/diff-viewer/ui/RunDiff.filters.test.tsx src/features/finding-filters/model/queryNavigation.test.tsx src/pages/runs/RunDetailPage.search.test.tsx`
  выполнена трижды с обычным CI worker режимом → 3 files / 73 tests PASS в каждом,
  11.51s / 11.24s / 10.32s; exit0, unhandled errors отсутствуют.
  Логи: `/private/tmp/86-ci-teardown-repeat-{1,2,3}.log`.
- Финальный `pnpm test` → 103 files / 1195 tests PASS, 45.43s, exit0;
  unhandled errors отсутствуют. Production поведение не менялось, прежний browser QA
  остаётся применимым. `git diff --check` → PASS.
- Fresh review координатора после fix: Standards 0, Spec 0; подтверждены hook order,
  отсутствие suppress и сохранение #86 fake-timer regressions. Повторная публикация
  follow-up остаётся publisher; development не выполняет commit/push.
- Publisher перед follow-up повторил fetch main: `origin/main` остаётся `5150ddc`,
  rebase не требуется. Diff от `bd25a23` содержит только setup и этот evidence;
  ownership setup с #106 согласован указанным комментарием. Подготовлен один
  test commit и обновление существующего draft PR #122; результат CI нового
  head на момент commit ещё ожидается, новых docs commit после push не планируется.

## Task 2: Заменить ожидание teardown исправлением util из review #122

**Description:** Обновить транзитивный util до релиза с unmount cleanup и убрать
10ms workaround. План/исследование выполнены на `dcda299`; пользователь явно
одобрил реализацию и публикацию. Разработка ведётся после rebase на `120203c`.

**Acceptance criteria:**

- [x] Используемое дерево содержит `@rc-component/util@1.14.0` с cleanup на
      unmount; обновление узкое, без новой direct зависимости/override.
- [x] Global `afterAll` wait и unused import удалены; публичный Form.Item
      regression RED на 1.13.0 и GREEN на 1.14.0 без sleep/suppress.
- [x] Все шесть gates, повторные CI runs и browser smoke PASS; PR #122 обновлён
      и reviewer получил ответ с SHA/evidence; CI на новом head завершён.

**Ordered checklist / verification:**

- [x] Прочитать review, проверить antd constraint и установленный 1.13.0 hook;
      подтвердить merged upstream #806, проверить уже исправленный navigationKey
      doc и reply (`1afee38`), перепроверить ownership #106/#109.
- [x] Пользователь одобрил follow-up план.
- [x] Освежить main/ownership, согласовать удаление setup workaround новым
      комментарием в #106 до edit; безопасно rebase перед финальной проверкой.
- [x] Подтвердить 1.14.0 в registry и cleanup в установленном пакете.
- [x] RED: минимальный public Form.Item unmount regression без global wait
      падает на старой версии по timer cleanup assertion.
- [x] Узко обновить транзитивный пакет через pnpm; убрать setup wait/import;
      проверить lockfile diff и разрешённые версии через dependency tree.
- [x] GREEN regression; возврат старого util снова даёт RED; восстановить 1.14.0.
- [x] Checkpoint: нет иных source/dependency правок или ожиданий в teardown.
- [x] Три CI=1 запуска RunDiff.filters + queryNavigation + RunDetailPage.search
      вместе с regression; exit0, без unhandled errors, обычные workers.
- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm verify:prod-bundle` после build
- [x] Browser smoke поиска/фильтров в обеих темах; записать evidence.
- [x] Независимые Standards/Spec reviews на финальном diff без findings.
- [x] Commit `(#86)`, hooks не обходить; push в существующую ветку/PR #122.
- [x] Обновить русский PR body, упомянуть transitive update и проверки;
      ответить reviewer с SHA/evidence, thread не resolve, проверить новый CI.

**Dependencies:** Task 1 выполнен; follow-up plan approval → coordination →
RED/GREEN → gates/reviews → publisher.

**Files likely touched:** `pnpm-lock.yaml`, `src/test/setup.ts`, один новый
co-located Form.Item regression в `src/shared/ui`, `docs/plans/86-plan.md`,
`docs/plans/86-todo.md`. `package.json` не предполагается менять.

**Estimated scope:** Medium, до 5 файлов; один последовательный review цикл.

### Task 2 execution evidence

- Пользователь явно одобрил follow-up и публикацию. До edit setup опубликован
  [новый ownership comment в #106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106#issuecomment-6235966133)
  о замене workaround upstream cleanup; #109 не пересекается.
- Перед gates: task-only tracked edits сохранены в отдельный stash; `git rebase origin/main`
  на `120203c` выполнен без конфликтов, новый head `4ccef32`. Stash применён,
  восстановление трёх файлов и `git diff --check` проверены; только затем stash удалён.
  Untracked regression сохранён. Исходный checkout не менялся.
- `pnpm view @rc-component/util@1.14.0 version dist.integrity dist.tarball dependencies peerDependencies --registry=https://registry.npmjs.org`
  подтвердил опубликованный пакет и integrity; `dist-tags.latest` = `1.14.0`.
  Configured private registry не отвечал, поэтому использован явный public registry
  только в командах; настройки registry не менялись.
- Targeted update: `pnpm update @rc-component/util --depth 100 --registry=https://registry.npmjs.org`.
  pnpm 12 не принимает version selector для indirect dependency; штатная unversioned
  команда разрешила подтверждённый latest `1.14.0` в пределах существующих ranges.
  Lockfile diff содержит только util version/integrity и ссылки на него;
  `package.json`, overrides и остальные resolved versions не менялись.
- `pnpm why @rc-component/util` → одна версия `1.14.0` во всём используемом дереве.
  Установленный `lib/hooks/useDelayState.js` содержит
  `React.useEffect(() => cancelPending, [cancelPending])`.
- Public regression `src/shared/ui/styles/antd.form.lifecycle.test.tsx` монтирует
  реальный `Form.Item` с именованным полем, доказывает наличие pending timers,
  unmount и ноль оставшихся timers. Нет deep imports, mocks внутренних hooks,
  sleep, drain/clear timers или suppress. Fake timers восстановлены в afterEach.
- Initial RED без setup wait на 1.13.0:
  `pnpm test src/shared/ui/styles/antd.form.lifecycle.test.tsx` → FAILED:
  после unmount осталось 2 timers вместо 0 (1.76s).
- Initial GREEN на 1.14.0: та же команда → 1/1 PASS (1.51s).
  Возврат сохранённого старого lockfile через `pnpm install --frozen-lockfile --offline`
  → повторный RED, то же assertion 2 вместо 0 (1.55s), log
  `/private/tmp/86-util-old-mutation.log`. Python finally восстановил новый lockfile
  и installed 1.14.0; финальный regression → 1/1 PASS (1.10s).
- Global 10ms `afterAll` и его import удалены; существующие cleanup/mocks/wait budgets
  сохранены. `navigationKey`, application source и конфигурация workers/timeouts
  не менялись. Scope — lockfile, setup, один public regression и два plans.

- Три последовательных запуска с обычными CI workers:
  `CI=1 pnpm test src/widgets/diff-viewer/ui/RunDiff.filters.test.tsx src/features/finding-filters/model/queryNavigation.test.tsx src/pages/runs/RunDetailPage.search.test.tsx src/shared/ui/styles/antd.form.lifecycle.test.tsx`
  → каждый 4 files / 74 tests PASS, exit0, без unhandled errors;
  12.91s / 11.55s / 10.67s. Логи `/private/tmp/86-util-ci-repeat-{1,2,3}.log`.
- `pnpm lint` → PASS (eslint + stylelint); `pnpm check-types` → PASS.
- `pnpm build` → PASS, 3539 modules; существующее предупреждение о крупном UI chunk
  (657.49 kB), ошибок нет. `pnpm verify:prod-bundle` после этой сборки → PASS,
  22 clean assets.

- Полная suite `pnpm test` → PASS, 108 files / 1276 tests, 51.25s, exit0;
  unhandled errors отсутствуют, log `/private/tmp/86-util-full-test.log`.
  Штатные jsdom diagnostics о pseudo-element styles/canvas/navigation не являются
  unhandled errors; test config и workers не менялись.

- Browser smoke координатора после util 1.14.0, mock Vite `http://127.0.0.1:5186`:
  поиск Retry → 1/11 и `q=Retry`; keyboard severity Warning →
  `severity=warning&q=Retry`; Back удаляет severity, сохраняя q;
  Forward и reload сохраняют 1/11 и оба параметра; reset → 11/11 без query.
  Light search Docs → 2/11. Проверены light/dark, focus ring и clear по Enter:
  11/11, activeElement с aria-label «Поиск по замечаниям».
  Mobile viewport390: clientWidth = scrollWidth = 375;
  desktop viewport1280: clientWidth = scrollWidth = 1265.
  Console warnings/errors пусты; после smoke восстановлена dark theme.
- Независимые финальные Standards и Spec subagents проверили
  `120203c...HEAD` вместе с working diff и новым regression: оба 0 findings.
  После шести gates implementation source не менялся.
- Publisher refresh перед публикацией: `origin/main` остаётся `120203c`,
  PR head остаётся ожидаемым `dcda299021e4cf4e771b6ed5331cbad5d0b7d617`,
  PR готов к review (`isDraft=false`). Rebase уже выполнен development;
  publication использует точный `--force-with-lease` этого remote head.
  Статус PR и reviewer не меняются. Публикационные пункты и новый CI пока открыты.

- Publication завершена: implementation commit `9205df84cff18f9562b1bf47929fe205c12b84c3`
  отправлен в существующую ветку/PR #122 с точным lease ожидаемого `dcda299`.
  Pre-commit eslint/prettier и pre-push tsc/eslint/stylelint PASS; hooks не обходились.
  Body на русском описывает весь PR, включая adapter/fallback/canary,
  `navigationKey`, transitive update и замену 10ms wait regression-тестом.
- [Ответ reviewer с SHA и evidence](https://github.com/larchanka-training/dmc-268-ui-t6/pull/122#issuecomment-6236118017)
  опубликован как общий PR comment в ответ на замечание `6235814747`.
  Ответ в уже исправленном navigationKey thread не дублировался; threads автор не resolve.
- [CI implementation head 9205df8, run 39046885177](https://github.com/larchanka-training/dmc-268-ui-t6/actions/runs/39046885177)
  завершён SUCCESS: UI quality (включая landing typecheck/test/build), Docker image
  build и Docker image security scan PASS; publish/deploy/promote jobs штатно SKIPPED.
  PR остаётся OPEN, `isDraft=false`, reviewer не назначен. Issue не закрывалась,
  merge и Development link не выполнялись. PR прикреплён к чату.
- Task 2 завершён. Эта финальная запись — только docs evidence commit;
  implementation source и lockfile после успешного CI не меняются. После её push
  publisher отдельно дожидается CI финального head и сообщает итог координатору.
