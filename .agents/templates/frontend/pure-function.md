# Pure function over a const tuple (entity `lib/`)

Requires: #26 (tooling), #31 (FSD layout, vitest)

## When to use

A small, dependency-free mapping from an entity's finite value set (a status,
a priority, a kind) to a display value or a derived fact. Keep it in
`entities/<x>/lib/`, not inline in a component — it needs no DOM and is
cheapest to unit test there.

## File placement

- `src/entities/task/lib/priority.ts`
- `src/entities/task/lib/priority.test.ts`

## Code

<!-- proof: priority.ts -->

```ts
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type Priority = (typeof PRIORITIES)[number]

const PRIORITY_RANK: Record<Priority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
}

function assertNeverPriority(value: never): never {
  throw new Error(`unhandled priority: ${String(value)}`)
}

export function priorityLabel(priority: Priority): string {
  switch (priority) {
    case 'low':
      return 'Low'
    case 'medium':
      return 'Medium'
    case 'high':
      return 'High'
    case 'urgent':
      return 'Urgent'
    default:
      return assertNeverPriority(priority)
  }
}

export function priorityRank(priority: Priority): number {
  return PRIORITY_RANK[priority]
}
```

## Test

<!-- proof: priority.test.ts -->

```ts
import { describe, expect, it } from 'vitest'

import { priorityLabel, priorityRank } from './priority'

const CASES = [
  ['low', 'Low', 0],
  ['medium', 'Medium', 1],
  ['high', 'High', 2],
  ['urgent', 'Urgent', 3],
] as const

describe('priorityLabel and priorityRank', () => {
  it('maps every priority to its literal label and rank', () => {
    for (const [priority, label, rank] of CASES) {
      expect(priorityLabel(priority)).toBe(label)
      expect(priorityRank(priority)).toBe(rank)
    }
  })
})
```

## Checklist

- The value set is a `readonly` const tuple (`as const`) with a derived
  union type — never a hand-written string union duplicating the tuple.
- The switch has no `default` fallthrough return — the `never`-typed guard
  function is the only way out, so adding a value to the tuple without a new
  `case` is a compile error, not a silent runtime gap.
- A `Record<Priority, ...>` lookup is fine for a straight mapping; reach for
  a `switch` + guard when branches do more than return a constant.
- Test walks a literal table (`for…of`, not `it.each` with a tuple array —
  `array-type` flags tuple-array parameter types) and asserts literal values,
  never values derived from the function under test.
