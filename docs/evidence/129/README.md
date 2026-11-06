# ui#129 browser evidence

Captured with Chromium, the Vite mock transport, a 1440 × 900 viewport, and the browser timezone set to `Asia/Tokyo`. Each screen was checked in light and dark themes.

The `before/` screenshots reproduce the old UTC behavior by intercepting the formatter module in the browser and returning `new Date(iso).toISOString().replace('T', ' ').slice(0, 19)`. This keeps the same UI shell for comparison; these are not screenshots of the historical `origin/main` build. The `after/` screenshots use the committed formatter with no interception.

| Screen                | Mock API time          | Before                | After                 |
| --------------------- | ---------------------- | --------------------- | --------------------- |
| Run header, Created   | `2026-09-18T11:49:00Z` | `2026-09-18 11:49:00` | `2026-09-18 20:49:00` |
| Review rules, Checked | `2026-09-18T12:00:00Z` | `2026-09-18 12:00:00` | `2026-09-18 21:00:00` |

Both values retain the 19-character layout, stay on one line, and keep the same color within each theme. The CSS is unchanged.
