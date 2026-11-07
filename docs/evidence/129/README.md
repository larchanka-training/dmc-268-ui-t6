# ui#129 browser evidence

Captured with Chromium, the Vite mock transport, English UI, a 1440 × 900 viewport, and the browser timezone set to `Asia/Tokyo`. Each screen was checked in light and dark themes.

The `before/` screenshots come from the PR base commit `210f63ef` running unmodified in an isolated Vite snapshot. The `after/` screenshots use this branch. Both runs use the same mock fixtures, language, theme, viewport, browser timezone, and scroll positions (run: top; rules: 600 px). No formatter module is intercepted. The timestamps below come from the mock transport fixtures, so these screenshots do not establish a live API response in the Network panel.

| Screen                | Mock fixture ISO time  | Before (base, UTC)     | After (browser local)  |
| --------------------- | ---------------------- | ---------------------- | ---------------------- |
| Run header, Created   | `2026-09-18T11:49:00Z` | `09/18/2026, 11:49:00` | `09/18/2026, 20:49:00` |
| Review rules, Checked | `2026-09-18T12:00:00Z` | `09/18/2026, 12:00:00` | `09/18/2026, 21:00:00` |

The English values remain 20 characters, stay on one line, and keep the same color within each theme. The CSS is unchanged. The date and time notation still follows the selected interface language, as required by #182; #129's fixed 19-character layout is intentionally superseded by that decision.
