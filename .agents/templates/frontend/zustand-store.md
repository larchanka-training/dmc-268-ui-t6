# Widget-local Zustand store

## When to use

UI state owned by one widget only (selection, expanded rows, an active
filter) — never server data; that belongs in a TanStack Query cache. Mirrors
`widgets/run-inspector/model/store.ts`.

## File placement

- `src/widgets/todo-panel/model/store.ts`
- `src/widgets/todo-panel/model/store.test.ts`

## Code

<!-- proof: store.ts -->

```ts
import { create } from 'zustand'

export type TodoFilter = 'all' | 'open' | 'done'

export interface TodoPanelState {
  selectedId: string | null
  filter: TodoFilter
  selectItem: (id: string | null) => void
  setFilter: (filter: TodoFilter) => void
}

export const useTodoPanelStore = create<TodoPanelState>()((set) => ({
  selectedId: null,
  filter: 'all',
  selectItem: (id) => {
    set({ selectedId: id })
  },
  setFilter: (filter) => {
    set({ filter })
  },
}))
```

## Test

<!-- proof: store.test.ts -->

```ts
import { beforeEach, describe, expect, it } from 'vitest'

import { useTodoPanelStore } from './store'

const initial = { selectedId: null, filter: 'all' as const }

beforeEach(() => {
  useTodoPanelStore.setState(initial)
})

describe('useTodoPanelStore', () => {
  it('selects an item', () => {
    useTodoPanelStore.getState().selectItem('task-1')
    expect(useTodoPanelStore.getState().selectedId).toBe('task-1')
  })

  it('sets a filter', () => {
    useTodoPanelStore.getState().setFilter('open')
    expect(useTodoPanelStore.getState().filter).toBe('open')
  })
})
```

## Checklist

- `create<State>()((set) => ({...}))` — the double-call curried form (needed
  for zustand 5's typed `create`), not `create<State>((set) => ({...}))`.
- Actions call `set({...})` with a block body (`no-confusing-void-expression`
  for a void-returning callback) — never `set => set({...})` as an implicit
  return.
- Reset state in `beforeEach`, not at the tail of each `it` — a failed
  assertion must not leak state into the next test.
- Store holds UI state only; anything fetched from the server goes in a
  TanStack Query cache, never mirrored here.
