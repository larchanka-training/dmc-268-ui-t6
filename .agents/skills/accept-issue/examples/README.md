<!-- SYNC: mirrored in dmc-268-{ui,api}-t6/.agents/skills/accept-issue/examples/README.md -->

# accept-issue golden examples — the contract of `acceptance.py`

These examples are written before the script (api#266 Part 2, task T1). They are the spec for
`scripts/acceptance.py`: the test runs every `NN-name/step-K/` offline and compares stdout and
the write log byte for byte. Rules: api `docs/CONTRIBUTING.md` on `f223cf3f` — §2 steps 8–9
(L56–57), the board notes (L61–63) and «Приёмка задачи» (L66–82).

All cases use one synthetic issue, `larchanka-training/dmc-268-api-t6#500`; nothing here is a
recording of a live issue (`real-272` is recorded separately, read-only, for a unit test).

## Layout

```
NN-name/README.md          what the case shows (starts with the SYNC line, a blank line, an H1)
NN-name/step-K/args.txt    one line: the `acceptance.py` arguments, shell-split (shlex)
NN-name/step-K/fixtures/   the offline seam (below)
NN-name/step-K/rows.json   the author's input, when the command is `table`
NN-name/step-K/expected.json          stdout, byte for byte
NN-name/step-K/expected-writes.jsonl  the write log; absent = no write
```

A case has several steps when the state changes between runs (case 01). The test runs a step
from its own directory (so `rows.json` resolves), with `ACCEPT_ISSUE_FIXTURE_DIR=<step>/fixtures`
and `ACCEPT_ISSUE_WRITE_LOG=<tmp file>`. Expected exit code: 1 when `verdict` is `stop`, else 0.
`stderr` is empty. The JSON files carry no SYNC marker; `diff -r` covers them.

## Commands

```
acceptance.py table  REF ROWS_JSON [--apply]                       author: the self-check table
acceptance.py accept REF [--table-comment ID] [--followup REF]... [--apply]   accepter: tick, close
acceptance.py return REF [--table-comment ID] [--fail ID=reason]... [--apply] accepter: send back
REF := api#N | ui#N | OWNER/NAME#N | N        (a bare N is api#N)
```

Without `--apply` nothing is written: the output shows the verdict and the exact comment. With
`--apply` everything is revalidated first and a `stop` writes nothing. Exit 0 ok, 1 stop, 2 usage,
3 gh / API / data error (also `--apply` in fixture mode with `ACCEPT_ISSUE_WRITE_LOG` unset).

`rows.json` — only the evidence comes from the author; the item text always comes from the issue
body:

```json
{"AC1": {"status": "done", "evidence": "PR #901, тест ..."},
 "AC2": {"status": "not_done"},
 "AC3": {"status": "moved", "to": "#285"},
 "DoD1": {"status": "done", "evidence": "..."}}
```

A row is required for every AC and DoD of the body and for nothing else (ids `AC1..`, `DoD1..` in
body order). `done` needs a non-empty `evidence`; `moved` is allowed only when the body item
carries «перенесён в #M» with the same `#M`.

## Output (stdout, `sort_keys`, indent 2, no ASCII escaping)

`table`: `ac_check`, `apply`, `board`, `comment`, `issue`, `mode` (`author`), `next`, `notice`,
`rows`, `schema` (1), `stops`, `verdict` (`ac_check` | `not_done` | `stop`), `viewer`, `warnings`.

`accept` and `return`: `after_table`, `apply`, `board`, `comment`, `issue`, `mode` (`accepter`),
`next`, `notice`, `readback`, `return_items`, `rows`, `schema`, `stops`, `table`, `tick`,
`verdict` (`accept` | `return` | `stop`), `viewer`, `warnings`.

- `rows` — `{id, kind (ac|dod), text, status (done|not_done|moved), evidence}`; `evidence` is the
  table cell (`не выполнено` / `перенесён в #M` for the other two statuses). `accept` / `return`
  read them from the table comment and match them to the body; `[]` on a stop before the table.
- `comment` — the exact text that `--apply` posts (`null` on a stop, and on `accept` with verdict
  `return`, which posts nothing).
- `board` — `{action, from, to, readback}`. `from` is the Status read before; `to` the target;
  `action` is `set` (a write is made, or made with `--apply`), `none` (already there, or no move
  is part of the command) or `left` (a «не выполнено» with the card in AC Check: not moved). A
  dry run shows `action: set` and `readback: null`; `--apply` reads the Status back.
- `notice` — the fixed text below when the run found any «не выполнено» / returned item; else `null`.
- `table` — `{author, comment_id, url, via}`, `via` = `marker` | `flag` (`--table-comment`).
- `tick` — ids of the unchecked boxes that `accept --apply` ticks (checked ones are left alone).
- `return_items` — `{id, text, reason}`, in body order: `не выполнено`, or `доказательство не
  подтвердилось: <--fail text>`, or a table gap.
- `after_table` — `{id, author, excerpt}` for every comment after the table (not written by this
  script): the human judges «замечания без ответа».
- `readback` — after `accept --apply`: `{state, last_closer, checked, total, unchecked}` from a
  fresh facts run; the close is good only when `state` is `CLOSED`, `last_closer` is `manual` and
  `unchecked` is 0.
- `stops` — strings; any stop means `verdict: stop`, nothing written. A closed issue is the only
  stop reported (nothing else is checked).
- `warnings` — strings, never a stop: `viewer X is not an assignee (assignees: a, b)`; a PR with
  unresolved threads or a CI state other than SUCCESS; the table author is not an assignee.

`notice` text (Russian; the skill quotes it in its reply):

> Просьба завести follow-up на невыполненный AC или DoD расходится с правилом «Доработка — в том же issue» (docs/CONTRIBUTING.md, «Приёмка задачи», L79): отдельный issue не заводится. Кодовый AC доделывают новым PR с `Refs #N` в этом же issue, некодовый — действием и доказательством комментарием. Follow-up заводят только на находку вне AC.

## The three comments

Each starts with a hidden marker (it only locates the comment; the visible table is the truth),
so a rerun finds and does not duplicate it. The latest marker comment wins. The exact texts are
in the `comment` fields of `expected.json`:

- `<!-- accept-issue:table v1 -->` — `## Самопроверка: AC → доказательство`, the table
  `| # | Пункт | Доказательство |` (one row per AC and DoD; `|` in a cell is `\|`, line breaks become
  blanks), then a line `Итог: …`.
- `<!-- accept-issue:accepted v1 -->` — `## Приёмка: issue закрыт`, a link to the table, one line
  per AC and per DoD (`- AC1 — <text> — выполнено` or `— перенесён в #M`), and, with
  `--followup REF`, `Follow-up вне AC (новый скоуп): <ref>`.
- `<!-- accept-issue:returned v1 -->` — `## Приёмка: возврат в In Progress`, a link to the table,
  `**Что осталось**` with one line per returned item, and the rework paragraph.

## The offline seam

`ACCEPT_ISSUE_FIXTURE_DIR` — every request reads `<dir>/<name>.json` (the full `{"data": ...}`
response); gh is never called. Names: `issue-p<k>` and `threads-…` (the Part 1 facts), `acceptance-p<k>`
(viewer login, body, assignees, comments; comment nodes carry `databaseId`), `board`, `item`,
`set-status`, `readback` (the board). After a write the script re-reads with the prefix `after-`
(`after-issue-p1`, `after-acceptance-p1`). In fixture mode a write never reaches gh: it is appended
as a JSON line (`sort_keys`, no ASCII escaping) to `$ACCEPT_ISSUE_WRITE_LOG`:

```
{"body": ..., "issue": N, "op": "comment" | "patch-body", "repo": ...}
{"issue": N, "op": "close", "repo": ..., "state_reason": "completed"}
{"op": "set-status", "ref": ..., "status": ...}
```

Order of writes: `table` — comment, then the card; `accept` — patch-body (ticks), comment,
close; `return` — comment, then the card. Live, the same writes are `gh api` REST calls
(`PATCH`, `POST`); the card is the GraphQL mutation of `board_status.py`.

## Cases

| Case | Shows |
| --- | --- |
| `01-not-done-then-ac-check` | author: AC2 «не выполнено» → no AC Check, card On Review → In Progress; a new PR with `Refs` in the same issue, a second table, AC Check |
| `02-no-pr-moved-and-non-code` | author on a task without a PR: a moved AC, a non-code AC with a comment link, a visual AC with a screenshot; dry run; a viewer who is not an assignee |
| `03-accept-and-close` | accepter: all done → tick, a closing comment naming every AC, close, read-back `manual` |
| `04-return-with-fail` | accepter: a «не выполнено» in the table plus a `--fail`: returned comment, card AC Check → In Progress, issue stays open |
| `05-finding-outside-ac` | a finding outside the AC during acceptance: accept proceeds, the follow-up is a create-issue spec with `parent` = the source issue and no «Хвосты», the closing comment names it |
| `06-closed-by-merge` | accepter on an issue closed by merge (the Development trap): stop, nothing written even with `--apply` |
| `07-followup-on-unmet-ac` | «заводи follow-up на AC2» on an unmet AC, in author and accepter mode: no write, `notice`, rework stays in the same issue |
