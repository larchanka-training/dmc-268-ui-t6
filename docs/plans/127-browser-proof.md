# #127: browser proof для пяти уровней severity

20.10.2026. UI base `ec628dd02bf0f59611e94ae6d3d742bb79472019`.
Chrome 155.0.8059.85 (headless, отдельный временный профиль), DPR 1,
1280×900 и 390×844. Storybook: `http://localhost:6127`.
Node 24.20.0, pnpm 12.4.1; Playwright взят из установленного runtime,
зависимости проекта не добавлялись.

Решение: [issue #127](https://github.com/larchanka-training/dmc-268-ui-t6/issues/127#issuecomment-6291809919).
Critical остаётся red `#f87171` / `#b91c1c`; high использует этот же тон с точкой,
medium — high/orange, low — warning/yellow, info — info/blue. Заливка только у critical.

## Публичные границы и метод

- Постоянные stories: Tag Severity, SeverityOnWarning, Solid и Reviewer UI Overview,
  в обеих темах. SeverityOnWarning сохраняет регрессионный фон warning Alert в витрине.
- Временный browser-only harness импортирует реальные `RunDiff`, `fromPatch`, fixture
  `SAMPLE_PATCH_A` и `DesignSystemProvider` через Vite Storybook; production route не добавлен.
  В каждой теме он выводит пять уровней в пяти контекстах: context line, added line,
  removed line, outside-diff warning Alert и summary-only warning Alert.
- Для всех 25 карточек в каждой теме измерены rest, hover и mouse-down/pressed: 150
  наблюдений actual InlineComment. Дополнительно 40 наблюдений в stories; всего 190 бейджей.
- `getComputedStyle` сохраняет текст, точку, background, token, font, rect и цепочку всех
  предков. Background смешивается от корня к бейджу: `top × alpha + bottom × (1 − alpha)`.
  Для `color(srgb … / alpha)` используются исходные дробные каналы, без canvas/8-bit
  округления. Затем WCAG relative luminance и `(Lmax + .05) / (Lmin + .05)`.
  Harness останавливается на неожиданной opacity предка вместо неподтверждённого расчёта.
- В строках context/added/removed реальный родитель карточки — `.diff-widget-content`,
  фон `#090d18` в dark и `#ffffff` в light. Цветная code line не является фоном бейджа.
  Для outside/summary реальный фон — warning Alert: `rgb(41, 38, 33)` / `rgb(246, 239, 230)`.
- Текст: 12px, weight 500. Порог текста ≥4.5:1; цветной точки ≥3:1 к непосредственному фону.
  Dot-текст нейтральный (`#f8fafc` / `#0b1220`), точки измерены независимо.

## RED до CSS fix

Старая смесь текста critical: 85% critical + 15% neutral; tint 22% critical + transparent.

| Контекст                         |            Dark |  Light |
| -------------------------------- | --------------: | -----: |
| Inline context / added / removed |          5.8987 | 5.4175 |
| Outside-diff warning Alert       | **4.3930 FAIL** | 4.8252 |
| Summary-only warning Alert       | **4.3930 FAIL** | 4.8252 |

Dark computed text `color(srgb 0.972549 0.523726 0.524902)` ≈ RGB `(248, 133.55, 133.85)`.
Computed background `color(srgb 0.972549 0.443137 0.443137 / 0.22)` over `(41, 38, 33)`
даёт `(86.54, 54.50, 50.60)`. Контраст **4.393003898:1**. Token и tint уже утверждённые;
проблема именно в смешанном тексте на фактическом фоне.

Промежуточная смесь 75% дала только 4.4381:1 на dark warning:hover; browser assertion
осталась красной. Итоговый минимальный fix — override текста только critical solid:
70% critical + 30% neutral. Approved token, tint 22%, weight 500 и остальные Tag варианты
не меняются. JS DOM test, дублирующий CSS-текст, не добавлялся: проверяется computed contrast.

## GREEN после shared Tag fix

Computed critical text dark: `color(srgb 0.972549 0.604314 0.606667)` ≈ RGB `(248, 154.10, 154.70)`.
Light: `color(srgb 0.520784 0.0980392 0.11451)` ≈ RGB `(132.80, 25.00, 29.20)`.
Красный hue сохраняется визуально в обеих темах; dot high остаётся исходным critical red.

| Critical solid, actual InlineComment      | Dark rest | Dark hover | Dark pressed | Light rest | Light hover | Light pressed |
| ----------------------------------------- | --------: | ---------: | -----------: | ---------: | ----------: | ------------: |
| Inline context / added / removed          |    6.8265 |     6.2071 |       7.0918 |     6.6533 |      6.1902 |        5.7482 |
| Outside-diff / summary-only warning Alert |    5.0840 | **4.6622** |       5.8180 |     5.9259 |      5.5230 |    **5.1381** |

Dark warning:hover: реальный родитель `(47.42, 45.50, 42.06)` после hover RowButton;
с tint critical фон бейджа `(91.5476, 60.3500, 57.6668)`. Именно этот сценарий даёт
минимум текста **4.662165195:1** по всем actual rest/hover/pressed.

| Все пять уровней, actual RunDiff | Dark rest | Dark hover | Dark pressed | Light rest | Light hover | Light pressed |
| -------------------------------- | --------: | ---------: | -----------: | ---------: | ----------: | ------------: |
| Минимум текста                   |    5.0840 |     4.6622 |       5.8180 |     5.9259 |      5.5230 |        5.1381 |
| Минимум точки                    |    5.4480 |     4.9316 |       6.2384 |     4.3155 |      3.9881 |    **3.6766** |

Минимум точки — light Low на pressed warning Alert: **3.676603105:1**. Story Severity,
SeverityOnWarning, Solid и Overview тоже проходят соответствующие пороги.

Проверен переключатель темы на том же mounted RunDiff: dark → light → dark и обратно,
computed critical соответствует literal обеих тем. Native Tab/Shift+Tab достигают соседних
карточек; Enter открывает/закрывает карточку ровно один раз, фокус остаётся на кнопке.
Focus ring: `rgb(96, 165, 250) solid 2px` / `rgb(29, 78, 216) solid 2px`, offset 1px.
При reduced motion provider отключает анимации. В harness actual RunDiff на 390px
`document.documentElement.scrollWidth === innerWidth === 390` в обеих темах.

Browser `pageerror` не обнаружены. В промежуточных прогонах при переходах между story и
Vite dependency reload наблюдались отменённые module requests `net::ERR_ABORTED` (в том
числе прогон с 11 отменами); это навигационные отмены, не ответы HTTP 5xx и не ошибка
карточек. Полные request records сохраняются скриптом; не считать промежуточный прогон
доказательством отсутствия сетевых отмен.

Browser D3 URL/back/forward/reset дополнительно проверен в настоящем mock-приложении
ниже; unit D3 regressions тоже зелёные. Публикация и итоговый review не объявляются
завершёнными этим документом.

## D3: существующее mock-приложение

Команда: `VITE_USE_MOCKS=true pnpm dev --host 127.0.0.1 --port 5127 --strictPort`.
Открыть `http://127.0.0.1:5127/review`, использовать существующий «Демо-вход (Mock)»,
если он показан. Redirect ведёт на `/runs/11111111-1111-4111-8111-000000000004`.
Использованы неизменённые `mockReviewFindings` и `mockReviewComments`: 11 карточек,
включая все пять уровней. Fixture, transport и production routes для QA не менялись.

Chrome 155.0.8059.85, 1440×1000; исходная light-тема, затем dark через «Меню пользователя» →
«Тёмная». Dropdown «Критичность» в обеих темах содержит ровно Critical / Warning / Info.
Каждый переход проверяет точный набор label карточек, счётчик и URL, а не только видимый chip.

| Действие             | URL search                           | Карточки                                        |
| -------------------- | ------------------------------------ | ----------------------------------------------- |
| Исходный вид / reset | отсутствует                          | 11: Critical×1, High×2, Medium×4, Low×2, Info×2 |
| Critical             | `severity=critical`                  | 3: Critical×1, High×2                           |
| Добавить Warning     | `severity=critical&severity=warning` | 9: Critical×1, High×2, Medium×4, Low×2          |
| Убрать Critical      | `severity=warning`                   | 6: Medium×4, Low×2                              |
| Browser back         | `severity=critical&severity=warning` | те же 9                                         |
| Browser forward      | `severity=warning`                   | те же 6                                         |
| Reset                | отсутствует                          | все 11                                          |
| Info                 | `severity=info`                      | 2: Info×2                                       |
| Reset                | отсутствует                          | все 11                                          |

В dark отдельно повторены все три single-group выбора, reset, back к пустому фильтру и
forward к Warning. Во всех состояниях серверные строки counts остаются `critical: 1`,
`high: 2`, `medium: 3`, `low: 1`, `info: 1`; фильтр считает показанные карточки вместе с
комментариями, поэтому его 11 отличается от серверных 8 findings. Ошибок `pageerror` и HTTP
ответов ≥400 в D3-сценарии нет. Dropdown открывался ArrowDown; после Escape harness ждал
закрытия popup, чтобы не измерять промежуточное состояние анимации.

Воспроизводимые ручные шаги — таблица выше. Автоматический script и полный trace результатов:
`/tmp/127-d3-browser.cjs`, `/tmp/127-d3-browser.json`, `/tmp/127-d3-browser.log`.
Снимки текущего mock run: `/tmp/127-d3-reset.png`, `/tmp/127-d3-reset-dark.png`.

## Скриншоты

Пять PNG общим размером около 490 KiB, без преобразования изображений:

- [RED dark warning](127-browser/red-dark-warning.png).
- [GREEN dark: все реальные контексты](127-browser/green-dark-rundiff.png).
- [GREEN light: все реальные контексты](127-browser/green-light-rundiff.png).
- [GREEN dark, outside-diff на 390px](127-browser/green-dark-390.png).
- [GREEN light, outside-diff на 390px](127-browser/green-light-390.png).

## Проверки

- Browser script GREEN: assertions по всем 190 observations, теме, keyboard и 390px passed.
- Targeted Tag/InlineComment/theme/severityBadge/finding-filters/RunDiff.filters:
  10 files, 267 tests passed (`/tmp/127-task3-unit.log`).
- Финальный `pnpm test`: 112 files, 1467 tests passed (`/tmp/127-final-test.log`).
- `pnpm lint`, `pnpm check-types`, `pnpm build`, `pnpm verify:prod-bundle` passed;
  bundle: 22 clean assets. `pnpm build-storybook` passed.
- `pnpm format:check` passed после сохранения proof и task docs; `git diff --check` passed.

Логи: `/tmp/127-task3-{red,green,unit}.log`, `/tmp/127-final-{lint,types,test,build,bundle,storybook}.log`.
Подробные computed ancestor chains и unrounded ratios:
`/tmp/127-browser-artifacts/{red,green}-matrix.json` (воспроизводятся скриптом ниже).

## Воспроизведение

Запустить Storybook из worktree: `pnpm exec storybook dev --port 6127 --ci --no-open`.
Сохранить единственный JavaScript-блок этого файла как `/tmp/127-browser-proof.cjs`, затем
запустить `pnpm exec node /tmp/127-browser-proof.cjs green`. В текущем окружении доступны
указанные в скрипте Playwright runtime и установленный Chrome; на другой машине изменить
эти два пути под уже установленные инструменты. Артефакты пишутся только в `/tmp`.

Для RED на отдельной scratch-копии вернуть долю critical text с 70% на 85% и запустить
`pnpm exec node /tmp/127-browser-proof.cjs red`. Команда проверяет, что actual dark outside
warning ratio действительно <4.5. Режим `green` на этой мутации падает на contrast assertion.
В рабочем diff сохранена GREEN-версия 70%; production route или browser harness в `src`
не добавлены.

```javascript
const fs = require('node:fs')
const assert = require('node:assert/strict')
const {
  chromium,
} = require('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright')
const OUTPUT = '/tmp/127-browser-artifacts'
fs.mkdirSync(OUTPUT, { recursive: true })
const STORY = 'свои-компоненты-tag--severity-on-warning'
let browser

// Executed in Chrome. Keep unrounded sRGB/alpha values until after contrast is calculated.
function measureTags(selector) {
  const rgba = (css) => {
    const values = css.match(/[\d.]+/g)?.map(Number) ?? []
    if (css.startsWith('color(srgb'))
      return [values[0] * 255, values[1] * 255, values[2] * 255, values[3] ?? 1]
    if (css.startsWith('rgb')) return [values[0], values[1], values[2], values[3] ?? 1]
    throw new Error('Unsupported computed color: ' + css)
  }
  const over = (fg, bg) => [...fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3])), 1]
  const luminance = (c) =>
    c
      .slice(0, 3)
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
  const contrast = (fg, bg) => {
    const a = luminance(fg),
      b = luminance(bg)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }
  return [...document.querySelectorAll(selector)].map((el) => {
    const style = getComputedStyle(el),
      parents = []
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p)
      parents.push({
        node: p.tagName,
        class: p.className,
        color: s.color,
        bg: s.backgroundColor,
        opacity: s.opacity,
      })
    }
    if (parents.some((p) => Number(p.opacity) !== 1))
      throw new Error('Unexpected parent opacity; extend compositor before accepting proof')
    let bg = [255, 255, 255, 1]
    for (const p of [...parents].reverse()) bg = over(rgba(p.bg), bg)
    let parentBg = [255, 255, 255, 1]
    for (const p of parents.slice(1).reverse()) parentBg = over(rgba(p.bg), parentBg)
    const fg = over(rgba(style.color), bg),
      dot = el.querySelector('span[aria-hidden="true"]')
    const dotColor = dot ? getComputedStyle(dot).backgroundColor : null
    const dotRatio = dot ? contrast(over(rgba(dotColor), bg), bg) : null
    const r = el.getBoundingClientRect()
    return {
      case: el.closest('[data-case]')?.dataset.case ?? 'story',
      label: el.textContent.trim(),
      tone: el.dataset.tone,
      variant: el.dataset.variant,
      color: style.color,
      background: style.backgroundColor,
      parentBg,
      bg,
      fg,
      textRatio: contrast(fg, bg),
      dotColor,
      dotRatio,
      critical: style.getPropertyValue('--rv-critical').trim(),
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      parents,
    }
  })
}

async function mountRunDiff(page, mode) {
  await page.evaluate(async (mode) => {
    const source = await (await fetch('/src/main.tsx')).text()
    const moduleUrl = (name) => {
      const path = [...source.matchAll(/from "([^"]+)"/g)]
        .map((m) => m[1])
        .find((path) => path.includes('/' + name + '.js?'))
      if (!path) throw new Error('Cannot find optimized ' + name)
      return path
    }
    const react = await import(moduleUrl('react')),
      dom = await import(moduleUrl('react-dom_client'))
    const R = react.default ?? react,
      D = dom.default ?? dom
    const { DesignSystemProvider } = await import('/src/shared/ui/theme/DesignSystemProvider.tsx')
    const { RunDiff } = await import('/src/widgets/diff-viewer/ui/RunDiff.tsx')
    const { fromPatch } = await import('/src/entities/diff/lib/fromPatch.ts')
    const { SAMPLE_PATCH_A } = await import('/src/shared/fixtures/sample.patch.ts')
    const file = fromPatch(SAMPLE_PATCH_A),
      levels = ['critical', 'high', 'medium', 'low', 'info']
    const findings = (name, anchor) =>
      levels.map((severity, i) => ({
        id: `33333333-3333-4333-8333-${String(i + 1).padStart(12, '0')}`,
        file: file.filename,
        oldLine: null,
        newLine: null,
        endLine: null,
        side: 'RIGHT',
        severity,
        category: 'security',
        title: `${name}: ${severity} review finding`,
        body: 'Review body for keyboard expansion and focus retention.',
        suggestion: null,
        confidence: 0.9,
        ruleName: null,
        ...anchor,
      }))
    const cases = [
      [
        'inline-context',
        {
          summaryOnly: false,
          files: [file],
          findings: findings('context', { oldLine: 1, newLine: 1 }),
        },
      ],
      [
        'inline-added',
        { summaryOnly: false, files: [file], findings: findings('added', { newLine: 2 }) },
      ],
      [
        'inline-removed',
        {
          summaryOnly: false,
          files: [file],
          findings: findings('removed', { oldLine: 2, side: 'LEFT' }),
        },
      ],
      [
        'outside-warning',
        {
          summaryOnly: false,
          files: [{ ...file, chunks: [], hasPatch: false }],
          findings: findings('outside', { newLine: 99 }),
        },
      ],
      [
        'summary-only',
        {
          summaryOnly: true,
          files: [{ ...file, chunks: [], hasPatch: false }],
          findings: findings('summary', { newLine: null }),
        },
      ],
    ]
    const host = document.createElement('main')
    host.id = 'browser-proof-127'
    host.style.padding = '16px'
    host.style.background = 'var(--rv-bg)'
    host.style.color = 'var(--rv-text)'
    host.style.fontFamily = 'var(--rv-font-sans)'
    document.getElementById('storybook-root').style.display = 'none'
    document.body.append(host)
    const root = D.createRoot(host)
    window.render127 = (mode) =>
      root.render(
        R.createElement(
          DesignSystemProvider,
          { mode },
          R.createElement(
            'div',
            null,
            ...cases.map(([name, props]) =>
              R.createElement(
                'section',
                { 'data-case': name, key: name, style: { marginBottom: 24, minWidth: 0 } },
                R.createElement('h2', { style: { fontSize: 15 } }, name),
                R.createElement(RunDiff, props),
              ),
            ),
          ),
        ),
      )
    window.render127(mode)
  }, mode)
  await page.locator('#browser-proof-127 .inline-comment [data-tone]').first().waitFor()
  await page.waitForFunction((mode) => document.documentElement.dataset.rvTheme === mode, mode)
}

;(async () => {
  const phase = process.argv[2] ?? 'red'
  browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })
  const errors = [],
    failedRequests = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('requestfailed', (r) => failedRequests.push({ url: r.url(), error: r.failure() }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const records = []
  for (const mode of ['dark', 'light']) {
    await page.goto(
      'http://localhost:6127/iframe.html?id=' +
        encodeURIComponent(STORY) +
        '&viewMode=story&globals=theme:' +
        mode,
    )
    await page.locator('[data-tone="critical"][data-variant="solid"]').waitFor()
    await page.waitForFunction((mode) => document.documentElement.dataset.rvTheme === mode, mode)
    const story = await page.evaluate(measureTags, '#storybook-root [data-tone]')
    records.push({ kind: 'warning-story', mode, tags: story })
    await page.screenshot({ path: `${OUTPUT}/${phase}-${mode}-warning.png`, fullPage: true })
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await mountRunDiff(page, mode)
        break
      } catch (error) {
        if (attempt === 2) throw error
        console.log('Retry harness after Vite dependency optimization:', error.message)
        await page.reload()
        await page.locator('[data-tone="critical"]').first().waitFor()
      }
    }
    const other = mode === 'dark' ? 'light' : 'dark'
    await page.evaluate((other) => window.render127(other), other)
    await page.waitForFunction((other) => document.documentElement.dataset.rvTheme === other, other)
    const switched = await page
      .locator('#browser-proof-127 .inline-comment [data-tone]')
      .first()
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--rv-critical').trim())
    assert.equal(switched, other === 'dark' ? '#f87171' : '#b91c1c')
    await page.evaluate((mode) => window.render127(mode), mode)
    await page.waitForFunction((mode) => document.documentElement.dataset.rvTheme === mode, mode)
    records.push({ kind: 'theme-switch', mode, other, critical: switched })
    const actual = await page.evaluate(
      measureTags,
      '#browser-proof-127 .inline-comment-row > [data-tone]',
    )
    assert.equal(actual.length, 25)
    records.push({ kind: 'actual-rundiff', mode, state: 'rest', tags: actual })
    await page.screenshot({ path: `${OUTPUT}/${phase}-${mode}-rundiff.png`, fullPage: true })
    if (phase === 'red') continue
    // Real RowButton hover backgrounds are part of the critical label's contrast boundary.
    for (const caseName of [
      'inline-context',
      'inline-added',
      'inline-removed',
      'outside-warning',
      'summary-only',
    ]) {
      const rows = page.locator(`[data-case="${caseName}"] .inline-comment-row`)
      for (let i = 0; i < (await rows.count()); i++) {
        const row = rows.nth(i)
        await row.evaluate((el) => (el.dataset.browserProofHover = 'true'))
        await row.hover()
        records.push({
          kind: 'actual-rundiff',
          mode,
          state: 'hover',
          tags: await page.evaluate(measureTags, '[data-browser-proof-hover] > [data-tone]'),
        })
        await page.mouse.down()
        records.push({
          kind: 'actual-rundiff',
          mode,
          state: 'pressed',
          tags: await page.evaluate(measureTags, '[data-browser-proof-hover] > [data-tone]'),
        })
        await page.mouse.up()
        await row.evaluate((el) => delete el.dataset.browserProofHover)
      }
    }
    const row = page.locator('[data-case="outside-warning"] .inline-comment-row').first()
    if ((await row.getAttribute('aria-expanded')) === 'true') await row.click()
    await row.focus()
    await page.keyboard.press('Tab')
    assert.equal(
      await page
        .locator('[data-case="outside-warning"] .inline-comment-row')
        .nth(1)
        .evaluate((el) => document.activeElement === el),
      true,
    )
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Enter')
    assert.equal(await row.getAttribute('aria-expanded'), 'true')
    assert.equal(await row.evaluate((el) => document.activeElement === el), true)
    await page.keyboard.press('Enter')
    assert.equal(await row.getAttribute('aria-expanded'), 'false')
    assert.equal(await row.evaluate((el) => document.activeElement === el), true)
    const focus = await row.evaluate((el) => {
      const s = getComputedStyle(el)
      return {
        outline: s.outline,
        outlineOffset: s.outlineOffset,
        boxShadow: s.boxShadow,
        active: document.activeElement === el,
      }
    })
    assert.equal(
      focus.outline,
      mode === 'dark' ? 'rgb(96, 165, 250) solid 2px' : 'rgb(29, 78, 216) solid 2px',
    )
    records.push({ kind: 'keyboard', mode, focus })
    await page.setViewportSize({ width: 390, height: 844 })
    const narrow = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    assert.equal(narrow.scrollWidth, 390)
    records.push({ kind: 'narrow', mode, ...narrow })
    await page
      .locator('[data-case="outside-warning"]')
      .screenshot({ path: `${OUTPUT}/${phase}-${mode}-390.png` })
    await page.setViewportSize({ width: 1280, height: 900 })
    for (const id of [
      'свои-компоненты-tag--severity',
      'свои-компоненты-tag--solid',
      'reviewer-ui--reviewer-ui',
    ]) {
      await page.goto(
        'http://localhost:6127/iframe.html?id=' +
          encodeURIComponent(id) +
          '&viewMode=story&globals=theme:' +
          mode,
      )
      await page.locator('[data-tone="critical"][data-variant="solid"]').first().waitFor()
      await page.waitForFunction((mode) => document.documentElement.dataset.rvTheme === mode, mode)
      const tags = await page.evaluate(
        measureTags,
        '#storybook-root [data-tone="critical"], #storybook-root [data-tone="high"], #storybook-root [data-tone="warning"], #storybook-root [data-tone="info"]',
      )
      records.push({ kind: id, mode, tags })
      if (id !== 'свои-компоненты-tag--solid')
        await page.screenshot({
          path: `${OUTPUT}/${phase}-${mode}-${id === 'reviewer-ui--reviewer-ui' ? 'overview' : 'severity'}.png`,
          fullPage: true,
        })
    }
  }
  fs.writeFileSync(
    `${OUTPUT}/${phase}-matrix.json`,
    JSON.stringify({ phase, browser: browser.version(), records, errors, failedRequests }, null, 2),
  )
  const tags = records.flatMap((r) =>
    (r.tags ?? []).map((t) => ({ kind: r.kind, mode: r.mode, state: r.state ?? 'rest', ...t })),
  )
  console.log(
    JSON.stringify(
      {
        phase,
        browser: browser.version(),
        summary: tags.map((t) => ({
          kind: t.kind,
          mode: t.mode,
          state: t.state,
          case: t.case,
          label: t.label,
          textRatio: t.textRatio,
          dotRatio: t.dotRatio,
          parentBg: t.parentBg,
          fg: t.fg,
          bg: t.bg,
          color: t.color,
        })),
        errors,
        failedRequests,
      },
      null,
      2,
    ),
  )
  if (phase === 'green')
    for (const t of tags) {
      assert.ok(
        t.textRatio >= 4.5,
        `${t.mode} ${t.case} ${t.label} ${t.state}: text ${t.textRatio}`,
      )
      if (t.dotRatio !== null)
        assert.ok(t.dotRatio >= 3, `${t.mode} ${t.case} ${t.label}: dot ${t.dotRatio}`)
    }
  else
    assert.ok(
      tags.some(
        (t) =>
          t.mode === 'dark' &&
          t.variant === 'solid' &&
          t.case === 'outside-warning' &&
          t.textRatio < 4.5,
      ),
      'Must reproduce dark critical warning Alert regression before CSS fix',
    )
  assert.deepEqual(errors, [])
  await browser.close()
})().catch(async (e) => {
  console.error(e)
  if (browser) await browser.close()
  process.exitCode = 1
})
```
