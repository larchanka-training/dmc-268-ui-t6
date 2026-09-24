# Widget UI component

## When to use

A presentational piece owned by one widget: typed props in, JSX out, no
server calls. Reach for antd primitives only when the widget needs them —
plain JSX is fine and keeps the proof block small.

## File placement

- `src/widgets/todo-panel/ui/ToggleBadge.tsx`
- `src/widgets/todo-panel/ui/ToggleBadge.test.tsx`

## Code

<!-- proof: ToggleBadge.tsx -->

```tsx
import type { JSX } from 'react'

interface ToggleBadgeProps {
  label: string
  active: boolean
  onToggle: () => void
}

export function ToggleBadge(props: ToggleBadgeProps): JSX.Element {
  const { label, active, onToggle } = props
  return (
    <button type="button" onClick={onToggle}>
      {`${label}: ${active ? 'on' : 'off'}`}
    </button>
  )
}
```

## Test

<!-- proof: ToggleBadge.test.tsx -->

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToggleBadge } from './ToggleBadge'

afterEach(() => {
  cleanup()
})

describe('ToggleBadge', () => {
  it('renders the label and current state', () => {
    render(<ToggleBadge label="Auto-merge" active={false} onToggle={vi.fn()} />)
    expect(screen.getByText('Auto-merge: off')).toBeTruthy()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<ToggleBadge label="Auto-merge" active={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Auto-merge: off'))
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
```

## Checklist

- The file exports only the component — no hook, store or schema alongside
  it (`react-refresh/only-export-components`).
- One child expression for text that must match as one node in tests
  (``{`${a}: ${b}`}``, not `{a}: {b}`) — safe against markup reflow.
- `afterEach(() => { cleanup() })`, not a bare `afterEach(cleanup)` reference.
- Interaction test uses `vi.fn()` for the callback prop, never an empty
  arrow function (`no-empty-function`).
- `// @vitest-environment jsdom` is the first line of the test file.
