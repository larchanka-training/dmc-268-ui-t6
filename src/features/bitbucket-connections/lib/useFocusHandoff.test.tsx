// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { useFocusHandoff } from './useFocusHandoff'

afterEach(cleanup)

function FocusHarness({
  targetMode = 'enabled',
  moveFocus = false,
}: {
  targetMode?: 'enabled' | 'missing' | 'disabled'
  moveFocus?: boolean
}) {
  const epoch = useRef(0)
  const otherRef = useRef<HTMLButtonElement | null>(null)
  const [originVisible, setOriginVisible] = useState(true)
  const { workspaceInputRef, requestFocus, trackConnectAction, trackBindingAction } =
    useFocusHandoff({ busy: false, epoch, latestSetupId: null })
  return (
    <div>
      <input aria-label="Workspace fallback" ref={workspaceInputRef} />
      {originVisible ? (
        <button
          onClick={(event) => {
            requestFocus(0, event.currentTarget, {
              kind: 'connect',
              remoteRepositoryUuid: 'remote-uuid',
            })
            setOriginVisible(false)
            if (moveFocus) otherRef.current?.focus()
          }}
        >
          Open repository
        </button>
      ) : null}
      {targetMode !== 'missing' ? (
        <button
          disabled={targetMode === 'disabled'}
          ref={(node) => {
            trackConnectAction('remote-uuid', node)
          }}
        >
          Connect target
        </button>
      ) : null}
      <button ref={otherRef}>Other control</button>
      <button
        onClick={(event) => {
          requestFocus(0, event.currentTarget, {
            kind: 'hook',
            portalRepositoryId: 'portal-id',
          })
        }}
      >
        Rotate hook
      </button>
      <button
        ref={(node) => {
          trackBindingAction('hook', 'portal-id', node)
        }}
      >
        Hook target
      </button>
    </div>
  )
}

describe('useFocusHandoff', () => {
  it('resolves remote UUID and portal repository ID actions after rendering', async () => {
    render(<FocusHarness />)
    const open = screen.getByRole('button', { name: 'Open repository' })
    open.focus()
    fireEvent.click(open)
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Connect target' }))
    })

    const rotate = screen.getByRole('button', { name: 'Rotate hook' })
    rotate.focus()
    fireEvent.click(rotate)
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Hook target' }))
    })
  })

  it.each(['missing', 'disabled'] as const)(
    'falls back to the workspace input when the %s target cannot receive focus',
    async (targetMode) => {
      render(<FocusHarness targetMode={targetMode} />)
      const open = screen.getByRole('button', { name: 'Open repository' })
      open.focus()
      fireEvent.click(open)
      await waitFor(() => {
        expect(document.activeElement).toBe(
          screen.getByRole('textbox', { name: 'Workspace fallback' }),
        )
      })
    },
  )

  it('does not steal focus when the user moves to another control', () => {
    render(<FocusHarness moveFocus />)
    const open = screen.getByRole('button', { name: 'Open repository' })
    open.focus()
    fireEvent.click(open)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Other control' }))
  })
})
