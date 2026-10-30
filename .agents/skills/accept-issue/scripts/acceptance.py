#!/usr/bin/env python3
"""acceptance.py — the author's self-check table and the accepter's close / return.

Implements the acceptance rules of api `docs/CONTRIBUTING.md` («Приёмка задачи»,
§2 steps 8-9) on top of `issue_facts.py` (the facts) and `board_status.py` (the card).
Everything a model could get wrong silently — a row for every AC and DoD, the AC Check
gate, ticking the body, closing, the board move — is done here; the skill text only
sequences the steps. The exact output of every case is fixed by `examples/`
(`examples/README.md` is the contract).

Usage
-----
    acceptance.py table  REF ROWS_JSON [--apply]
    acceptance.py accept REF [--table-comment ID] [--followup REF]... [--apply]
    acceptance.py return REF [--table-comment ID] [--fail ID=reason]... [--apply]
    REF := api#N | ui#N | OWNER/NAME#N | N        (a bare N is api#N)

`table` is the author's self-check: it validates the rows (one per AC and DoD of the
issue body, evidence from `ROWS_JSON`, item text from the body), renders the table
comment, and moves the card: AC Check when nothing is «не выполнено»; On Review ->
In Progress when something is (a card already in AC Check is left, the acceptor
returns it). Without `--apply` nothing is written: the JSON verdict shows the exact
comment. With `--apply` everything is revalidated and written; a stop writes nothing.

Contract
--------
stdout carries one JSON document (`sort_keys`, indent 2, no ASCII escaping, one
trailing newline), schema 1. Exit 0 ok, 1 stop (`verdict` is `stop`), 2 usage or a bad
ROWS_JSON, 3 gh / API / data error (also `--apply` against the offline seam without
ACCEPT_ISSUE_WRITE_LOG). On 2 and 3 stderr carries one JSON line {"error": "..."} and
stdout stays empty. The keys are listed in `examples/README.md`.

Offline seam: with ACCEPT_ISSUE_FIXTURE_DIR set, gh is never called and every request
reads <dir>/<name>.json (the full {"data": ...} response); the names are those of
`issue_facts.py` and `board_status.py` plus `acceptance-p<k>` (viewer, body, assignees,
comments). A write is then appended as a JSON line to $ACCEPT_ISSUE_WRITE_LOG instead.
"""
# SYNC: mirrored in dmc-268-{ui,api}-t6/.agents/skills/accept-issue/scripts/acceptance.py

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, NoReturn

sys.path.insert(0, str(Path(__file__).resolve().parent))
import board_status  # noqa: E402
import issue_facts  # noqa: E402

SCHEMA = 1
WRITE_LOG_ENV = "ACCEPT_ISSUE_WRITE_LOG"
GH_TIMEOUT = 120  # seconds per gh call
MAX_PAGES = 200

TABLE_MARK = "<!-- accept-issue:table v1 -->"
NOT_DONE = "не выполнено"
MOVED_NOTE = re.compile(r"перенесён в ((?:[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)?#[1-9][0-9]*)")
MOVED_TO = re.compile(r"(?:[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)?#[1-9][0-9]*")
STATUSES = ("done", "not_done", "moved")

RULE = (
    "Невыполненный AC или DoD доделывается в том же issue: кодовый — новым PR с `Refs #N`, "
    "некодовый — действием и доказательством (правило «Доработка — в том же issue», "
    "`docs/CONTRIBUTING.md`, «Приёмка задачи»)."
)
NEXT = {
    ("table", "ac_check"): "The table is posted for the acceptor: the acceptor runs accept next.",
    ("table", "not_done"): (
        "Rework stays in this issue: a code AC -> a new PR with Refs (implement-issue), "
        "a non-code AC -> an action plus an evidence comment; no follow-up issue, no "
        "«Хвосты». Then run table again."
    ),
    ("table", "left"): (
        "The card stays in AC Check and the acceptor returns it to In Progress. Rework stays "
        "in this issue: a code AC -> a new PR with Refs (implement-issue), a non-code AC -> "
        "an action plus an evidence comment; no follow-up issue, no «Хвосты». Then run table again."
    ),
    ("table", "stop"): "Fix the stop reasons, then run table again.",
}

ACCEPTANCE_QUERY = """
query($owner: String!, $name: String!, $number: Int!, $c: String) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      body
      assignees(first: 100) { nodes { login } }
      comments(first: 100, after: $c) {
        pageInfo { hasNextPage endCursor }
        nodes { databaseId author { login } createdAt body }
      }
    }
  }
}
"""

Json = dict[str, Any]


def fail(message: str, code: int) -> NoReturn:
    issue_facts.fail(message, code)


# ─── fetch ──────────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class Comment:
    id: int
    author: str
    created_at: str
    body: str


