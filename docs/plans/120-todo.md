# Задачи #120

Текущий follow-up PR #137: rebase на `origin/main@6f5a122`, fixed point
`66aa8fb3fbf45bf4dafd9635353ae8cb0701bff3`. Первоначальная база — `c153576`.
Подробности — [план](120-plan.md). Первоначальная проверка ниже историческая;
актуальные результаты follow-up записаны отдельно. Речь скринридером остаётся открытой.

## До реализации

- [x] Пользователь одобрил сохранённый план; до этого код не менять.
- [x] Повторно проверить main и пересечения открытых PR #106/#109/#122.
- [x] Оставить координационные комментарии в пересекающихся PR до правок.
- [x] Выбрать актуальную кнопку/ссылку настроек по итоговой базе #106.
- [x] Создать `fix/120-access-refresh-slot` от актуального main отдельно от #110.
- [x] Сохранить текущий checkout, `.pnpm-store/` и планы #114–116.
- [x] Запустить профильный baseline из плана, записать SHA и результат.
- [x] Проверить доступность настоящего браузера и скринридера для первого объявления.

## 1. Геометрия и статус — M, 3–5 файлов

Зависимость: подготовка. Файлы: RepositoryList CSS/TSX/тест, при необходимости
RepositoriesPage TSX/тест. Хук опроса не менять.

- [x] В браузере воспроизвести текущие сдвиги и отсутствие пустого status в AX tree.
- [x] Закрепить резерв только вне `idle`, без `:empty` скрытия в ожидании/таймауте.
- [x] Использовать 32/56 px как начальные размеры раскладки по сетке 4 px;
      сверить достаточность в браузере и не возвращать старый лишний margin.
- [x] Сохранить Flat Console tokens, текущие компоненты и условия визуального текста.
- [x] Обеспечить один status со страницы до её ухода, включая ошибку без данных.
- [x] Обеспечить первое обновление уже зарегистрированного live region;
      если нужно, выделить только презентационную синхронизацию объявления.
- [x] Написать регрессии содержимого/переходов/идентичности status; получить red → green.
- [x] Проверить первый GET, между GET, второй GET, таймаут и ручной GET.
- [x] Получить геометрию поиска/рамки таблицы на 1280/390 в обеих темах:
      смещение 0 px, допустимое округление не больше 1 px явно записано.
- [x] Проверить отсутствие горизонтального скролла документа на 390 px.
- [x] Проверить AX tree пустого и заполненного status, ошибок и таймаута.
- [ ] Подтвердить первую речь реальным скринридером, записать browser/AT;
      при недоступности оставить этот AC открытым, назвать ограничение.
- [x] Проверить keyboard/focus, действие таймаута и reduced motion.

## 2. Действия строки при опросе — S, 1–2 тестовых файла

Зависимость: подготовка, итоговая форма настроек. Основной файл:
`src/pages/repositories/RepositoriesPage.test.tsx`.

- [x] Вместо проверки атрибута во время delayed GET выполнить переключение.
- [x] Проверить реальный PATCH правильного id и `{ enabled: false }`,
      оптимистический `aria-checked` и подтверждённый результат.
- [x] Открыть настройки этой строки и проверить диалог; после #106 проверить
      переход настоящим роутером и содержимое целевой страницы.
- [x] Временно заблокировать switch при polling: тест обязан стать красным.
- [x] Откатить мутант switch, временно заблокировать действие настроек:
      для ссылки блокировать переход, а не просто добавить aria-disabled.
- [x] Получить красный тест настроек, записать команды/упавшие утверждения.
- [x] Откатить все мутанты и получить зелёный профильный запуск.
- [x] Сохранить existing регрессии PATCH guard, дедлайна и отмены при уходе.

## Контрольная точка 1

- [x] Профильные тесты зелёные; два независимых мутанта дали red.
- [x] Browser/AX доказательства сохранены, речевая проверка выполнена или
      её незавершённость явно зафиксирована без заявления закрытого AC.
- [x] Окно 120 с / шаг 5 с / PATCH guard и auth-поведение не изменены.

## 3. Документация — S, 1 файл

Зависимость: согласование пересечений и итог среза 1. Файл:
`docs/FRONTEND_ARCHITECTURE.md`.

