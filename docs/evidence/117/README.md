# Run screen acceptance evidence — #117

Captured on 2026-10-18 against the mock app (`VITE_USE_MOCKS=true`), run `11111111-1111-4111-8111-000000000004` / mock PR #34. Baseline is `9382f9e7daf2df1eb654da30b8536280e41d090e`; after captures show the completed implementation. The same routes, fixture, themes, viewports, diff modes and initial context were used. Finding crops were recaptured with matching initial context. These committed JPEGs are the actual before/after attachments; temporary browser artifacts are not required to review them.

## Matched screenshot matrix

| Surface / theme / viewport        | Before                                             | After                                                                                              |
| --------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Runs · light-390x844              | [before](before/runs-light-390x844.jpg)            | [after left](after/runs-left-light-390x844.jpg), [after right](after/runs-right-light-390x844.jpg) |
| Detail · unified · light-390x844  | [before](before/detail-unified-light-390x844.jpg)  | [after](after/detail-unified-light-390x844.jpg)                                                    |
| Finding · unified · light-390x844 | [before](before/finding-unified-light-390x844.jpg) | [after](after/finding-unified-light-390x844.jpg)                                                   |
| Detail · split · light-390x844    | [before](before/detail-split-light-390x844.jpg)    | [after](after/detail-split-light-390x844.jpg)                                                      |
| Finding · split · light-390x844   | [before](before/finding-split-light-390x844.jpg)   | [after](after/finding-split-light-390x844.jpg)                                                     |
| Runs · light-1440x900             | [before](before/runs-light-1440x900.jpg)           | [after ](after/runs-light-1440x900.jpg)                                                            |
| Detail · unified · light-1440x900 | [before](before/detail-unified-light-1440x900.jpg) | [after](after/detail-unified-light-1440x900.jpg)                                                   |
| Detail · split · light-1440x900   | [before](before/detail-split-light-1440x900.jpg)   | [after](after/detail-split-light-1440x900.jpg)                                                     |
| Runs · dark-390x844               | [before](before/runs-dark-390x844.jpg)             | [after left](after/runs-left-dark-390x844.jpg), [after right](after/runs-right-dark-390x844.jpg)   |
| Detail · unified · dark-390x844   | [before](before/detail-unified-dark-390x844.jpg)   | [after](after/detail-unified-dark-390x844.jpg)                                                     |
| Finding · unified · dark-390x844  | [before](before/finding-unified-dark-390x844.jpg)  | [after](after/finding-unified-dark-390x844.jpg)                                                    |
| Detail · split · dark-390x844     | [before](before/detail-split-dark-390x844.jpg)     | [after](after/detail-split-dark-390x844.jpg)                                                       |
| Finding · split · dark-390x844    | [before](before/finding-split-dark-390x844.jpg)    | [after](after/finding-split-dark-390x844.jpg)                                                      |
| Runs · dark-1440x900              | [before](before/runs-dark-1440x900.jpg)            | [after ](after/runs-dark-1440x900.jpg)                                                             |
| Detail · unified · dark-1440x900  | [before](before/detail-unified-dark-1440x900.jpg)  | [after](after/detail-unified-dark-1440x900.jpg)                                                    |
| Detail · split · dark-1440x900    | [before](before/detail-split-dark-1440x900.jpg)    | [after](after/detail-split-dark-1440x900.jpg)                                                      |

Additional final desktop overviews: [light](after/overview-light-1440x900.jpg), [dark](after/overview-dark-1440x900.jpg). There are 16 baseline and 18 core final screenshots plus 2 final overviews. Interim metadata/task4 captures are excluded.

## Measurements and manual verification

[Final measurements](measurements-final.json) contain 14 states: eight detail states (Unified/Split × light/dark × phone/desktop) and six table states (left/right phone positions and desktop in both themes).

- **Containment/table:** every final state has root scroll width equal to client width. The in-app browser uses a 15px classic scrollbar, so a 390px viewport has a 375px root/client width; desktop is 1440/1425px. This is zero horizontal page overflow. At 390px the inner table has a 281px client width and 797px scroll width; `scrollLeft` changes from 0 to 516px and exposes review status and engine. The desktop table is 1127px wide with no unnecessary horizontal overflow. Rounded containment and explicit RepositoryList `x: 900` behavior were checked separately.
- **Fonts/metadata:** Inter is loaded on table and detail states; JetBrains Mono is loaded and computed on the commit hash in detail. `fonts.mono: false` on runs-table states is expected because that screen does not use/load it. Desktop metadata tracks are four equal 261.75px tracks; findings span two tracks (539.5px including gap). Short PR/status/findings/started values have 20px–20.1875px height. Intermediate 768px layout was separately checked at two equal 305.5px tracks; phone uses one 249px track. Long values wrap without changing equal track widths or overflowing the page.
- **Diff:** both Unified and Split show exactly one sign per change, no signs for context/empty counterparts, and unchanged source/syntax content. The marker lane is 7.2px; gutter 61.59px retains 36.008px (5ch) number room. Computed insertion/deletion contrast is 5.35:1 / 5.07:1 in light and 7.37:1 / 5.93:1 in dark. Theme switching repaints signs without losing Split selection. Native clipboard copy yielded source line 2 without the decorative sign; loading context changed 10→15 rows while signs stayed at 5.
- **Finding:** the phone `L4–5` range changed from 25.797×42px to 29.961×21px; the complete range stays on one line and the title wraps between words (`brokenWords: []`). Unit tests cover severity/range/no-range and expanded-state contracts; browser checks cover the visible fixture and its expanded content. Native Enter opens once and Space closes once, with focus retained and a 2px ring in both themes (light rgb(29,78,216), dark rgb(96,165,250)). Pointer activation and DOM contracts are also covered by tests.
- **Browser checklist:** keyboard links/actions, accessible names, focus visibility/retention, one activation per key press, computed contrast, control alignment, narrow containment, Storybook defaults/explicit overrides and empty/loading behavior were checked. There were no browser errors. Reduced-motion emulation is unavailable in this in-app browser; the changed UI uses a static layout with no motion dependency. No emulated reduced-motion preference check is claimed.

## Automated verification

All required gates passed on the completed source: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test` (109 files / 1434 tests), `pnpm build`, `pnpm verify:prod-bundle` (22 assets). Regression tests were demonstrated RED before implementation and by removing the relevant behavior; jsdom assertions cover DOM/API contracts, while style measurements and native keyboard/copy behavior were checked in the browser. Independent Standards and Spec reviews each returned zero findings.

An initial baseline mismatch came from stale installed dependencies; `pnpm install --frozen-lockfile` restored the pinned lockfile environment. No source workaround or dependency change was introduced. See the [plan](https://github.com/larchanka-training/dmc-268-ui-t6/blob/008ee59afbe1d1e0598c9a44dea0e4c32d48ced2/docs/plans/117-plan.md) and [task/evidence record](https://github.com/larchanka-training/dmc-268-ui-t6/blob/008ee59afbe1d1e0598c9a44dea0e4c32d48ced2/docs/plans/117-todo.md) for the complete execution record.
