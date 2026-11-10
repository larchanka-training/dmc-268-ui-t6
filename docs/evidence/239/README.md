# UI audit fixes — #239 Part 2

Before and after for the defects of the
[Part 1 list](https://github.com/larchanka-training/dmc-268-ui-t6/issues/239#issuecomment-6700534983)
that this pull request fixes, in both themes at the widths where each one showed. Every number below
is in [`measurements.json`](measurements.json) (`before` and `after` records with theme, width and,
where it matters, view, motion setting and load).

## How it was taken

- **Builds.** `VITE_USE_MOCKS=true vite build` of `cb3dd355` (before, `main` at the branch point) and
  of `b76d68f0` (after: this branch rebased onto `fc3781f2`). The mock build signs in by itself; the
  login screen is opened through «Sign out».
- **Browser.** Playwright 1.64.1 driving headless Chrome (`channel: 'chrome'`), English,
  `prefers-reduced-motion: reduce` unless stated. Windows 390×844, 1280×800 and 1440×900, plus
  1265×800 for `/audit`: a 1280px window with the 15px classic scrollbar, the narrowest laptop frame
  of DESIGN_SYSTEM §5 (967px). `/audit` was also measured in Russian at 1265.
- **A cell is measured** once its content anchor is visible and the DOM size is stable for three
  reads in a row. Every probe reproduced its defect on the before build, so it can fail.
- **Login (D2).** The background is a WebGL canvas the DOM cannot see. The glyphs of the subtitle and
  the note are hidden (`color: transparent`) and every pixel under each line box
  (`Range.getClientRects()`) is compared with the text colour. The shader phase is random: three loads
  for each theme, width and motion setting. The after numbers come from the same tree before the
  rebase; the rebase changed no file under `src/pages/login` and not `tokens.css`.
- **Code breaks (D8).** A break counts as a defect when it falls inside a segment with no break
  opportunity (a run of non-space characters) that is shorter than the line. A segment longer than
  the line may break anywhere (DESIGN_SYSTEM §5) and is counted apart (`longerThanLine`). Part 1
  counted any break between two word characters, so its counts differ by one or two lines.
- **Pictures at 390.** Added in the review of #315 that requested changes, from the same two builds,
  for every fixed defect whose Part 1 widths include 390 (D1, D4, D6, D9, D10, D12, D13) and for the
  diff at 390 that D8 closes, plus the open settings `Select` (D13) at 1280 and 390; the numbers of
  D6, D10, D12 and D13 at 390 are in `measurements.json` too. At 390 the diff table is wider than the
  window and scrolls sideways: the diff crops show the part around the `attempts` line of the new
  side, the same in both builds.
- **1440.** Pictures at 1440 are taken where the Part 1 list names 1440 apart: D2, D3 and D4, D8
  Split. For the defects listed at every width (D1, D6, D9, D10, D12, D13) the 1280 picture stands
  for 1440: both windows have the laptop layout of DESIGN_SYSTEM §5. The 1440 numbers of D1, D9, D10
  (the Unified/Split switch) and D6 (the summary-only run) are in `measurements.json`; the user menu
  (D12), the open `Select` (D13) and the settings page (D6, D10 `code`) were measured at 390 and 1280.
- **Theme switch of the diff.** Since D1 the syntax colours follow `data-rv-theme`, which
  `DesignSystemProvider` sets in a `useEffect`, while the diff background comes in an inline style.
  Every DOM mutation of both was stamped with a `requestAnimationFrame` counter on the after build at
  1280: they changed in the same frame 3 of 3 times on a choice in the user menu and 3 of 3 times on
  an OS theme change with the preference «System» (`page.emulateMedia`). The first render is not
  covered.

## Fixed here

| Defect                             | Before                                                                                                                                                               | After                                                                                                                                                                                                                                                | Pictures                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| D1 syntax colours on insert/delete | lowest 3.11:1 light (`function`, delete), 4.09:1 dark (`comment`, insert); 50 and 104 tokens below 4.5 at 1280 (Unified + Split)                                     | lowest 5.38:1 light, 5.87:1 dark; none below 4.5 at any width                                                                                                                                                                                        | `diff-unified-*-1280`, `diff-split-*-1280`, `diff-unified-*-390`, `diff-split-*-390`                               |
| D2 login subtitle and note         | at 1280/1440: subtitle 2.67–3.64:1; note 1.79–1.87:1 with reduced motion, 1.99–6.16:1 with motion as the phase moves; up to 58% of the pixels under a line below 4.5 | subtitle 7.4:1 or more everywhere; note 4.57:1 or more at 390 and 1280. **Remainder:** reduced motion at 1440, 6 of 4,650 pixels at the end of the note stay at 4.38–4.48:1 — [#313](https://github.com/larchanka-training/dmc-268-ui-t6/issues/313) | `login-*-1280`, `login-*-1440`                                                                                     |
| D3 `/audit` table width            | 1662–1665px wide in a 967–1142px frame at 1265–1440 (1768–1775px in Russian); Status ends 294px past the frame at 1265 (319px in Russian)                            | table = frame at 1265, 1280 and 1440, Russian included; at 390 a 900px table scrolls to its last column (0px past the frame)                                                                                                                         | `audit-*-1280`, `audit-*-1440`                                                                                     |
| D4 `/audit` status                 | plain text (`queued —`), 0 of 20 rows with a tag                                                                                                                     | a tag with a dot in 20 of 20 rows, the reason on its own line                                                                                                                                                                                        | same as D3, `audit-*-390`                                                                                          |
| D6 Alert title                     | 14px (summary-only run, settings with invalid rules)                                                                                                                 | 13px                                                                                                                                                                                                                                                 | `settings-0002-alert-*-1280`, `summary-only-*-1280`, `settings-0002-alert-*-390`, `summary-only-*-390`             |
| D8 code broken mid-word            | 18 of 50 lines (Unified) and 24 of 61 (Split) at 390; 1 and 7 at 1280; 0 and 7 at 1440                                                                               | 0 at every width; only segments longer than the line break (1 and 11 at 390). At 390 this also closes the Part 1 observation _diff at 390px_                                                                                                         | `diff-split-*-1280`, `diff-split-*-1440`; the observation at 390: `diff-unified-*-390`, `diff-split-*-390`         |
| D9 summary-only file paths         | Inter 13px                                                                                                                                                           | JetBrains Mono 12px (`FilePath`)                                                                                                                                                                                                                     | `summary-only-*-1280`, `summary-only-*-390`                                                                        |
| D10 radii                          | selected Unified/Split 2px; `code` in RAG error text 3px                                                                                                             | 4px and 4px; `999px` is the token `--rv-radius-full`                                                                                                                                                                                                 | `segmented-*-1280`, `settings-0002-code-*-1280`, `segmented-*-390`, `settings-0002-code-*-390`                     |
| D12 user menu                      | name `<b>` at 700; group titles 11.5px                                                                                                                               | `span` at 600; 12px                                                                                                                                                                                                                                  | `user-menu-*-1280`, `user-menu-*-390`                                                                              |
| D13 open `Select` value            | opacity 0.25: 1.75:1 light, 2.13:1 dark (`/audit` and settings, 390 and 1280)                                                                                        | opacity 1: 18.72:1 light, 18.54:1 dark (`/audit` and settings, 390 and 1280)                                                                                                                                                                         | `audit-select-open-*-1280`, `audit-select-open-*-390`, `settings-select-open-*-1280`, `settings-select-open-*-390` |

`*` is `light` or `dark`; each name exists in [`before/`](before) and [`after/`](after).

## Not fixed here

- **Separate issues:** D5 block headings — [#310](https://github.com/larchanka-training/dmc-268-ui-t6/issues/310);
  D7 visible field labels — [#311](https://github.com/larchanka-training/dmc-268-ui-t6/issues/311);
  D11 icon sizes — [#312](https://github.com/larchanka-training/dmc-268-ui-t6/issues/312);
  the rest of D2 — [#313](https://github.com/larchanka-training/dmc-268-ui-t6/issues/313).
- **Observations of Part 1, no rule broken:**
  - _Diff at 390px_ — closed by D8: the rule now covers every width (DESIGN_SYSTEM §5).
  - _`RepositoryList` picks its columns by window (1366px)_ — dropped: DESIGN_SYSTEM §5 and §8
    record that breakpoint as the one inside the laptop range.
  - _Charts scale with the width_ and _settings form 560px next to rules 720px_ — dropped: no rule
    of the design system covers them.

## Limits

Mock data only. Headless Chrome renders the login shader in software WebGL; a real GPU can differ.
Hover and focus states were not re-measured.