- [x] §2: `['repos']`, immediate refetch, 5 с / 120 с, PATCH guard/key.
- [x] Различить очистку таймеров и отмену GET через потребляемый AbortSignal.
- [x] Описать intent pending/ready, успешный callback, очистку ошибки и обычного
      входа, потребление страницей; дать ссылку на returnTo.ts.
- [x] Добавить useRepositoryAccessRefresh.ts в дерево; прочий дрейф не трогать.
- [x] Добавить свободную Ф-22 запись: номер проверен, участники уведомлены.
- [x] Сверить текст с существующим кодом, не менять код ради документации.

## Контрольная точка 2: все gates и review

- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm verify:prod-bundle` после свежего build
- [x] Итоговый diff ограничен #120; нет мутантов и чужих локальных файлов.
- [ ] В PR What / Why / How to verify / Refs, browser/AT evidence,
      таблица геометрии и две мутации; без closing keyword и Development link.
- [ ] Rebase на main перед review; approve на текущем head; все треды разрешены.
- [ ] Приёмка AC и закрытие issue остаются техлиду по workflow.

## Follow-up PR #137 (2026-10-18)

- [x] Продолжить уже одобренный план; не открывать новый planning gate.
- [x] Rebase на `6f5a122` (`66aa8fb`), дополнительные координационные комментарии
      #135/#136/#138/#139 до Ф-22/§2 и собственных новых файлов дерева.
- [x] P2 (оба треда): в idle нет визуального wrapper; waiting GET/пустой интервал/
      следующий GET/таймаут/manual GET сохраняют тот же wrapper. Регрессия выбирает
      CSS Module class, без лишнего role/live; возврат в idle удаляет wrapper.
- [x] P3-1/2: clipped/nowrap CSS Module страницы; чистый resolver и общие константы
      через публичный API виджета. Шесть literal status/refreshing cases проверены;
      русская копия, приоритет таймаута, spinner/button и два rAF сохранены.
- [x] P3-3: количество `status` проверяется отдельно, текущий DOM node сравнивается
      через `toBe(status)` при первом GET, завершении/интервале, следующем GET,
      таймауте и idle error. Exact `key={String(isError)}` mutant падает на `toBe`
      после успешного length=1; восстановлен. Cancellation/StrictMode/unmount сохранены.
- [x] P3-4/5: принята существующая двухкадровая политика: быстрый GET может отменить
      текст; медленные GET могут повторять его примерно до 24 раз/120 с. FA §2 row
      теперь содержит PATCH guard/key и отмену при уходе последнего наблюдателя;
      другой observer сохраняет GET, timer cleanup описан отдельно.
- [x] P3-6: recipe разделён на seeded geometry и fresh/no-cache AX/error. Старое
      утверждение seeded geometry = no-data entry исправлено; речь не заявляется.
- [x] P3-7: prospective fix/test/docs группы отделены для publisher; старую историю
      ради дробления не реконструируем.
- [x] Профильный restored green: 13 файлов / 146 тестов, 85.36 с (1 worker).
- [x] Новая browser matrix и no-cache/error AX: независимый QA, результаты ниже.
- [x] Шесть final-source gates: lint, types, format, 106 файлов / 1282 теста,
      build и проверка22 JS assets после свежего build. Результаты ниже.
- [x] Итоговые независимые Standards/Spec review follow-up: 0/0 actionable findings;
      proof-only markdown результаты gates дополняются после review.
- [ ] Публикация существующего PR отдельным publisher; human approve на текущем head
      и разрешение тредов авторами review остаются открытыми.

Команды red → green (Node 24.20.0, `npm_config_manage_package_manager_versions=false`,
`pnpm_config_verify_deps_before_run=false`, без правки lock/config):

```sh
pnpm exec vitest run src/widgets/repository-list/ui/RepositoryList.test.tsx \
  -t 'reserves a visual slot' --maxWorkers=1
pnpm exec vitest run src/pages/repositories/RepositoriesPage.test.tsx \
  -t 'keeps one empty status through an idle error' --maxWorkers=1
pnpm exec vitest run src/pages/repositories src/pages/auth src/features/auth \
  src/entities/repository src/widgets/repository-list --maxWorkers=1