@dataclass(frozen=True)
class Item:
    id: str  # AC1.. / DoD1..
    kind: str  # "ac" | "dod"
    text: str
    checked: bool
    line: int  # index of the raw line in body.splitlines()


@dataclass(frozen=True)
class Snapshot:
    repo: str
    number: int
    facts: Json
    body: str
    items: list[Item]
    assignees: list[str]
    viewer: str
    comments: list[Comment]

    @property
    def ref(self) -> str:
        return issue_facts.ref_str(self.repo, self.number)


def fetch_acceptance(
    repo: str, number: int, prefix: str = ""
) -> tuple[str, str, list[str], list[Comment]]:
    """(viewer, body, assignees, comments) of the issue, every comment page."""
    viewer = ""
    body = ""
    assignees: list[str] = []
    comments: list[Comment] = []
    cursor: str | None = None
    for page in range(1, MAX_PAGES + 1):
        data = issue_facts.request(
            f"{prefix}acceptance-p{page}", ACCEPTANCE_QUERY, repo, number, cursor
        )
        repository = issue_facts.obj(data.get("repository"), "repository")
        raw = repository.get("issue")
        if raw is None:
            fail(f"issue {issue_facts.ref_str(repo, number)} not found", 3)
        issue = issue_facts.obj(raw, "issue")
        if page == 1:
            viewer = issue_facts.text_of(
                issue_facts.obj(data.get("viewer"), "viewer"), "login", "viewer"
            )
            raw_body = issue.get("body")
            if raw_body is not None and not isinstance(raw_body, str):
                fail("unexpected shape: issue.body is not a string or null", 3)
            body = raw_body or ""
            raw_assignees = issue_facts.obj(issue.get("assignees"), "issue.assignees").get("nodes")
            if not isinstance(raw_assignees, list):
                fail("unexpected shape: issue.assignees.nodes is not a list", 3)
            assignees = [
                issue_facts.text_of(issue_facts.obj(n, "assignees[]"), "login", "assignees[]")
                for n in raw_assignees
            ]
        nodes, more, cursor = issue_facts.nodes_of(issue.get("comments"), "issue.comments")
        for node in nodes:
            comment_id = node.get("databaseId")
            if not isinstance(comment_id, int):
                fail("unexpected shape: comment.databaseId is not an integer", 3)
            author = node.get("author")
            login = (
                issue_facts.text_of(issue_facts.obj(author, "comment.author"), "login", "author")
                if author is not None
                else "ghost"
            )
            comments.append(
                Comment(
                    comment_id,
                    login,
                    issue_facts.text_of(node, "createdAt", "comment"),
                    issue_facts.text_of(node, "body", "comment"),
                )
            )
        if not more:
            return viewer, body, assignees, comments
    fail(f"issue comments have more than {MAX_PAGES} pages", 3)


def body_items(body: str) -> list[Item]:
    """The AC and DoD checkboxes of the body, with the ids the table uses."""
    counts = {"ac": 0, "dod": 0}
    items: list[Item] = []
    for line, section, checked, text in issue_facts.scan_checkboxes(body):
        if section is None:
            continue
        counts[section] += 1
        prefix = "AC" if section == "ac" else "DoD"
        items.append(Item(f"{prefix}{counts[section]}", section, text, checked, line))
    return items


def snapshot(repo: str, number: int) -> Snapshot:
    facts = issue_facts.collect(repo, number)
    viewer, body, assignees, comments = fetch_acceptance(repo, number)
    return Snapshot(repo, number, facts, body, body_items(body), assignees, viewer, comments)


# ─── writes ─────────────────────────────────────────────────────────────────
def seam() -> bool:
    return issue_facts.fixture_dir() is not None


def require_write_log() -> None:
    """Called before any write of an `--apply` run: the offline seam never falls
    through to gh, so it needs a log to write to."""
    if seam() and not os.environ.get(WRITE_LOG_ENV):
        fail(f"--apply against {issue_facts.FIXTURE_ENV} needs {WRITE_LOG_ENV}", 3)


def write(op: Json, argv: list[str]) -> None:
    """One write: a JSON line in the write log under the seam, else `gh api` REST."""
    if seam():
        log = os.environ.get(WRITE_LOG_ENV)
        if not log:
            fail(f"--apply against {issue_facts.FIXTURE_ENV} needs {WRITE_LOG_ENV}", 3)
        with open(log, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(op, sort_keys=True, ensure_ascii=False) + "\n")
        return
    try:
        proc = subprocess.run(
            ["gh", "api", *argv], capture_output=True, encoding="utf-8", timeout=GH_TIMEOUT
        )
    except subprocess.TimeoutExpired:
        fail(f"gh api {op['op']} timed out after {GH_TIMEOUT} s", 3)
    except (OSError, ValueError) as exc:
        fail(f"cannot run gh api {op['op']}: {exc}", 3)
    if proc.returncode != 0:
        fail(f"gh api {op['op']} exited {proc.returncode}: {proc.stderr.strip()}", 3)


