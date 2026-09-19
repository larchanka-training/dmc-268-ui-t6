---
name: manual-automation
description: This skill should be used when manually testing or automating this Vite/React app in a real browser — port management, launching the dev or preview server, browser automation, and end-to-end verification.
metadata:
  version: 1.0.0
  source: instructor-pack
  adapted-for: frontend
---

# Manual Browser Automation

Generic port/launch/navigate workflow for driving this app in a real
browser via the Chrome DevTools MCP tools (or Claude-in-Chrome, whichever
is available). Complements `e2e-test`, which adds this product's specific
scenarios and assertion style — use this skill for the launch/navigate
mechanics, `e2e-test` for what to check.

## Workflow Execution Steps

### 1. Port Management

**Check if port 5173 (dev) is in use:**

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

**If a listener is present:** treat it as the running app — Vite HMR
reloads on code changes, so do not stop it just to pick up new code. Only
stop it if it's unresponsive (health check below fails).

**If the port is free:** proceed to application launch.

For a production-like check (no HMR, minified bundle) use port 4173
(`pnpm preview`) instead — see step 2.

### 2. Application Launch

**Dev server** (default for interactive testing):

```bash
nohup pnpm dev > /tmp/vite-dev.log 2>&1 &
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/)
  [ "$code" = "200" ] && break
  sleep 1
done
[ "$code" = "200" ] || { echo "dev server not ready after 30s"; cat /tmp/vite-dev.log; exit 1; }
```

**Production-like check** (build first, then serve the built output):

```bash
pnpm build && nohup pnpm preview > /tmp/vite-preview.log 2>&1 &
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/)
  [ "$code" = "200" ] && break
  sleep 1
done
[ "$code" = "200" ] || { echo "preview server not ready after 30s"; cat /tmp/vite-preview.log; exit 1; }
```

Run in background mode so the agent keeps control of the terminal; poll the
health check (readiness loop above) rather than a bare curl right after
launch — Vite needs time to start, so an immediate request races the
server.

### 3. Browser Automation Setup

- Connect via the available MCP browser tools.
- Navigate to `http://localhost:5173/` (or `:4173` for the preview build).
- Wait for the page to settle, then take an initial snapshot.

### 4. Navigation

This is a client-rendered SPA with no login/OTP flow today — skip any
credentials/auth step. Navigate directly to the screen under test via UI
interaction (clicking through the run list) rather than guessing routes
that may not exist yet.

### 5. Testing Execution

Use whichever browser tool surface is loaded in the session:

- **Chrome DevTools MCP**: `new_page`, `take_snapshot`, `click`, `fill`,
  `evaluate_script`, `list_console_messages`, `list_network_requests`,
  `take_screenshot`, `performance_start_trace` / `performance_stop_trace`,
  `lighthouse_audit`.
- **Claude-in-Chrome**: `navigate`, `find`, `computer`, `form_input`,
  `javascript_tool`, `read_console_messages`, `read_network_requests`.

**Testing best practices:**

- Wait for elements before interacting instead of guessing timing.
- Take a screenshot at key steps for the human's record only.
- Check console messages for JS errors after every interaction.
- Verify network requests to the backend API complete (2xx), not just that
  the UI stopped spinning.
- Use script evaluation for assertions — see `e2e-test` for the DOM-state
  assertion style used in this product.

### 6. Cleanup

**After testing completion:**

- Close the browser pages/tabs you opened.
- Only stop the dev/preview server if you started it yourself for this
  session, and the user isn't continuing to use it.
- Remove temp logs (`/tmp/vite-dev.log`, `/tmp/vite-preview.log`) if no
  longer needed for debugging.

## Exit Criteria

- Port 5173 (or 4173 for a preview run) is confirmed serving the app.
- Browser successfully connects and navigates to the app.
- All specified scenarios execute via the browser tools.
- Results are reported with the relevant console/network output.
- Any server the agent itself started is stopped, or left running only with
  the user's continued use in mind.

## Error Handling

**Port conflicts:**

- Identify the process on the port before assuming it's stale
  (`lsof -nP -iTCP:5173 -sTCP:LISTEN`); never kill a listener you didn't
  start without checking the health check first.

**Application launch failures:**

- Check `/tmp/vite-dev.log` (or `/tmp/vite-preview.log`) for the error.
- Verify `pnpm install` has been run and `node_modules` exists.

**Browser automation failures:**

- Re-check console messages and network requests for the root cause.
- Verify selectors against a fresh snapshot — DOM structure can change
  between HMR updates.

**Navigation failures:**

- Confirm the route exists in the app before assuming a bug — this SPA has
  no server-side routes beyond the Vite dev/preview server itself.
