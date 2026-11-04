// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useWorkspaceStore } from './store'

const WORKSPACE_ID = '123e4567-e89b-12d3-a456-426614174000'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  useWorkspaceStore.setState({ selectedId: null })
})

/** A page reload evaluates the module again, so the store reads the saved value anew. */
async function reloadStore() {
  vi.resetModules()
  const fresh = await import('./store')
  return fresh.useWorkspaceStore
}

describe('useWorkspaceStore', () => {
  it('applies the choice at once and saves it', () => {
    useWorkspaceStore.getState().select(WORKSPACE_ID)
    expect(useWorkspaceStore.getState().selectedId).toBe(WORKSPACE_ID)
    expect(localStorage.getItem('dmc_current_workspace')).toBe(WORKSPACE_ID)
  })

  it('starts with no choice when nothing was saved', async () => {
    const store = await reloadStore()
    expect(store.getState().selectedId).toBeNull()
  })

  it('keeps the choice after a reload', async () => {
    useWorkspaceStore.getState().select(WORKSPACE_ID)
    const store = await reloadStore()
    expect(store.getState().selectedId).toBe(WORKSPACE_ID)
  })

  it('starts with no choice when the storage cannot be read', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const store = await reloadStore()
    expect(store.getState().selectedId).toBeNull()
  })

  it('still applies the choice when the storage cannot be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    useWorkspaceStore.getState().select(WORKSPACE_ID)
    expect(useWorkspaceStore.getState().selectedId).toBe(WORKSPACE_ID)
  })
})