def post_comment(repo: str, number: int, body: str) -> None:
    op = {"body": body, "issue": number, "op": "comment", "repo": repo}
    write(op, [f"repos/{repo}/issues/{number}/comments", "-f", f"body={body}"])


def set_card(repo: str, number: int, status: str) -> str:
    """Move the card and read the Status back (the log line comes first)."""
    ref = issue_facts.ref_str(repo, number)
    if seam():
        write({"op": "set-status", "ref": ref, "status": status}, [])
    return board_status.set_status(repo, number, status)


# ─── rows and the table ─────────────────────────────────────────────────────
def esc(text: str) -> str:
    """A table cell: `|` escaped, line breaks become blanks."""
    return " ".join(text.replace("|", "\\|").split())


def load_rows(path: str) -> dict[str, Any]:
    try:
        raw = Path(path).read_text(encoding="utf-8")
    except (OSError, ValueError) as exc:
        fail(f"cannot read ROWS_JSON {path}: {getattr(exc, 'strerror', None) or exc}", 2)
    try:
        spec = json.loads(raw)
    except json.JSONDecodeError as exc:
        fail(f"ROWS_JSON {path} is not JSON: {exc}", 2)
    if not isinstance(spec, dict):
        fail(f"ROWS_JSON {path} must be an object {{id: {{status, evidence}}}}", 2)
    return spec


def build_rows(items: list[Item], spec: dict[str, Any]) -> tuple[list[Json], list[str]]:
    """(rows, problems): one row per body item from the author's `spec`; a problem is
    a stop, and then no rows are returned."""
    problems: list[str] = []
    known = {item.id for item in items}
    for key in spec:
        if key not in known:
            problems.append(f"{key}: no such AC or DoD in the issue body")
    rows: list[Json] = []
    for item in items:
        entry = spec.get(item.id)
        if entry is None:
            problems.append(f"{item.id}: no row for this item")
            continue
        if not isinstance(entry, dict):
            problems.append(f"{item.id}: the row must be an object")
            continue
        status = entry.get("status")
        if status not in STATUSES:
            problems.append(f"{item.id}: status must be done, not_done or moved")
            continue
        evidence = ""
        if status == "done":
            given = entry.get("evidence")
            if not isinstance(given, str) or not given.strip():
                problems.append(f"{item.id}: status done needs a non-empty evidence")
                continue
            evidence = given.strip()
        elif status == "moved":
            target = entry.get("to")
            if not isinstance(target, str) or not MOVED_TO.fullmatch(target):
                problems.append(f'{item.id}: status moved needs "to": "#M"')
                continue
            note = MOVED_NOTE.search(item.text)
            if note is None or note.group(1) != target:
                problems.append(
                    f"{item.id}: status moved needs «перенесён в {target}» in the issue body "
                    "item; the tech lead writes it, the executor cannot move an AC"
                )
                continue
            evidence = f"перенесён в {target}"
        else:
            evidence = NOT_DONE
        rows.append(
            {
                "evidence": evidence,
                "id": item.id,
                "kind": item.kind,
                "status": status,
                "text": item.text,
            }
        )
    return ([], problems) if problems else (rows, [])


def render_table(rows: list[Json], card: str | None) -> str:
    lines = [
        TABLE_MARK,
        "",
        "## Самопроверка: AC → доказательство",
        "",
        "| # | Пункт | Доказательство |",
        "| --- | --- | --- |",
    ]
    for row in rows:
        lines.append(f"| {row['id']} | {esc(row['text'])} | {esc(row['evidence'])} |")
    missing = [row["id"] for row in rows if row["status"] == "not_done"]
    lines.append("")
    if missing and card == "AC Check":
        lines.append(
            f"Итог: не выполнено — {', '.join(missing)}. Карточка остаётся в AC Check: "
            "принимающий вернёт её в In Progress; доработка идёт в этом же issue."
        )
    elif missing:
        lines.append(
            f"Итог: не выполнено — {', '.join(missing)}. AC Check не ставлю, "
            "доработка идёт в этом же issue."
        )
    else:
        lines.append("Итог: «не выполнено» нет, ставлю AC Check.")
    return "\n".join(lines) + "\n"


def latest_marked(comments: list[Comment], marker: str) -> Comment | None:
    marked = [c for c in comments if c.body.lstrip().startswith(marker)]
    return marked[-1] if marked else None


# ─── the board ──────────────────────────────────────────────────────────────
def board_block(
    action: str = "none",
    status_from: str | None = None,
    to: str | None = None,
    readback: str | None = None,
) -> Json:
    return {"action": action, "from": status_from, "readback": readback, "to": to}


