import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

export type FocusTarget =
  | { kind: 'workspace' }
  | { kind: 'setup'; setupId: number }
  | { kind: 'latest-setup' }
  | { kind: 'connect'; remoteRepositoryUuid: string }
  | { kind: 'credential'; portalRepositoryId: string }
  | { kind: 'hook'; portalRepositoryId: string }
  | { kind: 'disconnect'; portalRepositoryId: string }
  | { kind: 'discover-submit' }
  | { kind: 'credential-submit' }

type BindingActionKind = 'credential' | 'hook' | 'disconnect'

interface FocusRequest {
  epoch: number
  from: HTMLElement
  target: FocusTarget
}

interface FocusHandoffOptions {
  busy: boolean
  epoch: RefObject<number>
  latestSetupId: number | null
}

/** Moves focus only when the action's origin still owns it or has unmounted. */
export function useFocusHandoff({ busy, epoch, latestSetupId }: FocusHandoffOptions) {
  const focusRequestRef = useRef<FocusRequest | null>(null)
  const [focusRevision, setFocusRevision] = useState(0)
  const workspaceInputRef = useRef<HTMLInputElement | null>(null)
  const discoverySubmitRef = useRef<HTMLButtonElement | null>(null)
  const credentialSubmitRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null)
  const setupActions = useRef(new Map<number, HTMLElement>())
  const connectActions = useRef(new Map<string, HTMLElement>())
  const credentialActions = useRef(new Map<string, HTMLElement>())
  const hookActions = useRef(new Map<string, HTMLElement>())
  const disconnectActions = useRef(new Map<string, HTMLElement>())

  useLayoutEffect(() => {
    const focusRequest = focusRequestRef.current
    if (!focusRequest || busy) return
    if (focusRequest.epoch !== epoch.current) {
      focusRequestRef.current = null
      return
    }
    const target = focusRequest.target
    let element: HTMLElement | null
    switch (target.kind) {
      case 'workspace':
        element = workspaceInputRef.current
        break
      case 'setup':
        element = setupActions.current.get(target.setupId) ?? null
        break
      case 'latest-setup':
        element = setupActions.current.get(latestSetupId ?? -1) ?? workspaceInputRef.current
        break
      case 'connect':
        element = connectActions.current.get(target.remoteRepositoryUuid) ?? null
        break
      case 'credential':
        element = credentialActions.current.get(target.portalRepositoryId) ?? null
        break
      case 'hook':
        element = hookActions.current.get(target.portalRepositoryId) ?? null
        break
      case 'disconnect':
        element = disconnectActions.current.get(target.portalRepositoryId) ?? null
        break
      case 'discover-submit':
        element = discoverySubmitRef.current
        break
      case 'credential-submit':
        element = credentialSubmitRef.current
        break
    }
    const active = document.activeElement
    if (!element || (element instanceof HTMLButtonElement && element.disabled)) {
      if (active === document.body || active === focusRequest.from)
        workspaceInputRef.current?.focus()
      focusRequestRef.current = null
      return
    }
    if (active === document.body || active === focusRequest.from) element.focus()
    focusRequestRef.current = null
  }, [busy, epoch, focusRevision, latestSetupId])

  const requestFocus = (requestEpoch: number, from: HTMLElement, target: FocusTarget) => {
    if (requestEpoch === epoch.current) {
      focusRequestRef.current = { epoch: requestEpoch, from, target }
      setFocusRevision((current) => current + 1)
    }
  }

  const trackSetupAction = (setupId: number, node: HTMLElement | null) => {
    if (node) setupActions.current.set(setupId, node)
    else setupActions.current.delete(setupId)
  }

  const trackConnectAction = (remoteRepositoryUuid: string, node: HTMLElement | null) => {
    if (node) connectActions.current.set(remoteRepositoryUuid, node)
    else connectActions.current.delete(remoteRepositoryUuid)
  }

  const trackBindingAction = (
    kind: BindingActionKind,
    portalRepositoryId: string,
    node: HTMLElement | null,
  ) => {
    const actions = {
      credential: credentialActions.current,
      hook: hookActions.current,
      disconnect: disconnectActions.current,
    }[kind]
    if (node) actions.set(portalRepositoryId, node)
    else actions.delete(portalRepositoryId)
  }

  return {
    workspaceInputRef,
    discoverySubmitRef,
    credentialSubmitRef,
    requestFocus,
    clearFocusRequest: () => {
      focusRequestRef.current = null
    },
    trackSetupAction,
    trackConnectAction,
    trackBindingAction,
  }
}
