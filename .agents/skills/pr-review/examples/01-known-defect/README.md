<!-- SYNC: mirrored in dmc-268-{ui,api}-t6/.agents/skills/pr-review/examples/01-known-defect/README.md -->

# 01 — a known defect: found and tied to a line

**Source:** a live snapshot of ui#130 and ui#111, recorded on 2026-11-03 by saving the output of
the two `gh api … --jq` calls `pr_context.py` makes, with no edits. The defect is known from
ui#131: when a cancel ends the run, the focused «Отменить» button unmounts and the focus falls to
the page; ui#139 fixed it later. The merged diff of ui#130 still has it.

## Input

```sh
pr_context.py ui#130
```

ui#130 is merged, head `21b8d99b895956a7c0dcd2ee809b401552aad806`. Its body has `Refs #111` and
names no part. ui#111 has no parts in its Scope and three acceptance criteria.

## Expected

- `verdict: go`, exit code 0, `reasons` empty.
- One issue, ui#111, `parts: []`, AC1–AC3 with `part: null`, in the issue's order.
- One warning: the pull request is merged.

## Expected review

Run in the ui clone. This part is behaviour, not compared byte by byte: the manual runs in Claude
Code and Codex are attached to the pull request that added the skill.

- The reviewers' first line names `head 21b8d99b895956a7c0dcd2ee809b401552aad806`.
- **Standards** reports the defect on `src/widgets/run-inspector/ui/RunControls.tsx`, at a line of
  the cancel branch (37–58) or of the rerun branch that should take the focus (59–76), and cites
  `.agents/rules/frontend.md` §3b rule 3 «Focus survives the action»: when a cancel ends the run,
  `canCancel` turns false, the focused button unmounts and nothing moves the focus to
  «Перезапустить». Severity medium or higher.
- **AC** has one row per criterion, AC1–AC3, each `covered`, `not covered` or `can't tell` with a
  `path:line` at the head or a reason. AC3 (the gates) is `can't tell`: a CI run is not in the
  diff. No row is `covered` without a link.
