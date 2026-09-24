# Good and Bad Tests

Examples are illustrative and not gate-checked. The proven patterns are in `.agents/templates/frontend/`.

## Good Tests

**Integration-style**: test through real interfaces, not mocks of internal
parts.

```tsx
// @vitest-environment jsdom
// GOOD: tests observable behavior
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DiffComment } from './DiffComment'

afterEach(() => {
  cleanup()
})

describe('DiffComment', () => {
  it('lets a user submit an inline comment on a diff line', () => {
    const onSubmit = vi.fn()
    render(<DiffComment lineNumber={42} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'unclear naming here' } })
    fireEvent.click(screen.getByRole('button', { name: /comment/i }))
    expect(onSubmit).toHaveBeenCalledWith({ lineNumber: 42, body: 'unclear naming here' })
  })
})
```

Characteristics:

- Tests behavior users/callers care about
- Uses the public API only (props, rendered DOM, exported store actions)
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: coupled to internal structure — e.g.
`vi.spyOn(internals, 'formatBody')` to assert a private helper was called
instead of asserting the resulting output.

Red flags:

- Mocking internal collaborators
- Testing private helpers
- Asserting on call counts/order instead of outcomes
- Test breaks when refactoring without a behavior change
- Test name describes HOW not WHAT
- Reading a store's internal state instead of going through the interface

```ts
// BAD: reaches into the store's internal field
it('addComment stores a new comment', () => {
  useCommentStore.getState().addComment(draft)
  expect(useCommentStore.getState()._internalComments.length).toBe(1)
})

// GOOD: verifies through the exported interface
it('addComment makes the comment retrievable', () => {
  useCommentStore.getState().addComment(draft)
  expect(useCommentStore.getState().comments).toContainEqual(draft)
})
```

**Tautological tests**: expected value restates the implementation, so the
test passes by construction.

```ts
// BAD: expected value is recomputed the way the code computes it
it('sums finding counts', () => {
  const findings = [{ count: 3 }, { count: 2 }]
  const expected = findings.reduce((sum, f) => sum + f.count, 0)
  expect(sumFindings(findings)).toBe(expected)
})

// GOOD: expected value is an independent, known literal
it('sums finding counts', () => {
  expect(sumFindings([{ count: 3 }, { count: 2 }])).toBe(5)
})
```

## Zod schemas: accept/reject literals

Test a schema by parsing known-good and known-bad literals, never by
re-deriving the shape from the schema itself:

```ts
import { describe, it, expect } from 'vitest'
import { RunUpdatedEventSchema } from './schemas'

describe('RunUpdatedEventSchema', () => {
  it('accepts a valid run-updated event', () => {
    const ok = { runId: '11111111-1111-4111-8111-000000000001', status: 'succeeded' }
    expect(RunUpdatedEventSchema.safeParse(ok).success).toBe(true)
  })

  it('rejects an unknown status literal', () => {
    const bad = { runId: '11111111-1111-4111-8111-000000000001', status: 'bogus' }
    expect(RunUpdatedEventSchema.safeParse(bad).success).toBe(false)
  })
})
```
