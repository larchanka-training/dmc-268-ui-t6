// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { useFocusHandoff } from './useFocusHandoff'

afterEach(cleanup)

function FocusHarness() {
  const epoch = useRef(0)
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
          }}
        >
          Open repository
        </button>
      ) : null}
      <button
        ref={(node) => {
          trackConnectAction('remote-uuid', node)
        }}
      >
        Connect target
      </button>
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
})
