"""Contract tests for scripts/acceptance.py.

Offline: no network, no tokens, no live `gh`. An autouse guard puts a fake `gh` first
on PATH that fails with exit 97, so any request that escapes the fixture seam is an
error, never a call. The golden cases live in `examples/` and run in test_examples.py;
this file covers what they do not: the row validation, the card rules, the write seam
and the live `gh api` argv.
"""
# SYNC: mirrored in dmc-268-{ui,api}-t6/.agents/skills/accept-issue/tests/test_acceptance.py

from __future__ import annotations

import importlib.util
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
SCRIPT = SKILL / "scripts" / "acceptance.py"
EXAMPLES = SKILL / "examples"
STEP_AUTHOR = EXAMPLES / "01-not-done-then-ac-check" / "step-2"  # table, all done, In Progress
STEP_CLOSED = EXAMPLES / "06-closed-by-merge" / "step-1"
API = "larchanka-training/dmc-268-api-t6"
REF = f"{API}#500"


def _load(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


acc = _load(SCRIPT, "accept_issue_acceptance")


@pytest.fixture(autouse=True)
def no_live_gh(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    guard = tmp_path / "guard-bin"
    guard.mkdir()
    gh = guard / "gh"
    gh.write_text(
        f"#!{sys.executable}\nimport sys\n"
        "sys.stderr.write('unexpected gh call\\n')\nsys.exit(97)\n",
        encoding="utf-8",
    )
    gh.chmod(0o755)
    monkeypatch.setenv("PATH", f"{guard}{os.pathsep}{os.environ.get('PATH', '')}")
    monkeypatch.delenv("ACCEPT_ISSUE_FIXTURE_DIR", raising=False)
    monkeypatch.delenv("ACCEPT_ISSUE_WRITE_LOG", raising=False)


def read(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def put(directory: Path, name: str, data: Any) -> None:
    (directory / f"{name}.json").write_text(json.dumps(data), encoding="utf-8")


def fixtures_of(step: Path, tmp_path: Path) -> Path:
    target = tmp_path / "fx"
    shutil.copytree(step / "fixtures", target)
    return target


def run(
    *args: str, fixtures: Path | None = None, log: Path | None = None, cwd: Path | None = None
) -> subprocess.CompletedProcess[str]:
    env = dict(os.environ)
    if fixtures is not None:
        env["ACCEPT_ISSUE_FIXTURE_DIR"] = str(fixtures)
    if log is not None:
        env["ACCEPT_ISSUE_WRITE_LOG"] = str(log)
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        encoding="utf-8",
        env=env,
        cwd=cwd,
        check=False,
    )


def error_of(r: subprocess.CompletedProcess[str]) -> str:
    assert r.stdout == ""
    assert "Traceback" not in r.stderr
    assert r.stderr.count("\n") == 1, r.stderr
    message = json.loads(r.stderr)["error"]
    assert isinstance(message, str)
    return message


def rows_file(tmp_path: Path, spec: Any) -> Path:
    path = tmp_path / "rows.json"
    path.write_text(json.dumps(spec), encoding="utf-8")
    return path


def good_rows() -> dict[str, Any]:
    return read(STEP_AUTHOR / "rows.json")  # type: ignore[no-any-return]


def table(
    tmp_path: Path, spec: Any, *flags: str, fixtures: Path | None = None, log: Path | None = None
) -> subprocess.CompletedProcess[str]:
    fx = fixtures or fixtures_of(STEP_AUTHOR, tmp_path)
    return run("table", "api#500", str(rows_file(tmp_path, spec)), *flags, fixtures=fx, log=log)


# ─── row validation ─────────────────────────────────────────────────────────
def stops_of(r: subprocess.CompletedProcess[str]) -> list[str]:
    assert r.returncode == 1, r.stderr
    doc = json.loads(r.stdout)
    assert doc["verdict"] == "stop"
    assert doc["rows"] == [] and doc["comment"] is None
    stops = doc["stops"]
    assert isinstance(stops, list)
    return [str(s) for s in stops]


def test_a_missing_row_and_an_unknown_id_are_stops(tmp_path: Path) -> None:
    spec = good_rows()
    del spec["AC2"]
    spec["AC9"] = {"status": "not_done"}
    assert stops_of(table(tmp_path, spec)) == [
        "AC9: no such AC or DoD in the issue body",
        "AC2: no row for this item",
    ]


@pytest.mark.parametrize(
    ("entry", "message"),
    [
        ({"status": "done"}, "AC1: status done needs a non-empty evidence"),
        ({"status": "done", "evidence": "  "}, "AC1: status done needs a non-empty evidence"),
        ({"status": "finished"}, "AC1: status must be done, not_done or moved"),
        ({"evidence": "x"}, "AC1: status must be done, not_done or moved"),
        ({"status": "moved"}, 'AC1: status moved needs "to": "#M"'),
        ({"status": "moved", "to": "285"}, 'AC1: status moved needs "to": "#M"'),
        (
            {"status": "moved", "to": "#285"},
            "AC1: status moved needs «перенесён в #285» in the issue body item; "
            "the tech lead writes it, the executor cannot move an AC",
        ),
        ("done", "AC1: the row must be an object"),
    ],
)
def test_a_bad_row_is_a_stop(tmp_path: Path, entry: Any, message: str) -> None:
    spec = good_rows()
    spec["AC1"] = entry
    assert stops_of(table(tmp_path, spec)) == [message]


def test_moved_needs_the_same_target_as_the_body_note(tmp_path: Path) -> None:
    fx = fixtures_of(STEP_AUTHOR, tmp_path)
    for name in ("issue-p1", "acceptance-p1"):
        doc = read(fx / f"{name}.json")
        issue = doc["data"]["repository"]["issue"]
        issue["body"] = issue["body"].replace(
            "Правило включено в ruleset", "Правило перенесён в #285"
        )
        put(fx, name, doc)
    spec = good_rows()
    spec["AC3"] = {"status": "moved", "to": "#286"}
    assert stops_of(table(tmp_path, spec, fixtures=fx)) == [
        "AC3: status moved needs «перенесён в #286» in the issue body item; "
        "the tech lead writes it, the executor cannot move an AC"
    ]
    spec["AC3"] = {"status": "moved", "to": "#285"}
    r = table(tmp_path, spec, fixtures=fx)
    assert r.returncode == 0, r.stderr
    rows = {row["id"]: row for row in json.loads(r.stdout)["rows"]}
    assert rows["AC3"]["evidence"] == "перенесён в #285"


def test_a_body_without_checkboxes_is_a_stop(tmp_path: Path) -> None:
    fx = fixtures_of(STEP_AUTHOR, tmp_path)
    for name in ("issue-p1", "acceptance-p1"):
        doc = read(fx / f"{name}.json")
        doc["data"]["repository"]["issue"]["body"] = "## Background\n\nNothing to check.\n"
        put(fx, name, doc)
    assert stops_of(table(tmp_path, good_rows(), fixtures=fx)) == [
        f"issue {REF} has no AC or DoD checkboxes: there is nothing to check"
    ]


@pytest.mark.parametrize("content", ["", "{", "[]", '"AC1"'])
def test_a_bad_rows_file_exits_2(tmp_path: Path, content: str) -> None:
    path = tmp_path / "rows.json"
    path.write_text(content, encoding="utf-8")
    r = run("table", "api#500", str(path), fixtures=fixtures_of(STEP_AUTHOR, tmp_path))
    assert r.returncode == 2
    assert "ROWS_JSON" in error_of(r)


def test_a_missing_rows_file_exits_2(tmp_path: Path) -> None:
    r = run(
        "table", "api#500", str(tmp_path / "none.json"), fixtures=fixtures_of(STEP_AUTHOR, tmp_path)
    )
    assert r.returncode == 2
    assert "cannot read ROWS_JSON" in error_of(r)


# ─── the issue and the card ─────────────────────────────────────────────────
def test_a_closed_issue_is_a_stop_for_the_author(tmp_path: Path) -> None:
    r = table(tmp_path, good_rows(), fixtures=fixtures_of(STEP_CLOSED, tmp_path))
    assert stops_of(r) == [f"issue {REF} is CLOSED: the self-check applies to an open issue"]


def _card(tmp_path: Path, status: str | None) -> Path:
    fx = fixtures_of(STEP_AUTHOR, tmp_path)
    doc = read(fx / "item.json")
    node = doc["data"]["repository"]["issue"]["projectItems"]["nodes"][0]
    node["fieldValueByName"] = (
        None
        if status is None
        else {"__typename": "ProjectV2ItemFieldSingleSelectValue", "name": status}
    )
    put(fx, "item", doc)
    return fx


@pytest.mark.parametrize("status", ["Todo", "Done", None])
def test_ac_check_from_a_card_elsewhere_is_a_stop(tmp_path: Path, status: str | None) -> None:
    r = table(tmp_path, good_rows(), fixtures=_card(tmp_path, status))
    assert r.returncode == 1
    doc = json.loads(r.stdout)
    assert doc["stops"] == [
        f"the card is in {status or 'no Status'}: AC Check is set from On Review, "
        "In Progress or AC Check"
    ]
    assert doc["board"] == {"action": "none", "from": status, "readback": None, "to": None}
    assert doc["comment"] is None and len(doc["rows"]) == 5


@pytest.mark.parametrize(
    ("status", "action", "target"),
    [
        ("On Review", "set", "In Progress"),
        ("In Progress", "none", "In Progress"),
        ("AC Check", "left", None),
        ("Todo", "none", None),
    ],
)
def test_not_done_moves_the_card_only_from_on_review(
    tmp_path: Path, status: str, action: str, target: str | None
) -> None:
    spec = good_rows()
    spec["AC2"] = {"status": "not_done"}
    r = table(tmp_path, spec, fixtures=_card(tmp_path, status))
    assert r.returncode == 0, r.stderr
    doc = json.loads(r.stdout)
    assert doc["verdict"] == "not_done" and doc["ac_check"] is False
    assert doc["board"] == {"action": action, "from": status, "readback": None, "to": target}
    assert doc["rework_rule"] == acc.RULE
    assert doc["warnings"] == ([f"the card is in {status}: not moved"] if status == "Todo" else [])


def test_ac_check_already_there_writes_no_card_move(tmp_path: Path) -> None:
    log = tmp_path / "writes.jsonl"
    r = table(tmp_path, good_rows(), "--apply", fixtures=_card(tmp_path, "AC Check"), log=log)
    assert r.returncode == 0, r.stderr
    doc = json.loads(r.stdout)
    assert doc["board"] == {
        "action": "none",
        "from": "AC Check",
        "readback": None,
        "to": "AC Check",
    }
    assert [json.loads(line)["op"] for line in log.read_text(encoding="utf-8").splitlines()] == [
        "comment"
    ]


def test_a_viewer_without_assignees_is_named_in_the_warning(tmp_path: Path) -> None:
    fx = fixtures_of(STEP_AUTHOR, tmp_path)
    doc = read(fx / "acceptance-p1.json")
    doc["data"]["repository"]["issue"]["assignees"]["nodes"] = []
    put(fx, "acceptance-p1", doc)
    r = table(tmp_path, good_rows(), fixtures=fx)
    assert json.loads(r.stdout)["warnings"] == [
        "viewer executor is not an assignee (assignees: none)"
    ]


# ─── writes ─────────────────────────────────────────────────────────────────
def test_a_dry_run_writes_nothing_even_with_a_log(tmp_path: Path) -> None:
    log = tmp_path / "writes.jsonl"
    r = table(tmp_path, good_rows(), log=log)
    assert r.returncode == 0, r.stderr
    assert not log.exists()
    assert json.loads(r.stdout)["apply"] is False


def test_apply_against_the_seam_needs_the_write_log(tmp_path: Path) -> None:
    r = table(tmp_path, good_rows(), "--apply")
    assert r.returncode == 3
    assert "ACCEPT_ISSUE_WRITE_LOG" in error_of(r)


def test_a_stop_writes_nothing_with_apply(tmp_path: Path) -> None:
    log = tmp_path / "writes.jsonl"
    spec = good_rows()
    del spec["AC2"]
    r = table(tmp_path, spec, "--apply", log=log)
    assert r.returncode == 1
    assert not log.exists()


def test_the_same_table_is_not_posted_twice(tmp_path: Path) -> None:
    log = tmp_path / "writes.jsonl"
    first = table(tmp_path, good_rows(), "--apply", log=log)
    comment = json.loads(first.stdout)["comment"]
    fx = tmp_path / "fx"
    doc = read(fx / "acceptance-p1.json")
    doc["data"]["repository"]["issue"]["comments"]["nodes"].append(
        {
            "databaseId": 9001,
            "author": {"login": "executor"},
            "createdAt": "2026-10-30T11:00:00Z",
            "body": comment,
        }
    )
    put(fx, "acceptance-p1", doc)
    log.unlink()
    second = table(tmp_path, good_rows(), "--apply", fixtures=fx, log=log)
    out = json.loads(second.stdout)
    assert out["warnings"] == [
        "the same table is already the latest table comment (#9001): not posted again"
    ]
    assert [json.loads(line)["op"] for line in log.read_text(encoding="utf-8").splitlines()] == [
        "set-status"
    ]


def test_a_read_back_that_differs_exits_3(tmp_path: Path) -> None:
    fx = fixtures_of(STEP_AUTHOR, tmp_path)
    doc = read(fx / "readback.json")
    doc["data"]["repository"]["issue"]["projectItems"]["nodes"][0]["fieldValueByName"]["name"] = (
        "Todo"
    )
    put(fx, "readback", doc)
    r = table(tmp_path, good_rows(), "--apply", fixtures=fx, log=tmp_path / "w.jsonl")
    assert r.returncode == 3
    assert "reads back as 'Todo', not 'AC Check'" in error_of(r)


# ─── the table text ─────────────────────────────────────────────────────────
def test_cells_escape_pipes_and_flatten_lines() -> None:
    assert acc.esc("a | b\n  c") == "a \\| b c"


def test_render_marks_the_comment_and_names_the_open_items() -> None:
    rows = [
        {"id": "AC1", "kind": "ac", "text": "one | two", "status": "done", "evidence": "PR #1"},
        {
            "id": "DoD1",
            "kind": "dod",
            "text": "gate",
            "status": "not_done",
            "evidence": "не выполнено",
        },
    ]
    text = acc.render_table(rows, None)
    assert text.startswith("<!-- accept-issue:table v1 -->\n")
    assert "| AC1 | one \\| two | PR #1 |" in text
    assert "| DoD1 | gate | не выполнено |" in text
    assert text.endswith(
        "Итог: не выполнено — DoD1. AC Check не ставлю, доработка идёт в этом же issue.\n"
    )


def test_the_latest_marked_comment_wins() -> None:
    mark = acc.TABLE_MARK
    comments = [
        acc.Comment(1, "a", "t", f"{mark}\nold"),
        acc.Comment(2, "a", "t", "chat"),
        acc.Comment(3, "a", "t", f"  {mark}\nnew"),
    ]
    latest = acc.latest_marked(comments, mark)
    assert latest is not None and latest.id == 3
    assert acc.latest_marked(comments[1:2], mark) is None


# ─── live writes (argv only) ────────────────────────────────────────────────
def test_a_live_comment_is_a_rest_post_with_a_raw_string_field(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[list[str]] = []

    def fake_run(argv: list[str], **_: Any) -> subprocess.CompletedProcess[str]:
        calls.append(argv)
        return subprocess.CompletedProcess(argv, 0, "{}", "")

    monkeypatch.setattr(acc.subprocess, "run", fake_run)
    acc.post_comment(API, 500, "@someone <!-- x -->")
    assert calls == [
        ["gh", "api", f"repos/{API}/issues/500/comments", "-f", "body=@someone <!-- x -->"]
    ]


def test_a_failing_live_write_exits_3(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    def fake_run(argv: list[str], **_: Any) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(argv, 1, "", "HTTP 403")

    monkeypatch.setattr(acc.subprocess, "run", fake_run)
    with pytest.raises(SystemExit) as stop:
        acc.post_comment(API, 500, "x")
    assert stop.value.code == 3
    assert "HTTP 403" in capsys.readouterr().err


def test_usage_errors_exit_2() -> None:
    for args in ([], ["table"], ["table", "api#1"], ["frobnicate", "api#1"], ["table", "x", "y"]):
        r = run(*args)
        assert r.returncode == 2, args
        error_of(r)