```

Первая команда на исходном unconditional wrapper (`66aa8fb`) красная:
`expect(getSlot()).toBeNull()` получает `<div class="_accessRefreshStatus_…" />`.
После условного wrapper зелёная. Вторая команда с exact key mutant красная:
`expect(screen.getByRole('status')).toBe(status)` (один status остаётся, но узел заменён).
После восстановления профильная третья команда зелёная, включая cancellation и action tests.
Старые отдельные action mutants ниже сохраняют силу: их production logic не менялась.
jsdom проверяет presence/identity/copy, но не размеры CSS, computed nowrap или речь.

### Итоговые gates follow-up

Node24.20.0, installed pnpm12.3.4; runtime flags выше, lock/config не менялись.

| Команда                    | Результат                                                              |
| -------------------------- | ---------------------------------------------------------------------- |
| `pnpm lint`                | Pass, ESLint + stylelint после узкой test-only правки                  |
| `pnpm check-types`         | Pass                                                                   |
| `pnpm format:check`        | Pass, весь tree; proof-only результаты дополнительно проверены адресно |
| `pnpm test --maxWorkers=1` | **106 файлов / 1282 теста passed**,1068.12с                            |
| `pnpm build`               | Pass; existing advisory chunk>500kB                                    |
| `pnpm verify:prod-bundle`  | Pass после свежего build,22 JS assets clean                            |

Первый lint обнаружил один новый test-only type-lint: CSS Module indexed class имеет
тип `string | undefined` внутри template literal (`restrict-template-expressions`).
Явный `String(styles.accessRefreshStatus)` сохраняет прежнее runtime приведение/селектор;
production код/immutable QA snapshot не менялись. Полный lint повторён и зелёный;
focused slot regression после эквивалентного приведения прошёл отдельно:1/1,7.04с.
Полный serial suite не перезапускался: поведение теста не изменилось. При запуске load
машины доходил до80; выбран1 worker, таймауты и конфигурация не менялись. Ошибок тестов
не было; jsdom выводил existing unsupported pseudo-style/canvas/navigation warnings.
Итоговый review follow-up: Standards0/Spec0; publisher оформляет fix/test/docs группы.

### Новая браузерная проверка follow-up

Независимый Chrome 155.0.8059.84 (headless Playwright/CDP), immutable source copy после
восстановления всех мутантов. Реальные RepositoriesPage/AppLayout/UiProvider/Query/HTTP
client и hook; `VITE_USE_MOCKS=false`, GET/PATCH перехвачены на HTTP boundary. Auth init
обойдён harness-ом; live GitHub OAuth и настоящий backend этой проверкой не подтверждены.
Подробный evidence: `/private/tmp/dmc-ui-137-browser-evidence.md`.

Geometry намеренно seed-ит `['repos']` одним постоянным fixture. Idle без intent и ready
entry — отдельные свежие страницы/QueryClient. Данные/sidebar одинаковы. В обеих темах:

| Viewport | Idle search / table top    | Waiting search / table top | Waiting reserve | Movement внутри waiting→timeout/manual GET |
| -------- | -------------------------- | -------------------------- | --------------- | ------------------------------------------ |
| 1280×900 | 99 / 149.984375 px         | 149 / 199.984375 px        | 32 px           | 0 px                                       |
| 390×900  | 180.984375 / 279.953125 px | 254.984375 / 353.953125 px | 56 px           | 0 px                                       |

У idle wrapper отсутствует; лишние +50/+74 px удалены, обычный grid gap 18 px сохранён.
Шесть checkpoints окна: первый held GET, пустой интервал, следующий held GET, второй
интервал, timeout, ручной held GET. На каждом checkpoint ширина документа = viewport;
390px table scroll остаётся внутри рамки, timeout/action помещаются. Между отдельными
idle и ready mount не заявляется нулевое смещение.

На всех checkpoints один non-ignored AX status (`live=polite`, `atomic=true`), неизменные
DOM/AX backend node внутри страницы. Computed status: nowrap, inset(50%), 1×1px, без
hidden/inert/aria-hidden/display:none/visibility:hidden у предков. Fresh **без seed cache**:
1280/light ready entry сначала empty AX backend130, через40ms тот же node с загрузкой;
390/light idle HTTP500 сохраняет empty backend147 при скрытом списке; ready HTTP500
сохраняет backend151 и waiting slot56px. Это direct-ready harness entry, без route
PageLoader; его предки видимы. Bonus real-App callback не дал пригодного evidence:
paused fake clock помешал lazy route mount, поэтому OAuth-путь не считается пройденным.
Error-layout с Alert/Empty не покрывается populated-geometry утверждением и вне scope.

Один намеренно быстрый GET (до presentation frames): MutationObserver не увидел назначения
loading copy, status остался пустым после notification flush/80ms frames. Held GET дал
текст после двух кадров; это наблюдение timing policy, а не гарантия речи. Кнопка timeout
во всех четырёх комбинациях доступна Tab/Shift+Tab, видимый2px outline, Enter запускает GET.
Настройки Enter открывают правильный диалог; Space отправляет PATCH `{ enabled: false }`
и подтверждает `aria-checked` (1280/light,390/dark). Waiting contrast около7.58:1/7.57:1;
на390 в обеих темах reduced-motion не лишает essential информации, spinner aria-hidden.
Неизменённое декоративное animation2.4s остаётся; нулевые uncaught page errors.
Реальная речь первого сообщения/таймаута **не проверена**, AC остаётся на ручную приёмку.

## Первоначальная историческая проверка до review (2026-10-18)

Эти результаты относятся к опубликованному `f4dcc1d`, до текущего follow-up, и не заменяют
повторную проверку итогового кода. Тогда визуальный резерв ошибочно был и в idle; review P2
это исправляет. Geometry fixture намеренно seed-ил `['repos']`: он не доказывал no-cache entry.

- База `c153576`: профильный baseline 12 файлов / 134 теста; после срезов 1–2 —
  12 файлов / 138 тестов. Хук опроса, API и auth-код не менялись.
- Реальный Chrome 155.0.8059.84 с настоящими страницей, shell и Query-хуками;
  GET/PATCH контролировались перехватом HTTP. При одинаковых данных и sidebar
  на 1280×900 и 390×900 в светлой/тёмной темах поиск и рамка таблицы смещаются
  на 0 px во всех восьми состояниях (включая ошибочный резерв idle); резерв 32/56 px. На 390 px прокрутка
  таблицы остаётся внутри рамки, ширина документа — 390 px.
- AX tree: ровно один status до первого сообщения, между GET, при таймауте и
  ошибке без данных. Один AX-узел сначала пуст, через два кадра содержит
  сообщение первого GET. Keyboard-проверки настроек, switch и ручного
  обновления пройдены; ошибок страницы в браузере нет.
- Два независимых мутанта при waiting + pending GET: disabled switch ломает
  утверждение о PATCH правильного id с `{ enabled: false }`; disabled settings
  ломает открытие нужного диалога. Мутанты восстановлены, профильный запуск зелёный.
- Ф-22 свободен в проверенных refs пересекающихся PR: #106/#109 занимают Ф-21,
  #122 заканчивается на Ф-20. Запись #120 ограничена опросом и постоянным статусом.
- Реальная речь первого сообщения скринридером **не проверена**: VoiceOver
  установлен, но наблюдение через System Events завершается ошибкой -10827.
  DOM/AX не доказывают озвучивание; речевая часть AC остаётся для ручной проверки.
- Все шесть gates зелёные: `pnpm lint`, `pnpm check-types`, `pnpm format:check`,
  полный `pnpm test --maxWorkers=1` (105 файлов / 1275 тестов), `pnpm build`,
  `pnpm verify:prod-bundle` после свежего build (22 JS-ассета чистые).
  Node 24.20.0; для вложенных вызовов pnpm переданы
  `pnpm_config_verify_deps_before_run=false` и
  `npm_config_manage_package_manager_versions=false`, без изменения конфигурации репозитория.
- Первый полный запуск с двумя workers дал два таймаута 60000 ms в существующих
  тестах rollback PATCH и истории фильтров прогона при наблюдаемой нагрузке на машину.
  Оба неизменённых теста прошли адресно с одним worker (2/2, 10.49 с), затем
  неизменённый полный набор прошёл с одним worker (1275/1275, 454.49 с).
  Таймауты, конфигурация и исходники для повторного запуска не менялись.
- Независимые Standards/Spec review всех трёх срезов: 0/0 замечаний.
  Это проверка реализации; approve участника на текущем head и приёмка AC техлидом
  остаются отдельными незавершёнными шагами.
