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
const STORAGE_KEY = 'dmc_current_workspace'

let client: QueryClient

function wrapper(props: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
}

function saveChoice(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
  useWorkspaceStore.setState({ selectedId: id })
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

  it('saves the first available in place of a workspace that is gone', () => {
    saveChoice(ORGANIZATION.id)
    seedMe([PERSONAL])
    renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(useWorkspaceStore.getState().selectedId).toBe(PERSONAL.id)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(PERSONAL.id)
  })

  it('stays on the first available when the workspace that was gone comes back', async () => {
    saveChoice(ORGANIZATION.id)
    seedMe([PERSONAL])
    const { result } = renderHook(() => useCurrentWorkspace(false), { wrapper })

    seedMe([PERSONAL, ORGANIZATION])
    await waitFor(() => {
      expect(result.current.workspaces).toEqual([PERSONAL, ORGANIZATION])
    })
    expect(result.current.current).toEqual(PERSONAL)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(PERSONAL.id)
  })

  it('keeps the choice while the answer has not come', () => {
    saveChoice(ORGANIZATION.id)
    renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(useWorkspaceStore.getState().selectedId).toBe(ORGANIZATION.id)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(ORGANIZATION.id)
  })

  it('keeps the choice when the request failed, whatever an older answer says', () => {
    saveChoice(ORGANIZATION.id)
    seedMe([PERSONAL])
    client
      .getQueryCache()
      .find({ queryKey: AUTH_ME_QUERY_KEY })
      ?.setState({ status: 'error', error: new Error('request failed') })
    const { result } = renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(result.current.current).toEqual(PERSONAL)
    expect(useWorkspaceStore.getState().selectedId).toBe(ORGANIZATION.id)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(ORGANIZATION.id)
  })

  it('keeps the choice when no workspace is available to replace it', () => {
    saveChoice(ORGANIZATION.id)
    seedMe([])
    renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(useWorkspaceStore.getState().selectedId).toBe(ORGANIZATION.id)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(ORGANIZATION.id)
  })

  it('leaves the saved choice alone while its workspace is available', () => {
    saveChoice(ORGANIZATION.id)
    seedMe([PERSONAL, ORGANIZATION])
    renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(useWorkspaceStore.getState().selectedId).toBe(ORGANIZATION.id)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(ORGANIZATION.id)
  })

  it('saves nothing until the user picks a workspace', () => {
    seedMe([PERSONAL, ORGANIZATION])
    renderHook(() => useCurrentWorkspace(false), { wrapper })
    expect(useWorkspaceStore.getState().selectedId).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
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
