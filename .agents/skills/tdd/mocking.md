# When to Mock

Examples are illustrative and not gate-checked. The proven patterns are in `.agents/templates/frontend/`.

Mock at **system boundaries** only:

- HTTP calls to the backend API
- Browser/global APIs (`Date`, `crypto.randomUUID`, timers)
- Third-party widgets you don't control

Don't mock:

- Your own components, hooks, or store actions
- Internal collaborators
- Anything you control

Use `vi.fn()` for standalone spies/stubs, `vi.spyOn()` to wrap an existing
method, and `vi.mock()` to replace a whole module (typically the API client
module) — but prefer a **fake adapter** over `vi.mock()` when testing code
built on a port (see below).

## Designing for Mockability

At system boundaries, design interfaces that are easy to mock.

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```ts
// Easy to mock
export function loadRun(id: string, api: RunApiClient) {
  return api.getRun(id)
}

// Hard to mock
export function loadRunDirect(id: string) {
  return fetch(`/runs/${id}`)
}
```

**2. Prefer SDK-style interfaces over generic fetchers** — `getRun(id)`,
`listRuns()`, `listActions(runId)` are each independently mockable;
a single `fetch(endpoint, options)` forces conditional logic inside the mock.

## Fake adapters over mocks, for ports

When code is written against a port (a small client interface over the `runApi`
descriptors in `entities/run/api`), prefer an in-memory **fake implementation**
of the port, e.g. in `entities/run/lib/`, over mocking each call with `vi.fn()`:

```ts
import type { RunListPage, RunSession } from '../model/schemas'

export interface RunApiClient {
  getRun: (id: string) => Promise<RunSession | null>
  listRuns: () => Promise<RunListPage>
}

export function createInMemoryRunApi(seed: RunSession[]): RunApiClient {
  const runs = new Map(seed.map((r) => [r.id, r]))
  return {
    getRun: (id) => Promise.resolve(runs.get(id) ?? null),
    listRuns: () => Promise.resolve({ items: [...runs.values()], nextCursor: null }),
  }
}
```

A fake keeps the test asserting on behavior ("the run I seeded comes back")
rather than on call shape, and it is reusable across every test that needs
the port — one fake, many tests, versus re-stubbing `vi.fn()` per call site.

## Where each tool fits

| Tool         | Use for                                              |
| ------------ | ---------------------------------------------------- |
| `vi.fn()`    | A standalone callback prop or spy                    |
| `vi.spyOn()` | Wrapping one method on a real object, then restoring |
| `vi.mock()`  | Replacing a whole module import (last resort)        |
| Fake adapter | Anything shaped as a port/client interface           |
