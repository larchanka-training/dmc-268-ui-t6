<!-- SYNC: mirrored in dmc-268-{ui,api}-t6/.agents/skills/accept-issue/examples/01-not-done-then-ac-check/README.md -->

# 01 — a «не выполнено», rework in the same issue, then AC Check

**Source:** synthetic (issue `larchanka-training/dmc-268-api-t6#500`, three AC, two DoD); see `../README.md` for the contract.

## Step 1 — the first self-check

```sh
acceptance.py table api#500 rows.json --apply
```

PR #901 is merged with `Refs #500`; the card is in On Review. AC2 is «не выполнено».

Expected: `verdict: not_done`, `ac_check: false`; the table is posted; the card goes On Review →
In Progress (`board.action: set`, read back); `notice` is present (no follow-up issue for an
unmet AC; the rework is a new PR in this issue); exit 0. Write log: the comment, then
`set-status In Progress`.

## Step 2 — after the new PR

```sh
acceptance.py table api#500 rows.json --apply
```

PR #902 (`Refs #500`) fixes AC2 and is merged; the first table is already in the issue (it is a
complete comment of its own; the new one supersedes it). The card is in In Progress.

Expected: `verdict: ac_check`, `ac_check: true`; a second, full table is posted; the card goes In
Progress → AC Check; `notice: null`. Write log: the comment, then `set-status AC Check`.
