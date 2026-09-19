# Good and Bad Tests

## Good Tests

**Integration-style**: test through real interfaces, not mocks of internal
parts.

```tsx
// GOOD: tests observable behavior
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiffComment } from './DiffComment'

afterEach(() => {
  cleanup()
})

describe('DiffComment', () => {
  it('lets a user submit an inline comment on a diff line', async () => {
    const onSubmit = vi.fn()
    render(<DiffComment lineNumber={42} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox'), 'unclear naming here')
    await userEvent.click(screen.getByRole('button', { name: /comment/i }))
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
test('addComment stores a new comment', () => {
  useCommentStore.getState().addComment(draft)
  expect(useCommentStore.getState()._internalComments.length).toBe(1)
})

// GOOD: verifies through the exported interface
test('addComment makes the comment retrievable', () => {
  useCommentStore.getState().addComment(draft)
  expect(useCommentStore.getState().comments).toContainEqual(draft)
})
```

**Tautological tests**: expected value restates the implementation, so the
test passes by construction.

```ts
// BAD: expected value is recomputed the way the code computes it
test('sums finding counts', () => {
  const findings = [{ count: 3 }, { count: 2 }]
  const expected = findings.reduce((sum, f) => sum + f.count, 0)
  expect(sumFindings(findings)).toBe(expected)
})

// GOOD: expected value is an independent, known literal
test('sums finding counts', () => {
  expect(sumFindings([{ count: 3 }, { count: 2 }])).toBe(5)
})
```

## Zod schemas: accept/reject literals

Test a schema by parsing known-good and known-bad literals, never by
re-deriving the shape from the schema itself:

```ts
import { describe, it, expect } from 'vitest'
import { runSummarySchema } from './schemas'

describe('runSummarySchema', () => {
  it('accepts a valid run summary', () => {
    const ok = { runId: 'r_1', status: 'completed', findingCount: 4 }
    expect(runSummarySchema.safeParse(ok).success).toBe(true)
  })

  it('rejects an unknown status literal', () => {
    const bad = { runId: 'r_1', status: 'bogus', findingCount: 4 }
    expect(runSummarySchema.safeParse(bad).success).toBe(false)
  })
})
```
