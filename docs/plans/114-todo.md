# Comments outside the diff — checklist (#114)

## Implementation

- [x] Recover missing-file, patchless and chunkless comments in ordinary runs.
- [x] Preserve finding precedence for a repeated id and distinct ids at the same anchor.
- [x] Assert exact M, file option counts and file/severity/search results.
- [x] Preserve summary-only comment exclusion from cards, M and file options.
- [x] Keep searchable fixture fields distinct; assert complete outside card lists.
- [x] Place rendering and summary-only regressions next to related coverage.
- [x] Document pending comment-only file links in architecture §6.
- [x] Reconcile architecture §11 with merged #134; inspect #136 unknown-file expectations.
- [x] Replace machine-specific execution history with portable evidence.

## Evidence

Original regression verification: rendering additions failed in four cases before the fix;
recovered-comment filter cases failed in fourteen cases before the fix. Afterward, the
focused diff-viewer suite passed 11 files / 190 tests. The historical full #114 suite passed
105 files / 1,290 tests before subsequent main changes.

Review cleanup: the isolated NO-MAGIC query failed with three cards when its intended
expectation was restored to one. Explicit unique rule/body fields remove the accidental
matches without changing production search behavior.

Browser verification used production RunDiff and DesignSystemProvider in a temporary
fixture, both themes, desktop and 390 px: M=5, four run-level outside cards, file option
counts 1/2/1/1, exact file/severity/search intersections, search expansion, Enter activation
and a visible 2 px focus outline. Summary-only M=2 excluded comments. Client and scroll
widths matched. Font requests were blocked by the temporary fixture's symlink allow list,
so these checks used fallback fonts; they do not prove successful font-asset loading.

## Review-remediation validation

- [x] Focused regressions pass after review cleanup.
- [x] `pnpm lint`
- [x] `pnpm check-types`
- [x] `pnpm format:check`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm verify:prod-bundle` after build
- [x] Fresh independent Standards/Spec review.

Focused review regressions passed 12 files / 206 tests. Lint, types, formatting, build and
bundle checks passed; the bundle contains 22 clean asset files. All used Node 24.20.0 and
pinned pnpm 12.4.1 with dependencies installed from the frozen lockfile.

The first full-suite attempt was canceled after an unchanged FindingFiltersBar test
(`shows the selected files as tags by file name, including one the run does not have`)
failed after 22.704 seconds during concurrent host load above 50. The run exited 130 and
is not a passing full-suite gate. No test timeout, isolation or error-handling setting was
changed. The unchanged failed case passed its isolated rerun (one test, 48 skipped).
The complete rerun, `pnpm test --maxWorkers=2`, passed 105 files / 1,290 tests in
237.66 seconds with exit 0 and no unhandled errors. The worker limit reduced concurrent
resource use for this run; repository test configuration and wait budgets are unchanged.
Fresh independent Standards and Spec reviews both reported zero findings.

## Integration with pending findings and effective file chips

- [x] Reconcile the architecture's independent comments/findings pending states.
- [x] Cover delayed comment-only files becoming known chips after a visible file selection.
- [x] Preserve genuinely unknown URL paths when clearing the effective selection.
- [x] Keep fetched diff visible during the active run and apply saved content filters on completion.

The combined page regression uses one published high-severity comment absent from `/diff`
and no run findings (M=1). Restoring the old comment prefilter made the recovered card
disappear; removing the pending-files guard made all four fetched diff files disappear.
Both targeted mutations failed the regression and were restored. Generic reset, card-state
and summary-only behavior remain covered by the existing page/widget suites.
