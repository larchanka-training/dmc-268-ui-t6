# #118 — список задач

План: [118-plan.md](118-plan.md). Статус: **approval получен 2026-10-18; T0–T9 прошли review Standards0 / Spec0; T10 приёмка и gates завершены; финальное review Standards0 / Spec0; публикация выполняется**.
Сверенная база: `origin/main` `9382f9e`; документы созданы в старой ветке #110 без реализации.

## Подготовка

- [x] Прочитать issue и уточнение после merged #104, правила и актуальный main.
- [x] Проверить текущую ветку и открытые PR: #106/#109 пересекаются с будущими правками.
- [x] Сохранить план с AC, code/spec решениями и браузерной матрицей.
- [x] Получить approval плана и визуальных решений code/spec.
- [x] Получить явное разрешение на публикацию конкретных комментариев из плана в #106/#109
      либо дождаться их merge; coordinator отправил оба комментария (ссылки ниже).
- [x] T0: обновить main, создать `fix/118-design-system-gaps` от свежего origin/main,
      перенести только документы #118, проверить merge-base и сохранность чужих untracked.
- [x] T0: повторно сверить ownership; опубликовать разрешённые комментарии до правок
      пересекающихся файлов либо убедиться, что соответствующие PR уже смёржены.

## Разработка — каждый slice через RED → GREEN → refactor

- [x] T1: исправить актуальную тему Docs и remount/navigation regression
      (`.storybook/preview.tsx` и целевые тесты).
- [x] T2: добавить Button link, Result500, InputNumber disabled, Avatar image/icon
      в Storybook, сохранить danger-истории #104.
- [x] Контрольная точка A: оба направления темы и все новые истории проверены в браузере.
- [x] T3: 3px error/warning halo Input/InputNumber; 2px Pagination ring по actual DOM;
      Segmented hover и Message shadow из токенов системы.
- [x] T4: общий доступный Segmented, обязательное имя, публичный tabIndex=-1;
      regression tests и браузерное доказательство единственного стопа/стрелок.
- [x] T5: использовать общий Segmented в RepositoryList, DiffViewer и Overview;
      осмысленные имена, фильтр/Unified/Split работают, повторные группы независимы.
- [x] Контрольная точка B: фокус после Tab/стрелок виден в приложении и Storybook,
      нет двойного изменения значения, FSD соблюдён.
- [x] T6: CodeBlock ring2px/link и line-height21px; доступное имя columnheader «Настройки».
- [x] T7: Typography body13px/1.5, Button12.5px во всех размерах при высотах26/32/40,
      critical solid Tag500 и прежняя22% заливка.
- [x] T8: diffTheme.test строит обе темы через buildTheme; строки ≥4.5:1;
      подтвердить RED временной mutation реальной палитры и откатить её, сохранить syntax tests.
- [x] Контрольная точка C: контраст и типографика проверены в браузере, #128 не затронут.
- [x] T9: обновить DESIGN_SYSTEM §2–7, статус и временную оговорку; описать chip24/surface3,
      syntax-слоты и цвета, Tag14/11/22%, пример reduced motion как в уже исправленном LoginPage.

## Приёмка и публикация

- [x] T10 / AC1: пять недостающих Storybook вариантов доступны в dark/light.
- [x] T10 / AC2: Docs Light→Dark, story→docs, старый light URL — итоговый html theme=dark.
- [x] T10 / AC3: browser computed styles подтверждают halo3px, Pagination2px, CodeBlock2px/link.
- [x] T10 / AC4: оба использования Segmented — один Tab-стоп, стрелки, focus, доступные имена.
- [x] T10 / AC5: существующие LoginPage.motion regression (2 теста) и пример reducedMotion.
- AC5 browser reduce initial/live — **не выполнялось**: недоступно в IAB.
  По согласованию с пользователем применена альтернативная автоматическая проверка
  существующими 2 LoginPage.motion tests; это не browser evidence.
  Системные настройки не менялись, OS-доступ отозван пользователем.
- [x] T10 / AC6: columnheader «Настройки» в accessibility tree.
- [x] T10 / AC7: каждый пункт code/spec таблицы закрыт, вычисленные значения совпадают.
- [x] T10 / AC8: реальная тема диффа, literal4.5:1 и чувствительность к поломке палитры.
- [x] Проверить общий frontend §3b checklist: keyboard, focus-return, no-double-action,
      names, contrast, control heights,390px; reduced motion — согласованная automation-only
      проверка. Evidence сохранено ниже.
