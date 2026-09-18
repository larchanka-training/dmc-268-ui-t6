---
name: e2e-test
description: This skill should be used when verifying UI behavior in a real browser, reproducing a UI bug, or end-to-end testing the run list, run inspector, or diff viewer of this Vite/React app.
metadata:
  version: 1.0.0
  source: instructor-pack
  adapted-for: frontend
---

# E2E Browser Testing (Vite/React app)

Verify real UI behavior in Chrome against the local dev server. Prefer this
over unit-test reasoning when a bug report says "works after refresh" or
"only happens when clicking around" — those are DOM/lifecycle bugs only a
real browser reveals.

Complements `manual-automation` (generic port/launch/navigate workflow).
This skill adds this product's scenarios and assertion style.

## 1. Server Readiness (do NOT restart blindly)

The dev server is Vite (`pnpm dev`) on port **5173** with hot module reload
— it picks up code changes automatically, so **never kill a running dev
server** just to "get fresh code". Only launch if none is listening:

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN   # expect a node/vite LISTEN entry
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/   # expect 200
```

If absent, launch it and confirm a single listener:

```bash
nohup pnpm dev > /tmp/vite-dev.log 2>&1 &
```

An `EADDRINUSE` in the log means one was already running — kill only your
duplicate, never the original. For a production-like check instead of HMR
behavior, use `pnpm build && pnpm preview` (port 4173) — see
`manual-automation`.

## 2. Browser Tools

Use whichever is available in the session, preferring the Chrome DevTools
MCP tools (`chrome-devtools_new_page`, snapshot, click, fill, evaluate) when
present, falling back to the Claude-in-Chrome tools
(`mcp__claude-in-chrome__navigate`, `find`, `computer`, `javascript_tool`)
otherwise. Navigate to `http://localhost:5173/` and snapshot before
interacting — no login/OTP flow exists yet (GitHub OAuth is future work per
`docs/SYSTEM_DESIGN.md`), so don't invent selectors for one.

## 3. Scenarios for This Product

Per `docs/SYSTEM_DESIGN.md` §"Frontend", the app's screens are the run list,
the run inspector, and the diff viewer:

- **Run list**: the overview/feed screen loads and renders run summaries
  (status, repository, timestamp) without a console error.
- **Run inspector**: opening a run from the list navigates to its trace view
  (`RunSession → RunAction`) and renders the action sequence for that run.
- **Diff viewer with inline comments**: opening a run's diff renders the
  file diff and lets a user attach an inline comment to a specific line.

One sentence per scenario above is the contract; expand with concrete
selectors only once the corresponding UI exists — do not pre-invent
`data-testid`s for screens not yet built.

## 4. Assert on DOM State, Not Screenshots

Screenshots are for the human's record only — the model can't reliably read
them. Assert programmatically instead, preferring `data-testid` or visible
text over CSS structure:

```js
;() =>
  [...document.querySelectorAll('[data-testid="run-row"]')].map((r) => ({
    id: r.getAttribute('data-run-id'),
    status: r.querySelector('[data-testid="run-status"]')?.textContent,
  }))
```

## 5. Console & Network

After any failing interaction, check the console-messages tool for JS
errors and the network-requests tool (filter XHR/fetch) — a failed run/diff
fetch surfaces as a 4xx/5xx there before it shows up as a blank panel in the
UI.

## 6. Cleanup

- Do NOT stop a dev server you found already running.
- Close extra browser pages/tabs you opened; leave the user's original tabs
  alone.
- If you launched the dev server yourself for the session, stop it when
  done unless the user is keeping it running for further work.

## 7. What to Report

For each scenario run: pass/fail, the assertion that failed (if any) with
the actual vs. expected DOM state, and any console/network errors observed.
Include the exact commands/selectors used so the run is reproducible.

## Known Pitfalls

- Page/tab ids can change after a browser restart — re-list pages before
  selecting one.
- A snapshot of a long run list can be large — prefer targeted
  `evaluate`/`data-testid` queries over parsing the full a11y tree.
- Vite's dev server serves modules over HTTP with hashed chunk URLs on
  rebuild — a stale reference to a chunk filename in a log is not a bug.
