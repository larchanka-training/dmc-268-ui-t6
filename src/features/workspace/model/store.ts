import { create } from 'zustand'

const CURRENT_WORKSPACE_STORAGE_KEY = 'dmc_current_workspace'

interface WorkspaceState {
  /**
   * The id the user picked last, or null when they never did. It may no longer be available:
   * `useCurrentWorkspace` decides which workspace is current and replaces an id that is gone.
   */
  selectedId: string | null
  select: (id: string) => void
}

function savedId(): string | null {
  try {
    return localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY)
  } catch {
    return null
  }
}

function persist(id: string): void {
  try {
    localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, id)
  } catch {
    // ignore: the choice still applies until the page is reloaded
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedId: savedId(),
  select: (id: string) => {
    persist(id)
    set({ selectedId: id })
  },
}))
