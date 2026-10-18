# Comments outside the diff (#114)

Source: [issue #114](https://github.com/larchanka-training/dmc-268-ui-t6/issues/114).

## Scope and design

For ordinary runs, merge all supplied `/comments` with `run.findings` through the existing
`mergeFindings` function. A finding wins over a comment with the same id; distinct ids at
the same anchor remain distinct. Summary-only runs continue to use findings alone.

The existing outside partition routes comments for absent files, patchless files and files
without chunks to the run-level «Замечания вне диффа» block. The merged set M supplies
counters, file options and the existing file/severity/search predicates.

This completes the UI's input contract. The current backend normally returns the same
published finding ids from run details and comments, so overlapping responses already
rendered those cards through findings. The regression fixtures demonstrate comments absent
from the supplied findings; they do not establish a current production divergence.

## Tasks

1. Add failing rendering regressions for missing, patchless and chunkless files; cover
   same-id precedence and distinct comments sharing an anchor. Remove the pre-merge filter.
2. Cover exact M, file options and file/severity/search combinations, with unique searchable
   fixture fields. Preserve summary-only exclusions and search expansion.
3. Update architecture §6/§11, reconcile the merged #134 text, and document pending
   comment-only file links. Inspect #136 integration expectations without importing its work.
4. Run focused tests, six UI gates and independent Standards/Spec review. Publish with
   `Refs #114`; issue acceptance and closure remain with the tech lead.

## Boundaries and integration

Production changes are limited to `RunDiff.tsx`. Tests cover its rendered output and page
fixture documentation; no API, filter algorithm, design-system or dependency changes belong
here. The unrelated Form timer cancellation is tracked independently under #119.

Preserve #134's inline-filter behavior. #136 uses `runFiles` for options; recovered
comment-only paths enter that set. Its unknown-path cases use different, genuinely unknown
paths. The merged #116 behavior keeps fetched diff files visible while findings are pending;
comment-only paths become effective chips when comments arrive. Combined page coverage
checks that selection edits retain genuinely unknown URL paths and that terminal status
reapplies the saved content filters without navigation.

## Validation

- Focused: `pnpm test src/widgets/diff-viewer src/pages/runs/RunDetailPage.filters.test.tsx`.
- Gates: `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm test`, `pnpm build`,
  then `pnpm verify:prod-bundle`.
- Browser: ordinary and summary-only fixtures, both themes, desktop/390 px, exact cards,
  counts, filters, keyboard focus and no horizontal overflow. Browser evidence and its font
  limitation are recorded in the todo file.
