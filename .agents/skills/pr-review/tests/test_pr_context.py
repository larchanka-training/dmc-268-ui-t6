"""Contract tests for scripts/pr_context.py.

Offline: no network, no tokens, no live `gh`. An autouse guard puts a fake `gh`
first on PATH that fails with exit 97, so any request that escapes the fixture
seam (`PR_REVIEW_FIXTURE_DIR`) or a test's own fake is an error, never a call.

Covers: every `examples/*/` case (stdout byte-equal to `expected.json`, exit code from
the verdict, the invocation read from the case's README); synthetic pull requests for the
`Refs` rules (none, a bare `Refs #`, a ref that is a pull request, several issues, the other
repo), the part a pull request names and the criteria it selects, an issue without criteria,
the state warnings; the REF grammar, exit codes 2 and 3, and the argv the script hands to
`gh` (read-only REST calls).
"""
# SYNC: mirrored in dmc-268-{ui,api}-t6/.agents/skills/pr-review/tests/test_pr_context.py

from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
SCRIPT = SKILL / "scripts" / "pr_context.py"
EXAMPLES = SKILL / "examples"
API = "larchanka-training/dmc-268-api-t6"
UI = "larchanka-training/dmc-268-ui-t6"
SEAM = "PR_REVIEW_FIXTURE_DIR"


def fake_gh(bin_dir: Path, body: str) -> Path:
    """Write an executable `gh` (a Python script) into bin_dir."""
    bin_dir.mkdir(parents=True, exist_ok=True)
    gh = bin_dir / "gh"
    gh.write_text(f"#!{sys.executable}\n{body}", encoding="utf-8")
    gh.chmod(0o755)
    return bin_dir


def prepend_path(monkeypatch: pytest.MonkeyPatch, bin_dir: Path) -> None:
    monkeypatch.setenv("PATH", f"{bin_dir}{os.pathsep}{os.environ.get('PATH', '')}")


@pytest.fixture(autouse=True)
def no_live_gh(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Every test starts with a `gh` that refuses to run and no fixture dir."""
    guard = fake_gh(
        tmp_path / "guard-bin",
        'import sys\nsys.stderr.write("unexpected gh call\\n")\nsys.exit(97)\n',
    )
    prepend_path(monkeypatch, guard)
    monkeypatch.delenv(SEAM, raising=False)


def run(*args: str, fixtures: Path | None = None) -> subprocess.CompletedProcess[str]:
    env = dict(os.environ)
    if fixtures is not None:
        env[SEAM] = str(fixtures)
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        env=env,
        check=False,
    )


def doc_of(r: subprocess.CompletedProcess[str]) -> dict[str, Any]:
    assert r.stderr == "", r.stderr
    parsed = json.loads(r.stdout)
    assert isinstance(parsed, dict)
    return parsed


def error_of(r: subprocess.CompletedProcess[str]) -> str:
    assert r.stdout == ""
    parsed = json.loads(r.stderr)
    assert isinstance(parsed, dict) and set(parsed) == {"error"}
    message = parsed["error"]
    assert isinstance(message, str)
    return message


# ─── the examples ───────────────────────────────────────────────────────────
CASES = sorted(p.name for p in EXAMPLES.iterdir() if p.is_dir())


def invocation(case: str) -> list[str]:
    """The arguments of the case's `pr_context.py` line, from its README."""
    readme = (EXAMPLES / case / "README.md").read_text(encoding="utf-8")
    block = re.search(r"```sh\n(pr_context\.py [^\n]+)\n```", readme)
    assert block, f"{case}/README.md has no ```sh pr_context.py ...``` block"
    return shlex.split(block.group(1))[1:]


def test_there_are_at_least_three_examples() -> None:
    assert len(CASES) >= 3


@pytest.mark.parametrize("case", CASES)
def test_example(case: str) -> None:
    folder = EXAMPLES / case
    readme = (folder / "README.md").read_text(encoding="utf-8")
    assert readme.startswith(
        f"<!-- SYNC: mirrored in dmc-268-{{ui,api}}-t6/.agents/skills/pr-review/"
        f"examples/{case}/README.md -->\n\n"
    )
    r = run(*invocation(case), fixtures=folder / "fixtures")
    expected = (folder / "expected.json").read_text(encoding="utf-8")
    assert r.stdout == expected
    assert r.stderr == ""
    assert r.returncode == (0 if json.loads(expected)["verdict"] == "go" else 1)


def test_the_examples_cover_go_and_stop() -> None:
    verdicts = {
        json.loads((EXAMPLES / case / "expected.json").read_text(encoding="utf-8"))["verdict"]
        for case in CASES
    }
    assert verdicts == {"go", "stop"}
