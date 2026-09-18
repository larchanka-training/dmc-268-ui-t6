# When to Mock

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
function submitFinding(finding: Finding, api: ReviewApiClient) {
  return api.postFinding(finding)
}

// Hard to mock
function submitFinding(finding: Finding) {
  return fetch('/api/findings', { method: 'POST', body: JSON.stringify(finding) })
}
```

**2. Prefer SDK-style interfaces over generic fetchers** — `getRun(id)`,
`listFindings(runId)`, `postComment(draft)` are each independently mockable;
a single `fetch(endpoint, options)` forces conditional logic inside the mock.

## Fake adapters over mocks, for ports

When code is written against a port (a small interface such as `VcsProvider`
or a repository-shaped client), prefer an in-memory **fake implementation**
of the port over mocking each call with `vi.fn()`:

```ts
// fakes/inMemoryReviewApi.ts
export function createInMemoryReviewApi(seed: RunSummary[]): ReviewApiClient {
  const runs = new Map(seed.map((r) => [r.runId, r]))
  return {
    getRun: async (id) => runs.get(id) ?? null,
    listFindings: async () => [],
    postComment: async (draft) => ({ ...draft, id: 'c_1' }),
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