def plan_card(not_done: bool, status: str | None) -> tuple[str, str | None, str | None, str | None]:
    """(action, to, stop, warning) for the author's card move (D5 in the plan)."""
    if not_done:
        if status == "On Review":
            return ("set", "In Progress", None, None)
        if status == "In Progress":
            return ("none", "In Progress", None, None)
        if status == "AC Check":
            return ("left", None, None, None)
        return ("none", None, None, f"the card is in {status or 'no Status'}: not moved")
    if status in ("On Review", "In Progress"):
        return ("set", "AC Check", None, None)
    if status == "AC Check":
        return ("none", "AC Check", None, None)
    stop = (
        f"the card is in {status or 'no Status'}: AC Check is set from On Review, "
        "In Progress or AC Check"
    )
    return ("none", None, stop, None)


# ─── table ──────────────────────────────────────────────────────────────────
def table_output(snap: Snapshot, apply: bool) -> Json:
    return {
        "ac_check": False,
        "apply": apply,
        "board": board_block(),
        "comment": None,
        "issue": snap.ref,
        "mode": "author",
        "next": NEXT[("table", "stop")],
        "rework_rule": None,
        "rows": [],
        "schema": SCHEMA,
        "stops": [],
        "verdict": "stop",
        "viewer": snap.viewer,
        "warnings": [],
    }


def run_table(ref: str, rows_path: str, apply: bool) -> Json:
    repo, number = issue_facts.parse_ref(ref)
    spec = load_rows(rows_path)
    if apply:
        require_write_log()
    snap = snapshot(repo, number)
    out = table_output(snap, apply)
    if snap.facts["issue"]["state"] == "CLOSED":
        out["stops"] = [f"issue {snap.ref} is CLOSED: the self-check applies to an open issue"]
        return out
    if not snap.items:
        out["stops"] = [f"issue {snap.ref} has no AC or DoD checkboxes: there is nothing to check"]
        return out
    rows, problems = build_rows(snap.items, spec)
    if problems:
        out["stops"] = problems
        return out
    out["rows"] = rows
    warnings = [
        f"PR {pr['ref']} is OPEN and has a Refs line naming this issue: "
        "the self-check follows the last PR of the task"
        for pr in snap.facts["prs"]
        if pr["refs"] and pr["state"] == "OPEN"
    ]
    if snap.viewer not in snap.assignees:
        listing = ", ".join(snap.assignees) or "none"
        warnings.append(f"viewer {snap.viewer} is not an assignee (assignees: {listing})")
    not_done = any(row["status"] == "not_done" for row in rows)
    status = board_status.read_status(repo, number)
    action, to, stop, card_warning = plan_card(not_done, status)
    if card_warning:
        warnings.append(card_warning)
    out["warnings"] = warnings
    out["board"] = board_block(action, status, to)
    if stop:
        out["board"] = board_block("none", status)
        out["stops"] = [stop]
        return out
    comment = render_table(rows, status)
    out["comment"] = comment
    out["verdict"] = "not_done" if not_done else "ac_check"
    out["ac_check"] = not not_done
    out["rework_rule"] = RULE if not_done else None
    out["next"] = NEXT[("table", "left" if action == "left" else out["verdict"])]
    if apply:
        latest = latest_marked(snap.comments, TABLE_MARK)
        if latest is not None and latest.body == comment:
            out["warnings"].append(
                f"the same table is already the latest table comment (#{latest.id}): "
                "not posted again"
            )
        else:
            post_comment(repo, number, comment)
        if action == "set" and to is not None:
            out["board"]["readback"] = set_card(repo, number, to)
    return out


# ─── main ───────────────────────────────────────────────────────────────────
class Parser(argparse.ArgumentParser):
    def error(self, message: str) -> NoReturn:
        fail(message, 2)


def build_parser() -> Parser:
    parser = Parser(
        prog="acceptance.py", description="Self-check table and acceptance of an issue."
    )
    sub = parser.add_subparsers(dest="command", required=True, parser_class=Parser)
    table = sub.add_parser("table", help="the author's self-check table")
    table.add_argument("ref", metavar="REF", help="api#N | ui#N | OWNER/NAME#N | N")
    table.add_argument("rows", metavar="ROWS_JSON", help="evidence per AC / DoD id")
    table.add_argument("--apply", action="store_true", help="write (default: dry run)")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    out = run_table(args.ref, args.rows, args.apply)
    sys.stdout.write(json.dumps(out, sort_keys=True, indent=2, ensure_ascii=False) + "\n")
    return 1 if out["verdict"] == "stop" else 0


if __name__ == "__main__":
    sys.exit(main())
