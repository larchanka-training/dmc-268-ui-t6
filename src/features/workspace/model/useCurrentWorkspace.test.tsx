// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AUTH_ME_QUERY_KEY, type Workspace } from '../../../entities/user'
import { useWorkspaceStore } from './store'
import { useCurrentWorkspace } from './useCurrentWorkspace'

const PERSONAL: Workspace = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'GitHub: skvertl',
  installationId: 12345,
}
const ORGANIZATION: Workspace = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  name: 'GitHub: larchanka-training',
  installationId: 67890,
}
const REMOVED_ID = '323e4567-e89b-12d3-a456-426614174002'

let client: QueryClient

function wrapper(props: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
}

function seedMe(workspaces: Workspace[]): void {
  client.setQueryData(AUTH_ME_QUERY_KEY, {
    id: 114473628,
    login: 'skvertl',
    name: null,
    avatarUrl: null,
    workspaces,
  })
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useWorkspaceStore.setState({ selectedId: null })
})

afterEach(() => {
  cleanup()
  client.clear()
  localStorage.clear()
})

describe('useCurrentWorkspace', () => {
  it('takes the list from the current user', () => {
    seedMe([PERSONAL, ORGANIZATION])
    const { result } = renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(result.current.workspaces).toEqual([PERSONAL, ORGANIZATION])
  })

  it('makes the first workspace current until the user picks one', () => {
    seedMe([PERSONAL, ORGANIZATION])
    const { result } = renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(result.current.current).toEqual(PERSONAL)
  })

  it('makes the picked workspace current', () => {
    seedMe([PERSONAL, ORGANIZATION])
    const { result } = renderHook(() => useCurrentWorkspace(false), { wrapper })
    act(() => {
      result.current.select(ORGANIZATION.id)
    })
    expect(result.current.current).toEqual(ORGANIZATION)
  })

  it('shows the same choice to every reader', () => {
    seedMe([PERSONAL, ORGANIZATION])
    const switcher = renderHook(() => useCurrentWorkspace(false), { wrapper })
    const screen = renderHook(() => useCurrentWorkspace(false), { wrapper })
    act(() => {
      switcher.result.current.select(ORGANIZATION.id)
    })
    expect(screen.result.current.current).toEqual(ORGANIZATION)
  })

  it('falls back to the first available when the saved workspace is gone', () => {
    useWorkspaceStore.setState({ selectedId: REMOVED_ID })
    seedMe([PERSONAL, ORGANIZATION])
    const { result } = renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(result.current.current).toEqual(PERSONAL)
  })

  it('keeps the saved id when the workspace is gone, and uses it when it comes back', async () => {
    localStorage.setItem('dmc_current_workspace', ORGANIZATION.id)
    useWorkspaceStore.setState({ selectedId: ORGANIZATION.id })
    seedMe([PERSONAL])
    const { result } = renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(result.current.current).toEqual(PERSONAL)
    expect(localStorage.getItem('dmc_current_workspace')).toBe(ORGANIZATION.id)

    seedMe([PERSONAL, ORGANIZATION])
    await waitFor(() => {
      expect(result.current.current).toEqual(ORGANIZATION)
    })
  })

  it('has no current workspace while the user is unknown', () => {
    const { result } = renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(result.current.workspaces).toEqual([])
    expect(result.current.current).toBeNull()
  })

  it('has no current workspace when the user has none', () => {
    seedMe([])
    const { result } = renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(result.current.current).toBeNull()
  })
})