- [x] `pnpm lint`.
- [x] `pnpm check-types`.
- [x] `pnpm format:check`.
- [x] `pnpm test`.
- [x] `pnpm build`.
- [x] `pnpm verify:prod-bundle` после build.
- [x] `pnpm build-storybook`.
- [x] Review: Standards0 / Spec0 findings; при findings вернуть development и повторить review.
- [x] Publisher: проверить scope diff и статус; коммитить только #118, не чужие планы/store.
- [ ] Publisher: rebase от актуального main, gates, Conventional Commit(#118), push и PR
      с What/Why/How to verify/Refs, перечнем code/spec решений и browser evidence.
- [ ] Прикрепить созданный PR к чату; вернуть URL. Не закрывать issue и не делать merge автоматически.

## Журнал доказательств

Planning: source implementation, tests, browser reproduction и gates **не запускались**.
При реализации записывать под задачами RED/GREEN, команды, актуальный SHA, browser URL/тему,
ожидаемые/фактические computed values и результаты review; checkbox отмечать только с evidence.

### T0 — 2026-10-18

- Пользователь утвердил план, code/spec решения и публикацию комментариев ответом «делай».
- `git fetch origin main`; отдельный worktree `/private/tmp/dmc-268-ui-118`, ветка
  `fix/118-design-system-gaps`. HEAD = origin/main = merge-base:
  `9382f9e7daf2df1eb654da30b8536280e41d090e`.
- Перенесены только `118-plan.md` / `118-todo.md`. Исходная `fix/110-mock-rerun`
  и её untracked остаются на месте; tracked-правок там нет.
- Coordinator сверил ownership и опубликовал разрешённые комментарии:
  [#106](https://github.com/larchanka-training/dmc-268-ui-t6/pull/106#issuecomment-6254412753),
  [#109](https://github.com/larchanka-training/dmc-268-ui-t6/pull/109#issuecomment-6254413223).
- Runtime: Node24.20.0, pnpm12.3.4. Здесь bypass pinned manager — `pnpm with current ...`
  (флаг `--manage-package-manager-versions=false` pnpm12 не поддерживает). Зависимости
  установлены из main lockfile через `install --frozen-lockfile --ignore-scripts` в отдельный
  worktree; исходный node_modules не менялся. Registry/store/state вынесены в отдельные
  `/private/tmp/dmc-268-ui-118-pnpm-*`; manifests и lockfile не изменены.

### T1 — RED

- Публичная граница: configured DocsContainer, html theme, переданная Docs theme и
  cleanup подписки на реальном Storybook Channel. Mock только внешнего Docs renderer
  и неиспользуемого story decorator provider; сам preview/container/channel настоящие.
- `pnpm with current exec vitest run src/test/storybookDocs.test.tsx`:
  **1 failed**; актуальный globals=dark перед mount при старом iframe URL
  `?globals=theme:light` даёт фактический html theme=light вместо literal dark (строка42).
- Storybook (до изменения implementation) доступен coordinator на
  `http://127.0.0.1:6118/`; browser evidence дополняется отдельно.

### T1 — GREEN и browser evidence

- `.storybook/preview.tsx`: initial mode берётся из `channel.last(GLOBALS_UPDATED)`;
  URL используется только при отсутствии valid cached event. Последующие события проверяет
  Zod enum dark/light; invalid event не перекрывает текущую valid theme. Существующий
  cleanup снимает тот же обработчик, второй store/globals-cache не вводился.
- `pnpm with current exec vitest run src/test/storybookDocs.test.tsx`: **6 passed**.
  Проверены initial URL fallback light/dark, cached globals при stale light URL,
  переключение Dark→Light→Dark, remount и число подписок1/0/1/0, invalid events.
- `pnpm with current check-types`: **passed**. `pnpm with current exec eslint .storybook/preview.tsx src/test/storybookDocs.test.tsx --max-warnings=0`: **passed**.
  Целевая проверка Prettier — **passed** после форматирования только plan/todo.
- Browser RED от coordinator (IAB): manager URL
  `http://127.0.0.1:6118/?path=/docs/%D1%81%D0%BF%D0%B5%D1%86%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%86%D0%B8%D1%8F--docs&globals=theme:light`,
  после Светлая→Тёмная toolbar «Тема Тёмная» присутствует1 раз, iframe html theme=light.
- Browser GREEN от coordinator на том же URL: после reload со stale light globals,
  Dark→Light даёт iframe html theme=light; Light→Dark даёт theme=dark. После перехода
  Reviewer UI story→Спецификация toolbar «Тема Тёмная» присутствует1 раз и iframe html
  theme=dark. iframe src `/iframe.html?id=спецификация--docs&viewMode=docs`.
- T2+ не начаты. Полные project gates и итоговый browser checklist остаются T10.

### T1 — исправление review

- Первое независимое review: Standards1(P3), Spec0. Замечание: тест должен
  находиться рядом с preview согласно `.agents/rules/frontend.md`§5.
- `src/test/storybookDocs.test.tsx` перенесён в `.storybook/preview.test.tsx`,
  исправлены относительный import preview и путь mock shared/ui.
- Vitest include в `vite.config.ts` дополнен точным `.storybook/preview.test.tsx`,
  чтобы обычный `pnpm test` также запускал colocated regression.
- Повторная проверка: `pnpm with current exec vitest run .storybook/preview.test.tsx`
  — **6 passed**; `pnpm with current check-types` — **passed**; целевые ESLint
  (`preview.tsx`, `preview.test.tsx`, `vite.config.ts`) и Prettier — **passed**.
  `git diff --check` — **passed**. Ожидается повторное review.
- Повторно прочитан список открытых PR#106/#109: `vite.config.ts` ими не затронут.

### T1 — повторное review

- После переноса теста: Standards0 / Spec0. T0–T1 разрешены coordinator к следующему slice.

### T2 — недостающие состояния Storybook

- Добавлены отдельные истории Button/Link, Content/ServerError (Result500),
  Input/DisabledNumber и Layout/AvatarImage, Layout/AvatarIcon.
- AvatarImage содержит автономный SVG data URI и текстовый fallback C; сети и новых
  зависимостей нет. Старые default/primary/text danger Buttons сохранены.
- Проверки экспортов статических stories не добавлялись согласно утверждённому плану.
- `pnpm with current check-types` — **passed**. Целевые ESLint и Prettier для
  четырёх изменённых stories — **passed**; `git diff --check` — **passed**.
- Scope T2: четыре source-файла, 44 добавленные строки; зависимости/lockfile не менялись.
  Browser evidence dark/light и checkpoint A подтверждены coordinator. T3+ не начаты.

- Browser GREEN от coordinator на `http://127.0.0.1:6118` в dark и light:
  `ant-design-button--link` рендерит `.ant-btn-link` (light цвет rgb(29,78,216));
  `ant-design-content--server-error` показывает img Server Error, «Ошибка сервера»,
  «Повторить»; `ant-design-input--disabled-number` имеет enabled=false;
  `ant-design-layout--avatar-image` — complete=true, naturalWidth64, data URI;
  `ant-design-layout--avatar-icon` — img с доступным именем «Аватар пользователя», count1.
  Прямой путь: `/iframe.html?id=<story-id>&viewMode=story&globals=theme:<dark|light>`.
- T1 repeat review Standards0 / Spec0, T2 browser PASS: checkpoint A закрыт,
  ожидается независимое review T2.

### T2 — исправление review

- Первое review: Standards1(P3), Spec0. По `DESIGN_SYSTEM.md`§8 у нового поля
  требуется видимая подпись. Только DisabledNumber теперь содержит
  label «Лимит замечаний» с `htmlFor="disabled-findings-limit"` и соответствующий
  InputNumber id; избыточный aria-label убран. Старые истории не менялись.
- После правки typecheck, целевые ESLint/Prettier для Input.stories.tsx и
  `git diff --check` — **passed**. T3+ не начаты, ожидается повторное review.

### T2 — повторное review

- Standards0 / Spec0 после видимой подписи; coordinator подтвердил в браузере:
  label видим, поле enabled=false. Разрешён следующий slice T3.

### T3 — RED/GREEN token seams

- Изучен установленный antd6.6.5: Input/InputNumber initComponentToken генерирует
  error/warningActiveShadow из controlOutlineWidth2; Pagination вызывает этот же helper,
  его component lineWidthFocus по умолчанию1. Message genListItemSharedStyle читает
  boxShadow, а не boxShadowSecondary. Segmented hover читает itemHoverBg.
- RED: `pnpm with current exec vitest run src/shared/ui/theme/buildTheme.test.ts -t
'3px focus halo'`: **2 failed** (undefined status shadow). Уточнены literal status
  shadows до непрозрачного link, как существующие colorErrorOutline/WarningOutline:
  dark `0 0 0 3px #60a5fa`, light `0 0 0 3px #1d4ed8`; normal activeShadow сохранён.
  GREEN **2 passed** после явных errorActiveShadow/warningActiveShadow обоих компонентов.
- RED/GREEN `-t 'neutral hover surface'`: **2 failed→2 passed**; dark
  rgba(148,163,184,.06), light rgba(15,23,42,.04) заданы через itemHoverBg=p.hover.
- RED/GREEN `-t 'popover shadow for Message'`: **2 failed→2 passed**;
  components.Message.boxShadow=p.popoverShadow, без изменения глобальной boxShadow.
- RED `-t '2px Pagination focus ring'`: **2 failed**, component token undefined.
  Trial lineWidthFocus2 в браузере дал пустую --ant-pagination-line-width-focus
  и outline none; override удалён, узкое CSS-правило покрывает реальные focus nodes.
- Добавлена StatusFocus story с видимыми связанными labels для error/warning Input
  и InputNumber. Stories сами не являются доказательством computed focus.
- Browser RED от coordinator: app4188dark/settings после очистки «Лимит замечаний»
  и submit, фокус ArrowLeft: status border rgb(248,113,113), shadow link 2px.
  Pagination actual focus LI.tabIndex0, outline rgb(96,165,250) solid1px.
  Message shadow target DIV.ant-message-notice.ant-message-notice-success; исходная
  тройная тень antd не равна popoverShadow.

### T3 — итоговый GREEN и browser evidence

- Pagination fallback в shared `antd.css`: page/jump LI получают outline2px/link;
  prev/next LI рисуют тот же ring на внутреннем item-link, offset1px. Корневой disabled
  вариант исключён, specificity на один класс выше antd. Component override не оставлен.
- Colocated `styles/antd.pagination.test.tsx` разбирает настоящий stylesheet через CSSOM,
  рендерит настоящий Pagination и проверяет matching селекторов на пяти focus targets.
  Это проверка селекторного контракта; computed appearance доказан отдельно браузером.
- Mutation/RED подтверждён тем же тестом с baseline stylesheet из HEAD: **1 failed**,
  page selector не достигает LI. Использованы временные копии test/CSS, затем удалены;
  HMR-реализация во время браузерной проверки не изменялась.
- `pnpm with current exec vitest run src/shared/ui/styles/antd.pagination.test.tsx
src/shared/ui/theme/buildTheme.test.ts`: **39 passed**,2files.
- Поддержка browser QA: Input/StatusFocus и Data/PaginationFocus (defaultCurrent6,
  total500,pageSize10,showSizeChangerfalse, видимые Tab anchors перед/после).
  Scope T3 расширен coordinator до6файлов:4плановых +2stories для проверкиAC.
- Browser GREEN coordinator: Input и InputNumber,error/warning, все4×dark/light:
  shadow dark rgb(96,165,250)0 0 0 3px / light rgb(29,78,216)0 0 0 3px.
  Error borders dark rgb(248,113,113),light rgb(217,38,38); warning borders
  dark rgb(251,191,36),light rgb(161,98,7). App maxComments error также3px.
- Segmented ::after hover: dark rgba(148,163,184,.06),light rgba(15,23,42,.04),
  opacity1 и hover=true на невыбранном пункте; соответствует нейтральному hover.
- Message actual .ant-message-notice: dark rgba(0,0,0,.6)0 8px24px-12px +
  rgba(148,163,184,.2)0 0 0 1px; light rgba(15,23,42,.2)0 8px24px-12px +
  rgba(15,23,42,.16)0 0 0 1px; обе совпадают с --rv-pop-shadow.
- PaginationFocus все5targets×dark/light: LI Назад/1/Предыдущие5/Следующие5/Вперед
  actual active=true после keyboardArrowUp; outline dark rgb(96,165,250)solid2px,
  light rgb(29,78,216)solid2px; prev/next computed на inner item-link, остальные на LI.
  App page1dark также2px. URLs на6118: `ant-design-input--status-focus`,
  `ant-design-data--pagination-focus`, `ant-design-feedback--message`,
  `ant-design-segmented--filter`; app4188mock /repositories.
- Focused checks: typecheck, целевые stylelint/Prettier и `git diff --check` —
  **passed**. Окончательный ESLint5files ещё running (session20853), передан coordinator;
  предыдущий целевой ESLint до CSS-test прошёл. T4+ не начаты, ожидается review T3.

### T3 — независимое review

- Standards0 / Spec0. Coordinator повторил окончательный ESLint, exit0
  (исходная session20853 недоступна из другого agent-runtime). T3 закрыт, разрешён T4.

### T4 — общий Segmented

- Публичная граница: named radiogroup, root Tab order, checked/onChange controlled и
  uncontrolled values, disabled option, caller props/ref и независимые radio groups.
- RED с passthrough реального antd: root tabIndex0 вместо literal -1, **1 failed**.
  Минимальная обёртка передаёт публичный tabIndex=-1; обязательный aria-label задаётся
  TypeScript API, generic value/callback и ref сохраняются. DOM-перезаписи и
  дополнительная клавиатурная логика не добавлялись.
- Stories используют общий компонент с осмысленными именами; Controlled содержит
  видимое value/onChange-count и Tab anchors перед/после. Disabled option находится
  между двумя доступными значениями для реальной проверки skip.
- Browser URLs6118: `ant-design-segmented--filter`, `--small`, `--disabled`,
  `--controlled`. Controlled initial output: «Выбрано:all; изменений:0».
- Native Tab/ShiftTab/arrows и отсутствие второго callback проверяет coordinator;
  jsdom не имитирует native radio navigation, это отдельное ограничение unit evidence.
- T5+ не начаты. Итоговые focused checks и browser evidence добавляются ниже.

### T4 — browser GREEN

- Controlled в dark/light: Tab с «Перед фильтром» сразу на checked radio,
  group tabIndex=-1. NativeRight пропускает disabled active→paused, output count1;
  DOM focus на paused, label outline2px/link. Tab сразу на «После фильтра»;
  ShiftTab возвращает paused; NativeLeft→all, count2. Один callback на нажатие.
- Uncontrolled Filter: clickAlllabel + nativeRight выбирает и фокусирует «Активные7».
  В Disabled story nativeTab с body полностью пропускает первую disabled group,
  попадает в checked radio группы «Фильтр с недоступным вариантом». Имена осмысленные.
- Проверка jsdom использует явные независимые name для повторных групп: antd
  в NODE_ENV=test намеренно выдаёт одинаковый test-id для своего auto useId.
  Workaround в production wrapper не добавлялся, реальная клавиатура проверена отдельно.
- Unit GREEN: `pnpm with current exec vitest run src/shared/ui/Segmented/Segmented.test.tsx`
  — **6 passed**. Проверены required label type, root-1, uncontrolled arrows/skip,
  controlled generic1|2 и caller rerender, caller class/size/ref/name, explicit independent
  groups и disabled. `pnpm with current check-types` — **passed**.
- ESLint и TypeScript7 по-разному сужали результат getByRole; тесты используют
  публичный generic `getByRole<HTMLInputElement>` вместо спорных casts.
- Целевые ESLint и Prettier по4файлам T4 — **passed**; `git diff --check` —
  **passed**. Ожидается независимое review T4. T5+ не начаты.

### T4 — независимое review

- Standards0 / Spec0; coordinator разрешил интеграцию T5.

### T5 — интеграция Segmented

- RepositoryList и DiffViewer импортируют общий Segmented из публичного shared/ui;
  Overview использует тот же компонент внутри shared. Новых зависимостей нет.
- Имена: «Фильтр репозиториев» и «Вид диффа: <filename>». Существующие
  фильтрация и общий useDiffViewerStore.viewType не менялись: переключение любого
  файла обновляет Unified/Split у всех, это прежнее продуктовое поведение.
- Unit RED RepositoryList: **1 failed**, отсутствует radiogroup «Фильтр репозиториев».
  После интеграции GREEN **1 passed**, стрелки all→active скрывают disabled repository,
  обратная стрелка возвращает его. Проверяется публичный rendered список.
- Unit RED DiffViewer: **1 failed**, нет radiogroup «Вид диффа:src/app.ts».
  После интеграции GREEN **1 passed**: две осмысленно названные группы, root-1,
  стрелки переводят оба файла в split/unified через существующий общий state.
- Полноценная native-name уникальность и переход фокуса проверяются браузером:
  jsdom antd autoId=test-id не является доказательством реальных имён.
- T6+ не начаты. Focused checks и browser evidence добавляются ниже.

- Focused `pnpm with current exec vitest run` по обоим widget test files —
  **40 passed**. Typecheck, целевой ESLint по5файлам T5, Prettier и diff-check —
  **passed**. Библиотека Table выводит известное jsdom предупреждение
  getComputedStyle(pseudo-element); appearance/focus этим тестом не доказывается.

### T5 — browser GREEN, checkpoint B

- App4188 /repositories, dark/light: nativeTab с поиска сразу на checked radio;
  Right→«Активные2», table rows3(header+2). Tab→ссылка первого репозитория;
  ShiftTab→selected radio; Left→«Все3», rows4. Focus outline2px/link обеих тем.
- Run#34 `/runs/11111111-1111-4111-8111-000000000004`: четыре группы «Вид диффа:
  src/a.ts», «Вид диффа:README.md», «Вид диффа:src/utils/retry.ts»,
  «Вид диффа:app/notify.py». Roots tabIndex=-1; native names уникальны между группами
  (_r_14_…_r_17_), одинаковы внутри пары.
- Первая группа: clickUnified→Tab выходит к следующему row button; ShiftTab возвращает;
  Right→все4selected Split и таблицы diff-split; фокус остаётся на Split первого файла,
  outline2px/link. Left→все4Unified. Проверено dark/light; общий режим сохранён.
- T3–T5 browser evidence вместе закрывают checkpoint B: keyboard focus, один stop,
  нет двойного изменения, осмысленные имена и корректная интеграция через shared API.
- T6+ не начаты. Ожидается независимое review T5.

### T5 — независимое review

- Standards0 / Spec0. Разрешён slice T6.

### T6 — CodeBlock и заголовок настроек

- RED CodeBlock CSSOM contract: line-height actual1.5 vs expected21px, **1 failed**;
  отдельно отсутствующее focus-visible outline vs literal2px/link, **1 failed**.
  GREEN implementation: line-height21px и focus-visible2pxsolidvar(--rv-link), offset2px.
- Существующий test сохраняет literal multiline text, caller class рядом с CSS module
  class; добавлен запрет явного tabindex. Production CodeBlock.tsx не менялся:
  коротким блокам не добавляется дополнительный Tab stop, overflow-focus делает браузер.
- LongLine story: width320/max-width100%, длинный JSON и видимые Button anchors
  «Перед кодом»/«После кода»; fixture не добавляет production focus logic.
- RepositoryList RED: **1 failed**, нет columnheader «Настройки». Public
  Table column.onHeaderCell теперь задаёт aria-label, визуальный заголовок сохраняется
  пустым; display:none и скрытого DOM-текста нет.
- Scope T6:5файлов (CodeBlock CSS/test/story + RepositoryList source/test).
  T7+ не начаты. Focused GREEN и browser evidence добавляются ниже.

### T6 — browser GREEN

- LongLine, обе темы: nativeTab с «Перед кодом» фокусирует PRE; tabindex attribute=null,
  scrollWidth5400/clientWidth320, line-height21px. Outline dark rgb(96,165,250)solid2px,
  light rgb(29,78,216)solid2px. NativeRight прокручивает scrollLeft0→40;
  следующий Tab сразу на «После кода».
- Actual app4188light: columnheader с name «Настройки» найден1раз,
  aria-label «Настройки», visible text пустой, как задумано.
- Browser evidence закрывает визуальные/focus аспекты; CSSOM unit является
  контрактом объявления стилей, не заменой browser computed styles.
- Focused Vitest по CodeBlock и RepositoryList: **28 passed**,2files.
  Typecheck, целевые ESLint/stylelint/Prettier и `git diff --check` — **passed**.
  Ожидается независимое review T6; T7+ не начаты.

### T6 — независимое review

- Standards0 / Spec0. Разрешён следующий slice T7.

### T7 — типографика и critical Tag

- RED theme public contract: Typography component token отсутствует, **2 failed**
  на literal13px/lineHeight1.5. После token trial GREEN **2 passed**.
- Установленный antd Typography читает token.lineHeight; browser trial dark показал
  scoped --ant-line-height=1.5, Text/Paragraph font13px/lineHeight19.5px.
  Component alias работает; CSSfallback не нужен. Heading h4 сохранил18px/26px
  (существующий baseline, вне scope T7).
- RED Button contract: **2 failed**, actual font sizes[12,12.5,13] вместо
  [12.5,12.5,12.5]. GREEN **2 passed** после только font-size token поправок;
  literal heights26/32/40 проверены в том же тесте, global geometry не менялась.
- RED Tag CSSOM contract: critical solid font-weight600 вместо500, **1 failed**.
  Удалено только специальное значение600, остаётся базовый500 и прежняя22%заливка.
  Тест также проверяет retained22%цветовую декларацию и caller class рядом с module class.
- Scope T7:4файла(theme source/test, TagCSS/test), без screenstyles/новых deps.
  T8+ не начаты. Итоговые focused checks и browser evidence добавляются ниже.

### T7 — итоговый GREEN и browser evidence

- Focused Vitest theme+Tag: **49 passed**,2files. Typecheck, целевые
  stylelint/Prettier и diff-check — **passed**. Окончательный ESLint — **passed**
  после явной проверки CSS empty-string вместо || в Tag test; повторный Tag suite **7 passed**.
- Browser dark/light: Content Text+Paragraph font13px/lineHeight19.5px.
  Typography lineHeight token работает через scoped --ant-line-height1.5,
  пустой --ant-typography-line-height не мешает использующемуся правилу; fallback не нужен.
- ButtonSizes все5кнопок(default/SM/LG/icon): font12.5px; large/default/small
  height40/32/26px точно, без изменения геометрии.
- Criticalsolid обе темы: fontWeight500,height20px, backgroundalpha.22;
  dark color(srgb .976471 .45098 .0862745/.22),
  light color(srgb .72549 .109804 .109804/.22). Foreground сохранился.
- T8+ не начаты. Ожидается независимое review T7.

### T7 — дополнительные QA и независимое review

- Standards0 / Spec0. Дополнительный browser contrast critical Tag с alpha-composition
  на actual opaque story background: light5.41749:1,dark5.85510:1, обе ≥4.5.
- ButtonVariants при storyviewport390px: page scrollWidth390 в обеих темах,
  все6русскихподписей без overflow, heights32, widest primary207.406px. Это Storybook390;
  app tab тогда оставался1280 и не считается доказательством app390 для T10.

### T8 — контраст реальной темы диффа

- diffTheme.test.ts строит обе темы через публичный buildTheme, сохранил все SURFACES,
  alpha-composition, row4.5:1 и syntax3:1, остальные stylesheet/syntax assertions.
- RED после переключения stock→actual theme: **1 failed/55 passed**. Dark special
  purple7 #854eca на insert#132a2c даёт2.8238183403199604:1 при пороге3:1.
- Минимальный fix mapper: только special берёт purple8, dark#ab7ae0/light#391085;
  другие7слотов не менялись. Литералы всех8слотов закреплены по actual theme,
  mapper comment объясняет исключение purple8. GREEN **58 passed**.
- Row regression sensitivity: временная мутация настоящего palette.dark.text
  #f8fafc→#0c1121; `vitest ... -t '4.5:1'` — **10 failed/10 passed/38 skipped**,
  plain contrast1.0 вместо≥4.5. Порог не ослаблялся.
- В finally восстановлены исходные bytes без gitcheckout. SHA256 до/после одинаков:
  `f222719d6517bd33479600ea415f23482d57629e21ee154e6f57b54246561092`.
  git diff palette.ts пустой, scratch не создавался и mutation не осталась.
- Restored browser run#34: dark special#ab7ae0,text#f8fafc,insert#132a2c;
  light special#391085,text#0b1220,insert#e0f7e8. Обе темы соответствуют buildTheme.
- Source scope2файла: diffTheme.ts/diffTheme.test.ts. T9 не начат;
  restored focused Vitest **58 passed**, typecheck, целевые ESLint/Prettier
  и diff-check — **passed**. Ожидается review. T6–T8 evidence закрывает checkpoint C;
  #128 не затронут.

### T8 — независимое review

- Standards0 / Spec0; reviewer отдельно запустил58тестов на установленном runtime
  и подтвердил palette SHA256. Разрешён docs-only slice T9.

### T9 — спецификация

- Только DESIGN_SYSTEM.md и журнал: статус без старого#98/blanket-caveat;
  пример nested ConfigProvider читает внешний theme.useToken и передаёт
  reducedMotion:!token.motion ровно как текущий LoginPage.
- Таблица8syntaxslots с фактическими обеими палитрами и specialpurple8; mapper
  остаётся в widget, FRONTEND_ARCHITECTURE.md не менялся. Общая норма4.5длятекста
  сохранена; syntax3 описан как дополнительный существующий регрессионный барьер.
- Зафиксированы CodeBlock12/21,body13/19.5,Button12.5all/heights26/32/40,
  Tagweight500 и14/11/22%+85/15%foreground, Selectmultiplechip24/surface3/default.
- Уточнены statusInput/InputNumber3pxopaque link, Paginationactualfocus/CSSfallback,
  Segmentedwrapper/label/native names/одинstop, Message.boxShadow popover.
- Markdown вручную сопоставлен с каждым code/spec пунктом118-plan и финальными
  source declarations; local architecture anchor проверен по реальному заголовку§6.
  Motion test source действительно покрывает initialmotiontrue/false и livefalse→true;
  OS/browser preference emulation не выполняется, это будет предел evidence T10.
- Целевой Prettier для DESIGN_SYSTEM.md/todo и `git diff --check` — **passed**.
  Fullgates пока не запускались.
  T10/публикация не начаты, #128 вне scope.

### T9 — независимое review и новая координация

- Standards0 / Spec0. Source заморожен; в T10 меняются только plan/todo с evidence.
- Во время работы появился открытый PR #141 с пересечением DESIGN_SYSTEM/DiffViewer.
  Coordinator получил отдельное явное разрешение пользователя и опубликовал
  [coordination comment #141](https://github.com/larchanka-training/dmc-268-ui-t6/pull/141#issuecomment-6255148170).
  При rebase publisher должен учитывать этот overlap вместе с #106/#109; комментирование
  не заменяет проверки конфликта. FRONTEND_ARCHITECTURE не менялся.

### T10 — финальные gates

- Runtime всех команд: Node24.20.0, `pnpm with current` (установленный pnpm12.3.4),
  worktree `/private/tmp/dmc-268-ui-118`, база `9382f9e7daf2df1eb654da30b8536280e41d090e`.
  Manifests/lockfile и исходный checkout не менялись; новых dependencies нет.
- `pnpm with current lint` — **exit0**, ESLint max-warnings0 и Stylelint.
- `pnpm with current check-types` — **exit0**, `tsc -b`.
- `pnpm with current format:check` — **exit0**, все файлы соответствуют Prettier.
- Coordinator запустил единственный полный `pnpm with current test`: **exit0**,
  **112 test files / 1451 tests passed**, duration61.47s;
  log `/private/tmp/118-full-test.log`. Повторный полный запуск не выполнялся.
- `pnpm with current build` — **exit0**, Vite3543modules, production output `dist`.
- После завершения build `pnpm with current verify:prod-bundle` — **exit0**,
  **22 files in dist/assets are clean**.
- `pnpm with current build-storybook` — **exit0**, Vite3392modules,
  output `storybook-static`, completed successfully.
- Обе сборки сообщили non-blocking chunk-size warning >500kB; ошибок сборки нет.
  Исходный код после T9 не менялся. Generated dist/storybook-static остаются ignored.

### T10 — итоговая браузерная матрица и предел motion evidence

- Browser QA выполнил coordinator в реальном IAB Chromium: Storybook
  `http://localhost:6118`, mock app `http://localhost:4188`; dark/light.
  Подробные computed values и RED/GREEN для AC1–4,6–8 записаны в T1–T8 выше.
- AC1: все5новых вариантов доступны, локальная Avatar image загружена без сети,
  InputNumber disabled с видимым label; прежние danger варианты сохранены.
- AC2: stale globals=theme:light, Light→Dark→Light→Dark, story→Спецификация;
  toolbar и iframe html theme согласованы после remount.
- AC3: все4statusfield error/warning Input/InputNumber дают opaque link3px halo;
  error/warning border сохраняется. Все5focus-targets Pagination дают link2px;
  overflowing CodeBlock получает native PRE focus и link2px, short blocks не добавлены в Tab.
- AC4: RepositoryList фильтрует Все3/Активные2; native Tab/ShiftTab/стрелки и ring2px
  работают в обеих темах. Run#34 `/runs/11111111-1111-4111-8111-000000000004`:
  4filegroups имеют разные native names/осмысленные labels, единый Unified/Split state
  сохранён, focus остаётся в исходной группе. Controlled Storybook: один callback на arrow,
  disabled пропускается, полный disabled group не получает stop.
- AC5: полный suite включает существующие **2 LoginPage.motion tests**:
  initial prefersReduced=false → motion=true; initial true → motion=false,
  затем live prefersReduced=false → motion=true. Пример документа передаёт
  reducedMotion:!token.motion и совпадает с LoginPage. Это автоматическая проверка provider,
  **не browser evidence отключённых анимаций**. IAB не предоставляет эмуляцию preference;
  системную настройку не меняли. Пользователь отозвал OS-доступ, дальнейших OS/native
  вызовов нет. Browser reduce initial/live не выполнялся; по согласованию с пользователем это
  адаптация способа проверки на существующие автоматические тесты, без утверждения
  о browser preference/анимациях.
- AC6: actual app columnheader с именем «Настройки» найден1, aria-label=Настройки,
  visible text пустой; имя не спрятано через display:none.
- AC7 browser PASS: SelectMultiple default chip в обеих темах height24px/font12.5px;
  dark background rgb(26,34,56)=#1a2238(--rv-surface3), remove icon rgb(148,163,184);
  light background rgb(228,233,242)=#e4e9f2, remove icon rgb(71,85,105), обе нейтральные.
  Финальная «Спецификация» отрендерена в dark/light с правильным html data-rv-theme;
  актуальный статус, таблица purple8 и fenced DarkSection с
  reducedMotion:!token.motion присутствуют. Source примера проверен через textContent
  (body innerText разрывает подсвеченные spans). Остальные computed code/spec values
  перечислены в T3/T6/T7/T8; каждый пункт исходной таблицы закрыт.
- AC8: обе реальные темы buildTheme и все contrast assertions GREEN; временная actual
  palette mutation дала10падений4.5:1, точное byte/hash restoration доказано в T8.
- §3b actual app390×844 (отдельный app tab): RepositoryList обеих тем htmlscrollWidth390
  при viewport390; таблица прокручивается только внутри container(client194/scroll1143).
  Native Tab+Right выбирает active(rows3). Run#34 обеих тем htmlscrollWidth375
  (15pxscrollbar), viewport390, Split работает. Viewport после QA восстановлен.
- §3b focus-return: actual app light, Cancel settings modal после wait hidden возвращает
  focus точно исходной кнопке «Настройки UIrepo»; Escape UserMenu — точно кнопке
  «Меню пользователя». app118/mobile118 dev.logs(levelerror,last8) пусты.
- Critical Tag contrast с alpha-composition: light5.41749:1,dark5.85510:1.
  Storybook390 ButtonVariants обеих тем: все6русскихподписей помещаются, pagewidth390,
  heights32; это отдельное story evidence и не подмена actual app390 выше.
- Финальное review всего diff и publisher ещё не выполнялись; commit/push/PR отсутствуют.

### T10 — отдельное подтверждение motion и завершение приёмки

- Coordinator дополнительно запустил существующий LoginPage.motion.test.tsx:
  **exit0, 1 file / 2 tests passed, 2.16s**. Реальный nested ConfigProvider probe:
  initial no-reduce→motiontrue, initial reduce→motionfalse, live optout→motiontrue.
  Baseline jsdom canvas getContext notimplemented warnings из HeroGlass не дали failures;
  ради них source/dependencies не менялись.
- T0–T10 implementation/приёмка завершены. T0–T9 независимые reviews: Standards0 / Spec0;
  финальное review полного diff и publisher ожидаются. Все7gates зелёные;
  fullsuite остаётся **112files / 1451tests**, отдельный motion запуск не прибавлен к этому числу.
- После последнего browser/motion evidence изменены только два документа #118;
  целевой Prettier и git diff --check проверены перед передачей на финальное review.

### Publisher — проверка перед коммитом

- Финальное независимое review полного diff новым reviewer: **Standards0 / Spec0**;
  исходный код заморожен. Publisher меняет только статус и evidence в plan/todo.
- `git fetch origin main` 2026-10-18: актуальный main и исходная база совпадают —
  `9382f9e7daf2df1eb654da30b8536280e41d090e`; дополнительного source-diff от main нет.
  Открытые пересечения по-прежнему #106/#109/#141; coordination comments указаны в плане.
  Порядок интеграции и сохранение их изменений требуют ручной проверки перед merge.
- Scope: 25 изменённых tracked-файлов и 6 новых файлов #118; manifests/lockfile,
  чужие планы и store не включаются. Diff-check чистый. Все7gates и browser evidence
  подтверждены выше; неизменная база не требует повторного полного test/build.
- Commit/push/PR на этой точке ещё не созданы. После публикации coordinator фиксирует
  URL и текущий head; issue остаётся открытым, merge не выполняется.
